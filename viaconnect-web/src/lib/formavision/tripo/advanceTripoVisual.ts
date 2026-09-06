import { downloadTripoGlb, getTripoTask, mapTripoTaskStatus } from './tripoClient';
import { readTripoApiKey } from './tripoApiKey';
import { tripoGlbStoragePath } from './tripoViews';
import { isTerminalMeshyStatus, toPersistedMeshyVisual } from '@/lib/formavision/meshy/meshyVisualState';
import type { TripoVisualState } from './types';

export interface AdvanceTripoDeps {
  fetchImpl?: typeof fetch;
  persistVisual: (sessionId: string, visual: TripoVisualState) => Promise<void>;
  storeGlb: (path: string, bytes: ArrayBuffer) => Promise<boolean>;
  now?: () => string;
  apiKey?: string | null;
}

export async function advanceTripoVisual(
  sessionId: string,
  userId: string,
  current: TripoVisualState,
  deps: AdvanceTripoDeps,
): Promise<TripoVisualState> {
  const now = deps.now ?? (() => new Date().toISOString());
  const stamp = now();
  const apiKey = deps.apiKey !== undefined ? deps.apiKey : readTripoApiKey();

  if (current.status === 'succeeded' && current.glbPath) {
    return current;
  }
  if (isTerminalMeshyStatus(current.status) && current.status !== 'succeeded') {
    return current;
  }
  if (!apiKey) {
    const visual: TripoVisualState = {
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

  const polled = await getTripoTask(apiKey, current.taskId, deps.fetchImpl ?? fetch);
  if (!polled.ok || !polled.data) {
    if (polled.errorCode === 'timeout' || polled.errorCode === 'rate_limited') {
      return { ...current, updatedAt: stamp, errorCode: polled.errorCode };
    }
    const visual: TripoVisualState = {
      ...current,
      status: polled.errorCode === 'moderation_blocked' ? 'moderation_blocked' : 'failed',
      errorCode: polled.errorCode === 'tripo_failed' ? 'meshy_failed' : polled.errorCode,
      updatedAt: stamp,
    };
    await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
    return visual;
  }

  const mapped = mapTripoTaskStatus(polled.data.status);
  const progress =
    typeof polled.data.progress === 'number' && Number.isFinite(polled.data.progress)
      ? polled.data.progress
      : current.progress;

  if (mapped.status !== 'succeeded') {
    const visual: TripoVisualState = {
      ...current,
      status: mapped.status,
      errorCode: mapped.errorCode === 'tripo_failed' ? 'meshy_failed' : mapped.errorCode,
      progress,
      updatedAt: stamp,
    };
    await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
    return visual;
  }

  const glbUrl = polled.data.output?.model_url;
  if (typeof glbUrl !== 'string' || glbUrl.length === 0) {
    const visual: TripoVisualState = {
      ...current,
      status: 'failed',
      errorCode: 'store_failed',
      progress,
      updatedAt: stamp,
    };
    await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
    return visual;
  }

  const downloaded = await downloadTripoGlb(glbUrl, deps.fetchImpl ?? fetch);
  if (!downloaded.ok || !downloaded.data) {
    const visual: TripoVisualState = {
      ...current,
      status: 'failed',
      errorCode: downloaded.errorCode === 'tripo_failed' ? 'store_failed' : downloaded.errorCode,
      progress,
      updatedAt: stamp,
    };
    await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
    return visual;
  }

  const glbPath = tripoGlbStoragePath(userId, sessionId);
  const stored = await deps.storeGlb(glbPath, downloaded.data);
  if (!stored) {
    const visual: TripoVisualState = {
      ...current,
      status: 'failed',
      errorCode: 'store_failed',
      progress,
      updatedAt: stamp,
    };
    await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
    return visual;
  }

  const visual: TripoVisualState = {
    ...current,
    status: 'succeeded',
    glbPath,
    glbBytes: downloaded.data.byteLength,
    errorCode: null,
    progress: 100,
    updatedAt: stamp,
  };
  await deps.persistVisual(sessionId, toPersistedMeshyVisual(visual));
  return visual;
}
