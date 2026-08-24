// Prompt 179 PATCH /api/body/goals/:id: edit goal fields, recompute the target
// effective today, and re-project the goal weight into user_weight_goals.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { buildGoalTarget } from '@/lib/body-goals/buildGoalTarget';
import { getGoalById, getLatestWeight, insertGoalTarget } from '@/lib/body-goals/goalsData';
import { projectGoalToWeightGoals } from '@/lib/body-goals/projectWeightGoal';
import type { GoalActivityLevel, GoalDriver } from '@/lib/body-goals/types';

export const dynamic = 'force-dynamic';

interface PatchBody {
  driver?: GoalDriver;
  goalWeightLb?: number;
  // Prompt 201f: the Trajectory Planner's Current weight drives the computation.
  startWeightLb?: number;
  targetDate?: string | null;
  targetRateLbPerWeek?: number | null;
  goalBodyfatPct?: number | null;
  activityLevel?: GoalActivityLevel | null;
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const sb = await createClient();
    const { data: { user } } = await withTimeout(sb.auth.getUser(), 5000, 'api.body.goals.edit.auth');
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const goal = await getGoalById(params.id, sb);
    if (!goal || goal.user_id !== user.id) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

    const body = (await request.json().catch(() => null)) as PatchBody | null;
    if (!body) return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });

    const driver = body.driver ?? goal.driver;
    const goalWeightLb = Number(body.goalWeightLb) > 0 ? Number(body.goalWeightLb) : goal.goal_weight_lb;
    const targetDate = driver === 'date' ? body.targetDate ?? goal.target_date : null;
    const targetRate =
      driver === 'rate'
        ? body.targetRateLbPerWeek != null
          ? Number(body.targetRateLbPerWeek)
          : goal.target_rate_lb_per_week
        : null;
    const activity = body.activityLevel ?? goal.activity_level;
    const goalBodyfat = body.goalBodyfatPct !== undefined ? body.goalBodyfatPct : goal.goal_bodyfat_pct;

    if (driver === 'date' && !targetDate) {
      return NextResponse.json({ ok: false, error: 'missing_target_date' }, { status: 400 });
    }

    const latest = await getLatestWeight(user.id, sb);
    const today = new Date().toISOString().slice(0, 10);

    // Prompt 201f: Arnold computes from the Trajectory Planner inputs. The
    // member's entered Current weight drives the energy model when provided
    // (falling back to the latest log, then the goal anchor), and the Goal body
    // fat percent feeds the lean-mass basis (falling back to a measured value).
    const currentWeightLb =
      Number(body.startWeightLb) > 0 ? Number(body.startWeightLb) : latest?.weightLb ?? goal.start_weight_lb;

    const built = buildGoalTarget({
      driver,
      targetRateLbPerWeek: targetRate,
      targetDate,
      startWeightLb: goal.start_weight_lb,
      goalWeightLb,
      startDate: goal.start_date,
      latestWeightLb: currentWeightLb,
      // Measured current body fat wins for the present-state lean-mass basis; the
      // planner Goal body fat only fills the gap when no measured value exists
      // (Gordon: goal body fat must never inflate present-state BMR).
      bodyFatPct: latest?.bodyFatPct ?? goalBodyfat ?? null,
      heightIn: goal.height_in,
      age: goal.age_years,
      sex: goal.sex,
      activityLevel: activity,
      dietaryChoice: null,
      effectiveDate: today,
      source: 'initial_plan',
      tdeeOverride: null,
      priorTdee: null,
    });
    if (!built.ok) {
      return NextResponse.json({ ok: false, error: 'setup_required', missing: built.missing }, { status: 422 });
    }

    const { error: updErr } = await withTimeout<{ error: { message: string } | null }>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sb as any).from('body_goals').update({
        driver,
        goal_weight_lb: goalWeightLb,
        target_date: targetDate,
        target_rate_lb_per_week: targetRate,
        goal_bodyfat_pct: goalBodyfat,
        activity_level: activity,
      }).eq('id', params.id).eq('user_id', user.id),
      8000,
      'api.body.goals.edit.update',
    );
    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });

    const target = await insertGoalTarget(
      {
        goal_id: params.id,
        user_id: user.id,
        effective_date: today,
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
      sb,
    );

    await projectGoalToWeightGoals({ userId: user.id, goalWeightLb, startWeightLb: goal.start_weight_lb }, sb);

    return NextResponse.json({ ok: true, target, projectedDate: built.target.projectedDate });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.body.goals.edit', 'timeout', { error: err });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.body.goals.edit', 'unexpected error', { error: err });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
