// Prompt 179 GET /api/body/goals/active: the active goal, its latest effective
// target, recalibration history, the EWMA trajectory series, adherence, and the
// live projected completion date. Returns { goal: null } when none is active.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  getActiveGoal,
  getLatestTarget,
  getLatestWeight,
  getRecalibrations,
  getWeightSeries,
  getLoggedKcalWindow,
} from '@/lib/body-goals/goalsData';
import { ewmaSeries } from '@/lib/body-goals/ewma';

const DAY_MS = 86_400_000;
function addDaysISO(from: string, days: number): string {
  return new Date(new Date(`${from}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const sb = createClient();
    const { data: { user } } = await withTimeout(sb.auth.getUser(), 5000, 'api.body.goals.active.auth');
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const goal = await getActiveGoal(user.id, sb);
    if (!goal) {
      const latest = await getLatestWeight(user.id, sb);
      return NextResponse.json({ ok: true, goal: null, latestWeightLb: latest?.weightLb ?? null });
    }

    const today = new Date().toISOString().slice(0, 10);
    const chartStart = addDaysISO(today, -90);
    const windowStart = addDaysISO(today, -13);
    const [latestTarget, recalibrations, weightPoints, loggedWindow] = await Promise.all([
      getLatestTarget(goal.id, sb),
      getRecalibrations(goal.id, sb),
      getWeightSeries(user.id, chartStart, sb),
      getLoggedKcalWindow(user.id, windowStart, today, sb),
    ]);

    const smoothed = ewmaSeries(weightPoints);
    const latestSmoothedLb = smoothed.length ? smoothed[smoothed.length - 1].smoothedLb : goal.start_weight_lb;
    const rationale = (latestTarget?.rationale ?? {}) as Record<string, unknown>;
    const projectedDate = typeof rationale.projectedDate === 'string' ? rationale.projectedDate : null;
    const adherencePct = Math.round((loggedWindow.daysLogged / 14) * 100);

    return NextResponse.json({
      ok: true,
      goal,
      latestTarget,
      recalibrations,
      trajectory: {
        actual: smoothed.map((s) => ({ date: s.date, smoothedLb: s.smoothedLb, rawLb: s.rawLb })),
        startWeightLb: goal.start_weight_lb,
        startDate: goal.start_date,
        goalWeightLb: goal.goal_weight_lb,
        latestSmoothedLb,
        projectedDate,
      },
      adherence: {
        daysLogged: loggedWindow.daysLogged,
        avgKcal: loggedWindow.avgKcal,
        windowDays: 14,
        adherencePct,
        latestWeightLb: latestSmoothedLb,
      },
      projectedDate,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.body.goals.active', 'timeout', { error: err });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.body.goals.active', 'unexpected error', { error: err });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
