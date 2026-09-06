import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { signPhotoPaths, signStoredGlb, storeMirroredGlb } from '@/lib/formavision/meshy/meshySupabase';
import type { TripoVisualState } from './types';
import type { TripoSessionPhotoRow } from './createTripoVisual';

const SCOPE = 'formavision.tripo.db';
const DB_TIMEOUT_MS = 5000;

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

const SESSION_COLUMNS =
  'id,user_id,tripo_visual,front_full_path,right_full_path,back_full_path,left_full_path';

export async function readOwnedTripoSession(
  admin: SupabaseClient,
  sessionId: string,
  userId: string,
): Promise<TripoSessionPhotoRow | null> {
  const res = await withTimeout<QueryResult<TripoSessionPhotoRow>>(
    Promise.resolve(
      admin
        .from('body_photo_sessions')
        .select(SESSION_COLUMNS)
        .eq('id', sessionId)
        .eq('user_id', userId)
        .maybeSingle(),
    ) as Promise<QueryResult<TripoSessionPhotoRow>>,
    DB_TIMEOUT_MS,
    `${SCOPE}.read`,
  );
  if (res.error) {
    safeLog.warn(SCOPE, 'session read failed', { error: res.error.message });
    return null;
  }
  return res.data;
}

export async function persistTripoVisual(
  admin: SupabaseClient,
  sessionId: string,
  userId: string,
  visual: TripoVisualState,
): Promise<void> {
  const res = await withTimeout<QueryResult<{ id: string }>>(
    Promise.resolve(
      admin
        .from('body_photo_sessions')
        .update({ tripo_visual: visual })
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

export function buildTripoCreateDeps(admin: SupabaseClient, userId: string) {
  return {
    readSession: (sessionId: string, ownerId: string) =>
      readOwnedTripoSession(admin, sessionId, ownerId),
    signPhotoUrls: (paths: string[]) => signPhotoPaths(admin, paths),
    persistVisual: (sessionId: string, visual: TripoVisualState) =>
      persistTripoVisual(admin, sessionId, userId, visual),
  };
}

export function buildTripoAdvanceDeps(admin: SupabaseClient, userId: string) {
  return {
    persistVisual: (sessionId: string, visual: TripoVisualState) =>
      persistTripoVisual(admin, sessionId, userId, visual),
    storeGlb: (path: string, bytes: ArrayBuffer) => storeMirroredGlb(admin, path, bytes),
  };
}

export { signStoredGlb };
