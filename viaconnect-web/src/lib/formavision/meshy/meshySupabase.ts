import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { PHOTO_BUCKET, PHOTO_SIGNED_TTL_SECONDS, type MeshyVisualState } from './types';
import type { SessionPhotoRow } from './createMeshyVisual';

const SCOPE = 'formavision.meshy.db';
const DB_TIMEOUT_MS = 5000;

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

const SESSION_COLUMNS =
  'id,user_id,meshy_visual,front_full_path,right_full_path,back_full_path,left_full_path';

export async function readOwnedSession(
  admin: SupabaseClient,
  sessionId: string,
  userId: string,
): Promise<SessionPhotoRow | null> {
  const res = await withTimeout<QueryResult<SessionPhotoRow>>(
    Promise.resolve(
      admin
        .from('body_photo_sessions')
        .select(SESSION_COLUMNS)
        .eq('id', sessionId)
        .eq('user_id', userId)
        .maybeSingle(),
    ) as Promise<QueryResult<SessionPhotoRow>>,
    DB_TIMEOUT_MS,
    `${SCOPE}.read`,
  );
  if (res.error) {
    safeLog.warn(SCOPE, 'session read failed', { error: res.error.message });
    return null;
  }
  return res.data;
}

export async function persistMeshyVisual(
  admin: SupabaseClient,
  sessionId: string,
  userId: string,
  visual: MeshyVisualState,
): Promise<void> {
  const res = await withTimeout<QueryResult<{ id: string }>>(
    Promise.resolve(
      admin
        .from('body_photo_sessions')
        .update({ meshy_visual: visual })
        .eq('id', sessionId)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle(),
    ) as Promise<QueryResult<{ id: string }>>,
    DB_TIMEOUT_MS,
    `${SCOPE}.persist`,
  );
  if (res.error) {
    safeLog.warn(SCOPE, 'visual persist failed', { error: res.error.message });
  }
}

export async function signPhotoPaths(
  admin: SupabaseClient,
  paths: string[],
): Promise<string[]> {
  const urls: string[] = [];
  for (const path of paths) {
    const res = await withTimeout<{
      data: { signedUrl: string } | null;
      error: { message: string } | null;
    }>(
      Promise.resolve(admin.storage.from(PHOTO_BUCKET).createSignedUrl(path, PHOTO_SIGNED_TTL_SECONDS)) as Promise<{
        data: { signedUrl: string } | null;
        error: { message: string } | null;
      }>,
      DB_TIMEOUT_MS,
      `${SCOPE}.signPhoto`,
    );
    if (res.data?.signedUrl) urls.push(res.data.signedUrl);
  }
  return urls;
}

export async function storeMirroredGlb(
  admin: SupabaseClient,
  path: string,
  bytes: ArrayBuffer,
): Promise<boolean> {
  const res = await withTimeout<{ error: { message: string } | null }>(
    Promise.resolve(
      admin.storage.from(PHOTO_BUCKET).upload(path, bytes, {
        contentType: 'model/gltf-binary',
        upsert: true,
      }),
    ) as Promise<{ error: { message: string } | null }>,
    20_000,
    `${SCOPE}.storeGlb`,
  );
  if (res.error) {
    safeLog.warn(SCOPE, 'glb store failed', { error: res.error.message });
    return false;
  }
  return true;
}

export async function signStoredGlb(
  admin: SupabaseClient,
  path: string,
  ttlSeconds: number,
): Promise<string | null> {
  const res = await withTimeout<{
    data: { signedUrl: string } | null;
    error: { message: string } | null;
  }>(
    Promise.resolve(admin.storage.from(PHOTO_BUCKET).createSignedUrl(path, ttlSeconds)) as Promise<{
      data: { signedUrl: string } | null;
      error: { message: string } | null;
    }>,
    DB_TIMEOUT_MS,
    `${SCOPE}.signGlb`,
  );
  if (res.error || !res.data?.signedUrl) {
    safeLog.warn(SCOPE, 'glb sign failed', { error: res.error?.message ?? 'missing url' });
    return null;
  }
  return res.data.signedUrl;
}

export function buildCreateDeps(admin: SupabaseClient, userId: string) {
  return {
    readSession: (sessionId: string, ownerId: string) => readOwnedSession(admin, sessionId, ownerId),
    signPhotoUrls: (paths: string[]) => signPhotoPaths(admin, paths),
    persistVisual: (sessionId: string, visual: MeshyVisualState) =>
      persistMeshyVisual(admin, sessionId, userId, visual),
  };
}

export function buildAdvanceDeps(admin: SupabaseClient, userId: string) {
  return {
    persistVisual: (sessionId: string, visual: MeshyVisualState) =>
      persistMeshyVisual(admin, sessionId, userId, visual),
    storeGlb: (path: string, bytes: ArrayBuffer) => storeMirroredGlb(admin, path, bytes),
  };
}
