import type { LlmErrorCode } from './types';

export function classifyHttpStatus(status: number): { code: LlmErrorCode; retryable: boolean } {
  if (status === 429 || status === 529) return { code: 'rate_limited', retryable: true };
  if (status === 408 || status === 504) return { code: 'timeout', retryable: true };
  if (status === 401 || status === 403) return { code: 'auth_error', retryable: false };
  if (status === 400 || status === 404 || status === 422) return { code: 'bad_request', retryable: false };
  if (status >= 500 && status <= 599) return { code: 'upstream_error', retryable: true };
  return { code: 'upstream_error', retryable: false };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export async function drainBody(res: Response): Promise<void> {
  try {
    await res.text();
  } catch {
    // Closing the body must not surface as a second error.
  }
}

/** Link a timeout signal with an optional caller signal. */
export function linkAbortSignals(primary: AbortSignal, extra?: AbortSignal): AbortSignal {
  if (!extra) return primary;
  const controller = new AbortController();
  const forward = (signal: AbortSignal) => {
    if (!controller.signal.aborted) controller.abort(signal.reason);
  };
  if (primary.aborted) {
    forward(primary);
    return controller.signal;
  }
  if (extra.aborted) {
    forward(extra);
    return controller.signal;
  }
  primary.addEventListener('abort', () => forward(primary), { once: true });
  extra.addEventListener('abort', () => forward(extra), { once: true });
  return controller.signal;
}
