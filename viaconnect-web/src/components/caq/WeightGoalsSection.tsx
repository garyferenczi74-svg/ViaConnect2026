'use client';

// =============================================================================
// Prompt 173 Task 3 (rebuild on main 2026-06-03): Weight Goals sub-section.
// Lives INSIDE the CAQ Phase 2 "What are your top wellness goals?" block.
//
// Captures a GOAL weight, references the CURRENT weight already entered in
// Phase 1 (Demographics) without re-asking, and shows the derived goal
// DIRECTION. The pair (current weight, goal weight) + direction is the
// canonical weight intent; the parent persists it via writeWeightGoal
// (Phase 2 accessor) on Lifestyle phase save. This component does NOT write
// to the DB itself; it is a controlled input that surfaces the captured kg
// value to the parent.
//
// Math lives in pure modules:
//   * direction  -> previewGoalDirection (accessor.ts). NEVER recomputed here.
//   * plausibility band + sub-18.5 + BMI + unit conversion -> guardrails.ts.
//
// Disordered-eating safety: reads profiles.body_scan_de_response via the
// stub safeguard module. When the column is absent on pre-169b live (the
// current state on main), the read defaults to inactive and the section
// renders the normal direction copy. When 169b lands and the column is
// populated as 'currently' or 'in_the_past', the section shifts to
// maintenance-oriented, professional-referral copy and suppresses
// direction framing.
//
// Tone: supportive + neutral. No streaks, pressure, comparison, or
// success/failure framing of any number.
// =============================================================================

import { useEffect, useState } from 'react';
import { Info, Pencil, HeartHandshake } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { previewGoalDirection, type GoalDirection } from '@/lib/weight-goals/accessor';
import type { PacePreset } from '@/lib/body-goals/types';
import {
  evaluateGoalWeight,
  kgToLbs,
  lbsToKg,
  type GoalPlausibility,
} from '@/lib/weight-goals/guardrails';
import { readActiveHistoryFromProfiles } from '@/lib/body-tracker/disordered-eating-safeguard';

type WeightUnit = 'kg' | 'lbs';

export interface WeightGoalsSectionProps {
  // Current weight in kg as a numeric STRING, exactly as stored in
  // demographics.weight on Phase 1 (empty string when not yet entered).
  currentWeightKgRaw: string;
  // Height in cm as a numeric STRING (demographics.height); used for the
  // BMI plausibility band + the sub-18.5 note. Empty string when not
  // entered.
  heightCmRaw: string;
  // The unit the user picked on Demographics (shared weightUnit state).
  // The goal weight input uses the SAME unit so the experience is
  // consistent.
  weightUnit: WeightUnit;
  // Controlled canonical goal weight in KG (null when empty/unset). Stored
  // in the parent's goals state so it survives with the rest of the goals
  // state and can be persisted on Phase 2 save.
  goalWeightKg: number | null;
  // Surface the captured canonical kg value (or null when cleared) to the
  // parent.
  onGoalWeightKgChange: (kg: number | null) => void;
  // Navigate back to Phase 1 (Demographics). The parent first persists the
  // in-progress draft (so the round trip preserves state) then routes.
  onEditDemographics: () => void;
  // Prompt 179a: pace preset (Gentle / Steady / Ambitious / Pick a target
  // date) captured inside this step. Shown only for a lose or gain direction.
  pace: PacePreset;
  onPaceChange: (p: PacePreset) => void;
  // Target date (yyyy-mm-dd) when pace is custom_date; null otherwise.
  targetDate: string | null;
  onTargetDateChange: (d: string | null) => void;
}

// Round a kg value to a tidy display number in the user's unit. We keep one
// decimal in kg and whole pounds, matching the Demographics inputs' feel.
function kgToDisplay(kg: number, unit: WeightUnit): string {
  if (unit === 'kg') {
    return String(Math.round(kg * 10) / 10);
  }
  return String(Math.round(kgToLbs(kg)));
}

// Calm, specific validation copy per plausibility verdict. No exclamation,
// no alarm; just a neutral nudge to correct the value.
function plausibilityMessage(p: GoalPlausibility, unit: WeightUnit): string | null {
  switch (p) {
    case 'not_positive':
      return 'Please enter a weight greater than zero.';
    case 'below_band':
      return `That number looks lower than we would expect for your height. Please double check the value and your ${unit === 'kg' ? 'kilograms' : 'pounds'} unit.`;
    case 'above_band':
      return `That target looks higher than expected for your height. Please double check the number and your ${unit === 'kg' ? 'kilograms' : 'pounds'} unit.`;
    case 'not_a_number':
    case 'no_height':
    case 'ok':
    default:
      return null;
  }
}

// Calm, factual direction label. Not motivational, not judgmental.
const DIRECTION_LABEL: Record<GoalDirection, string> = {
  lose: 'Lose',
  gain: 'Gain',
  maintain: 'Maintain',
};

export function WeightGoalsSection({
  currentWeightKgRaw,
  heightCmRaw,
  weightUnit,
  goalWeightKg,
  onGoalWeightKgChange,
  onEditDemographics,
  pace,
  onPaceChange,
  targetDate,
  onTargetDateChange,
}: WeightGoalsSectionProps) {
  // Local DRAFT string for the unit-aware input. Kept in the user's unit so
  // typing feels natural; we convert to canonical kg on every change.
  const [draft, setDraft] = useState<string>('');

  // Disordered-eating safety signal. While loading we assume NOT active
  // (false) so we do not flash safety copy; the safeguard read also
  // defaults to false on any error or missing column.
  const [deSafetyActive, setDeSafetyActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const active = await readActiveHistoryFromProfiles(supabase);
      if (!cancelled) setDeSafetyActive(active);
    })();
    return () => { cancelled = true; };
  }, []);

  // Hydrate the visible draft from the canonical kg value (e.g. on resume,
  // or after returning from Demographics). Re-runs when the unit changes so
  // the displayed number follows the unit toggle.
  useEffect(() => {
    if (goalWeightKg !== null && Number.isFinite(goalWeightKg) && goalWeightKg > 0) {
      setDraft(kgToDisplay(goalWeightKg, weightUnit));
    } else {
      setDraft('');
    }
  }, [goalWeightKg, weightUnit]);

  const currentWeightKg = (() => {
    const n = parseFloat(currentWeightKgRaw);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
  const heightCm = (() => {
    const n = parseFloat(heightCmRaw);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  // Convert the unit-aware draft into canonical kg and push it up.
  function handleDraftChange(value: string) {
    setDraft(value);
    const entered = parseFloat(value);
    if (!Number.isFinite(entered) || entered <= 0) {
      onGoalWeightKgChange(null);
      return;
    }
    const kg = weightUnit === 'kg' ? entered : lbsToKg(entered);
    onGoalWeightKgChange(kg);
  }

  const evaluation = evaluateGoalWeight(goalWeightKg, heightCm);
  const hasGoal = goalWeightKg !== null && Number.isFinite(goalWeightKg) && goalWeightKg > 0;

  // Direction preview (client-side only; the DB trigger owns the stored
  // value).
  const direction: GoalDirection | null =
    hasGoal && currentWeightKg !== null
      ? previewGoalDirection(currentWeightKg, goalWeightKg as number)
      : null;

  const validationMsg = hasGoal ? plausibilityMessage(evaluation.plausibility, weightUnit) : null;
  const showBelowHealthyNote = hasGoal && evaluation.isValid && evaluation.belowHealthyRange;
  const unitLabel = weightUnit === 'kg' ? 'kg' : 'lbs';

  return (
    <div className="rounded-xl border border-dark-border bg-dark-surface/60 p-4 md:p-5 space-y-4">
      {/* Sub-section heading */}
      <div>
        <p className="text-sm font-medium text-white/80">Weight Goals</p>
        <p className="text-xs text-white/40 mt-0.5">
          Optional. This helps us tailor nutrition guidance to where you are and where you would like to be.
        </p>
      </div>

      {/* Current weight (read-only reference from Demographics) */}
      {currentWeightKg === null ? (
        <div className="rounded-lg border border-dark-border bg-dark-surface px-3 py-3">
          <p className="text-sm text-white/70">
            Add your current weight on the Demographics step to set a weight goal.
          </p>
          <button
            type="button"
            onClick={onEditDemographics}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-copper hover:text-copper/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-copper/50 rounded transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
            Go to Demographics
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dark-border bg-dark-surface px-3 py-2.5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-white/40 font-medium">Current weight</p>
            <p className="text-sm text-white/90 mt-0.5">
              {kgToDisplay(currentWeightKg, weightUnit)} {unitLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onEditDemographics}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-copper hover:text-copper/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-copper/50 rounded px-1 py-0.5 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
            Edit on Demographics
          </button>
        </div>
      )}

      {/* Goal weight input (unit-aware, same unit as Demographics) */}
      <div>
        <label htmlFor="caq-goal-weight" className="block text-sm font-medium text-white/70 mb-1.5">
          Goal weight
        </label>
        <div className="relative">
          <input
            id="caq-goal-weight"
            type="number"
            inputMode="decimal"
            min={0}
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            aria-describedby="caq-goal-weight-help"
            aria-invalid={Boolean(validationMsg)}
            className="w-full h-10 bg-dark-surface border border-dark-border rounded-lg px-3 pr-12 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-copper/50 focus:border-copper/50 transition-colors"
            placeholder={weightUnit === 'kg' ? '68' : '150'}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">{unitLabel}</span>
        </div>
        <p id="caq-goal-weight-help" className="sr-only">
          Enter your goal weight in {weightUnit === 'kg' ? 'kilograms' : 'pounds'}, the same unit you selected on the Demographics step.
        </p>

        {/* Calm validation message (not an error shout) */}
        {validationMsg && (
          <p className="mt-1.5 text-xs text-amber-400/80" aria-live="polite">
            {validationMsg}
          </p>
        )}
      </div>

      {/* Derived direction (calm, factual). Hidden until a valid goal +
          current weight exist, so we never show a direction we cannot
          stand behind. Suppressed in disordered-eating safety mode, which
          leads with maintenance-oriented copy instead. */}
      {direction && evaluation.isValid && currentWeightKg !== null && !deSafetyActive && (
        <div
          className="flex items-center gap-2 rounded-lg border border-teal/20 bg-teal/5 px-3 py-2"
          aria-live="polite"
        >
          <span className="text-[11px] uppercase tracking-[0.12em] text-white/40 font-medium">Direction</span>
          <span className="text-sm font-medium text-teal-light">{DIRECTION_LABEL[direction]}</span>
        </div>
      )}

      {/* Prompt 179a: pace / target-date capture. Shown only for a lose or
          gain direction (a maintain goal needs no pace), and suppressed in
          disordered-eating safety mode. Defaults to Steady. */}
      {direction && (direction === 'lose' || direction === 'gain') && evaluation.isValid && currentWeightKg !== null && !deSafetyActive && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.12em] text-white/40 font-medium">Pace</p>
          <div className="flex flex-wrap gap-2">
            {(['gentle', 'steady', 'ambitious'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPaceChange(p)}
                aria-pressed={pace === p}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-teal/50 ${
                  pace === p
                    ? 'border-teal/50 bg-teal/15 text-white'
                    : 'border-dark-border bg-dark-surface text-white/55 hover:text-white/80'
                }`}
              >
                {p === 'gentle' ? 'Gentle' : p === 'steady' ? 'Steady' : 'Ambitious'}
                <span className="ml-1 text-white/40">{p === 'gentle' ? '0.5' : p === 'steady' ? '1.0' : '1.5'} lb/wk</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => onPaceChange('custom_date')}
              aria-pressed={pace === 'custom_date'}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-teal/50 ${
                pace === 'custom_date'
                  ? 'border-teal/50 bg-teal/15 text-white'
                  : 'border-dark-border bg-dark-surface text-white/55 hover:text-white/80'
              }`}
            >
              Pick a target date
            </button>
          </div>
          {pace === 'custom_date' && (
            <input
              type="date"
              value={targetDate ?? ''}
              onChange={(e) => onTargetDateChange(e.target.value || null)}
              className="w-full h-10 bg-dark-surface border border-dark-border rounded-lg px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-copper/50 focus:border-copper/50 transition-colors"
            />
          )}
          <p className="text-[11px] text-white/40">
            Arnold keeps every plan within a safe pace. If a date would need a faster rate than is safe, the date is eased back, never your calories.
          </p>
        </div>
      )}

      {/* Disordered-eating safety mode: maintenance-oriented, professional
          referral copy. No deficit, no rate-of-loss framing. Takes
          precedence over the sub-18.5 note (both are supportive, but we
          lead with safety). */}
      {deSafetyActive ? (
        <div className="flex items-start gap-2 rounded-lg border border-teal/20 bg-teal/5 px-3 py-2.5" aria-live="polite">
          <HeartHandshake className="w-4 h-4 mt-0.5 shrink-0 text-teal-light" strokeWidth={1.5} />
          <p className="text-xs leading-relaxed text-white/70">
            We will keep things focused on steady, maintenance oriented habits rather than a target pace. If a weight goal feels stressful, it is completely okay to skip it, and a healthcare professional can help you set goals that feel right for you.
          </p>
        </div>
      ) : (
        showBelowHealthyNote && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2.5" aria-live="polite">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-400/80" strokeWidth={1.5} />
            <p className="text-xs leading-relaxed text-white/70">
              This target is on the lower side of commonly cited healthy weight ranges for your height. That can still be the right choice for some people, and it is worth talking through with a healthcare professional to make sure it fits your needs.
            </p>
          </div>
        )
      )}
    </div>
  );
}

export default WeightGoalsSection;
