// Prompt 179 POST /api/body/goals: create or replace the active goal. Closes
// any prior active goal, computes the initial_plan target in memory first
// (no partial write), inserts the goal + target, then projects the goal weight
// into user_weight_goals (179a save path, fail-open). Standard resilience.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { buildGoalTarget } from '@/lib/body-goals/buildGoalTarget';
import { readGoalProfile } from '@/lib/body-goals/profile';
import { getLatestWeight, insertGoalTarget } from '@/lib/body-goals/goalsData';
import { projectGoalToWeightGoals } from '@/lib/body-goals/projectWeightGoal';
import type { GoalActivityLevel, GoalDriver } from '@/lib/body-goals/types';

interface CreateGoalBody {
  driver: GoalDriver;
  goalWeightLb: number;
  startWeightLb?: number;
  targetDate?: string | null;
  targetRateLbPerWeek?: number | null;
  goalBodyfatPct?: number | null;
  activityLevel?: GoalActivityLevel | null;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const sb = createClient();
    const { data: { user } } = await withTimeout(sb.auth.getUser(), 5000, 'api.body.goals.create.auth');
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const body = (await request.json().catch(() => null)) as CreateGoalBody | null;
    if (!body) return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
    if (body.driver !== 'date' && body.driver !== 'rate') {
      return NextResponse.json({ ok: false, error: 'invalid_driver' }, { status: 400 });
    }
    if (!(Number(body.goalWeightLb) > 0)) {
      return NextResponse.json({ ok: false, error: 'invalid_goal_weight' }, { status: 400 });
    }
    if (body.driver === 'date' && !body.targetDate) {
      return NextResponse.json({ ok: false, error: 'missing_target_date' }, { status: 400 });
    }
    if (body.driver === 'rate' && !(Number(body.targetRateLbPerWeek) >= 0)) {
      return NextResponse.json({ ok: false, error: 'missing_target_rate' }, { status: 400 });
    }

    const [profile, latest] = await Promise.all([
      readGoalProfile(user.id, sb),
      getLatestWeight(user.id, sb),
    ]);
    const startWeightLb =
      Number(body.startWeightLb) > 0 ? Number(body.startWeightLb) : latest?.weightLb ?? null;
    if (!startWeightLb) {
      return NextResponse.json({ ok: false, error: 'no_current_weight', missing: ['currentWeight'] }, { status: 422 });
    }

    const start = todayISO();
    const activity = body.activityLevel ?? profile.activityLevel;
    const targetRate = body.driver === 'rate' ? Number(body.targetRateLbPerWeek) : null;
    const targetDate = body.driver === 'date' ? body.targetDate ?? null : null;

    // Build the initial target FIRST; only persist if it succeeds.
    const built = buildGoalTarget({
      driver: body.driver,
      targetRateLbPerWeek: targetRate,
      targetDate,
      startWeightLb,
      goalWeightLb: Number(body.goalWeightLb),
      startDate: start,
      latestWeightLb: latest?.weightLb ?? startWeightLb,
      bodyFatPct: latest?.bodyFatPct ?? null,
      heightIn: profile.heightIn,
      age: profile.ageYears,
      sex: profile.sex,
      activityLevel: activity,
      dietaryChoice: null,
      effectiveDate: start,
      source: 'initial_plan',
      tdeeOverride: null,
      priorTdee: null,
    });
    if (!built.ok) {
      return NextResponse.json({ ok: false, error: 'setup_required', missing: built.missing }, { status: 422 });
    }

    // Close any prior active goal (one-active-per-user index).
    await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (sb as any).from('body_goals').update({ status: 'abandoned' }).eq('user_id', user.id).eq('status', 'active'))(),
      8000,
      'api.body.goals.create.close',
    );

    const { data: goalRow, error: goalErr } = await withTimeout<{ data: { id: string } | null; error: { message: string } | null }>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sb as any).from('body_goals').insert({
        user_id: user.id,
        status: 'active',
        driver: body.driver,
        start_weight_lb: startWeightLb,
        goal_weight_lb: Number(body.goalWeightLb),
        goal_bodyfat_pct: body.goalBodyfatPct ?? null,
        start_date: start,
        target_date: targetDate,
        target_rate_lb_per_week: targetRate,
        sex: profile.sex,
        age_years: profile.ageYears,
        height_in: profile.heightIn,
        activity_level: activity,
      }).select('id').single(),
      8000,
      'api.body.goals.create.insert',
    );
    if (goalErr || !goalRow) {
      return NextResponse.json({ ok: false, error: goalErr?.message ?? 'insert_failed' }, { status: 500 });
    }

    const target = await insertGoalTarget(
      {
        goal_id: goalRow.id,
        user_id: user.id,
        effective_date: start,
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

    // 179a write-through (save path); fail-open, never blocks the goal write.
    await projectGoalToWeightGoals(
      { userId: user.id, goalWeightLb: Number(body.goalWeightLb), startWeightLb },
      sb,
    );

    return NextResponse.json({
      ok: true,
      goalId: goalRow.id,
      target,
      projectedDate: built.target.projectedDate,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.body.goals.create', 'timeout', { error: err });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.body.goals.create', 'unexpected error', { error: err });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
