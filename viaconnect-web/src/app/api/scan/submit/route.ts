// Prompt 231: submit route for the 4-pose scan. Verifies consent
// server-side, snapshots height, writes ONE body_photo_sessions row plus its
// body_photo_session_frames children through a strict field whitelist, and
// only returns success after the capture_status='ready' UPDATE confirms.
//
// Bucket is the EXISTING private body-progress-photos bucket (converge, no
// new bucket). Path convention matches PhotoSessionCapture.tsx (the live
// journal_v0 flow): `${userId}/${sessionId}/${pose}_full_${ts}.jpg` and
// `${userId}/${sessionId}/${pose}_thumb_${ts}.jpg`. No thumbnail pipeline
// exists yet, so the thumb path is a second upload of the same JPEG bytes
// (never NULL, per the live gallery's expectation).
//
// Never trusts a client-supplied user_id: the admin client only writes rows
// scoped to the id derived from supabase.auth.getUser(). Landmarks are
// stripped from the frame insert unless SCAN_PERSIST_LANDMARKS is truthy
// (G81, default OFF); the insert never spreads client JSON.

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasScanConsent } from '@/lib/scan/scanConsentGate';
import { readHeightCm } from '@/lib/scan/readHeightCm';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { inMemoryRateLimit } from '@/lib/utils/inMemoryRateLimit';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET = 'body-progress-photos';
const SCOPE = 'api.scan.submit';
const DB_TIMEOUT_MS = 5000;
const UPLOAD_TIMEOUT_MS = 8000;
const UPLOAD_MAX_ATTEMPTS = 2;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

const VIEWS = ['front', 'right', 'back', 'left'] as const;
type View = (typeof VIEWS)[number];

function isView(v: unknown): v is View {
  return typeof v === 'string' && (VIEWS as readonly string[]).includes(v);
}

interface ParsedQa {
  pass: boolean;
  code: string;
  message: string;
  mode: 'landmarker' | 'weak';
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
}

/** Strict whitelist parse of the client "frames" field. Never trusts shape. */
function parseFramesField(raw: FormDataEntryValue | null): ParsedFrame[] | null {
  if (typeof raw !== 'string') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length !== VIEWS.length) return null;

  const result: ParsedFrame[] = [];
  const seen = new Set<View>();
  for (const item of parsed) {
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

    result.push({
      view: rec.view,
      skipped: Boolean(rec.skipped),
      qa,
      capturedWidth: typeof rec.capturedWidth === 'number' ? rec.capturedWidth : 0,
      capturedHeight: typeof rec.capturedHeight === 'number' ? rec.capturedHeight : 0,
      capturedAt: typeof rec.capturedAt === 'string' ? rec.capturedAt : new Date().toISOString(),
      retryCount: typeof rec.retryCount === 'number' ? rec.retryCount : 0,
      landmarks: Array.isArray(rec.landmarks) ? rec.landmarks : undefined,
    });
  }
  if (!VIEWS.every((v) => seen.has(v))) return null;
  return result;
}

/** UA FAMILY ONLY (condition 10): no raw UA string, no identifiers. */
function deriveDeviceInfo(userAgent: string | null): { family: string; platform: string } {
  const ua = userAgent ?? '';
  let family = 'unknown';
  if (/Edg\//.test(ua)) family = 'Edge';
  else if (/CriOS\//.test(ua) || (/Chrome\//.test(ua) && !/OPR\//.test(ua))) family = 'Chrome';
  else if (/FxiOS\//.test(ua) || /Firefox\//.test(ua)) family = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) family = 'Safari';

  let platform = 'unknown';
  if (/iPhone|iPad|iPod/.test(ua)) platform = 'iOS';
  else if (/Android/.test(ua)) platform = 'Android';
  else if (/Windows/.test(ua)) platform = 'Windows';
  else if (/Macintosh|Mac OS X/.test(ua)) platform = 'macOS';
  else if (/Linux/.test(ua)) platform = 'Linux';

  return { family, platform };
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

async function uploadOnce(
  admin: SupabaseClient,
  path: string,
  bytes: Blob,
): Promise<boolean> {
  try {
    const res = await withTimeout<{ error: { message: string } | null }>(
      Promise.resolve(
        admin.storage.from(BUCKET).upload(path, bytes, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        }),
      ) as Promise<{ error: { message: string } | null }>,
      UPLOAD_TIMEOUT_MS,
      `${SCOPE}.upload`,
    );
    return !res.error;
  } catch {
    return false;
  }
}

async function uploadWithRetry(admin: SupabaseClient, path: string, bytes: Blob): Promise<boolean> {
  for (let attempt = 1; attempt <= UPLOAD_MAX_ATTEMPTS; attempt++) {
    if (await uploadOnce(admin, path, bytes)) return true;
  }
  return false;
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
    const { data: userData } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      `${SCOPE}.auth`,
    );
    const user = userData.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!inMemoryRateLimit(`scan-submit:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    // Consent gate FIRST. Never write before this resolves ok:true.
    const consent = await hasScanConsent(user.id);
    if (!consent.ok || !consent.version) {
      return NextResponse.json(
        {
          ok: false,
          error: 'consent_required',
          nextAction: 'Review and accept the scan consent notice, then try again.',
        },
        { status: 403 },
      );
    }

    const form = await request.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }

    const frames = parseFramesField(form.get('frames'));
    if (!frames) {
      return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }

    // Every non-skipped frame must carry its blob.
    const blobs = new Map<View, Blob>();
    for (const frame of frames) {
      if (frame.skipped) continue;
      const entry = form.get(`frame_${frame.view}`);
      if (!(entry instanceof Blob) || entry.size === 0) {
        return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
      }
      blobs.set(frame.view, entry);
    }

    const persistLandmarks =
      process.env.SCAN_PERSIST_LANDMARKS === 'true' || process.env.SCAN_PERSIST_LANDMARKS === '1';

    const heightCm = await readHeightCm(supabase, user.id);
    const deviceInfo = deriveDeviceInfo(request.headers.get('user-agent'));

    const admin: SupabaseClient = createAdminClient();

    const sessionInsert = await dbCall<{ id: string }>(
      admin
        .from('body_photo_sessions')
        .insert({
          user_id: user.id,
          protocol: '4pose_v1',
          capture_status: 'uploading',
          consent_version: consent.version,
          device_info: deviceInfo,
          height_cm_at_scan: heightCm,
          height_cm_source: heightCm !== null ? 'clinical_assessment' : null,
        })
        .select('id')
        .single(),
      'sessionInsert',
    );
    if (sessionInsert.error || !sessionInsert.data) {
      safeLog.error(SCOPE, 'session insert failed', { error: sessionInsert.error });
      return NextResponse.json({ ok: false, error: 'session_create_failed' }, { status: 500 });
    }
    const sessionId = sessionInsert.data.id;

    // Upload phase: each non-skipped pose gets full + thumb (same bytes;
    // no thumbnail pipeline exists yet, so thumb is never left NULL).
    const ts = Date.now();
    const pathPatch: Record<string, string> = {};
    const failedPoses: string[] = [];

    for (const frame of frames) {
      if (frame.skipped) continue;
      const bytes = blobs.get(frame.view);
      if (!bytes) {
        failedPoses.push(frame.view);
        continue;
      }
      const fullPath = `${user.id}/${sessionId}/${frame.view}_full_${ts}.jpg`;
      const thumbPath = `${user.id}/${sessionId}/${frame.view}_thumb_${ts}.jpg`;

      const [fullOk, thumbOk] = await Promise.all([
        uploadWithRetry(admin, fullPath, bytes),
        uploadWithRetry(admin, thumbPath, bytes),
      ]);

      if (!fullOk || !thumbOk) {
        failedPoses.push(frame.view);
        continue;
      }
      pathPatch[`${frame.view}_full_path`] = fullPath;
      pathPatch[`${frame.view}_thumb_path`] = thumbPath;
    }

    if (failedPoses.length > 0) {
      safeLog.warn(SCOPE, 'upload failed for pose(s)', { sessionId, failedPoses });
      if (Object.keys(pathPatch).length > 0) {
        await dbCall(
          admin.from('body_photo_sessions').update(pathPatch).eq('id', sessionId).select('id').single(),
          'pathPatchPartial',
        );
      }
      await markPartial(admin, sessionId);
      return NextResponse.json(
        {
          ok: false,
          error: 'upload_failed',
          sessionId,
          failedPoses,
          nextAction: 'Retry upload for the listed pose(s).',
        },
        { status: 502 },
      );
    }

    if (Object.keys(pathPatch).length > 0) {
      const pathUpdate = await dbCall(
        admin.from('body_photo_sessions').update(pathPatch).eq('id', sessionId).select('id').single(),
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
    // landmarks included ONLY when the server flag is truthy (G81, default OFF).
    const frameRows = frames.map((frame) => {
      const row: Record<string, unknown> = {
        session_id: sessionId,
        view: frame.view,
        qa: frame.qa,
        qa_mode: frame.qa.mode,
        captured_width: frame.capturedWidth,
        captured_height: frame.capturedHeight,
        skipped: frame.skipped,
        retry_count: frame.retryCount,
        captured_at: frame.capturedAt,
      };
      if (persistLandmarks && frame.landmarks) {
        row.landmarks = frame.landmarks;
      }
      return row;
    });

    const frameInsert = await dbCall(
      admin.from('body_photo_session_frames').insert(frameRows),
      'frameInsert',
    );
    if (frameInsert.error) {
      safeLog.error(SCOPE, 'frame insert failed', { sessionId, error: frameInsert.error });
      await markPartial(admin, sessionId);
      return NextResponse.json(
        { ok: false, error: 'frame_save_failed', sessionId, nextAction: 'Retry.' },
        { status: 500 },
      );
    }

    // Success only after this UPDATE confirms capture_status='ready'
    // (condition 24c). Never return ok:true before this resolves.
    const readyUpdate = await dbCall<{ capture_status: string }>(
      admin
        .from('body_photo_sessions')
        .update({ capture_status: 'ready' })
        .eq('id', sessionId)
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

    safeLog.info(SCOPE, 'scan submitted', { sessionId });
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
