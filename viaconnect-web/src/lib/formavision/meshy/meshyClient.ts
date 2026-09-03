import { getCircuitBreaker, isCircuitBreakerError } from '@/lib/utils/circuit-breaker';
import { isTimeoutError, withAbortTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { meshyAuthHeader } from './meshyApiKey';
import { mapMeshyHttpError } from './meshyVisualState';
import {
  MESHY_AI_MODEL,
  MESHY_CREATE_URL,
  MESHY_POSE_MODE,
  MESHY_TARGET_POLYCOUNT,
  MESHY_TEXTURE_RESOLUTION,
  type MeshyCreateRequestBody,
  type MeshyErrorCode,
  type MeshyTaskRecord,
} from './types';

const SCOPE = 'formavision.meshy';
const CREATE_TIMEOUT_MS = 15_000;
const POLL_TIMEOUT_MS = 15_000;
const DOWNLOAD_TIMEOUT_MS = 45_000;

export function buildMeshyCreateBody(imageUrls: string[]): MeshyCreateRequestBody {
  return {
    image_urls: imageUrls,
    ai_model: MESHY_AI_MODEL,
    should_texture: true,
    texture_resolution: MESHY_TEXTURE_RESOLUTION,
    ultra_mode: false,
    enable_pbr: false,
    should_remesh: true,
    topology: 'triangle',
    target_polycount: MESHY_TARGET_POLYCOUNT,
    pose_mode: MESHY_POSE_MODE,
    target_formats: ['glb'],
    moderation: false,
  };
}

export interface MeshyHttpResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  errorCode: MeshyErrorCode | null;
}

function redactMeshyErrorText(text: string): string {
  return text.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]').slice(0, 400);
}

export async function createMeshyTask(
  apiKey: string,
  imageUrls: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<MeshyHttpResult<{ taskId: string }>> {
  const breaker = getCircuitBreaker('meshy-multi-image-to-3d');
  try {
    const response = await breaker.execute(() =>
      withAbortTimeout(
        (signal) =>
          fetchImpl(MESHY_CREATE_URL, {
            method: 'POST',
            headers: {
              Authorization: meshyAuthHeader(apiKey),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(buildMeshyCreateBody(imageUrls)),
            signal,
          }),
        CREATE_TIMEOUT_MS,
        `${SCOPE}.create`,
      ),
    );
    const text = await response.text();
    if (!response.ok) {
      const errorCode = mapMeshyHttpError(response.status, text);
      safeLog.warn(SCOPE, 'create rejected', { status: response.status, errorCode });
      return { ok: false, status: response.status, data: null, errorCode };
    }
    let parsed: { result?: unknown } = {};
    try {
      parsed = JSON.parse(text) as { result?: unknown };
    } catch {
      return { ok: false, status: response.status, data: null, errorCode: 'meshy_failed' };
    }
    const taskId = typeof parsed.result === 'string' ? parsed.result : null;
    if (!taskId) {
      return { ok: false, status: response.status, data: null, errorCode: 'meshy_failed' };
    }
    return { ok: true, status: response.status, data: { taskId }, errorCode: null };
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn(SCOPE, 'create timeout', { error: error.message });
      return { ok: false, status: 0, data: null, errorCode: 'timeout' };
    }
    if (isCircuitBreakerError(error)) {
      safeLog.warn(SCOPE, 'create circuit open', { breaker: error.breakerName });
      return { ok: false, status: 0, data: null, errorCode: 'meshy_failed' };
    }
    safeLog.warn(SCOPE, 'create threw', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return { ok: false, status: 0, data: null, errorCode: 'meshy_failed' };
  }
}

export async function getMeshyTask(
  apiKey: string,
  taskId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MeshyHttpResult<MeshyTaskRecord>> {
  const breaker = getCircuitBreaker('meshy-multi-image-to-3d');
  try {
    const response = await breaker.execute(() =>
      withAbortTimeout(
        (signal) =>
          fetchImpl(`${MESHY_CREATE_URL}/${encodeURIComponent(taskId)}`, {
            method: 'GET',
            headers: { Authorization: meshyAuthHeader(apiKey) },
            signal,
          }),
        POLL_TIMEOUT_MS,
        `${SCOPE}.poll`,
      ),
    );
    const text = await response.text();
    if (!response.ok) {
      const errorCode = mapMeshyHttpError(response.status, text);
      safeLog.warn(SCOPE, 'poll rejected', { status: response.status, errorCode });
      return { ok: false, status: response.status, data: null, errorCode };
    }
    try {
      const data = JSON.parse(text) as MeshyTaskRecord;
      return { ok: true, status: response.status, data, errorCode: null };
    } catch {
      return { ok: false, status: response.status, data: null, errorCode: 'meshy_failed' };
    }
  } catch (error) {
    if (isTimeoutError(error)) {
      return { ok: false, status: 0, data: null, errorCode: 'timeout' };
    }
    if (isCircuitBreakerError(error)) {
      return { ok: false, status: 0, data: null, errorCode: 'meshy_failed' };
    }
    return { ok: false, status: 0, data: null, errorCode: 'meshy_failed' };
  }
}

export async function downloadMeshyGlb(
  glbUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MeshyHttpResult<ArrayBuffer>> {
  try {
    const response = await withAbortTimeout(
      (signal) => fetchImpl(glbUrl, { method: 'GET', signal }),
      DOWNLOAD_TIMEOUT_MS,
      `${SCOPE}.download`,
    );
    if (!response.ok) {
      return { ok: false, status: response.status, data: null, errorCode: 'store_failed' };
    }
    const buffer = await response.arrayBuffer();
    return { ok: true, status: response.status, data: buffer, errorCode: null };
  } catch (error) {
    if (isTimeoutError(error)) {
      return { ok: false, status: 0, data: null, errorCode: 'timeout' };
    }
    safeLog.warn(SCOPE, 'glb download failed', {
      error: error instanceof Error ? redactMeshyErrorText(error.message) : 'unknown',
    });
    return { ok: false, status: 0, data: null, errorCode: 'store_failed' };
  }
}
