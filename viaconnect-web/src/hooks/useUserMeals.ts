'use client';

// Prompt #168 Apply B: useUserMeals.
// Reads UNION of `meals` (canonical post-cutover) and `nutrition_logs` (legacy)
// during the 168 to 168a transition window so dashboard surfaces don't lose
// historical entries. Section 5.1 + Path B locked decision at top of plan.
//
// Dedup: if a `meals` row carries a non-null legacy_nutrition_log_id matching a
// nutrition_logs row's id, the meals row wins. Section 4.2 of the plan keeps
// `legacy_nutrition_log_id` on the meals row precisely for this hand-off.
//
// Realtime: subscribes to a single supabase channel filtered by user_id on the
// meals table. INSERT/UPDATE/DELETE all trigger a fetch. Surgical merge is a
// 168a polish; refetch-on-event is the simpler-correct path for Apply B.
// Section 5.2 of the plan flags the "one subscription per session" ideal as a
// context-provider concern that belongs in Apply C / 168a, not here.
//
// Errors are captured into the returned `error` field and never thrown.

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Meal, MealType, MealSource, ScoreBreakdown, QualityTier, QualityTierDb } from '@/lib/gordon/types';

export interface UseUserMealsOptions {
  readonly days?: number;
  readonly includeLegacy?: boolean;
}

export interface UseUserMealsResult {
  readonly meals: Meal[];
  readonly loading: boolean;
  readonly error: Error | null;
}

const DEFAULT_DAYS = 7;
const VALID_MEAL_TYPES: ReadonlyArray<MealType> = ['breakfast', 'lunch', 'dinner', 'snack'];
const TIER_DB_TO_APP: Record<QualityTierDb, QualityTier> = {
  poor: 'Poor',
  fair: 'Fair',
  good: 'Good',
  excellent: 'Excellent',
  perfection: 'Perfection',
};

function safeMealType(value: unknown): MealType {
  if (typeof value !== 'string') return 'snack';
  const normalized = value.toLowerCase();
  if ((VALID_MEAL_TYPES as ReadonlyArray<string>).includes(normalized)) {
    return normalized as MealType;
  }
  if (normalized === 'snacks') return 'snack';
  return 'snack';
}

function tierFromDb(value: unknown): QualityTier | null {
  if (typeof value !== 'string') return null;
  const lower = value.toLowerCase() as QualityTierDb;
  return TIER_DB_TO_APP[lower] ?? null;
}

function numericOrZero(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
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

function nullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value.trim() === '') return null;
  return value;
}

// Maps a canonical `meals` row (snake_case) to the app-level Meal interface.
function mealRowToMeal(row: Record<string, unknown>): Meal {
  return {
    mealId: String(row.meal_id ?? ''),
    userId: String(row.user_id ?? ''),
    loggedAt: String(row.logged_at ?? ''),
    mealType: safeMealType(row.meal_type),
    source: (row.source as MealSource) ?? 'quick_log',
    sourceConfidence: numericOrZero(row.source_confidence),
    proteinG: numericOrZero(row.protein_g),
    carbsG: numericOrZero(row.carbs_g),
    fatTotalG: numericOrZero(row.fat_total_g),
    fatHealthyG: numericOrZero(row.fat_healthy_g),
    fiberG: numericOrZero(row.fiber_g),
    sugarG: numericOrZero(row.sugar_g),
    sodiumMg: numericOrZero(row.sodium_mg),
    caloriesKcal: numericOrZero(row.calories_kcal),
    caloriesAutoCalc: row.calories_auto_calc !== false,
    wholeFoodFlag: typeof row.whole_food_flag === 'boolean' ? row.whole_food_flag : null,
    ingredientsList: row.ingredients_list ?? null,
    mealName: nullableString(row.meal_name),
    notes: nullableString(row.notes),
    rawInput: row.raw_input ?? null,
    legacyNutritionLogId: nullableString(row.legacy_nutrition_log_id),
    qualityScore: nullableNumeric(row.quality_score),
    qualityTier: tierFromDb(row.quality_tier),
    scoreBreakdown: (row.score_breakdown as ScoreBreakdown | null) ?? null,
    scoredAt: nullableString(row.scored_at),
    gordonVersion: nullableString(row.gordon_version),
    createdAt: String(row.created_at ?? row.logged_at ?? ''),
    updatedAt: String(row.updated_at ?? row.logged_at ?? ''),
  };
}

// Maps a legacy `nutrition_logs` row to the app-level Meal interface.
//
// Field map per Apply B spec:
//   id              -> mealId, legacyNutritionLogId
//   user_id         -> userId
//   logged_at       -> loggedAt
//   meal_type       -> mealType (fallback 'snack' if value not in enum)
//   data_source/source -> source ('manual_text'/'analyze-text'/'analyze_text'
//                                 -> 'photo_ai' if photo_url present else 'quick_log';
//                                 'full_manual' otherwise; best effort)
//   confidence      -> sourceConfidence (default 0.5)
//   protein_g/carbs_g/fat_total_g/fiber_g/sugar_g  -> same camelCase
//   good_fat_g ?? healthy_fat_g                    -> fatHealthyG (default 0)
//   sodium_mg                                      -> 0 (legacy table has no sodium; known gap)
//   calories                                       -> caloriesKcal
//   ai_notes                                       -> notes
//   serving_description                            -> mealName
//   raw_input                                      -> rawInput
//   created_at ?? logged_at                        -> createdAt
//   updated_at ?? logged_at                        -> updatedAt
//
// Quality fields (qualityScore/qualityTier/scoreBreakdown/scoredAt/gordonVersion)
// are all null because Gordon never scored legacy rows.
function legacyRowToMeal(row: Record<string, unknown>): Meal {
  const rawSource = (row.data_source ?? row.source) as unknown;
  const sourceStr = typeof rawSource === 'string' ? rawSource.toLowerCase() : '';
  const hasPhoto = typeof row.photo_url === 'string' && (row.photo_url as string).trim() !== '';
  let mappedSource: MealSource;
  if (sourceStr === 'manual_text' || sourceStr === 'analyze-text' || sourceStr === 'analyze_text') {
    mappedSource = hasPhoto ? 'photo_ai' : 'quick_log';
  } else if (sourceStr === 'analyze-photo' || sourceStr === 'analyze_photo' || sourceStr === 'photo_ai') {
    mappedSource = 'photo_ai';
  } else if (sourceStr === 'tracker_api') {
    mappedSource = 'tracker_api';
  } else if (sourceStr === 'wearable_cgm') {
    mappedSource = 'wearable_cgm';
  } else if (sourceStr === 'quick_log') {
    mappedSource = 'quick_log';
  } else {
    mappedSource = 'full_manual';
  }

  const id = String(row.id ?? '');
  const loggedAt = String(row.logged_at ?? '');
  const fallbackHealthy = row.good_fat_g ?? row.healthy_fat_g;

  return {
    mealId: id,
    userId: String(row.user_id ?? ''),
    loggedAt,
    mealType: safeMealType(row.meal_type),
    source: mappedSource,
    sourceConfidence: nullableNumeric(row.confidence) ?? 0.5,
    proteinG: numericOrZero(row.protein_g),
    carbsG: numericOrZero(row.carbs_g),
    fatTotalG: numericOrZero(row.fat_total_g),
    fatHealthyG: numericOrZero(fallbackHealthy),
    fiberG: numericOrZero(row.fiber_g),
    sugarG: numericOrZero(row.sugar_g),
    sodiumMg: 0,
    caloriesKcal: numericOrZero(row.calories),
    caloriesAutoCalc: false,
    wholeFoodFlag: null,
    ingredientsList: null,
    mealName: nullableString(row.serving_description),
    notes: nullableString(row.ai_notes),
    rawInput: row.raw_input ?? null,
    legacyNutritionLogId: id,
    qualityScore: null,
    qualityTier: null,
    scoreBreakdown: null,
    scoredAt: null,
    gordonVersion: null,
    createdAt: String(row.created_at ?? loggedAt),
    updatedAt: String(row.updated_at ?? loggedAt),
  };
}

export function useUserMeals(
  userId: string | null | undefined,
  options?: UseUserMealsOptions,
): UseUserMealsResult {
  const days = options?.days ?? DEFAULT_DAYS;
  const includeLegacy = options?.includeLegacy ?? true;

  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(userId));
  const [error, setError] = useState<Error | null>(null);

  const fetchMeals = useCallback(async () => {
    if (!userId) {
      setMeals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const mealsPromise = supabase
        .from('meals')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', sinceIso)
        .order('logged_at', { ascending: false });

      const legacyPromise = includeLegacy
        ? supabase
            .from('nutrition_logs')
            .select('*')
            .eq('user_id', userId)
            .gte('logged_at', sinceIso)
            .order('logged_at', { ascending: false })
        : Promise.resolve({ data: [], error: null });

      const [mealsRes, legacyRes] = await Promise.all([mealsPromise, legacyPromise]);

      const mealsRows: Record<string, unknown>[] =
        mealsRes && Array.isArray(mealsRes.data) ? mealsRes.data : [];
      const canonical: Meal[] = mealsRows.map(mealRowToMeal);
      const supersededLegacyIds = new Set<string>();
      for (const m of canonical) {
        if (m.legacyNutritionLogId) supersededLegacyIds.add(m.legacyNutritionLogId);
      }

      let legacy: Meal[] = [];
      if (includeLegacy) {
        const legacyRows: Record<string, unknown>[] =
          legacyRes && Array.isArray(legacyRes.data) ? legacyRes.data : [];
        legacy = legacyRows
          .filter((r) => {
            const id = typeof r.id === 'string' ? r.id : null;
            return id !== null && !supersededLegacyIds.has(id);
          })
          .map(legacyRowToMeal);
      }

      // mealsRes.error and legacyRes.error are surfaced if either hit a real
      // failure. Missing-table conditions on the legacy fetch (PGRST205) are
      // common in dev; treat as an empty legacy set rather than a hard error.
      const mealsErr = mealsRes && mealsRes.error ? mealsRes.error : null;
      if (mealsErr && mealsErr.code !== 'PGRST205') {
        throw new Error(String(mealsErr.message ?? 'meals fetch failed'));
      }

      const combined = [...canonical, ...legacy].sort((a, b) => {
        const aT = a.loggedAt ? Date.parse(a.loggedAt) : 0;
        const bT = b.loggedAt ? Date.parse(b.loggedAt) : 0;
        return bT - aT;
      });

      setMeals(combined);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      setLoading(false);
    }
  }, [userId, days, includeLegacy]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  useEffect(() => {
    if (!userId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;
    const channel = supabase
      .channel(`user-meals-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meals',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchMeals();
        },
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // best effort cleanup; supabase-js swallows unsubscribed channels
      }
    };
  }, [userId, fetchMeals]);

  return { meals, loading, error };
}

export default useUserMeals;
