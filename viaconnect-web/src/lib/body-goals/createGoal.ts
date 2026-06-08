// Prompt 179a: the one body_goals creation path, shared by the POST route, the
// CAQ submit (origin caq), and the lazy backfill (origin caq_backfill). Builds
// the initial target, optionally closes the prior active goal, inserts the
// goal + target, and projects through to user_weight_goals with self-heal.
//
// requireTarget=true (the Goals tab planner) surfaces setup_required and does
// NOT create a goal when the target cannot compute. requireTarget=false (CAQ +
// backfill) always creates the goal and projects goal weight, so the macro
// engine's user_weight_goals read is never left unwritten; the target is
// attempted best-effort and filled in later if it cannot compute yet.

import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/utils/with-timeout';
import { buildGoalTarget } from './buildGoalTarget';
import { insertGoalTarget } from './goalsData';
import { projectAndMarkSync } from './projectWeightGoal';
import type { BiologicalSex } from '@/lib/gordon/generateMacroTargets';
import type { DietaryChoice } from '@/lib/gordon/macro-config';
import type { BodyGoalTargetRow, GoalActivityLevel, GoalDriver, GoalOrigin, PacePreset } from './types';

export interface CreateBodyGoalParams {
  userId: string;
  driver: GoalDriver;
  goalWeightLb: number;
  startWeightLb: number;
  startDate: string;
  targetDate: string | null;
  targetRateLbPerWeek: number | null;
  goalBodyfatPct: number | null;
  sex: BiologicalSex | null;
  ageYears: number | null;
  heightIn: number | null;
  activityLevel: GoalActivityLevel | null;
  latestWeightLb: number;
  currentBodyFatPct: number | null;
  dietaryChoice: DietaryChoice | null;
  origin: GoalOrigin;
  targetPacePreset: PacePreset | null;
  requireTarget: boolean;
  closePriorActive: boolean;
}

export type CreateBodyGoalResult =
  | { ok: false; reason: 'setup_required'; missing: string[] }
  | { ok: false; reason: 'conflict' | 'insert_failed'; message: string }
  | { ok: true; goalId: string; target: BodyGoalTargetRow | null; projectedDate: string | null };

export async function createBodyGoal(
  params: CreateBodyGoalParams,
  supabase: SupabaseClient,
): Promise<CreateBodyGoalResult> {
  const built = buildGoalTarget({
    driver: params.driver,
    targetRateLbPerWeek: params.targetRateLbPerWeek,
    targetDate: params.targetDate,
    startWeightLb: params.startWeightLb,
    goalWeightLb: params.goalWeightLb,
    startDate: params.startDate,
    latestWeightLb: params.latestWeightLb,
    bodyFatPct: params.currentBodyFatPct,
    heightIn: params.heightIn,
    age: params.ageYears,
    sex: params.sex,
    activityLevel: params.activityLevel,
    dietaryChoice: params.dietaryChoice,
    effectiveDate: params.startDate,
    source: 'initial_plan',
    tdeeOverride: null,
    priorTdee: null,
  });
  if (!built.ok && params.requireTarget) {
    return { ok: false, reason: 'setup_required', missing: built.missing };
  }

  if (params.closePriorActive) {
    await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (supabase as any).from('body_goals').update({ status: 'abandoned' }).eq('user_id', params.userId).eq('status', 'active'))(),
      8000,
      'createBodyGoal.closePrior',
    );
  }

  const { data: goalRow, error: goalErr } = await withTimeout<{
    data: { id: string } | null;
    error: { message: string; code?: string } | null;
  }>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('body_goals').insert({
      user_id: params.userId,
      status: 'active',
      driver: params.driver,
      start_weight_lb: params.startWeightLb,
      goal_weight_lb: params.goalWeightLb,
      goal_bodyfat_pct: params.goalBodyfatPct,
      start_date: params.startDate,
      target_date: params.targetDate,
      target_rate_lb_per_week: params.targetRateLbPerWeek,
      sex: params.sex,
      age_years: params.ageYears,
      height_in: params.heightIn,
      activity_level: params.activityLevel,
      origin: params.origin,
      target_pace_preset: params.targetPacePreset,
    }).select('id').single(),
    8000,
    'createBodyGoal.insert',
  );
  if (goalErr || !goalRow) {
    // 23505 = unique_violation on the one-active-goal index (concurrent create).
    const isConflict = goalErr?.code === '23505';
    return { ok: false, reason: isConflict ? 'conflict' : 'insert_failed', message: goalErr?.message ?? 'insert failed' };
  }

  let target: BodyGoalTargetRow | null = null;
  if (built.ok) {
    target = await insertGoalTarget(
      {
        goal_id: goalRow.id,
        user_id: params.userId,
        effective_date: params.startDate,
        source: 'initial_plan',
        estimated_tdee_kcal: built.target.estimatedTdeeKcal,
        calorie_target_kcal: built.target.calorieTargetKcal,
        protein_g: built.target.proteinG,
        fat_g: built.target.fatG,
        carb_g: built.target.carbG,
        fiber_g: built.target.fiberG,
        added_sugar_limit_g: built.target.addedSugarLimitG,
        hydration_ml: built.target.hydrationMl,
        rationale: built.target.rationale,
      },
      supabase,
    );
  }

  await projectAndMarkSync(
    goalRow.id,
    { userId: params.userId, goalWeightLb: params.goalWeightLb, startWeightLb: params.startWeightLb },
    supabase,
  );

  return { ok: true, goalId: goalRow.id, target, projectedDate: built.ok ? built.target.projectedDate : null };
}
