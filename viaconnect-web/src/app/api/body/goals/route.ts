// Prompt 179 POST /api/body/goals: create or replace the active goal. Delegates
// to createBodyGoal (the shared creation path; Prompt 179a). The Goals tab
// planner (origin goals_tab) requires a computable target and surfaces
// setup_required; the CAQ (origin caq) creates the goal even when the target
// cannot compute yet, so the user_weight_goals projection still runs. Standard
// resilience.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { readGoalProfile } from '@/lib/body-goals/profile';
import { getLatestWeight } from '@/lib/body-goals/goalsData';
import { createBodyGoal } from '@/lib/body-goals/createGoal';
import type { GoalActivityLevel, GoalDriver, GoalOrigin, PacePreset } from '@/lib/body-goals/types';

interface CreateGoalBody {
  driver: GoalDriver;
  goalWeightLb: number;
  startWeightLb?: number;
  targetDate?: string | null;
  targetRateLbPerWeek?: number | null;
  goalBodyfatPct?: number | null;
  activityLevel?: GoalActivityLevel | null;
  origin?: GoalOrigin;
  targetPacePreset?: PacePreset | null;
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

    const origin: GoalOrigin = body.origin ?? 'goals_tab';
    const result = await createBodyGoal(
      {
        userId: user.id,
        driver: body.driver,
        goalWeightLb: Number(body.goalWeightLb),
        startWeightLb,
        startDate: todayISO(),
        targetDate: body.driver === 'date' ? body.targetDate ?? null : null,
        targetRateLbPerWeek: body.driver === 'rate' ? Number(body.targetRateLbPerWeek) : null,
        goalBodyfatPct: body.goalBodyfatPct ?? null,
        sex: profile.sex,
        ageYears: profile.ageYears,
        heightIn: profile.heightIn,
        activityLevel: body.activityLevel ?? profile.activityLevel,
        // Prompt 201f: Arnold computes from the Trajectory Planner inputs. The
        // member's entered Current weight (startWeightLb) drives the energy model,
        // and the Goal body fat percent feeds the lean-mass basis (falling back to
        // a measured value).
        latestWeightLb: startWeightLb,
        currentBodyFatPct: body.goalBodyfatPct ?? latest?.bodyFatPct ?? null,
        dietaryChoice: null,
        origin,
        targetPacePreset: body.targetPacePreset ?? null,
        // Planner requires a computed target; CAQ + backfill do not.
        requireTarget: origin === 'goals_tab',
        closePriorActive: true,
      },
      sb,
    );

    if (!result.ok && result.reason === 'setup_required') {
      return NextResponse.json({ ok: false, error: 'setup_required', missing: result.missing }, { status: 422 });
    }
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.reason, message: result.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      goalId: result.goalId,
      target: result.target,
      projectedDate: result.projectedDate,
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
