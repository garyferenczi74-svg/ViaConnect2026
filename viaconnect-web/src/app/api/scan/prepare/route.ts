// Prompt 231: prepare route for the 4-pose scan (client-direct signed
// uploads; no image bytes in this request). Idempotently creates or returns
// the body_photo_sessions row for the caller-supplied scanId (INSERT ...
// ON CONFLICT (id) DO NOTHING, then a user-scoped SELECT); a scanId already
// owned by another user is rejected as 409, never hijacked. Mints a signed
// UPLOAD url for the full + thumb object of each non-skipped pose under the
// existing body-progress-photos path convention, with a fresh timestamp per
// call. device_info is UA family only; logs never carry an object path.

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasScanConsent } from '@/lib/scan/scanConsentGate';
import { readResolvedHeightCm } from '@/lib/scan/readHeightCm';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { inMemoryRateLimit } from '@/lib/utils/inMemoryRateLimit';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET = 'body-progress-photos';
const SCOPE = 'api.scan.prepare';
const DB_TIMEOUT_MS = 5000;
const SIGN_TIMEOUT_MS = 5000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

const VIEWS = ['front', 'right', 'back', 'left'] as const;
type View = (typeof VIEWS)[number];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isView(v: unknown): v is View {
  return typeof v === 'string' && (VIEWS as readonly string[]).includes(v);
}

interface ParsedPose {
  pose: View;
  skipped: boolean;
}

/** Strict whitelist parse of the client "poses" field. Never trusts shape. */
function parsePosesField(raw: unknown): ParsedPose[] | null {
  if (!Array.isArray(raw) || raw.length !== VIEWS.length) return null;
  const result: ParsedPose[] = [];
  const seen = new Set<View>();
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return null;
    const rec = item as Record<string, unknown>;
    if (!isView(rec.pose) || seen.has(rec.pose)) return null;
    seen.add(rec.pose);
    result.push({ pose: rec.pose, skipped: Boolean(rec.skipped) });
  }
  if (!VIEWS.every((v) => seen.has(v))) return null;
  return result;
}

/** UA FAMILY ONLY (condition 10): no raw UA string, no platform, no
 * identifiers. */
function deriveDeviceInfo(userAgent: string | null): { family: string } {
  const ua = userAgent ?? '';
  let family = 'unknown';
  if (/Edg\//.test(ua)) family = 'Edge';
  else if (/CriOS\//.test(ua) || (/Chrome\//.test(ua) && !/OPR\//.test(ua))) family = 'Chrome';
  else if (/FxiOS\//.test(ua) || /Firefox\//.test(ua)) family = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) family = 'Safari';
  return { family };
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

interface SignedUploadTarget {
  path: string;
  token: string;
  signedUrl: string;
}

async function signUpload(admin: SupabaseClient, path: string): Promise<SignedUploadTarget | null> {
  try {
    const res = await withTimeout<{
      data: { signedUrl: string; token: string; path: string } | null;
      error: { message: string } | null;
    }>(
      Promise.resolve(admin.storage.from(BUCKET).createSignedUploadUrl(path)) as Promise<{
        data: { signedUrl: string; token: string; path: string } | null;
        error: { message: string } | null;
      }>,
      SIGN_TIMEOUT_MS,
      `${SCOPE}.sign`,
    );
    if (res.error || !res.data) return null;
    return { path: res.data.path || path, token: res.data.token, signedUrl: res.data.signedUrl };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: userData } = await withTimeout(supabase.auth.getUser(), 5000, `${SCOPE}.auth`);
    const user = userData.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!inMemoryRateLimit(`scan-prepare:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
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

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }
    const { scanId, poses } = body as Record<string, unknown>;
    if (typeof scanId !== 'string' || !UUID_RE.test(scanId)) {
      return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }
    const parsedPoses = parsePosesField(poses);
    if (!parsedPoses) {
      return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }

    const resolvedHeight = await readResolvedHeightCm(supabase, user.id);
    const heightCm = resolvedHeight.heightCm;
    const deviceInfo = deriveDeviceInfo(request.headers.get('user-agent'));

    const admin: SupabaseClient = createAdminClient();

    // INSERT ... ON CONFLICT (id) DO NOTHING. Never read this result for
    // data - a duplicate resolves with no row and no error. The follow-up
    // SELECT below is the sole authority on the session's contents.
    const upsertResult = await dbCall(
      admin.from('body_photo_sessions').upsert(
        {
          id: scanId,
          user_id: user.id,
          protocol: '4pose_v1',
          capture_status: 'uploading',
          consent_version: consent.version,
          device_info: deviceInfo,
          height_cm_at_scan: heightCm,
          height_cm_source: resolvedHeight.source,
        },
        { onConflict: 'id', ignoreDuplicates: true },
      ),
      'sessionUpsert',
    );
    if (upsertResult.error) {
      safeLog.error(SCOPE, 'session upsert failed', { error: upsertResult.error });
      return NextResponse.json({ ok: false, error: 'session_create_failed' }, { status: 500 });
    }

    // Authoritative read, scoped to this user. A scanId already owned by
    // someone else resolves null here - REJECTED as a conflict, never
    // hijacked, and never disclosed as "exists for someone else" vs. any
    // other reason a row failed to resolve.
    const sessionRead = await dbCall<{ id: string }>(
      admin.from('body_photo_sessions').select('id').eq('id', scanId).eq('user_id', user.id).maybeSingle(),
      'sessionRead',
    );
    if (sessionRead.error) {
      safeLog.error(SCOPE, 'session read failed', { error: sessionRead.error });
      return NextResponse.json({ ok: false, error: 'session_create_failed' }, { status: 500 });
    }
    if (!sessionRead.data) {
      return NextResponse.json(
        { ok: false, error: 'session_conflict', nextAction: 'Start a new scan.' },
        { status: 409 },
      );
    }
    const sessionId = sessionRead.data.id;

    // Fresh ts per prepare call: a retried prepare mints new upload targets
    // rather than reusing paths from a possibly-abandoned prior attempt.
    const ts = Date.now();
    const uploads: Array<{ pose: View; full: SignedUploadTarget; thumb: SignedUploadTarget }> = [];

    for (const p of parsedPoses) {
      if (p.skipped) continue;
      const fullPath = `${user.id}/${sessionId}/${p.pose}_full_${ts}.jpg`;
      const thumbPath = `${user.id}/${sessionId}/${p.pose}_thumb_${ts}.jpg`;
      const [full, thumb] = await Promise.all([signUpload(admin, fullPath), signUpload(admin, thumbPath)]);
      if (!full || !thumb) {
        safeLog.error(SCOPE, 'sign failed for pose', { sessionId, pose: p.pose });
        return NextResponse.json({ ok: false, error: 'sign_failed', sessionId }, { status: 500 });
      }
      uploads.push({ pose: p.pose, full, thumb });
    }

    safeLog.info(SCOPE, 'scan prepared', { sessionId, poseCount: uploads.length });
    return NextResponse.json({ ok: true, sessionId, uploads });
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.error(SCOPE, 'timeout', { error });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error(SCOPE, 'unexpected error', { error });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
