// Prompt 179 POST /api/body/goals/:id/revert (DD-2): revert to the immediately
// prior target row by appending a copy with source 'revert' effective today.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getPriorTarget, insertGoalTarget } from '@/lib/body-goals/goalsData';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const sb = createClient();
    const { data: { user } } = await withTimeout(sb.auth.getUser(), 5000, 'api.body.goals.revert.auth');
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const prior = await getPriorTarget(params.id, sb);
    if (!prior) return NextResponse.json({ ok: false, reason: 'no_prior_target' });

    const today = new Date().toISOString().slice(0, 10);
    const reverted = await insertGoalTarget(
      {
        goal_id: params.id,
        user_id: user.id,
        effective_date: today,
        source: 'revert',
        estimated_tdee_kcal: prior.estimated_tdee_kcal,
        calorie_target_kcal: prior.calorie_target_kcal,
        protein_g: prior.protein_g,
        fat_g: prior.fat_g,
        carb_g: prior.carb_g,
        fiber_g: prior.fiber_g,
        added_sugar_limit_g: prior.added_sugar_limit_g,
        hydration_ml: prior.hydration_ml,
        rationale: { ...(prior.rationale ?? {}), revertedFromTargetId: prior.id },
      },
      sb,
    );
    return NextResponse.json({ ok: true, target: reverted });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.body.goals.revert', 'timeout', { error: err });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.body.goals.revert', 'unexpected error', { error: err });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
