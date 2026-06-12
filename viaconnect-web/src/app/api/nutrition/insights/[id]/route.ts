// Prompt 192 Task 3: PATCH /api/nutrition/insights/[id].
//
// Whitelisted to exactly two fields (parseInsightPatchBody rejects
// anything else):
//   * status: 'read' | 'dismissed' | 'saved' | 'active' ('active' exists
//     solely to support dismiss-undo; 'expired' is runner owned).
//   * feedback: { helpful: boolean }, inserted into
//     nutrition_insight_feedback.
//
// Both writes go through the USER scoped client so RLS enforces
// ownership: the status update matches zero rows for someone else's id
// (404), and feedback inserts only after ownership is proven, either by
// the status update having matched a row or by an owner scoped select.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';
import { parseInsightPatchBody } from '@/lib/nutrition/insights/route-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SCOPE = 'api.nutrition.insights.patch';
const DB_TIMEOUT_MS = 5000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: { id: string };
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const startedAt = Date.now();
  const supabase = createClient();

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

  const insightId = context.params.id;
  // A malformed id can never match a row; 404 without leaking validity.
  if (!UUID_RE.test(insightId)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const parsed = parseInsightPatchBody(rawBody);
  if (!parsed.ok) {
    return NextResponse.json({ error: 'invalid_body', reason: parsed.reason }, { status: 400 });
  }
  const { status, feedback } = parsed.patch;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  let ownershipProven = false;

  try {
    if (status !== undefined) {
      const { data, error } = await withTimeout(
        Promise.resolve(
          sb
            .from('nutrition_insights')
            .update({ status })
            .eq('id', insightId)
            .eq('user_id', userId)
            .select('id, status'),
        ),
        DB_TIMEOUT_MS,
        `${SCOPE}.status-update`,
      );
      if (error) throw new Error(error.message);
      if (!Array.isArray(data) || data.length === 0) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
      ownershipProven = true;
    }

    if (feedback !== undefined) {
      if (!ownershipProven) {
        // Feedback only patch: prove ownership through the RLS scoped
        // select before inserting (the feedback table's own policy checks
        // user_id, not insight ownership).
        const { data, error } = await withTimeout(
          Promise.resolve(
            sb
              .from('nutrition_insights')
              .select('id')
              .eq('id', insightId)
              .eq('user_id', userId)
              .maybeSingle(),
          ),
          DB_TIMEOUT_MS,
          `${SCOPE}.ownership-check`,
        );
        if (error) throw new Error(error.message);
        if (!data) {
          return NextResponse.json({ error: 'not_found' }, { status: 404 });
        }
      }

      const { error: feedbackError } = await withTimeout(
        Promise.resolve(
          sb.from('nutrition_insight_feedback').insert({
            insight_id: insightId,
            user_id: userId,
            helpful: feedback.helpful,
          }),
        ),
        DB_TIMEOUT_MS,
        `${SCOPE}.feedback-insert`,
      );
      if (feedbackError) throw new Error(feedbackError.message);
    }
  } catch (err) {
    safeLog.error(SCOPE, 'patch failed', {
      userId,
      insightId,
      durationMs: Date.now() - startedAt,
      err,
    });
    return NextResponse.json({ error: 'update_failed' }, { status: 502 });
  }

  safeLog.info(SCOPE, 'insight patched', {
    userId,
    insightId,
    durationMs: Date.now() - startedAt,
    status: status ?? null,
    feedbackRecorded: feedback !== undefined,
  });
  return NextResponse.json({
    ok: true,
    ...(status !== undefined ? { status } : {}),
    ...(feedback !== undefined ? { feedbackRecorded: true } : {}),
  });
}
