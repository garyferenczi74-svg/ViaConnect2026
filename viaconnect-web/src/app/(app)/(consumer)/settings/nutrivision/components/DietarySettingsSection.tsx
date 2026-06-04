'use client';

// =============================================================================
// Prompt 173a Phase 8 follow up (2026-06-04): /settings/nutrivision dietary
// choice mirror.
//
// Lets the user change their dietary choice after the CAQ without re-running
// the questionnaire. Source of truth is assessment_results phase 3
// (lifestyle JSON), the same place the CAQ writes and the macro engine
// resolver reads. Saving here writes back to that record and immediately
// fires /api/nutrition/generate-targets so the active nutrition_targets row
// reflects the new split.
//
// The card surfaces (a) the current pick and (b) the engine's EFFECTIVE
// value from the latest targets row so the user can see when the
// conservative path overrode their choice to balanced. Calm tone, no
// motivational language.
// =============================================================================

import { useEffect, useState } from 'react';
import { Utensils } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { DietaryChoiceSelector } from '@/components/caq/DietaryChoiceSelector';
import { useNutritionTargets } from '@/hooks/useNutritionTargets';
import type { DietaryChoice } from '@/lib/gordon/macro-config';

const VALID_CHOICES: ReadonlyArray<DietaryChoice> = [
  'balanced', 'mediterranean', 'low_carb', 'keto', 'higher_carb', 'plant_based',
];

const CHOICE_LABEL: Record<DietaryChoice, string> = {
  balanced: 'Balanced',
  mediterranean: 'Mediterranean',
  low_carb: 'Low-carb',
  keto: 'Keto',
  higher_carb: 'Higher-carb',
  plant_based: 'Plant-based',
};

function isDietaryChoice(value: unknown): value is DietaryChoice {
  return typeof value === 'string' && (VALID_CHOICES as ReadonlyArray<string>).includes(value);
}

export function DietarySettingsSection() {
  const [userId, setUserId] = useState<string | null>(null);
  const [pick, setPick] = useState<DietaryChoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // The EFFECTIVE choice from the latest targets row (string per the row
  // type). When this disagrees with the user's pick we surface a calm note
  // that the conservative path overrode it.
  const { targets, regenerate } = useNutritionTargets(userId);
  const effectiveChoice = targets?.dietaryChoice ?? null;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: row } = await (supabase as any)
          .from('assessment_results')
          .select('data')
          .eq('user_id', user.id)
          .eq('phase', 3)
          .maybeSingle();
        const raw = (row?.data as Record<string, unknown> | undefined)?.dietaryChoice;
        if (!cancelled && isDietaryChoice(raw)) setPick(raw);
      } catch {
        /* silent: the user may not have completed the CAQ yet */
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  async function persist(next: DietaryChoice) {
    if (!userId) return;
    setSaving(true);
    const prev = pick;
    setPick(next);
    try {
      const supabase = createClient();
      // Read existing phase 3 data so we merge instead of overwriting the
      // other Lifestyle fields (goals, weight goal, supplement form, etc.).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from('assessment_results')
        .select('data')
        .eq('user_id', userId)
        .eq('phase', 3)
        .maybeSingle();
      const merged = {
        ...(existing?.data as Record<string, unknown> | undefined ?? {}),
        dietaryChoice: next,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('assessment_results')
        .upsert({ user_id: userId, phase: 3, data: merged }, { onConflict: 'user_id,phase' });
      if (error) throw new Error(error.message);

      toast.success(`Dietary choice updated to ${CHOICE_LABEL[next]}.`);

      // Fire the recompute so the active nutrition_targets row reflects the
      // new split. The hook refetches on success so the EFFECTIVE chip
      // updates without a manual refresh.
      void regenerate();
    } catch (err) {
      // Roll back the optimistic state and let the user retry.
      setPick(prev);
      toast.error(err instanceof Error ? err.message : 'Could not save your dietary choice.');
    } finally {
      setSaving(false);
    }
  }

  // The conservative-path override fires when the engine routes a keto or
  // low-carb pick to balanced (173a Section 9). When that happens the
  // effective value reads 'balanced' even though the pick is something
  // else; surface a calm note explaining the override.
  const wasOverridden =
    pick !== null &&
    effectiveChoice !== null &&
    effectiveChoice !== pick &&
    isDietaryChoice(effectiveChoice);

  return (
    <section
      aria-labelledby="dietary-choice-heading"
      className="mt-4 rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-5 backdrop-blur-md"
    >
      <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-white/55">
        Nutrition
      </h2>
      <div className="mb-3 flex items-center gap-2">
        <Utensils className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
        <h3
          id="dietary-choice-heading"
          className="text-base font-semibold text-white"
        >
          Dietary Choice
        </h3>
      </div>
      <p className="mb-4 text-sm leading-[22px] text-white/70">
        Pick the eating style closest to how you want to eat. This drives how your fat and carbohydrate targets are split on the Nutrition Log. Changes take effect on your next macro recompute, which we trigger automatically when you save.
      </p>

      {loading ? (
        <p className="text-xs text-white/45">Loading current choice...</p>
      ) : (
        <>
          <DietaryChoiceSelector
            value={pick}
            onChange={(choice) => { if (!saving) void persist(choice); }}
          />

          {wasOverridden && isDietaryChoice(effectiveChoice) ? (
            <p
              className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] leading-relaxed text-white/65"
              role="note"
              aria-live="polite"
            >
              Your pick is {CHOICE_LABEL[pick as DietaryChoice]}. Your active targets are using {CHOICE_LABEL[effectiveChoice]} because a safety path is in effect (active disordered eating history, a goal weight below the healthy range, or under 18). The selector still records your pick; the engine reverts as soon as the safety condition no longer applies.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

export default DietarySettingsSection;
