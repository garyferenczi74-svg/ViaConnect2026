// Opt-in retain FRBL after photo analyze. Server-only. Default discard stays
// the analyze path. This route never invents muscle lbs.

import { randomUUID } from 'node:crypto';
import { after, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { inMemoryRateLimit } from '@/lib/utils/inMemoryRateLimit';
import { safeLog } from '@/lib/utils/safe-log';
import { FORMAVISION_PHOTO_PROTOCOL } from '@/lib/scan/scanProtocols';
import { POSE_ORDER, type PoseId } from '@/lib/scan/poses';
import { readResolvedHeightCm } from '@/lib/scan/readHeightCm';
import { startMeshyForReadySession } from '@/lib/formavision/meshy/startMeshyForReadySession';
import { startTripoForReadySession } from '@/lib/formavision/tripo/startTripoForReadySession';
import type { Database } from '@/lib/supabase/types';

type UserScopedClient = SupabaseClient<Database>;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SCOPE = 'api.formavision.retain-frbl';
const BUCKET = 'body-progress-photos';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGN_TIMEOUT_MS = 5000;
const DB_TIMEOUT_MS = 5000;

function isPoseId(value: unknown): value is PoseId {
  return typeof value === 'string' && (POSE_ORDER as readonly string[]).includes(value);
}

async function requireUser(): Promise<{ id: string; supabase: UserScopedClient } | NextResponse> {
  const supabase = await createClient();
  const { data: userData } = await withTimeout(supabase.auth.getUser(), 5000, `${SCOPE}.auth`);
  const user = userData.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return { id: user.id, supabase };
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

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const auth = await requireUser();
    if (auth instanceof NextResponse) return auth;
    if (!inMemoryRateLimit(`formavision-retain-frbl:${auth.id}`, 8, 60_000)) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }
    const rec = body as Record<string, unknown>;
    const action = rec.action;
    const photoScanId = typeof rec.photoScanId === 'string' && UUID_RE.test(rec.photoScanId)
      ? rec.photoScanId
      : null;
    if (!photoScanId) {
      return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }

    const admin = createAdminClient();
    const ownedScan = await withTimeout<{
      data: { id: string } | null;
      error: { message: string } | null;
    }>(
      Promise.resolve(
        admin
          .from('body_tracker_photo_scans')
          .select('id')
          .eq('id', photoScanId)
          .eq('user_id', auth.id)
          .maybeSingle(),
      ) as Promise<{ data: { id: string } | null; error: { message: string } | null }>,
      DB_TIMEOUT_MS,
      `${SCOPE}.scan`,
    );
    if (ownedScan.error || !ownedScan.data) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    if (action === 'prepare') {
      return prepareRetain(admin, auth.supabase, auth.id, photoScanId, rec.poses);
    }
    if (action === 'finalize') {
      return finalizeRetain(admin, auth.id, photoScanId, rec);
    }
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
  } catch (error) {
    if (isTimeoutError(error)) {
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error(SCOPE, 'unexpected', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}

async function prepareRetain(
  admin: SupabaseClient,
  userClient: UserScopedClient,
  userId: string,
  photoScanId: string,
  rawPoses: unknown,
): Promise<NextResponse> {
  if (!Array.isArray(rawPoses)) {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }
  const poses: Array<{ pose: PoseId; skipped: boolean }> = [];
  const seen = new Set<PoseId>();
  for (const item of rawPoses) {
    if (typeof item !== 'object' || item === null) continue;
    const rec = item as Record<string, unknown>;
    if (!isPoseId(rec.pose) || seen.has(rec.pose)) continue;
    seen.add(rec.pose);
    poses.push({ pose: rec.pose, skipped: Boolean(rec.skipped) });
  }
  if (poses.filter((p) => !p.skipped).length === 0) {
    return NextResponse.json({ ok: false, error: 'no_photos' }, { status: 400 });
  }

  const sessionId = randomUUID();
  const resolvedHeight = await readResolvedHeightCm(userClient, userId);
  const heightCm = resolvedHeight.heightCm;
  const sessionRow: Database['public']['Tables']['body_photo_sessions']['Insert'] = {
    id: sessionId,
    user_id: userId,
    protocol: FORMAVISION_PHOTO_PROTOCOL,
    capture_status: 'uploading',
  };
  // Gary HARD lock: stamp finite CAQ-first height only. Never invent.
  if (heightCm !== null && Number.isFinite(heightCm)) {
    sessionRow.height_cm_at_scan = heightCm;
    sessionRow.height_cm_source = resolvedHeight.source;
  }
  const created = await withTimeout<{ error: { message: string } | null }>(
    Promise.resolve(
      admin.from('body_photo_sessions').insert(sessionRow),
    ) as Promise<{ error: { message: string } | null }>,
    DB_TIMEOUT_MS,
    `${SCOPE}.sessionInsert`,
  );
  if (created.error) {
    safeLog.warn(SCOPE, 'session insert failed', { error: created.error.message });
    return NextResponse.json({ ok: false, error: 'session_create_failed' }, { status: 500 });
  }

  const ts = Date.now();
  const uploads: Array<{ pose: PoseId; full: SignedUploadTarget; thumb: SignedUploadTarget }> = [];
  for (const p of poses) {
    if (p.skipped) continue;
    const fullPath = `${userId}/${sessionId}/${p.pose}_full_${ts}.jpg`;
    const thumbPath = `${userId}/${sessionId}/${p.pose}_thumb_${ts}.jpg`;
    const [full, thumb] = await Promise.all([signUpload(admin, fullPath), signUpload(admin, thumbPath)]);
    if (!full || !thumb) {
      return NextResponse.json({ ok: false, error: 'sign_failed', sessionId }, { status: 500 });
    }
    uploads.push({ pose: p.pose, full, thumb });
  }

  safeLog.info(SCOPE, 'retain prepared', { photoScanId, sessionId, poseCount: uploads.length });
  return NextResponse.json({ ok: true, sessionId, uploads });
}

async function finalizeRetain(
  admin: SupabaseClient,
  userId: string,
  photoScanId: string,
  rec: Record<string, unknown>,
): Promise<NextResponse> {
  const sessionId = typeof rec.sessionId === 'string' && UUID_RE.test(rec.sessionId) ? rec.sessionId : null;
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }

  const owned = await withTimeout<{
    data: { id: string } | null;
    error: { message: string } | null;
  }>(
    Promise.resolve(
      admin
        .from('body_photo_sessions')
        .select('id')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .maybeSingle(),
    ) as Promise<{ data: { id: string } | null; error: { message: string } | null }>,
    DB_TIMEOUT_MS,
    `${SCOPE}.sessionRead`,
  );
  if (owned.error || !owned.data) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const pathsRaw = rec.paths;
  if (typeof pathsRaw !== 'object' || pathsRaw === null) {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }
  const paths = pathsRaw as Record<string, unknown>;
  const patch: Record<string, string | null> = {};
  const views: PoseId[] = [];
  for (const pose of POSE_ORDER) {
    const pair = paths[pose];
    if (typeof pair !== 'object' || pair === null) continue;
    const full = (pair as Record<string, unknown>).full;
    const thumb = (pair as Record<string, unknown>).thumb;
    if (typeof full === 'string' && full.startsWith(`${userId}/${sessionId}/`)) {
      patch[`${pose}_full_path`] = full;
      views.push(pose);
    }
    if (typeof thumb === 'string' && thumb.startsWith(`${userId}/${sessionId}/`)) {
      patch[`${pose}_thumb_path`] = thumb;
    }
  }

  if (views.length === 0) {
    return NextResponse.json({ ok: false, error: 'no_photos' }, { status: 400 });
  }

  const sessionUpdate = await withTimeout<{ error: { message: string } | null }>(
    Promise.resolve(
      admin
        .from('body_photo_sessions')
        .update({
          ...patch,
          protocol: FORMAVISION_PHOTO_PROTOCOL,
          capture_status: 'ready',
        })
        .eq('id', sessionId)
        .eq('user_id', userId),
    ) as Promise<{ error: { message: string } | null }>,
    DB_TIMEOUT_MS,
    `${SCOPE}.sessionUpdate`,
  );
  if (sessionUpdate.error) {
    safeLog.warn(SCOPE, 'session update failed', { error: sessionUpdate.error.message });
    return NextResponse.json({ ok: false, error: 'store_failed' }, { status: 500 });
  }

  const scanUpdate = await withTimeout<{ error: { message: string } | null }>(
    Promise.resolve(
      admin
        .from('body_tracker_photo_scans')
        .update({
          photos_retained: true,
          photo_session_id: sessionId,
          retained_views: views,
        })
        .eq('id', photoScanId)
        .eq('user_id', userId),
    ) as Promise<{ error: { message: string } | null }>,
    DB_TIMEOUT_MS,
    `${SCOPE}.scanUpdate`,
  );
  if (scanUpdate.error) {
    safeLog.warn(SCOPE, 'scan retain flag failed', { error: scanUpdate.error.message });
    return NextResponse.json({ ok: false, error: 'store_failed' }, { status: 500 });
  }

  safeLog.info(SCOPE, 'retain finalized', { photoScanId, sessionId, views });
  try {
    after(() => {
      void startMeshyForReadySession(sessionId, userId, admin);
      void startTripoForReadySession(sessionId, userId, admin);
    });
  } catch {
    void startMeshyForReadySession(sessionId, userId, admin);
    void startTripoForReadySession(sessionId, userId, admin);
  }
  return NextResponse.json({ ok: true, sessionId, views });
}
