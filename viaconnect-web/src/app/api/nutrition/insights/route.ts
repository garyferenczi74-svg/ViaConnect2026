// Prompt 192 Task 3: GET /api/nutrition/insights.
//
// Session authed read of the caller's generated insights, newest first.
// Hard rules:
//   * Only compliance_passed = true rows are ever returned (defense in
//     depth on top of the engine's lint gate).
//   * Lazy expiry: active rows past expires_at are filtered out in the
//     query (gt on expires_at); the runner's sweep owns the status flip.
//   * FAIL OPEN: a read failure returns 200 with insights: [] and
//     degraded: true so the nutrition hub card renders its fallback
//     instead of an error state. An insights outage must never break
//     anything else.
//
// Paging: offset based (offset param, cursor accepted as an alias), one
// extra row is requested to compute nextOffset without a count query.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';
import {
  HORIZON_VALUES,
  INSIGHT_TYPE_VALUES,
  STATUS_VALUES,
  clampLimitParam,
  oneOf,
  parseOffsetParam,
} from '@/lib/nutrition/insights/route-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCOPE = 'api.nutrition.insights.get';
const DB_TIMEOUT_MS = 5000;

const SELECT_COLUMNS =
  'id, insight_type, horizon, title, body, severity, confidence, data_snapshot, product_suggestion, status, generated_at, expires_at';

export async function GET(request: NextRequest): Promise<NextResponse> {
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

  const params = request.nextUrl.searchParams;
  const horizon = oneOf(params.get('horizon'), HORIZON_VALUES);
  const type = oneOf(params.get('type'), INSIGHT_TYPE_VALUES);
  const status = oneOf(params.get('status'), STATUS_VALUES) ?? 'active';
  const limit = clampLimitParam(params.get('limit'));
  const offset = parseOffsetParam(params.get('offset') ?? params.get('cursor'));

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('nutrition_insights')
      .select(SELECT_COLUMNS)
      .eq('user_id', userId)
      .eq('compliance_passed', true)
      .eq('status', status)
      .order('generated_at', { ascending: false })
      .range(offset, offset + limit); // limit + 1 rows to detect a next page
    if (status === 'active') {
      query = query.gt('expires_at', new Date().toISOString());
    }
    if (horizon) query = query.eq('horizon', horizon);
    if (type) query = query.eq('insight_type', type);

    const { data, error } = await withTimeout(
      Promise.resolve(query),
      DB_TIMEOUT_MS,
      `${SCOPE}.list`,
    );
    if (error) throw new Error(error.message);

    const rows: unknown[] = Array.isArray(data) ? data : [];
    const hasMore = rows.length > limit;
    const insights = hasMore ? rows.slice(0, limit) : rows;
    safeLog.info(SCOPE, 'insights listed', {
      userId,
      durationMs: Date.now() - startedAt,
      count: insights.length,
      status,
    });
    return NextResponse.json({ insights, nextOffset: hasMore ? offset + limit : null });
  } catch (err) {
    // Fail open: degraded read, never an error surface.
    safeLog.warn(SCOPE, 'list failed, returning degraded empty payload', {
      userId,
      durationMs: Date.now() - startedAt,
      err,
    });
    return NextResponse.json({ insights: [], nextOffset: null, degraded: true });
  }
}
