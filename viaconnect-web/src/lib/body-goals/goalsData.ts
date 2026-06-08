// Prompt 179: Supabase access layer for Body Goals. Thin query wrappers plus
// one pure aggregator (aggregateDailyKcal) that is unit-tested. Every call is
// timeout-wrapped; read failures fail soft (empty / null) so the engine can
// fall back rather than throw.

import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type { BodyGoalRow, BodyGoalTargetRow } from './types';
import type { WeightPoint } from './ewma';

/** Pure: sum kcal per calendar day, then average across the days that have any log. */
export function aggregateDailyKcal(
  perDay: Array<{ day: string; kcal: number }>,
): { avgKcal: number; daysLogged: number } {
  const byDay = new Map<string, number>();
  for (const r of perDay) byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.kcal);
  const totals = [...byDay.values()];
  if (totals.length === 0) return { avgKcal: 0, daysLogged: 0 };
  const sum = totals.reduce((s, v) => s + v, 0);
  return { avgKcal: Math.round(sum / totals.length), daysLogged: totals.length };
}

export async function getActiveGoal(
  userId: string,
  supabase: SupabaseClient,
): Promise<BodyGoalRow | null> {
  try {
    const { data } = await withTimeout<{ data: BodyGoalRow | null }>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('body_goals').select('*').eq('user_id', userId).eq('status', 'active').maybeSingle(),
      8000,
      'goalsData.getActiveGoal',
    );
    return data ?? null;
  } catch (err) {
    safeLog.warn('goalsData', 'getActiveGoal failed', { err, userId });
    return null;
  }
}

export async function getGoalById(
  goalId: string,
  supabase: SupabaseClient,
): Promise<BodyGoalRow | null> {
  const { data } = await withTimeout<{ data: BodyGoalRow | null }>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('body_goals').select('*').eq('id', goalId).maybeSingle(),
    8000,
    'goalsData.getGoalById',
  );
  return data ?? null;
}

/** Latest measured weight (lb) + body fat percent from the Arnold weight log. */
export async function getLatestWeight(
  userId: string,
  supabase: SupabaseClient,
): Promise<{ weightLb: number; bodyFatPct: number | null } | null> {
  try {
    const { data } = await withTimeout<{ data: { weight_lbs: number; body_fat_pct: number | null } | null }>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('body_tracker_weight').select('weight_lbs, body_fat_pct').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      8000,
      'goalsData.getLatestWeight',
    );
    if (!data || !(Number(data.weight_lbs) > 0)) return null;
    return { weightLb: Number(data.weight_lbs), bodyFatPct: data.body_fat_pct === null ? null : Number(data.body_fat_pct) };
  } catch (err) {
    safeLog.warn('goalsData', 'getLatestWeight failed', { err, userId });
    return null;
  }
}

/** Date-ordered weight series (ascending) for the EWMA trend + trajectory chart. */
export async function getWeightSeries(
  userId: string,
  sinceISO: string,
  supabase: SupabaseClient,
): Promise<WeightPoint[]> {
  try {
    const { data } = await withTimeout<{ data: Array<{ weight_lbs: number; created_at: string }> | null }>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('body_tracker_weight').select('weight_lbs, created_at').eq('user_id', userId)
        .gte('created_at', `${sinceISO}T00:00:00Z`).not('weight_lbs', 'is', null)
        .order('created_at', { ascending: true }),
      8000,
      'goalsData.getWeightSeries',
    );
    return (data ?? [])
      .filter((r) => Number(r.weight_lbs) > 0)
      .map((r) => ({ date: String(r.created_at).slice(0, 10), weightLb: Number(r.weight_lbs) }));
  } catch (err) {
    safeLog.warn('goalsData', 'getWeightSeries failed', { err, userId });
    return [];
  }
}

/** Unified meals (+ legacy meal_logs, deduped) averaged per logged day in the window. */
export async function getLoggedKcalWindow(
  userId: string,
  startISO: string,
  endISO: string,
  supabase: SupabaseClient,
): Promise<{ avgKcal: number; daysLogged: number }> {
  const perDay: Array<{ day: string; kcal: number }> = [];
  const seenLegacy = new Set<string>();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: meals } = await withTimeout<{ data: Array<Record<string, unknown>> | null }>(
      sb.from('meals').select('calories_kcal, logged_at, legacy_nutrition_log_id').eq('user_id', userId)
        .gte('logged_at', `${startISO}T00:00:00Z`).lte('logged_at', `${endISO}T23:59:59Z`),
      8000,
      'goalsData.meals',
    );
    for (const m of meals ?? []) {
      if (m.legacy_nutrition_log_id) seenLegacy.add(String(m.legacy_nutrition_log_id));
      perDay.push({ day: String(m.logged_at).slice(0, 10), kcal: Number(m.calories_kcal) || 0 });
    }
    const { data: legacy } = await withTimeout<{ data: Array<Record<string, unknown>> | null }>(
      sb.from('meal_logs').select('id, calories, meal_date').eq('user_id', userId)
        .gte('meal_date', startISO).lte('meal_date', endISO),
      8000,
      'goalsData.mealLogs',
    );
    for (const l of legacy ?? []) {
      if (seenLegacy.has(String(l.id))) continue; // already counted via meals.legacy_nutrition_log_id
      perDay.push({ day: String(l.meal_date).slice(0, 10), kcal: Number(l.calories) || 0 });
    }
  } catch (err) {
    safeLog.warn('goalsData', 'getLoggedKcalWindow failed', { err, userId });
  }
  return aggregateDailyKcal(perDay);
}

export async function getLatestTarget(
  goalId: string,
  supabase: SupabaseClient,
): Promise<BodyGoalTargetRow | null> {
  const { data } = await withTimeout<{ data: BodyGoalTargetRow | null }>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('body_goal_targets').select('*').eq('goal_id', goalId)
      .order('effective_date', { ascending: false }).order('computed_at', { ascending: false })
      .limit(1).maybeSingle(),
    8000,
    'goalsData.getLatestTarget',
  );
  return data ?? null;
}

/** The target immediately prior to the newest one (for revert). */
export async function getPriorTarget(
  goalId: string,
  supabase: SupabaseClient,
): Promise<BodyGoalTargetRow | null> {
  const { data } = await withTimeout<{ data: BodyGoalTargetRow[] | null }>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('body_goal_targets').select('*').eq('goal_id', goalId)
      .order('computed_at', { ascending: false }).limit(2),
    8000,
    'goalsData.getPriorTarget',
  );
  const rows = data ?? [];
  return rows.length >= 2 ? rows[1] : null;
}

export async function getRecalibrations(
  goalId: string,
  supabase: SupabaseClient,
  limit = 12,
): Promise<Record<string, unknown>[]> {
  const { data } = await withTimeout<{ data: Record<string, unknown>[] | null }>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('body_goal_recalibrations').select('*').eq('goal_id', goalId)
      .order('created_at', { ascending: false }).limit(limit),
    8000,
    'goalsData.getRecalibrations',
  );
  return data ?? [];
}

export interface InsertTargetRow {
  goal_id: string;
  user_id: string;
  effective_date: string;
  source: BodyGoalTargetRow['source'];
  estimated_tdee_kcal: number | null;
  calorie_target_kcal: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
  fiber_g: number;
  added_sugar_limit_g: number | null;
  hydration_ml: number | null;
  rationale: Record<string, unknown> | null;
}

export async function insertGoalTarget(
  row: InsertTargetRow,
  supabase: SupabaseClient,
): Promise<BodyGoalTargetRow> {
  const { data, error } = await withTimeout<{ data: BodyGoalTargetRow | null; error: { message: string } | null }>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('body_goal_targets').insert(row).select('*').single(),
    8000,
    'goalsData.insertGoalTarget',
  );
  if (error) throw new Error(`insertGoalTarget failed: ${error.message}`);
  return data as BodyGoalTargetRow;
}

export async function insertRecalibration(
  row: Record<string, unknown>,
  supabase: SupabaseClient,
): Promise<void> {
  const { error } = await withTimeout<{ error: { message: string } | null }>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('body_goal_recalibrations').insert(row),
    8000,
    'goalsData.insertRecalibration',
  );
  if (error) throw new Error(`insertRecalibration failed: ${error.message}`);
}
