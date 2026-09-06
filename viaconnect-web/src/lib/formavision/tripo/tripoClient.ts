import { getCircuitBreaker, isCircuitBreakerError } from '@/lib/utils/circuit-breaker';
import { isTimeoutError, withAbortTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { tripoAuthHeader } from './tripoApiKey';
import { buildTripoMultiviewBody } from './tripoViews';
import {
  TRIPO_CREATE_URL,
  tripoTaskUrl,
  type TripoApiEnvelope,
  type TripoErrorCode,
  type TripoViewInput,
} from './types';

const SCOPE = 'formavision.tripo';
const CREATE_TIMEOUT_MS = 15_000;
const POLL_TIMEOUT_MS = 15_000;
const DOWNLOAD_TIMEOUT_MS = 45_000;

export interface TripoHttpResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  errorCode: TripoErrorCode | null;
}

function redactTripoErrorText(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/Authorization\s*[:=]\s*[^\s,"']+/gi, 'Authorization: [redacted]')
    .slice(0, 400);
}

function mapHttpError(status: number): TripoErrorCode {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 404) return 'not_found';
  if (status === 402) return 'payment_required';
  if (status === 429) return 'rate_limited';
  return 'tripo_failed';
}

export async function createTripoTask(
  apiKey: string,
  views: readonly TripoViewInput[],
  fetchImpl: typeof fetch = fetch,
): Promise<TripoHttpResult<{ taskId: string }>> {
  const breaker = getCircuitBreaker('tripo-multiview-to-model');
  try {
    const response = await breaker.execute(() =>
      withAbortTimeout(
        (signal) =>
          fetchImpl(TRIPO_CREATE_URL, {
            method: 'POST',
            headers: {
              Authorization: tripoAuthHeader(apiKey),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(buildTripoMultiviewBody(views)),
            signal,
          }),
        CREATE_TIMEOUT_MS,
        `${SCOPE}.create`,
      ),
    );
    const text = await response.text();
    if (!response.ok) {
      const errorCode = mapHttpError(response.status);
      safeLog.warn(SCOPE, 'create rejected', {
        status: response.status,
        errorCode,
        body: redactTripoErrorText(text),
      });
      return { ok: false, status: response.status, data: null, errorCode };
    }
    let parsed: TripoApiEnvelope = {};
    try {
      parsed = JSON.parse(text) as TripoApiEnvelope;
    } catch {
      return { ok: false, status: response.status, data: null, errorCode: 'tripo_failed' };
    }
    const taskId =
      typeof parsed.data?.task_id === 'string' && parsed.data.task_id.length > 0
        ? parsed.data.task_id
        : null;
    if (!taskId) {
      return { ok: false, status: response.status, data: null, errorCode: 'tripo_failed' };
    }
    return { ok: true, status: response.status, data: { taskId }, errorCode: null };
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.warn(SCOPE, 'create timeout', { error: error.message });
      return { ok: false, status: 0, data: null, errorCode: 'timeout' };
    }
    if (isCircuitBreakerError(error)) {
      safeLog.warn(SCOPE, 'create circuit open', { breaker: error.breakerName });
      return { ok: false, status: 0, data: null, errorCode: 'tripo_failed' };
    }
    safeLog.warn(SCOPE, 'create threw', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return { ok: false, status: 0, data: null, errorCode: 'tripo_failed' };
  }
}

export async function getTripoTask(
  apiKey: string,
  taskId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TripoHttpResult<TripoApiEnvelope['data']>> {
  const breaker = getCircuitBreaker('tripo-multiview-to-model');
  try {
    const response = await breaker.execute(() =>
      withAbortTimeout(
        (signal) =>
          fetchImpl(tripoTaskUrl(taskId), {
            method: 'GET',
            headers: { Authorization: tripoAuthHeader(apiKey) },
            signal,
          }),
        POLL_TIMEOUT_MS,
        `${SCOPE}.poll`,
      ),
    );
    const text = await response.text();
    if (!response.ok) {
      const errorCode = mapHttpError(response.status);
      safeLog.warn(SCOPE, 'poll rejected', {
        status: response.status,
        errorCode,
        body: redactTripoErrorText(text),
      });
      return { ok: false, status: response.status, data: null, errorCode };
    }
    try {
      const parsed = JSON.parse(text) as TripoApiEnvelope;
      return { ok: true, status: response.status, data: parsed.data ?? null, errorCode: null };
    } catch {
      return { ok: false, status: response.status, data: null, errorCode: 'tripo_failed' };
    }
  } catch (error) {
    if (isTimeoutError(error)) {
      return { ok: false, status: 0, data: null, errorCode: 'timeout' };
    }
    if (isCircuitBreakerError(error)) {
      return { ok: false, status: 0, data: null, errorCode: 'tripo_failed' };
    }
    return { ok: false, status: 0, data: null, errorCode: 'tripo_failed' };
  }
}

export async function downloadTripoGlb(
  glbUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TripoHttpResult<ArrayBuffer>> {
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
      error: error instanceof Error ? redactTripoErrorText(error.message) : 'unknown',
    });
    return { ok: false, status: 0, data: null, errorCode: 'store_failed' };
  }
}

export function mapTripoTaskStatus(status: string | undefined): {
  status: import('./types').TripoVisualStatus;
  errorCode: TripoErrorCode | null;
} {
  const raw = (status ?? '').toLowerCase();
  if (raw === 'success' || raw === 'succeeded') {
    return { status: 'succeeded', errorCode: null };
  }
  if (raw === 'running' || raw === 'processing') {
    return { status: 'in_progress', errorCode: null };
  }
  if (raw === 'queued' || raw === 'pending') {
    return { status: 'pending', errorCode: null };
  }
  if (raw === 'cancelled' || raw === 'canceled' || raw === 'failed' || raw === 'error') {
    return { status: 'failed', errorCode: 'tripo_failed' };
  }
  return { status: 'in_progress', errorCode: null };
}
