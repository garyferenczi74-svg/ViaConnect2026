// Prompt 179 DD-1: resolve the day's calorie + macro target with clean
// precedence (same-day manual override, then the latest effective goal target,
// then the CAQ static nutrition_targets row as the fail-open fallback). The
// picker is pure (unit-tested); the fetcher fails open to the CAQ static target
// if anything in the goal layer throws, so the daily score is never blocked.

import type { SupabaseClient } from '@supabase/supabase-js';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';
import type { NutritionTargets } from './types';
import type { BodyGoalTargetRow } from '@/lib/body-goals/types';

export type ResolvedSource = 'manual_override' | 'goal_target' | 'caq_static';

export interface ResolvedDailyTarget {
  dailyKcal: number;
  dailyProteinG: number;
  dailyCarbsG: number;
  dailyFatTotalG: number;
  dailyFiberG: number;
  addedSugarLimitG: number | null;
  hydrationMl: number | null;
  source: ResolvedSource;
  goalId: string | null;
}

export function goalTargetRowToResolved(
  row: BodyGoalTargetRow,
  source: ResolvedSource,
): ResolvedDailyTarget {
  return {
    dailyKcal: row.calorie_target_kcal,
    dailyProteinG: row.protein_g,
    dailyCarbsG: row.carb_g,
    dailyFatTotalG: row.fat_g,
    dailyFiberG: row.fiber_g,
    addedSugarLimitG: row.added_sugar_limit_g,
    hydrationMl: row.hydration_ml,
    source,
    goalId: row.goal_id,
  };
}

export function caqTargetsToResolved(nt: NutritionTargets): ResolvedDailyTarget {
  return {
    dailyKcal: nt.dailyKcal,
    dailyProteinG: nt.dailyProteinG,
    dailyCarbsG: nt.dailyCarbsG,
    dailyFatTotalG: nt.dailyFatTotalG,
    dailyFiberG: nt.dailyFiberG,
    addedSugarLimitG: null,
    hydrationMl: null,
    source: 'caq_static',
    goalId: null,
  };
}

export function pickResolvedTarget(c: {
  override: ResolvedDailyTarget | null;
  goalTarget: ResolvedDailyTarget | null;
  caqStatic: ResolvedDailyTarget | null;
}): ResolvedDailyTarget | null {
  return c.override ?? c.goalTarget ?? c.caqStatic ?? null;
}

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rawCaqRowToResolved(row: Record<string, unknown>): ResolvedDailyTarget {
  return {
    dailyKcal: num(row.daily_kcal),
    dailyProteinG: num(row.daily_protein_g),
    dailyCarbsG: num(row.daily_carbs_g),
    dailyFatTotalG: num(row.daily_fat_total_g),
    dailyFiberG: num(row.daily_fiber_g),
    addedSugarLimitG: null,
    hydrationMl: null,
    source: 'caq_static',
    goalId: null,
  };
}

/**
 * Fetch only the GOAL overlay (manual override, else latest effective goal
 * target) for a user on a date. Returns null when there is no active goal or no
 * applicable target. Fails open to null so callers keep their CAQ static target.
 */
export async function fetchGoalOverlay(
  userId: string,
  localDateISO: string,
  supabase: SupabaseClient,
): Promise<ResolvedDailyTarget | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: goal } = await withTimeout<{ data: { id: string } | null }>(
      sb.from('body_goals').select('id').eq('user_id', userId).eq('status', 'active').maybeSingle(),
      8000,
      'goalOverlay.activeGoal',
    );
    if (!goal) return null;

    const { data: overrideRow } = await withTimeout<{ data: BodyGoalTargetRow | null }>(
      sb
        .from('body_goal_targets')
        .select('*')
        .eq('goal_id', goal.id)
        .eq('source', 'manual_override')
        .eq('effective_date', localDateISO)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      8000,
      'goalOverlay.override',
    );
    if (overrideRow) return goalTargetRowToResolved(overrideRow as BodyGoalTargetRow, 'manual_override');

    const { data: latestRow } = await withTimeout<{ data: BodyGoalTargetRow | null }>(
      sb
        .from('body_goal_targets')
        .select('*')
        .eq('goal_id', goal.id)
        .lte('effective_date', localDateISO)
        .order('effective_date', { ascending: false })
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      8000,
      'goalOverlay.latest',
    );
    return latestRow ? goalTargetRowToResolved(latestRow as BodyGoalTargetRow, 'goal_target') : null;
  } catch (err) {
    safeLog.warn('goalOverlay', 'goal layer failed', { err, userId });
    return null;
  }
}

/**
 * Resolve the full precedence target for a user on a date: the goal overlay
 * (override, then goal target) when present, otherwise the CAQ static target.
 * Always fails open; never throws.
 */
export async function fetchResolvedDailyTarget(
  userId: string,
  localDateISO: string,
  supabase: SupabaseClient,
): Promise<ResolvedDailyTarget | null> {
  // CAQ static first; it is the fail-open fallback for everything below.
  let caqStatic: ResolvedDailyTarget | null = null;
  try {
    const { data } = await withTimeout<{ data: Record<string, unknown> | null }>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('nutrition_targets')
        .select('*')
        .eq('user_id', userId)
        .is('superseded_at', null)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle(),
      8000,
      'resolveDailyTarget.caq',
    );
    if (data) caqStatic = rawCaqRowToResolved(data as Record<string, unknown>);
  } catch (err) {
    safeLog.warn('resolveDailyTarget', 'caq fetch failed', { err, userId });
  }

  const overlay = await fetchGoalOverlay(userId, localDateISO, supabase);
  return pickResolvedTarget({
    override: overlay?.source === 'manual_override' ? overlay : null,
    goalTarget: overlay?.source === 'goal_target' ? overlay : null,
    caqStatic,
  });
}
