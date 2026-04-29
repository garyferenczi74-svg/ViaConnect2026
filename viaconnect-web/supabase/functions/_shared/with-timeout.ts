/**
 * supabase/functions/_shared/with-timeout.ts
 *
 * Deno-compatible mirror of src/lib/utils/with-timeout.ts.
 * Used by Supabase Edge Functions which run on Deno and cannot import from
 * the Next.js side.
 *
 * Created as part of Prompt #140b (Layer 3 Hardening).
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
 *   // Supabase call inside an edge function
 *   const result = await withTimeout(
 *     supabase.from('table').select('*').limit(100),
 *     15000,
 *     'edge-function.example.db-read'
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

export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError
}
