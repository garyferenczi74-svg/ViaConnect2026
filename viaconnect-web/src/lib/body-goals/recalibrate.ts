// Prompt 179 Section 5.3 + DD-2: weekly adaptive recalibration. computeRecalibration
// is PURE (unit-tested, criterion 3); recalibrateGoal fetches the window stats,
// computes in memory, and only writes the audit + new target row after a clean
// compute (criterion 5: never a partial row).

import type { SupabaseClient } from '@supabase/supabase-js';
import { smoothedWeightChange, type WeightPoint } from './ewma';
import { estimateAdaptiveTdee } from './energy';
import { buildGoalTarget } from './buildGoalTarget';
import {
  getGoalById,
  getLatestWeight,
  getWeightSeries,
  getLoggedKcalWindow,
  getLatestTarget,
  insertGoalTarget,
  insertRecalibration,
} from './goalsData';
import { safeLog } from '@/lib/utils/safe-log';
import type { BodyGoalRow, BuiltGoalTarget } from './types';

const WINDOW_DAYS = 14;
const MIN_DAYS = 10;
const DAY_MS = 86_400_000;

export interface ComputeRecalibrationInput {
  goal: BodyGoalRow;
  today: string;
  windowStart: string;
  windowEnd: string;
  avgKcal: number;
  daysLogged: number;
  weightPoints: WeightPoint[];
  latestWeightLb: number;
  currentBodyFatPct: number | null;
  priorTdee: number | null;
  prevCalorieTarget: number | null;
}

export type ComputeRecalibrationResult =
  | { ok: false; reason: 'insufficient_data' | 'setup_required' }
  | { ok: true; target: BuiltGoalTarget; estimatedTdee: number; weightChangeLb: number; adherencePct: number };

export function computeRecalibration(input: ComputeRecalibrationInput): ComputeRecalibrationResult {
  if (input.daysLogged < MIN_DAYS) return { ok: false, reason: 'insufficient_data' };

  const weightChangeLb = smoothedWeightChange(input.weightPoints, input.windowStart, input.windowEnd) ?? 0;
  const estimatedTdee = estimateAdaptiveTdee({
    avgLoggedKcal: input.avgKcal,
    weightChangeLb,
    windowDays: WINDOW_DAYS,
    priorTdee: input.priorTdee,
  });

  const built = buildGoalTarget({
    driver: input.goal.driver,
    targetRateLbPerWeek: input.goal.target_rate_lb_per_week,
    targetDate: input.goal.target_date,
    startWeightLb: input.goal.start_weight_lb,
    goalWeightLb: input.goal.goal_weight_lb,
    startDate: input.goal.start_date,
    latestWeightLb: input.latestWeightLb,
    bodyFatPct: input.currentBodyFatPct,
    heightIn: input.goal.height_in,
    age: input.goal.age_years,
    sex: input.goal.sex,
    activityLevel: input.goal.activity_level,
    dietaryChoice: null,
    effectiveDate: input.today,
    source: 'weekly_recalibration',
    tdeeOverride: estimatedTdee,
    priorTdee: input.priorTdee,
  });
  if (!built.ok) return { ok: false, reason: 'setup_required' };

  const adherencePct = Math.round((input.daysLogged / WINDOW_DAYS) * 1000) / 10;
  return { ok: true, target: built.target, estimatedTdee, weightChangeLb, adherencePct };
}

function addDaysISO(from: string, days: number): string {
  return new Date(new Date(`${from}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export type RecalibrateResult =
  | { ok: false; reason: 'no_goal' | 'insufficient_data' | 'setup_required' }
  | { ok: true; target: BuiltGoalTarget };

/**
 * Run one recalibration for a goal. `today` is supplied by the caller (the
 * route or cron) so this function never reads the clock directly.
 */
export async function recalibrateGoal(
  goalId: string,
  today: string,
  supabase: SupabaseClient,
): Promise<RecalibrateResult> {
  const goal = await getGoalById(goalId, supabase);
  if (!goal || goal.status !== 'active') return { ok: false, reason: 'no_goal' };

  const windowEnd = today;
  const windowStart = addDaysISO(today, -(WINDOW_DAYS - 1));
  const [{ avgKcal, daysLogged }, weightPoints, latest, priorTarget] = await Promise.all([
    getLoggedKcalWindow(goal.user_id, windowStart, windowEnd, supabase),
    getWeightSeries(goal.user_id, windowStart, supabase),
    getLatestWeight(goal.user_id, supabase),
    getLatestTarget(goalId, supabase),
  ]);

  const rationaleTdee =
    priorTarget?.rationale && typeof (priorTarget.rationale as Record<string, unknown>).tdee === 'number'
      ? ((priorTarget.rationale as Record<string, unknown>).tdee as number)
      : null;
  const priorTdee = rationaleTdee ?? priorTarget?.estimated_tdee_kcal ?? null;

  const computed = computeRecalibration({
    goal,
    today,
    windowStart,
    windowEnd,
    avgKcal,
    daysLogged,
    weightPoints,
    latestWeightLb: latest?.weightLb ?? goal.start_weight_lb,
    currentBodyFatPct: latest?.bodyFatPct ?? null,
    priorTdee,
    prevCalorieTarget: priorTarget?.calorie_target_kcal ?? null,
  });
  if (!computed.ok) return computed;

  try {
    await insertRecalibration(
      {
        goal_id: goalId,
        user_id: goal.user_id,
        window_start: windowStart,
        window_end: windowEnd,
        days_logged: daysLogged,
        avg_logged_kcal: avgKcal,
        weight_change_lb: computed.weightChangeLb,
        estimated_tdee_kcal: computed.estimatedTdee,
        prev_calorie_target: priorTarget?.calorie_target_kcal ?? null,
        new_calorie_target: computed.target.calorieTargetKcal,
        adherence_pct: computed.adherencePct,
      },
      supabase,
    );
    await insertGoalTarget(
      {
        goal_id: goalId,
        user_id: goal.user_id,
        effective_date: today,
        source: 'weekly_recalibration',
        estimated_tdee_kcal: computed.target.estimatedTdeeKcal,
        calorie_target_kcal: computed.target.calorieTargetKcal,
        protein_g: computed.target.proteinG,
        fat_g: computed.target.fatG,
        carb_g: computed.target.carbG,
        fiber_g: computed.target.fiberG,
        added_sugar_limit_g: computed.target.addedSugarLimitG,
        hydration_ml: computed.target.hydrationMl,
        rationale: computed.target.rationale,
      },
      supabase,
    );
  } catch (err) {
    safeLog.error('recalibrateGoal', 'write failed after compute', { err, goalId });
    return { ok: false, reason: 'setup_required' };
  }
  return { ok: true, target: computed.target };
}
