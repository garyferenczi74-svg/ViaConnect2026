'use client';

/**
 * src/hooks/journey/useTodayMealLogs.ts
 *
 * Prompt 208j Task J-T3. Reads today's meal_logs for the nutrition donut in
 * YourJourneyCoaching. Separate from the existing nutrition_logs read already
 * in YourJourneyCoaching.tsx (which reads confirmed nutrition_logs).
 *
 * Schema: meal_logs (migration 20260411000040_prompt_84_meal_logs.sql).
 * Columns: calories, protein_g, carbs_g, fat_g (note: fat_g NOT total_fat_g
 * which belongs to nutrition_logs).
 *
 * Date scoping: meal_logs.meal_date = localDateString(detectTimezone()),
 * same format used by useDailyScores and other meal_logs readers.
 *
 * Resilience: withTimeout(4000) + try/catch fail-open (zeros on error) + safeLog.
 * Auth scoped: filter by user_id = userId via RLS.
 *
 * Rules: no em-dashes, no emojis, no `any`.
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { detectTimezone, localDateString } from '@/lib/timezone';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Row type (avoids `any`)
// ---------------------------------------------------------------------------

interface MealLogRow {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface TodayMealLogsResult {
  carbsG: number;
  proteinG: number;
  fatG: number;
  calories: number;
  rowCount: number;
  loading: boolean;
}

const ZERO: TodayMealLogsResult = {
  carbsG: 0,
  proteinG: 0,
  fatG: 0,
  calories: 0,
  rowCount: 0,
  loading: true,
};

// ---------------------------------------------------------------------------
// Pure aggregation helper (exported for TDD)
// ---------------------------------------------------------------------------

/**
 * Sums calories, protein_g, carbs_g, and fat_g over an array of MealLogRow
 * objects. Pure and never throws: null, non-numeric, or missing fields are
 * treated as 0. An empty array returns all-zero totals.
 */
export function aggregateMealRows(
  rows: MealLogRow[],
): { calories: number; protein_g: number; carbs_g: number; fat_g: number } {
  const toNum = (v: number | null | undefined): number => {
    if (typeof v === 'number' && isFinite(v)) return v;
    if (typeof v === 'string') { const p = Number(v); if (isFinite(p)) return p; }
    return 0;
  };
  type Totals = { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  return rows.reduce<Totals>(
    (acc, r) => ({
      calories: acc.calories + toNum(r.calories),
      protein_g: acc.protein_g + toNum(r.protein_g),
      carbs_g: acc.carbs_g + toNum(r.carbs_g),
      fat_g: acc.fat_g + toNum(r.fat_g),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

// ---------------------------------------------------------------------------
// useTodayMealLogs
// ---------------------------------------------------------------------------

/**
 * Aggregates today's meal_logs macros and calories.
 *
 * Fail-open: any error resolves with all-zero values and loading: false.
 *
 * @param userId The authenticated user id, or null before auth resolves.
 */
export function useTodayMealLogs(userId: string | null): TodayMealLogsResult {
  const [result, setResult] = useState<TodayMealLogsResult>(ZERO);

  useEffect(() => {
    if (!userId) {
      setResult({ carbsG: 0, proteinG: 0, fatG: 0, calories: 0, rowCount: 0, loading: false });
      return;
    }

    let active = true;

    (async () => {
      try {
        const today = localDateString(detectTimezone());
        const supabase = createClient();
        type MlResult = { data: MealLogRow[] | null; error: unknown };
        const { data } = await withTimeout(
          supabase
            .from('meal_logs')
            .select('calories, protein_g, carbs_g, fat_g')
            .eq('user_id', userId)
            .eq('meal_date', today) as unknown as Promise<MlResult>,
          4000,
          'useTodayMealLogs.meal_logs',
        );
        if (!active) return;
        const rows: MealLogRow[] = Array.isArray(data) ? data : [];
        const totals = aggregateMealRows(rows);
        setResult({
          carbsG: totals.carbs_g,
          proteinG: totals.protein_g,
          fatG: totals.fat_g,
          calories: totals.calories,
          rowCount: rows.length,
          loading: false,
        });
      } catch (err) {
        if (!active) return;
        safeLog.warn('useTodayMealLogs', 'meal_logs read failed, failing open', { error: err });
        setResult({ carbsG: 0, proteinG: 0, fatG: 0, calories: 0, rowCount: 0, loading: false });
      }
    })();

    return () => { active = false; };
  }, [userId]);

  return result;
}
