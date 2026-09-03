import { createMeshyTask } from './meshyClient';
import { readMeshyApiKey } from './meshyApiKey';
import { orderFrblPhotos, type PosePathRecord } from './frblOrder';
import {
  emptyMeshyVisual,
  isTerminalMeshyStatus,
  sanitizeMeshyVisual,
  toPersistedMeshyVisual,
} from './meshyVisualState';
import type { CreateMeshyResult, MeshyVisualState } from './types';

export interface SessionPhotoRow extends PosePathRecord {
  id: string;
  user_id?: string;
  meshy_visual?: unknown;
}

export interface CreateMeshyDeps {
  fetchImpl?: typeof fetch;
  readSession: (sessionId: string, userId: string) => Promise<SessionPhotoRow | null>;
  signPhotoUrls: (paths: string[]) => Promise<string[]>;
  persistVisual: (sessionId: string, visual: MeshyVisualState) => Promise<void>;
  now?: () => string;
  apiKey?: string | null;
}

function failedResult(
  visual: MeshyVisualState,
  errorCode: CreateMeshyResult['errorCode'],
): CreateMeshyResult {
  return { ok: false, skipped: false, visual, errorCode };
}

export async function createMeshyVisual(
  sessionId: string,
  userId: string,
  deps: CreateMeshyDeps,
): Promise<CreateMeshyResult> {
  const now = deps.now ?? (() => new Date().toISOString());
  const stamp = now();
  const apiKey = deps.apiKey !== undefined ? deps.apiKey : readMeshyApiKey();

  if (!apiKey) {
    const visual: MeshyVisualState = {
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

  const existing = sanitizeMeshyVisual(session.meshy_visual, stamp);
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

  const photos = orderFrblPhotos(session);
  if (photos.length === 0) {
    const visual: MeshyVisualState = {
      ...emptyMeshyVisual(stamp),
      status: 'failed',
      errorCode: 'no_photos',
    };
    await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
    return failedResult(visual, 'no_photos');
  }

  const signed = await deps.signPhotoUrls(photos.map((p) => p.path));
  const imageUrls = signed.filter((url) => typeof url === 'string' && url.length > 0);
  if (imageUrls.length === 0) {
    const visual: MeshyVisualState = {
      ...emptyMeshyVisual(stamp),
      views: photos.map((p) => p.view),
      status: 'failed',
      errorCode: 'meshy_failed',
    };
    await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
    return failedResult(visual, 'meshy_failed');
  }

  const created = await createMeshyTask(apiKey, imageUrls, deps.fetchImpl ?? fetch);
  if (!created.ok || !created.data) {
    const visual: MeshyVisualState = {
      ...emptyMeshyVisual(stamp),
      views: photos.map((p) => p.view),
      status: created.errorCode === 'moderation_blocked' ? 'moderation_blocked' : 'failed',
      errorCode: created.errorCode,
    };
    await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
    return failedResult(visual, created.errorCode);
  }

  const visual: MeshyVisualState = {
    taskId: created.data.taskId,
    status: 'pending',
    glbPath: null,
    glbBytes: null,
    views: photos.map((p) => p.view),
    errorCode: null,
    progress: 0,
    createdAt: existing.createdAt === existing.updatedAt ? stamp : existing.createdAt,
    updatedAt: stamp,
  };
  await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
  return { ok: true, skipped: false, visual, errorCode: null };
}
