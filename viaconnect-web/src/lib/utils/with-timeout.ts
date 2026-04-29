/**
 * lib/utils/with-timeout.ts
 *
 * Timeout utilities for resilience hardening across all execution layers.
 * Created as part of Prompt #140 (Production Resilience Audit + Foundation Layer).
 *
 * Two variants are provided:
 *
 *   1. withTimeout: races any Promise against a timer. Use this for SDK calls
 *      that do not expose AbortSignal (e.g., Supabase client methods).
 *
 *   2. withAbortTimeout: invokes a function with an AbortSignal that gets
 *      aborted on timeout. Use this for fetch and other AbortSignal-aware APIs.
 *      This actually cancels the underlying network request, which is important
 *      to prevent resource leaks at scale.
 *
 * Usage examples:
 *
 *   // Supabase auth check in middleware
 *   const { data, error } = await withTimeout(
 *     supabase.auth.getUser(),
 *     3000,
 *     'middleware.auth.getUser'
 *   )
 *
 *   // External API call with AbortController
 *   const response = await withAbortTimeout(
 *     (signal) => fetch('https://api.anthropic.com/v1/messages', {
 *       method: 'POST',
 *       headers: { 'x-api-key': apiKey },
 *       body: JSON.stringify(payload),
 *       signal,
 *     }),
 *     10000,
 *     'edge-function.marshall.rebuttal-drafter.claude-api'
 *   )
 *
 *   // Type-safe error handling
 *   try {
 *     await withTimeout(somePromise, 5000, 'my-operation')
 *   } catch (error) {
 *     if (isTimeoutError(error)) {
 *       safeLog.warn('my-scope', 'operation timed out', { error })
 *       return fallbackValue
 *     }
 *     throw error
 *   }
 */

export class TimeoutError extends Error {
  readonly operation: string
  readonly timeoutMs: number

  constructor(operation: string, timeoutMs: number) {
    super(`Operation "${operation}" timed out after ${timeoutMs}ms`)
    this.name = 'TimeoutError'
    this.operation = operation
    this.timeoutMs = timeoutMs
  }
}

/**
 * Race a promise against a timer. If the timer wins, throws TimeoutError.
 * The original promise is allowed to settle in the background (its result is
 * discarded), and the timer is cleared on either outcome to prevent leaks.
 *
 * Use this when the underlying call does not accept an AbortSignal (most
 * Supabase client methods, third-party SDKs without abort support).
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string = 'unknown'
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new TimeoutError(operation, timeoutMs))
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    return result
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
  }
}

/**
 * Invoke a function with an AbortSignal that aborts on timeout. The function
 * is expected to use the signal in its underlying request (e.g., fetch with
 * { signal }), which actually cancels the in-flight network request rather
 * than just discarding its result.
 *
 * Use this for fetch and any vendor SDK that supports AbortSignal.
 */
export async function withAbortTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  operation: string = 'unknown'
): Promise<T> {
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => {
    controller.abort(new TimeoutError(operation, timeoutMs))
  }, timeoutMs)

  try {
    return await fn(controller.signal)
  } finally {
    clearTimeout(timeoutHandle)
  }
}

/**
 * Type guard for clean error handling at consumer call sites.
 *
 *   if (isTimeoutError(error)) {
 *     // narrowed to TimeoutError; .operation and .timeoutMs are available
 *   }
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError
}
