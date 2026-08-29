// Prompt 231: delete a scan session. Tombstones capture_status to
// delete_pending FIRST, then removes the storage objects and, only after
// that succeeds, deletes the session row (frames cascade via the FK). A
// storage removal failure leaves capture_status at delete_pending for a
// retry and returns a "still deleting" result - never a false Deleted.
// Ownership resolved only through .eq('user_id', user.id); never a
// client-supplied path.

import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { inMemoryRateLimit } from '@/lib/utils/inMemoryRateLimit';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';

const BUCKET = 'body-progress-photos';
const SCOPE = 'api.scan.delete';
const DB_TIMEOUT_MS = 5000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

const PATH_COLUMNS = [
  'front_full_path',
  'front_thumb_path',
  'right_full_path',
  'right_thumb_path',
  'back_full_path',
  'back_thumb_path',
  'left_full_path',
  'left_thumb_path',
] as const;

interface SessionPathRow {
  id: string;
  [key: string]: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: userData } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      `${SCOPE}.auth`,
    );
    const user = userData.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!inMemoryRateLimit(`scan-delete:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const sessionId = body && typeof body === 'object' ? (body as Record<string, unknown>).sessionId : null;
    if (typeof sessionId !== 'string' || !sessionId) {
      return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }

    const admin: SupabaseClient = createAdminClient();

    // Ownership + paths resolved ONLY through the parent session filtered
    // by user_id. Never a client-supplied path.
    const sessionRes = await withTimeout<{ data: SessionPathRow | null; error: { message: string } | null }>(
      Promise.resolve(
        admin
          .from('body_photo_sessions')
          .select(`id,${PATH_COLUMNS.join(',')}`)
          .eq('id', sessionId)
          .eq('user_id', user.id)
          .maybeSingle(),
      ) as Promise<{ data: SessionPathRow | null; error: { message: string } | null }>,
      DB_TIMEOUT_MS,
      `${SCOPE}.session`,
    );
    if (sessionRes.error) {
      safeLog.error(SCOPE, 'session lookup error', { error: sessionRes.error });
      return NextResponse.json({ ok: false, error: 'lookup_failed' }, { status: 500 });
    }
    const session = sessionRes.data;
    if (!session) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    // Tombstone first. If this write does not confirm, stop: nothing is
    // deleted and the session stays exactly as it was.
    const tombstone = await withTimeout<{ data: { id: string } | null; error: { message: string } | null }>(
      Promise.resolve(
        admin
          .from('body_photo_sessions')
          .update({ capture_status: 'delete_pending' })
          .eq('id', sessionId)
          .eq('user_id', user.id)
          .select('id')
          .single(),
      ) as Promise<{ data: { id: string } | null; error: { message: string } | null }>,
      DB_TIMEOUT_MS,
      `${SCOPE}.tombstone`,
    );
    if (tombstone.error || !tombstone.data) {
      safeLog.error(SCOPE, 'tombstone update failed', { sessionId, error: tombstone.error });
      return NextResponse.json({ ok: false, error: 'tombstone_failed', sessionId }, { status: 500 });
    }

    const paths = PATH_COLUMNS.map((col) => session[col]).filter(
      (p): p is string => typeof p === 'string' && p.length > 0,
    );

    if (paths.length > 0) {
      const removeRes = await withTimeout<{ error: { message: string } | null }>(
        Promise.resolve(admin.storage.from(BUCKET).remove(paths)) as Promise<{
          error: { message: string } | null;
        }>,
        DB_TIMEOUT_MS,
        `${SCOPE}.removeObjects`,
      ).catch((error) => ({ error: { message: error instanceof Error ? error.message : 'unknown' } }));

      if (removeRes.error) {
        // Object removal failed: capture_status STAYS delete_pending. Never
        // report Deleted; caller retries.
        safeLog.error(SCOPE, 'storage remove failed, delete_pending retained', {
          sessionId,
          error: removeRes.error,
        });
        return NextResponse.json(
          {
            ok: false,
            error: 'delete_pending',
            sessionId,
            nextAction: 'Deleting... try again in a moment.',
          },
          { status: 202 },
        );
      }
    }

    // Rows last: frames cascade via ON DELETE CASCADE. Confirm a row was
    // actually removed before reporting Deleted.
    const rowDelete = await withTimeout<{ data: { id: string }[] | null; error: { message: string } | null }>(
      Promise.resolve(
        admin.from('body_photo_sessions').delete().eq('id', sessionId).eq('user_id', user.id).select('id'),
      ) as Promise<{ data: { id: string }[] | null; error: { message: string } | null }>,
      DB_TIMEOUT_MS,
      `${SCOPE}.rowDelete`,
    );
    if (rowDelete.error || !rowDelete.data || rowDelete.data.length === 0) {
      safeLog.error(SCOPE, 'row delete failed after object removal, delete_pending retained', {
        sessionId,
        error: rowDelete.error,
      });
      return NextResponse.json(
        {
          ok: false,
          error: 'delete_pending',
          sessionId,
          nextAction: 'Deleting... try again in a moment.',
        },
        { status: 202 },
      );
    }

    safeLog.info(SCOPE, 'scan deleted', { sessionId });
    return NextResponse.json({ ok: true, deleted: true, sessionId });
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.error(SCOPE, 'timeout', { error });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error(SCOPE, 'unexpected error', { error });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
