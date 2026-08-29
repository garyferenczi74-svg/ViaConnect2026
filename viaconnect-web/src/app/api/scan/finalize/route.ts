// Prompt 231: finalize route for the 4-pose scan (client-direct signed
// uploads). The client has already uploaded full + thumb bytes DIRECTLY to
// Storage via the signed upload urls from POST /api/scan/prepare - this
// route takes JSON metadata only, plus the object paths reported uploaded.
// Each reported path must match the EXACT user/session/pose/variant pattern
// prepare authorized AND pass storage.exists() before it is written onto
// the session row (that column is later signed unconditionally by
// /api/scan/signed-url, so a mismatched path is rejected here rather than
// there); either check failing marks that pose 'partial', never a faked
// success. Frame rows use a strict field whitelist, upserted on
// (session_id, view) so a retried finalize never 500s on the unique
// constraint. capture_status='ready' is only returned once that UPDATE
// re-selects and confirms it. Logs carry sessionId/pose only, never a path.

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { inMemoryRateLimit } from '@/lib/utils/inMemoryRateLimit';
import { safeLog } from '@/lib/utils/safe-log';
import { buildFrameRow } from '@/lib/scan/finalizeFrameRow';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET = 'body-progress-photos';
const SCOPE = 'api.scan.finalize';
const DB_TIMEOUT_MS = 5000;
const EXISTS_TIMEOUT_MS = 5000;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

const VIEWS = ['front', 'right', 'back', 'left'] as const;
type View = (typeof VIEWS)[number];
type Variant = 'full' | 'thumb';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isView(v: unknown): v is View {
  return typeof v === 'string' && (VIEWS as readonly string[]).includes(v);
}

interface ParsedQa {
  pass: boolean;
  code: string;
  message: string;
  mode: 'landmarker' | 'weak';
}

interface ParsedPaths {
  full: string;
  thumb: string;
}

interface ParsedFrame {
  view: View;
  skipped: boolean;
  qa: ParsedQa;
  capturedWidth: number;
  capturedHeight: number;
  capturedAt: string;
  retryCount: number;
  landmarks: unknown[] | undefined;
  paths: ParsedPaths | null;
}

/** Strict whitelist parse of the client "frames" field. Never trusts shape. */
function parseFramesField(raw: unknown): ParsedFrame[] | null {
  if (!Array.isArray(raw) || raw.length !== VIEWS.length) return null;

  const result: ParsedFrame[] = [];
  const seen = new Set<View>();
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return null;
    const rec = item as Record<string, unknown>;
    if (!isView(rec.view) || seen.has(rec.view)) return null;
    seen.add(rec.view);

    const qaRaw = rec.qa;
    if (typeof qaRaw !== 'object' || qaRaw === null) return null;
    const qaRec = qaRaw as Record<string, unknown>;
    const qa: ParsedQa = {
      pass: Boolean(qaRec.pass),
      code: typeof qaRec.code === 'string' ? qaRec.code : 'NO_BODY',
      message: typeof qaRec.message === 'string' ? qaRec.message : '',
      mode: qaRec.mode === 'landmarker' ? 'landmarker' : 'weak',
    };

    const skipped = Boolean(rec.skipped);
    let paths: ParsedPaths | null = null;
    if (!skipped) {
      const pathsRaw = rec.paths;
      if (typeof pathsRaw === 'object' && pathsRaw !== null) {
        const pr = pathsRaw as Record<string, unknown>;
        if (typeof pr.full === 'string' && typeof pr.thumb === 'string') {
          paths = { full: pr.full, thumb: pr.thumb };
        }
      }
    }

    result.push({
      view: rec.view,
      skipped,
      qa,
      capturedWidth: typeof rec.capturedWidth === 'number' ? rec.capturedWidth : 0,
      capturedHeight: typeof rec.capturedHeight === 'number' ? rec.capturedHeight : 0,
      capturedAt: typeof rec.capturedAt === 'string' ? rec.capturedAt : new Date().toISOString(),
      retryCount: typeof rec.retryCount === 'number' ? rec.retryCount : 0,
      landmarks: Array.isArray(rec.landmarks) ? rec.landmarks : undefined,
      paths,
    });
  }
  if (!VIEWS.every((v) => seen.has(v))) return null;
  return result;
}

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The EXACT path pattern prepare authorized for this user/session/pose. */
function expectedPathRegex(userId: string, sessionId: string, view: View, variant: Variant): RegExp {
  return new RegExp(
    `^${escapeForRegex(userId)}/${escapeForRegex(sessionId)}/${view}_${variant}_\\d+\\.jpg$`,
  );
}

interface DbResult<T> {
  data: T | null;
  error: { message: string } | null;
}

async function dbCall<T>(promise: unknown, label: string): Promise<DbResult<T>> {
  try {
    return await withTimeout<DbResult<T>>(
      Promise.resolve(promise) as Promise<DbResult<T>>,
      DB_TIMEOUT_MS,
      `${SCOPE}.${label}`,
    );
  } catch (error) {
    if (isTimeoutError(error)) {
      return { data: null, error: { message: 'timeout' } };
    }
    return { data: null, error: { message: error instanceof Error ? error.message : 'unknown' } };
  }
}

async function checkExists(admin: SupabaseClient, path: string): Promise<boolean> {
  try {
    const res = await withTimeout<{ data: boolean; error: { message: string } | null }>(
      Promise.resolve(admin.storage.from(BUCKET).exists(path)) as Promise<{
        data: boolean;
        error: { message: string } | null;
      }>,
      EXISTS_TIMEOUT_MS,
      `${SCOPE}.exists`,
    );
    return !res.error && res.data === true;
  } catch {
    return false;
  }
}

async function markPartial(admin: SupabaseClient, sessionId: string): Promise<void> {
  try {
    await dbCall(
      admin.from('body_photo_sessions').update({ capture_status: 'partial' }).eq('id', sessionId),
      'markPartial',
    );
  } catch (error) {
    safeLog.warn(SCOPE, 'failed to mark session partial', { error, sessionId });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: userData } = await withTimeout(supabase.auth.getUser(), 5000, `${SCOPE}.auth`);
    const user = userData.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!inMemoryRateLimit(`scan-finalize:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }
    const { sessionId, frames: framesRaw } = body as Record<string, unknown>;
    if (typeof sessionId !== 'string' || !UUID_RE.test(sessionId)) {
      return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }
    const frames = parseFramesField(framesRaw);
    if (!frames) {
      return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }

    const persistLandmarks =
      process.env.SCAN_PERSIST_LANDMARKS === 'true' || process.env.SCAN_PERSIST_LANDMARKS === '1';

    const admin: SupabaseClient = createAdminClient();

    // Ownership resolved ONLY through the parent session filtered by
    // user_id (mirrors signed-url/delete). Not found or owned by someone
    // else: identical 404, never disclose which.
    const sessionRead = await dbCall<{ id: string }>(
      admin.from('body_photo_sessions').select('id').eq('id', sessionId).eq('user_id', user.id).maybeSingle(),
      'sessionRead',
    );
    if (sessionRead.error) {
      safeLog.error(SCOPE, 'session lookup error', { error: sessionRead.error });
      return NextResponse.json({ ok: false, error: 'lookup_failed' }, { status: 500 });
    }
    if (!sessionRead.data) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    // Phase 1: validate + confirm each reported object path BEFORE it is
    // ever written to the session row.
    const pathPatch: Record<string, string> = {};
    const failedPoses: string[] = [];

    for (const frame of frames) {
      if (frame.skipped) continue;
      if (!frame.paths) {
        failedPoses.push(frame.view);
        continue;
      }
      const fullOk = expectedPathRegex(user.id, sessionId, frame.view, 'full').test(frame.paths.full);
      const thumbOk = expectedPathRegex(user.id, sessionId, frame.view, 'thumb').test(frame.paths.thumb);
      if (!fullOk || !thumbOk) {
        safeLog.warn(SCOPE, 'reported path pattern mismatch, rejected', { sessionId, pose: frame.view });
        failedPoses.push(frame.view);
        continue;
      }
      const [fullExists, thumbExists] = await Promise.all([
        checkExists(admin, frame.paths.full),
        checkExists(admin, frame.paths.thumb),
      ]);
      if (!fullExists || !thumbExists) {
        failedPoses.push(frame.view);
        continue;
      }
      pathPatch[`${frame.view}_full_path`] = frame.paths.full;
      pathPatch[`${frame.view}_thumb_path`] = frame.paths.thumb;
    }

    if (Object.keys(pathPatch).length > 0) {
      const pathUpdate = await dbCall(
        admin
          .from('body_photo_sessions')
          .update(pathPatch)
          .eq('id', sessionId)
          .eq('user_id', user.id)
          .select('id')
          .single(),
        'pathUpdate',
      );
      if (pathUpdate.error) {
        safeLog.error(SCOPE, 'path update failed', { sessionId, error: pathUpdate.error });
        await markPartial(admin, sessionId);
        return NextResponse.json(
          { ok: false, error: 'session_update_failed', sessionId, nextAction: 'Retry.' },
          { status: 500 },
        );
      }
    }

    // Frame rows via a STRICT field whitelist. Never spread client JSON.
    // Always inserted regardless of failedPoses: this table carries no
    // image path, only capture metadata, so a failed-to-confirm pose still
    // gets its attempt recorded.
    const frameRows = frames.map((frame) => ({
      session_id: sessionId,
      ...buildFrameRow(frame, persistLandmarks),
    }));

    // upsert on (session_id, view), never a bare insert: a client that
    // retries finalize after losing the response (the exact scenario this
    // route exists to make safe) must not hit the UNIQUE(session_id, view)
    // constraint. Rows are server-whitelisted and admin-written, so
    // refreshing on conflict is correct here.
    const frameInsert = await dbCall(
      admin.from('body_photo_session_frames').upsert(frameRows, { onConflict: 'session_id,view' }),
      'frameUpsert',
    );
    if (frameInsert.error) {
      safeLog.error(SCOPE, 'frame upsert failed', { sessionId, error: frameInsert.error });
      await markPartial(admin, sessionId);
      return NextResponse.json(
        { ok: false, error: 'frame_save_failed', sessionId, nextAction: 'Retry.' },
        { status: 500 },
      );
    }

    if (failedPoses.length > 0) {
      safeLog.warn(SCOPE, 'pose(s) could not be confirmed in storage', { sessionId, failedPoses });
      await markPartial(admin, sessionId);
      return NextResponse.json(
        {
          ok: false,
          error: 'incomplete_upload',
          sessionId,
          failedPoses,
          nextAction: 'Retry upload for the listed pose(s) and finalize again.',
        },
        { status: 422 },
      );
    }

    // Success only after this UPDATE confirms capture_status='ready'
    // (condition 24c). Never return ok:true before this resolves.
    const readyUpdate = await dbCall<{ capture_status: string }>(
      admin
        .from('body_photo_sessions')
        .update({ capture_status: 'ready' })
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .select('capture_status')
        .single(),
      'readyUpdate',
    );
    if (readyUpdate.error || readyUpdate.data?.capture_status !== 'ready') {
      safeLog.error(SCOPE, 'ready update not confirmed', { sessionId, error: readyUpdate.error });
      await markPartial(admin, sessionId);
      return NextResponse.json(
        { ok: false, error: 'finalize_failed', sessionId, nextAction: 'Retry.' },
        { status: 500 },
      );
    }

    safeLog.info(SCOPE, 'scan finalized', { sessionId });
    return NextResponse.json({ ok: true, sessionId, failedPoses: [] });
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.error(SCOPE, 'timeout', { error });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error(SCOPE, 'unexpected error', { error });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
