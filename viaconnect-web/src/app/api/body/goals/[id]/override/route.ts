// Prompt 179 POST /api/body/goals/:id/override (DD-1): the member pins today's
// calories manually. Recompute the macro split for the pinned calories via the
// shared deriveMacroSplit and append a manual_override target effective today.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { lbsToKg } from '@/lib/weight-goals/guardrails';
import { resolveLeanBodyMass } from '@/lib/gordon/lbm';
import { deriveMacroSplit } from '@/lib/gordon/macroSplit';
import { personalizeHydrationTarget } from '@/lib/nutrition/hydration/target-personalizer';
import { getGoalById, getLatestWeight, insertGoalTarget } from '@/lib/body-goals/goalsData';
import { goalToHydrationActivity } from '@/lib/body-goals/activity';
import type { GoalDirection } from '@/lib/weight-goals/accessor';

export const dynamic = 'force-dynamic';

const IN_TO_CM = 2.54;
const MAINTAIN_BAND_LB = 2.2;

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const sb = await createClient();
    const { data: { user } } = await withTimeout(sb.auth.getUser(), 5000, 'api.body.goals.override.auth');
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const body = (await request.json().catch(() => null)) as { calorieTargetKcal?: number } | null;
    const pinned = Number(body?.calorieTargetKcal);
    if (!(pinned > 0)) return NextResponse.json({ ok: false, error: 'invalid_calories' }, { status: 400 });

    const goal = await getGoalById(params.id, sb);
    if (!goal || goal.user_id !== user.id) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

    const latest = await getLatestWeight(user.id, sb);
    const weightKg = lbsToKg(latest?.weightLb ?? goal.start_weight_lb);
    const heightCm = (goal.height_in ?? 0) * IN_TO_CM;
    const lbm = resolveLeanBodyMass({
      weightKg,
      heightCm,
      biologicalSex: goal.sex ?? 'unspecified',
      bodyFatFraction: latest?.bodyFatPct ? latest.bodyFatPct / 100 : null,
    });
    const deltaLb = goal.start_weight_lb - goal.goal_weight_lb;
    const direction: GoalDirection =
      Math.abs(deltaLb) <= MAINTAIN_BAND_LB ? 'maintain' : deltaLb > 0 ? 'lose' : 'gain';
    const split = deriveMacroSplit({
      calorieTargetKcal: Math.round(pinned),
      direction,
      lbmKg: lbm ? lbm.lbmKg : weightKg * 0.75,
      currentWeightKg: weightKg,
      dietaryChoice: 'balanced',
    });
    const today = new Date().toISOString().slice(0, 10);

    const target = await insertGoalTarget(
      {
        goal_id: params.id,
        user_id: user.id,
        effective_date: today,
        source: 'manual_override',
        estimated_tdee_kcal: null,
        calorie_target_kcal: Math.round(pinned),
        protein_g: Math.round(split.proteinG),
        fat_g: Math.round(split.fatG),
        carb_g: Math.round(split.carbG),
        fiber_g: split.fiberG,
        added_sugar_limit_g: Math.round((0.1 * pinned) / 4),
        hydration_ml: personalizeHydrationTarget({
          body_weight_kg: weightKg,
          custom_target_ml_per_day: null,
          activity_level: goalToHydrationActivity(goal.activity_level),
        }),
        rationale: { manualOverride: true, pinnedCalories: Math.round(pinned), direction },
      },
      sb,
    );

    return NextResponse.json({ ok: true, target });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.body.goals.override', 'timeout', { error: err });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.body.goals.override', 'unexpected error', { error: err });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
