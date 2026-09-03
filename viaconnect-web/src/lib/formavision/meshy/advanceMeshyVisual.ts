import { downloadMeshyGlb, getMeshyTask } from './meshyClient';
import { readMeshyApiKey } from './meshyApiKey';
import { frblGlbStoragePath } from './frblOrder';
import { isTerminalMeshyStatus, mapMeshyTaskStatus, toPersistedMeshyVisual } from './meshyVisualState';
import type { MeshyVisualState } from './types';

export interface AdvanceMeshyDeps {
  fetchImpl?: typeof fetch;
  persistVisual: (sessionId: string, visual: MeshyVisualState) => Promise<void>;
  storeGlb: (path: string, bytes: ArrayBuffer) => Promise<boolean>;
  now?: () => string;
  apiKey?: string | null;
}

export async function advanceMeshyVisual(
  sessionId: string,
  userId: string,
  current: MeshyVisualState,
  deps: AdvanceMeshyDeps,
): Promise<MeshyVisualState> {
  const now = deps.now ?? (() => new Date().toISOString());
  const stamp = now();
  const apiKey = deps.apiKey !== undefined ? deps.apiKey : readMeshyApiKey();

  if (current.status === 'succeeded' && current.glbPath) {
    return current;
  }
  if (isTerminalMeshyStatus(current.status) && current.status !== 'succeeded') {
    return current;
  }
  if (!apiKey) {
    const visual: MeshyVisualState = {
      ...current,
      status: 'skipped_no_key',
      errorCode: 'no_key',
      updatedAt: stamp,
    };
    await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
    return visual;
  }
  if (!current.taskId) {
    return current;
  }

  const polled = await getMeshyTask(apiKey, current.taskId, deps.fetchImpl ?? fetch);
  if (!polled.ok || !polled.data) {
    if (polled.errorCode === 'timeout' || polled.errorCode === 'rate_limited') {
      return { ...current, updatedAt: stamp, errorCode: polled.errorCode };
    }
    const visual: MeshyVisualState = {
      ...current,
      status: polled.errorCode === 'moderation_blocked' ? 'moderation_blocked' : 'failed',
      errorCode: polled.errorCode,
      updatedAt: stamp,
    };
    await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
    return visual;
  }

  const mapped = mapMeshyTaskStatus(polled.data.status, polled.data.task_error?.message ?? null);
  const progress =
    typeof polled.data.progress === 'number' && Number.isFinite(polled.data.progress)
      ? polled.data.progress
      : current.progress;

  if (mapped.status !== 'succeeded') {
    const visual: MeshyVisualState = {
      ...current,
      status: mapped.status,
      errorCode: mapped.errorCode,
      progress,
      updatedAt: stamp,
    };
    await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
    return visual;
  }

  const glbUrl = polled.data.model_urls?.glb;
  if (typeof glbUrl !== 'string' || glbUrl.length === 0) {
    const visual: MeshyVisualState = {
      ...current,
      status: 'failed',
      errorCode: 'store_failed',
      progress,
      updatedAt: stamp,
    };
    await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
    return visual;
  }

  const downloaded = await downloadMeshyGlb(glbUrl, deps.fetchImpl ?? fetch);
  if (!downloaded.ok || !downloaded.data) {
    const visual: MeshyVisualState = {
      ...current,
      status: 'failed',
      errorCode: downloaded.errorCode ?? 'store_failed',
      progress,
      updatedAt: stamp,
    };
    await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
    return visual;
  }

  const glbPath = frblGlbStoragePath(userId, sessionId);
  const stored = await deps.storeGlb(glbPath, downloaded.data);
  if (!stored) {
    const visual: MeshyVisualState = {
      ...current,
      status: 'failed',
      errorCode: 'store_failed',
      progress,
      updatedAt: stamp,
    };
    await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
    return visual;
  }

  const visual: MeshyVisualState = {
    ...current,
    status: 'succeeded',
    errorCode: null,
    glbPath,
    glbBytes: downloaded.data.byteLength,
    progress: 100,
    updatedAt: stamp,
  };
  await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
  return visual;
}
