// Prompt #170 Phase 1b: NutriVision pipeline timeout wrapper.
// Per Prompt 170 §3.3 every external API call and every Supabase call in the
// NutriVision pipeline is wrapped in Promise.race against a timeout. Default
// budgets: 3000 ms for fast endpoints, 5000 ms for vision provider calls.
// On timeout we emit a structured warn log via safeLog (do NOT instantiate a
// parallel logger) and throw TimeoutError so callers can branch on isTimeoutError.
//
// Note: a generic withTimeout already lives at src/lib/utils/with-timeout.ts
// (Prompt #140). This module is the NutriVision-domain wrapper that adds an
// op label, request_id propagation, and the safeLog warn line at the timeout
// boundary. Pipeline code imports from here; cross-cutting infrastructure
// keeps using the generic helper.
//
// Hard rules honored: no em or en dashes anywhere, no emojis, no any.

import { safeLog } from '@/lib/utils/safe-log';

export interface WithTimeoutOptions {
  timeoutMs: number;
  op: string;
  requestId?: string;
}

export class TimeoutError extends Error {
  readonly name = 'TimeoutError' as const;
  readonly timeoutMs: number;
  readonly op: string;

  constructor(op: string, timeoutMs: number) {
    super(`NutriVision operation "${op}" timed out after ${timeoutMs}ms`);
    this.timeoutMs = timeoutMs;
    this.op = op;
  }
}

export function isTimeoutError(err: unknown): err is TimeoutError {
  return err instanceof TimeoutError;
}

export async function withTimeout<T>(promise: Promise<T>, opts: WithTimeoutOptions): Promise<T> {
  const { timeoutMs, op, requestId } = opts;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      safeLog.warn('nutrivision.timeout', op, { op, timeout_ms: timeoutMs, request_id: requestId });
      reject(new TimeoutError(op, timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
