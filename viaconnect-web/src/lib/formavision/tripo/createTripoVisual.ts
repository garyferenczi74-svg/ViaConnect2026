import { createTripoTask } from './tripoClient';
import { readTripoApiKey } from './tripoApiKey';
import { orderTripoViews } from './tripoViews';
import type { PosePathRecord } from '@/lib/formavision/meshy/frblOrder';
import {
  emptyMeshyVisual,
  isTerminalMeshyStatus,
  sanitizeMeshyVisual,
  toPersistedMeshyVisual,
} from '@/lib/formavision/meshy/meshyVisualState';
import type { CreateTripoResult, TripoVisualState } from './types';

export interface TripoSessionPhotoRow extends PosePathRecord {
  id: string;
  user_id?: string;
  tripo_visual?: unknown;
}

export interface CreateTripoDeps {
  fetchImpl?: typeof fetch;
  readSession: (sessionId: string, userId: string) => Promise<TripoSessionPhotoRow | null>;
  signPhotoUrls: (paths: string[]) => Promise<string[]>;
  persistVisual: (sessionId: string, visual: TripoVisualState) => Promise<void>;
  now?: () => string;
  apiKey?: string | null;
}

function failedResult(
  visual: TripoVisualState,
  errorCode: CreateTripoResult['errorCode'],
): CreateTripoResult {
  return { ok: false, skipped: false, visual, errorCode };
}

export async function createTripoVisual(
  sessionId: string,
  userId: string,
  deps: CreateTripoDeps,
): Promise<CreateTripoResult> {
  const now = deps.now ?? (() => new Date().toISOString());
  const stamp = now();
  const apiKey = deps.apiKey !== undefined ? deps.apiKey : readTripoApiKey();

  if (!apiKey) {
    const visual: TripoVisualState = {
      ...emptyMeshyVisual(stamp),
      status: 'skipped_no_key',
      errorCode: 'no_key',
    };
    return { ok: true, skipped: true, visual, errorCode: 'no_key' };
  }

  const session = await deps.readSession(sessionId, userId);
  if (!session) {
    return failedResult(emptyMeshyVisual(stamp), 'not_found');
  }

  const existing = sanitizeMeshyVisual(session.tripo_visual, stamp);
  if (existing.status === 'succeeded' && existing.glbPath) {
    return { ok: true, skipped: false, visual: existing, errorCode: null };
  }
  if (
    existing.taskId &&
    (existing.status === 'pending' || existing.status === 'in_progress') &&
    !isTerminalMeshyStatus(existing.status)
  ) {
    return { ok: true, skipped: false, visual: existing, errorCode: null };
  }

  const photos = session;
  const paths = [
    photos.front_full_path,
    photos.left_full_path,
    photos.back_full_path,
    photos.right_full_path,
  ].filter((p): p is string => typeof p === 'string' && p.length > 0);

  if (paths.length === 0) {
    const visual: TripoVisualState = {
      ...emptyMeshyVisual(stamp),
      status: 'failed',
      errorCode: 'no_photos',
    };
    await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
    return failedResult(visual, 'no_photos');
  }

  const signed = await deps.signPhotoUrls(paths);
  const signedByPath = new Map<string, string>();
  for (let i = 0; i < paths.length; i++) {
    const url = signed[i];
    if (typeof url === 'string' && url.length > 0) signedByPath.set(paths[i], url);
  }
  const views = orderTripoViews(session, signedByPath);
  if (views.length === 0) {
    const visual: TripoVisualState = {
      ...emptyMeshyVisual(stamp),
      status: 'failed',
      errorCode: 'tripo_failed',
    };
    await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
    return failedResult(visual, 'tripo_failed');
  }

  const created = await createTripoTask(apiKey, views, deps.fetchImpl ?? fetch);
  if (!created.ok || !created.data) {
    const visual: TripoVisualState = {
      ...emptyMeshyVisual(stamp),
      views: views.map((v) => v.view),
      status: created.errorCode === 'moderation_blocked' ? 'moderation_blocked' : 'failed',
      errorCode: created.errorCode === 'tripo_failed' ? 'meshy_failed' : created.errorCode,
    };
    await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
    return failedResult(visual, created.errorCode);
  }

  const visual: TripoVisualState = {
    taskId: created.data.taskId,
    status: 'pending',
    glbPath: null,
    glbBytes: null,
    views: views.map((v) => v.view),
    errorCode: null,
    progress: 0,
    createdAt: existing.createdAt === existing.updatedAt ? stamp : existing.createdAt,
    updatedAt: stamp,
  };
  await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
  return { ok: true, skipped: false, visual, errorCode: null };
}
