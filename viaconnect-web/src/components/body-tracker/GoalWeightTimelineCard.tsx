'use client';

// =============================================================================
// Prompt 173 Phase 7 (rebuild on main 2026-06-03): Body Tracker goal weight
// timeline card.
//
// Reads goal weight from the canonical user_weight_goals via useWeightGoalKg
// (Section 4.3 + Section 7); current weight + weekly rate flow from the
// active nutrition_targets row (its macro_basis JSON carries weeklyRateKg).
// projectWeeksToGoal handles the math + the weekly_rate_cap_pct clamp so the
// timeline never implies a faster trajectory than the macros support.
//
// Hides itself when projection data is missing (no goal, no targets yet, or
// engine direction is Maintain) so the page never shows nonsense.
// =============================================================================

import { Goal, ShieldAlert } from 'lucide-react';
import { projectWeeksToGoal } from '@/lib/weight-goals/timeline';
import { LBS_PER_KG } from '@/lib/weight-goals/guardrails';
import { MacroDisclaimer } from '@/components/nutrition/MacroDisclaimer';

export interface GoalWeightTimelineCardProps {
  readonly currentWeightKg: number | null;
  readonly goalWeightKg: number | null;
  readonly weeklyRateKg: number | null;
  readonly weightUnit: 'kg' | 'lbs';
}

function kgToDisplay(kg: number, unit: 'kg' | 'lbs'): string {
  if (unit === 'kg') return (Math.round(kg * 10) / 10).toString();
  return Math.round(kg * LBS_PER_KG).toString();
}

export function GoalWeightTimelineCard({
  currentWeightKg,
  goalWeightKg,
  weeklyRateKg,
  weightUnit,
}: GoalWeightTimelineCardProps) {
  const projection = projectWeeksToGoal(currentWeightKg, goalWeightKg, weeklyRateKg);

  // Missing inputs or Maintain target: hide the card entirely. The page
  // keeps the WeightChart reference line so the goal is still visible.
  if (projection.kind === 'unavailable') return null;

  const unitLabel = weightUnit === 'kg' ? 'kg' : 'lbs';

  if (projection.kind === 'at_goal') {
    return (
      <section className="rounded-2xl border border-[#2DA5A0]/30 bg-[#1E3054]/35 p-4 text-white md:p-5">
        <header className="mb-2 flex items-center gap-2">
          <Goal className="h-4 w-4 text-[#5BC0BB]" strokeWidth={1.5} />
          <h3 className="text-[14px] font-semibold text-white">At your goal</h3>
        </header>
        <p className="text-[12px] leading-relaxed text-white/65">
          Your current weight is within the maintain band of your goal. The
          macros are tuned to maintenance from here.
        </p>
        {/* Phase 9: compliance memo Section 7 + spec Section 7 require
            every macro-engine-driven surface to carry the disclaimer. */}
        <MacroDisclaimer />
      </section>
    );
  }

  const { weeksToGoal, rateWasCapped, effectiveRateKgPerWeek, direction } = projection.data;
  const weeksLabel = weeksToGoal === 1 ? 'week' : 'weeks';

  return (
    <section
      className="rounded-2xl border border-white/10 bg-[#1E3054]/35 p-4 text-white md:p-5"
      aria-label="Projected timeline to goal weight"
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Goal className="h-4 w-4 text-[#5BC0BB]" strokeWidth={1.5} />
          <h3 className="text-[14px] font-semibold text-white">Projected timeline</h3>
        </div>
        <span className="text-[10px] uppercase tracking-[0.10em] text-white/45">
          {direction === 'lose' ? 'Lose' : 'Gain'}
        </span>
      </header>

      <div className="flex items-baseline gap-2">
        <span className="text-[22px] font-semibold tabular-nums text-white">{weeksToGoal}</span>
        <span className="text-[13px] text-white/60">{weeksLabel} to goal</span>
      </div>
      <p className="mt-1 text-[11px] text-white/45">
        At {kgToDisplay(effectiveRateKgPerWeek, weightUnit)} {unitLabel} per week.
      </p>

      {rateWasCapped ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2" role="note">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-300" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-[11px] leading-relaxed text-white/65">
            This timeline reflects a safe weekly rate cap. Your engine suggested a faster pace, which we slowed to keep the change steady and sustainable.
          </p>
        </div>
      ) : null}

      {/* Phase 9: compliance memo Section 7 + spec Section 7 require every
          macro-engine-driven surface to carry the disclaimer. */}
      <MacroDisclaimer />
    </section>
  );
}

export default GoalWeightTimelineCard;
