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
import { stampFiniteHeight } from '@/lib/scan/heightCmSourceStamp';
import { startMeshyForReadySession } from '@/lib/formavision/meshy/startMeshyForReadySession';
import { startTripoForReadySession } from '@/lib/formavision/tripo/startTripoForReadySession';
import { frblGlbStoragePath } from '@/lib/formavision/meshy/frblOrder';
import { tripoGlbStoragePath } from '@/lib/formavision/tripo/tripoViews';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SCOPE = 'api.formavision.retain-frbl';
const BUCKET = 'body-progress-photos';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGN_TIMEOUT_MS = 5000;
const DB_TIMEOUT_MS = 5000;
const LIST_TIMEOUT_MS = 5000;
const LIST_PAGE_SIZE = 1000;

const SESSION_PATH_COLUMNS = POSE_ORDER.flatMap(
  (pose) => [`${pose}_full_path`, `${pose}_thumb_path`] as const,
);

interface OwnedPhotoScanRow {
  id: string;
  photos_retained: boolean | null;
  photo_session_id: string | null;
}

interface SessionPathRow {
  id: string;
  user_id: string;
  [key: string]: unknown;
}

interface StorageListItem {
  name: string;
  id?: string | null;
  metadata?: Record<string, unknown> | null;
}

function isListedStorageFile(item: StorageListItem): boolean {
  if (typeof item.name !== 'string' || item.name.length === 0) return false;
  if (item.id === null) return false;
  if (item.metadata === null) return false;
  return true;
}

function clearedSessionPathPatch(): Record<string, null> {
  const patch: Record<string, null> = {};
  for (const pose of POSE_ORDER) {
    patch[`${pose}_full_path`] = null;
    patch[`${pose}_thumb_path`] = null;
  }
  return patch;
}

/**
 * Lists files under a server-built prefix. Returns null on any failure
 * (fail closed — never report discarded without a verified list).
 */
async function listAllUnderPrefix(admin: SupabaseClient, prefix: string): Promise<string[] | null> {
  const paths: string[] = [];
  let offset = 0;
  for (;;) {
    let page: StorageListItem[] | null;
    try {
      const res = await withTimeout<{
        data: StorageListItem[] | null;
        error: { message: string } | null;
      }>(
        Promise.resolve(
          admin.storage.from(BUCKET).list(prefix, { limit: LIST_PAGE_SIZE, offset }),
        ) as Promise<{ data: StorageListItem[] | null; error: { message: string } | null }>,
        LIST_TIMEOUT_MS,
        `${SCOPE}.list`,
      );
      if (res.error) return null;
      page = res.data;
    } catch {
      return null;
    }
    const items = page ?? [];
    for (const item of items) {
      if (isListedStorageFile(item)) paths.push(`${prefix}${item.name}`);
    }
    if (items.length < LIST_PAGE_SIZE) break;
    offset += items.length;
  }
  return paths;
}

function isPoseId(value: unknown): value is PoseId {
  return typeof value === 'string' && (POSE_ORDER as readonly string[]).includes(value);
}

async function requireUser(): Promise<{ id: string } | NextResponse> {
  const supabase = await createClient();
  const { data: userData } = await withTimeout(supabase.auth.getUser(), 5000, `${SCOPE}.auth`);
  const user = userData.user;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return { id: user.id };
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
      data: OwnedPhotoScanRow | null;
      error: { message: string } | null;
    }>(
      Promise.resolve(
        admin
          .from('body_tracker_photo_scans')
          .select('id, photos_retained, photo_session_id')
          .eq('id', photoScanId)
          .eq('user_id', auth.id)
          .maybeSingle(),
      ) as Promise<{ data: OwnedPhotoScanRow | null; error: { message: string } | null }>,
      DB_TIMEOUT_MS,
      `${SCOPE}.scan`,
    );
    if (ownedScan.error || !ownedScan.data) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    if (action === 'prepare') {
      return prepareRetain(admin, auth.id, photoScanId, rec.poses);
    }
    if (action === 'finalize') {
      return finalizeRetain(admin, auth.id, photoScanId, rec);
    }
    if (action === 'discard') {
      return discardRetain(admin, auth.id, ownedScan.data);
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
  // Same cookie createClient() as /api/scan/prepare — never the admin client.
  const supabase = await createClient();
  const resolvedHeight = await readResolvedHeightCm(supabase, userId);
  const stamped = stampFiniteHeight(resolvedHeight);
  const sessionRow: Database['public']['Tables']['body_photo_sessions']['Insert'] = {
    id: sessionId,
    user_id: userId,
    protocol: FORMAVISION_PHOTO_PROTOCOL,
    capture_status: 'uploading',
  };
  // Gary HARD lock: stamp finite CAQ-first height only. Never invent.
  // Map resolver source → LIVE CHECK (caq_phase_1 | pre_scan_update | manual).
  if (stamped) {
    sessionRow.height_cm_at_scan = stamped.heightCm;
    if (stamped.source) sessionRow.height_cm_source = stamped.source;
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

/**
 * Option C: discard kept FRBL for one owned photo scan.
 * Resolves photo_session_id server-side. Removes named full/thumb paths,
 * everything listed under the session prefix, and explicit Meshy/Tripo GLB
 * paths. Fail closed if list/remove fails. Updates scan retain flags only
 * — never estimated_body_fat_*. Clears session path columns. Does not
 * DELETE body_photo_sessions (no CASCADE). Does not start Meshy/Tripo.
 * Already-discarded is idempotent 200.
 */
async function discardRetain(
  admin: SupabaseClient,
  userId: string,
  scan: OwnedPhotoScanRow,
): Promise<NextResponse> {
  const sessionId =
    typeof scan.photo_session_id === 'string' && UUID_RE.test(scan.photo_session_id)
      ? scan.photo_session_id
      : null;
  const alreadyDiscarded = scan.photos_retained !== true && sessionId === null;
  if (alreadyDiscarded) {
    return NextResponse.json({ ok: true, discarded: true });
  }

  if (sessionId) {
    const sessionRes = await withTimeout<{
      data: SessionPathRow | null;
      error: { message: string } | null;
    }>(
      Promise.resolve(
        admin
          .from('body_photo_sessions')
          .select(`id,user_id,${SESSION_PATH_COLUMNS.join(',')}`)
          .eq('id', sessionId)
          .eq('user_id', userId)
          .maybeSingle(),
      ) as Promise<{ data: SessionPathRow | null; error: { message: string } | null }>,
      DB_TIMEOUT_MS,
      `${SCOPE}.discardSession`,
    );
    if (sessionRes.error) {
      safeLog.error(SCOPE, 'discard session lookup failed', { error: sessionRes.error.message });
      return NextResponse.json({ ok: false, error: 'lookup_failed' }, { status: 500 });
    }

    const namedPaths = SESSION_PATH_COLUMNS.map((col) => sessionRes.data?.[col]).filter(
      (p): p is string => typeof p === 'string' && p.length > 0,
    );

    const listedPaths = await listAllUnderPrefix(admin, `${userId}/${sessionId}/`);
    if (listedPaths === null) {
      safeLog.error(SCOPE, 'discard storage list failed', { sessionId });
      return NextResponse.json({ ok: false, error: 'storage_list_failed' }, { status: 500 });
    }

    const paths = Array.from(
      new Set([
        ...namedPaths,
        ...listedPaths,
        frblGlbStoragePath(userId, sessionId),
        tripoGlbStoragePath(userId, sessionId),
      ]),
    );

    if (paths.length > 0) {
      const removeRes = await withTimeout<{ error: { message: string } | null }>(
        Promise.resolve(admin.storage.from(BUCKET).remove(paths)) as Promise<{
          error: { message: string } | null;
        }>,
        DB_TIMEOUT_MS,
        `${SCOPE}.discardRemove`,
      ).catch((error: unknown) => ({
        error: { message: error instanceof Error ? error.message : 'unknown' },
      }));

      if (removeRes.error) {
        safeLog.error(SCOPE, 'discard storage remove failed', {
          sessionId,
          error: removeRes.error.message,
        });
        return NextResponse.json({ ok: false, error: 'storage_remove_failed' }, { status: 500 });
      }
    }

    const sessionUpdate = await withTimeout<{ error: { message: string } | null }>(
      Promise.resolve(
        admin
          .from('body_photo_sessions')
          .update(clearedSessionPathPatch())
          .eq('id', sessionId)
          .eq('user_id', userId),
      ) as Promise<{ error: { message: string } | null }>,
      DB_TIMEOUT_MS,
      `${SCOPE}.discardSessionClear`,
    );
    if (sessionUpdate.error) {
      safeLog.warn(SCOPE, 'discard session path clear failed', { error: sessionUpdate.error.message });
      return NextResponse.json({ ok: false, error: 'store_failed' }, { status: 500 });
    }
  }

  const scanUpdate = await withTimeout<{ error: { message: string } | null }>(
    Promise.resolve(
      admin
        .from('body_tracker_photo_scans')
        .update({
          photos_retained: false,
          photo_session_id: null,
          retained_views: null,
        })
        .eq('id', scan.id)
        .eq('user_id', userId),
    ) as Promise<{ error: { message: string } | null }>,
    DB_TIMEOUT_MS,
    `${SCOPE}.discardScan`,
  );
  if (scanUpdate.error) {
    safeLog.warn(SCOPE, 'discard scan flag update failed', { error: scanUpdate.error.message });
    return NextResponse.json({ ok: false, error: 'store_failed' }, { status: 500 });
  }

  safeLog.info(SCOPE, 'retain discarded', { photoScanId: scan.id, sessionId });
  return NextResponse.json({ ok: true, discarded: true });
}
