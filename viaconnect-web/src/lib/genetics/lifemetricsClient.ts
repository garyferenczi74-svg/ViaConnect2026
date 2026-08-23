/**
 * src/lib/genetics/lifemetricsClient.ts
 *
 * Optional pull helper for LifeMetrics Platform API v3.2 (action envelope).
 * POST https://api-v2.lifemetrics.com/v1/platform-api
 * Auth: x-api-key plus Bearer from authenticate. Reads LIFEMETRICS_API_KEY
 * from env when present. Does not invent live secrets.
 *
 * Used when a webhook event is a pointer (result id / order id) and the
 * inline payload has no rows to map. The outbound GeneMetrics poller stays.
 *
 * Standing rules: no em or en dashes, TypeScript strict (no any).
 */

import { withAbortTimeout } from '@/lib/utils/with-timeout';
import { getCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { safeLog } from '@/lib/utils/safe-log';

const SCOPE = 'genetics.lifemetrics.client';
const DEFAULT_API_URL = 'https://api-v2.lifemetrics.com/v1/platform-api';
const breaker = getCircuitBreaker('lifemetrics-api');

export interface LifemetricsActionEnvelope {
  action: string;
  payload?: Record<string, unknown>;
}

export interface LifemetricsPullPointer {
  resultId?: string | null;
  orderId?: string | null;
  kitBarcode?: string | null;
}

export function readLifemetricsApiKey(): string {
  return process.env.LIFEMETRICS_API_KEY ?? '';
}

export function readLifemetricsApiUrl(): string {
  return process.env.LIFEMETRICS_API_URL || DEFAULT_API_URL;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function extractLifemetricsPullPointer(payload: unknown): LifemetricsPullPointer {
  const root = asRecord(payload) ?? {};
  const data = asRecord(root.data) ?? {};
  const inner = asRecord(root.payload) ?? {};
  const result = asRecord(root.result) ?? {};
  const bags = [root, data, inner, result];
  const read = (keys: string[]): string | null => {
    for (const bag of bags) {
      for (const key of keys) {
        const value = asString(bag[key]);
        if (value) return value;
      }
    }
    return null;
  };
  return {
    resultId: read(['result_id', 'resultId', 'genetics_result_id', 'genome_result_id']),
    orderId: read(['order_id', 'orderId', 'lab_order_id']),
    kitBarcode: read(['kit_barcode', 'barcode', 'kit_id', 'kitBarcode']),
  };
}

function extractBearer(body: unknown): string | null {
  const record = asRecord(body);
  if (!record) return null;
  const data = asRecord(record.data);
  return (
    asString(record.token) ??
    asString(record.access_token) ??
    asString(record.bearer) ??
    (data
      ? asString(data.token) ?? asString(data.access_token) ?? asString(data.bearer)
      : null)
  );
}

async function postAction(
  envelope: LifemetricsActionEnvelope,
  apiKey: string,
  bearer: string | null,
): Promise<unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const res = await breaker.execute(() =>
    withAbortTimeout(
      (signal) =>
        fetch(readLifemetricsApiUrl(), {
          method: 'POST',
          headers,
          body: JSON.stringify(envelope),
          signal,
        }),
      15000,
      `${SCOPE}.${envelope.action}`,
    ),
  );
  if (!res.ok) {
    safeLog.warn(SCOPE, 'platform action failed', {
      action: envelope.action,
      status: res.status,
    });
    return null;
  }
  try {
    return await res.json();
  } catch {
    safeLog.warn(SCOPE, 'platform action returned non-json', { action: envelope.action });
    return null;
  }
}

/**
 * Authenticate, then pull a genetics or lab result by pointer. Returns the
 * JSON body for the mapper, or null when the key is missing or the call fails.
 */
export async function pullLifemetricsResult(
  pointer: LifemetricsPullPointer,
  eventType: string | null,
): Promise<unknown | null> {
  const apiKey = readLifemetricsApiKey();
  if (!apiKey) return null;
  if (!pointer.resultId && !pointer.orderId && !pointer.kitBarcode) return null;

  const authBody = await postAction({ action: 'authenticate', payload: {} }, apiKey, null);
  const bearer = extractBearer(authBody);
  if (!bearer) {
    safeLog.warn(SCOPE, 'authenticate returned no bearer', {});
    return null;
  }

  const isLab =
    eventType === 'lab_results.received' || eventType === 'lab_order.results_ready';
  const action = isLab ? 'lab_results.get' : 'genetics_result.get';
  const payload: Record<string, unknown> = {};
  if (pointer.resultId) payload.result_id = pointer.resultId;
  if (pointer.orderId) payload.order_id = pointer.orderId;
  if (pointer.kitBarcode) payload.kit_barcode = pointer.kitBarcode;

  return postAction({ action, payload }, apiKey, bearer);
}
