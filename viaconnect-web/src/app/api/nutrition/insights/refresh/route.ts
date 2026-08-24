// Prompt 192 Task 3: POST /api/nutrition/insights/refresh.
//
// Manual regeneration, rate limited to one manual run per user per 10
// minutes via the nutrition_insight_runs ledger. Over the limit returns a
// 429 envelope { error: 'rate_limited', retryAfterSeconds } computed from
// the newest manual run.
//
// The runner is AWAITED on purpose: serverless kills background work
// after the response is sent, so fire and forget would silently drop the
// run. Every step inside the runner is timeout bounded. The response
// keeps the spec's 202 + runId accepted-run semantics, and because the
// work already finished by then the body also carries status 'done' and
// the inserted count. Runner errors map to a 502 envelope.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';
import {
  MANUAL_REFRESH_WINDOW_MS,
  manualRefreshGate,
} from '@/lib/nutrition/insights/route-helpers';
import { runInsightsForUser } from '@/lib/nutrition/insights/runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// The awaited runner can take tens of seconds when the model composer is
// slow; keep headroom above the per call timeouts.
export const maxDuration = 60;

const SCOPE = 'api.nutrition.insights.refresh';
const DB_TIMEOUT_MS = 5000;

export async function POST(): Promise<NextResponse> {
  const startedAt = Date.now();
  const supabase = await createClient();

  let userId: string | null = null;
  try {
    const { data } = await withTimeout(supabase.auth.getUser(), DB_TIMEOUT_MS, `${SCOPE}.auth`);
    userId = data.user?.id ?? null;
  } catch (err) {
    safeLog.warn(SCOPE, 'auth check failed', { durationMs: Date.now() - startedAt, err });
  }
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Rate limit window check via the user scoped client (RLS owner select
  // on nutrition_insight_runs). Fail open on the limiter itself: a broken
  // check must not block the refresh button; the runner's own failure
  // handling still applies. Two truly concurrent requests can both pass
  // this check; the window math still bounds steady state frequency.
  let newestManualStartedAt: string | null = null;
  try {
    const since = new Date(Date.now() - MANUAL_REFRESH_WINDOW_MS).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await withTimeout(
      Promise.resolve(
        (supabase as any)
          .from('nutrition_insight_runs')
          .select('started_at')
          .eq('user_id', userId)
          .eq('trigger', 'manual')
          .gte('started_at', since)
          .order('started_at', { ascending: false })
          .limit(1),
      ),
      DB_TIMEOUT_MS,
      `${SCOPE}.rate-limit-check`,
    );
    if (error) throw new Error(error.message);
    newestManualStartedAt =
      Array.isArray(data) && data[0]?.started_at ? String(data[0].started_at) : null;
  } catch (err) {
    safeLog.warn(SCOPE, 'rate limit check failed, allowing run', { userId, err });
  }

  const gate = manualRefreshGate(newestManualStartedAt, new Date().toISOString());
  if (gate.limited) {
    safeLog.info(SCOPE, 'manual refresh rate limited', {
      userId,
      retryAfterSeconds: gate.retryAfterSeconds,
    });
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: gate.retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterSeconds) } },
    );
  }

  try {
    const admin = createAdminClient();
    const result = await runInsightsForUser(admin, userId, 'manual');
    if ('error' in result) {
      safeLog.error(SCOPE, 'manual run failed', {
        userId,
        durationMs: Date.now() - startedAt,
        error: result.error,
      });
      return NextResponse.json({ error: 'run_failed', detail: result.error }, { status: 502 });
    }
    safeLog.info(SCOPE, 'manual run finished', {
      userId,
      durationMs: Date.now() - startedAt,
      runId: result.runId,
      inserted: result.inserted,
    });
    return NextResponse.json(
      { runId: result.runId, status: 'done', inserted: result.inserted },
      { status: 202 },
    );
  } catch (err) {
    safeLog.error(SCOPE, 'manual run threw', {
      userId,
      durationMs: Date.now() - startedAt,
      err,
    });
    return NextResponse.json({ error: 'run_failed' }, { status: 502 });
  }
}
