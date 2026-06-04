'use client';

// Prompt #168 Apply B + Prompt 173 Phase 5 (2026-06-03): useNutritionTargets.
// Single active row per user (superseded_at IS NULL) is canonical. If no row
// exists, the hook returns null + loading false; it does NOT auto-trigger a
// regeneration. Page-level UX for "no targets yet" is wired at Apply C.
//
// regenerate(): POST to the Next.js API route /api/nutrition/generate-targets.
// The route is session-authed and writes via service role (the prior owner
// INSERT and UPDATE policies on nutrition_targets were dropped in Phase 5
// migration 20260603110000 so the route is the only writer). The retired
// gordon-generate-targets edge function never existed on live and is not
// resurrected.
//
// Realtime: skipped intentionally per spec. Targets change rarely (CAQ updates,
// profile changes, Body Tracker weight logs). Refetch-on-regenerate is enough.

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { NutritionTargets, MealDistribution } from '@/lib/gordon/types';

export interface UseNutritionTargetsResult {
  readonly targets: NutritionTargets | null;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly regenerate: () => Promise<void>;
}

const DEFAULT_DISTRIBUTION: MealDistribution = {
  breakfast: 0.25,
  lunch: 0.30,
  dinner: 0.30,
  snack: 0.075,
  snackDivisorCap: 4,
};

function numericOrZero(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function nullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value.trim() === '') return null;
  return value;
}

function nullableNumeric(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function distributionFromUnknown(value: unknown): MealDistribution {
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return {
      breakfast: numericOrZero(obj.breakfast) || DEFAULT_DISTRIBUTION.breakfast,
      lunch: numericOrZero(obj.lunch) || DEFAULT_DISTRIBUTION.lunch,
      dinner: numericOrZero(obj.dinner) || DEFAULT_DISTRIBUTION.dinner,
      snack: numericOrZero(obj.snack) || DEFAULT_DISTRIBUTION.snack,
      snackDivisorCap:
        numericOrZero(obj.snackDivisorCap) || DEFAULT_DISTRIBUTION.snackDivisorCap,
    };
  }
  return DEFAULT_DISTRIBUTION;
}

function goalDirectionFromUnknown(value: unknown): 'lose' | 'gain' | 'maintain' | null {
  if (value === 'lose' || value === 'gain' || value === 'maintain') return value;
  return null;
}

function rowToTargets(row: Record<string, unknown>): NutritionTargets {
  return {
    targetId: String(row.target_id ?? ''),
    userId: String(row.user_id ?? ''),
    effectiveFrom: String(row.effective_from ?? ''),
    dailyKcal: numericOrZero(row.daily_kcal),
    dailyProteinG: numericOrZero(row.daily_protein_g),
    dailyCarbsG: numericOrZero(row.daily_carbs_g),
    dailyFatTotalG: numericOrZero(row.daily_fat_total_g),
    dailyFatSaturatedG: numericOrZero(row.daily_fat_saturated_g),
    dailyFatUnsatG: numericOrZero(row.daily_fat_unsat_g),
    dailyFiberG: numericOrZero(row.daily_fiber_g),
    dailySugarG: numericOrZero(row.daily_sugar_g),
    dailySodiumMg: numericOrZero(row.daily_sodium_mg),
    sourceCaqSnapshot: row.source_caq_snapshot ?? null,
    sourceBodySnapshot: row.source_body_snapshot ?? null,
    bioOptDay: nullableNumeric(row.bio_opt_day),
    mealDistribution: distributionFromUnknown(row.meal_distribution),
    generatedByVersion: String(row.generated_by_version ?? 'gordon-1.0.0'),
    generatedAt: String(row.generated_at ?? ''),
    supersededAt: nullableString(row.superseded_at),
    // Prompt 173 Phase 5: weight-goal-driven columns. Null on legacy rows.
    goalDirection: goalDirectionFromUnknown(row.goal_direction),
    goalWeightKg: nullableNumeric(row.goal_weight_kg),
    currentWeightKg: nullableNumeric(row.current_weight_kg),
    conservativePath: row.conservative_path === true,
    conservativeReason: nullableString(row.conservative_reason),
    macroBasis: row.macro_basis ?? null,
  };
}

export function useNutritionTargets(
  userId: string | null | undefined,
): UseNutritionTargetsResult {
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(userId));
  const [error, setError] = useState<Error | null>(null);

  const fetchActive = useCallback(async () => {
    if (!userId) {
      setTargets(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { data, error: queryErr } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('user_id', userId)
        .is('superseded_at', null)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      // PGRST205 = relation does not exist (table not migrated yet).
      // Treat as no-active-targets rather than a hard error so the UI stays
      // useful in dev; surface anything else.
      if (queryErr && queryErr.code !== 'PGRST116' && queryErr.code !== 'PGRST205') {
        throw new Error(String(queryErr.message ?? 'nutrition_targets fetch failed'));
      }
      setTargets(data ? rowToTargets(data as Record<string, unknown>) : null);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
      setTargets(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  const regenerate = useCallback(async () => {
    if (!userId) return;
    setError(null);
    try {
      // Prompt 173 Phase 5: the canonical writer is the Next.js API route.
      // Session cookies authenticate the route; no Authorization header is
      // required because Next.js receives the same cookies the supabase
      // browser client uses.
      const response = await fetch('/api/nutrition/generate-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        // 422 estimate_unavailable from the engine: the user's profile is
        // incomplete (missing weight goal, demographics, or activity level).
        // The page surfaces this as "complete your profile" rather than a
        // hard error.
        if (response.status === 422) {
          await fetchActive();
          return;
        }
        throw new Error(`/api/nutrition/generate-targets failed with status ${response.status}`);
      }
      await fetchActive();
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    }
  }, [userId, fetchActive]);

  return { targets, loading, error, regenerate };
}

export default useNutritionTargets;
