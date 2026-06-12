// Prompt 192 Task 3: POST /api/nutrition/insights/cron.
//
// Scheduled generation entry, invoked by the nutrition-insights-daily and
// nutrition-insights-weekly edge function relays. Authorized by Bearer
// CRON_SECRET with a timing safe compare (same pattern as the body goals
// recalibrate cron). Body: { trigger: 'daily' | 'weekly' }.
//
// Eligibility (admin client, paged because PostgREST has no DISTINCT):
//   daily:  users with a scored meal (quality_score not null) logged in
//           the last 24 hours.
//   weekly: users with at least 3 distinct scored days (UTC) in the prior
//           7 days, aggregated JS side from a thin projection.
// Both are capped at 200 users per invocation; row paging is bounded.
//
// Processing: runInsightsForUser per user with concurrency 3 under a 50s
// soft budget. When the budget runs out the remainder is logged and left
// for the next cron tick. Per user failures never abort the batch.

import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';
import {
  CRON_CONCURRENCY,
  CRON_MAX_ROW_PAGES,
  CRON_ROW_PAGE_SIZE,
  CRON_SOFT_BUDGET_MS,
  CRON_USERS_PER_INVOCATION,
  dailyEligibilitySinceIso,
  distinctUserIds,
  pageRange,
  weeklyEligibilitySinceIso,
  weeklyEligibleUserIds,
} from '@/lib/nutrition/insights/cron-eligibility';
import { runInsightsForUser } from '@/lib/nutrition/insights/runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Sized to the 50s soft budget plus response overhead.
export const maxDuration = 60;

const SCOPE = 'cron.nutrition-insights';
const DB_TIMEOUT_MS = 8000;

const BEARER_PREFIX = 'Bearer ';

function isAuthorized(headerValue: string | null): boolean {
  const expected = `${BEARER_PREFIX}${process.env.CRON_SECRET ?? ''}`;
  const actual = headerValue ?? '';
  if (expected.length <= BEARER_PREFIX.length) return false; // secret unset -> reject all
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

interface MealUserRow {
  user_id: string;
  logged_at: string;
}

// Pages thin meals projections until the row pages bound, a short page,
// or enough rows to satisfy the user cap.
async function fetchEligibleUsers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  trigger: 'daily' | 'weekly',
  nowIso: string,
): Promise<string[]> {
  const sinceIso =
    trigger === 'daily' ? dailyEligibilitySinceIso(nowIso) : weeklyEligibilitySinceIso(nowIso);
  const columns = trigger === 'daily' ? 'user_id' : 'user_id, logged_at';

  const rows: MealUserRow[] = [];
  for (let page = 0; page < CRON_MAX_ROW_PAGES; page++) {
    const { from, to } = pageRange(page, CRON_ROW_PAGE_SIZE);
    const { data, error } = await withTimeout(
      Promise.resolve(
        sb
          .from('meals')
          .select(columns)
          .not('quality_score', 'is', null)
          .gte('logged_at', sinceIso)
          .order('user_id', { ascending: true })
          .range(from, to),
      ),
      DB_TIMEOUT_MS,
      `${SCOPE}.eligibility-page`,
    );
    if (error) throw new Error(error.message);
    const pageRows: MealUserRow[] = Array.isArray(data) ? data : [];
    rows.push(...pageRows);
    if (pageRows.length < CRON_ROW_PAGE_SIZE) break;
  }

  return trigger === 'daily'
    ? distinctUserIds(rows, CRON_USERS_PER_INVOCATION)
    : weeklyEligibleUserIds(rows, CRON_USERS_PER_INVOCATION);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const trigger = (body as Record<string, unknown>).trigger;
  if (trigger !== 'daily' && trigger !== 'weekly') {
    return NextResponse.json({ ok: false, error: 'invalid_trigger' }, { status: 400 });
  }

  const startedAt = Date.now();
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = admin as any;

  let users: string[];
  try {
    users = await fetchEligibleUsers(sb, trigger, new Date().toISOString());
  } catch (err) {
    safeLog.error(SCOPE, 'eligibility query failed', { trigger, err });
    return NextResponse.json({ ok: false, error: 'eligibility_failed' }, { status: 500 });
  }

  let processed = 0;
  let failed = 0;
  let index = 0;
  while (index < users.length) {
    if (Date.now() - startedAt > CRON_SOFT_BUDGET_MS) break;
    const group = users.slice(index, index + CRON_CONCURRENCY);
    index += group.length;
    const results = await Promise.all(
      group.map(async (userId) => {
        try {
          return await runInsightsForUser(admin, userId, trigger);
        } catch (err) {
          // The runner returns { error } by contract; this is belt and
          // braces so one user can never abort the batch.
          return { error: err instanceof Error ? err.message : 'unknown' };
        }
      }),
    );
    for (const result of results) {
      if ('error' in result) failed += 1;
      else processed += 1;
    }
  }

  const remaining = users.length - index;
  if (remaining > 0) {
    safeLog.warn(SCOPE, 'soft budget reached, remainder deferred to next tick', {
      trigger,
      remaining,
      durationMs: Date.now() - startedAt,
    });
  }
  safeLog.info(SCOPE, 'batch done', {
    trigger,
    eligible: users.length,
    processed,
    failed,
    remaining,
    durationMs: Date.now() - startedAt,
  });
  return NextResponse.json({ processed, failed });
}
