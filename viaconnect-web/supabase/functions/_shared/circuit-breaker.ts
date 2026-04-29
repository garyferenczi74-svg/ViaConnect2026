/**
 * supabase/functions/_shared/circuit-breaker.ts
 *
 * Deno-compatible mirror of src/lib/utils/circuit-breaker.ts.
 * Used by Supabase Edge Functions for external vendor coordination.
 *
 * Created as part of Prompt #140b (Layer 3 Hardening).
 *
 * Usage examples:
 *
 *   // Inside an edge function
 *   import { getCircuitBreaker, isCircuitBreakerError } from '../_shared/circuit-breaker.ts'
 *   import { withAbortTimeout, isTimeoutError } from '../_shared/with-timeout.ts'
 *
 *   const breaker = getCircuitBreaker('claude-api')
 *   try {
 *     const result = await breaker.execute(() =>
 *       withAbortTimeout(
 *         (signal) => fetch('https://api.anthropic.com/v1/messages', { ..., signal }),
 *         10000,
 *         'edge-function.example.claude-api'
 *       )
 *     )
 *   } catch (error) {
 *     if (isCircuitBreakerError(error)) return fallbackResponse()
 *     if (isTimeoutError(error)) return timeoutResponse()
 *     throw error
 *   }
 *
 * Design notes:
 * - State is per Edge Function invocation instance. Supabase Edge Functions
 *   may reuse instances across requests (warm starts), but state will reset
 *   on cold starts. For persistent state, defer to a future prompt.
 */

export class CircuitBreakerError extends Error {
  readonly breakerName: string

  constructor(breakerName: string) {
    super(`Circuit breaker "${breakerName}" is open`)
    this.name = 'CircuitBreakerError'
    this.breakerName = breakerName
  }
}

export interface CircuitBreakerOptions {
  failureThreshold: number
  resetTimeoutMs: number
  halfOpenMaxAttempts: number
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 60000,
  halfOpenMaxAttempts: 1,
}

type State = 'closed' | 'open' | 'half-open'

export class CircuitBreaker {
  private state: State = 'closed'
  private failures = 0
  private successes = 0
  private lastFailureAt: Date | null = null
  private nextAttemptAt: Date | null = null
  private halfOpenAttempts = 0

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions = DEFAULT_OPTIONS
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.maybeTransitionFromOpenToHalfOpen()

    if (this.state === 'open') {
      throw new CircuitBreakerError(this.name)
    }

    if (this.state === 'half-open' && this.halfOpenAttempts >= this.options.halfOpenMaxAttempts) {
      throw new CircuitBreakerError(this.name)
    }

    if (this.state === 'half-open') {
      this.halfOpenAttempts++
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  getState(): State {
    this.maybeTransitionFromOpenToHalfOpen()
    return this.state
  }

  getStats() {
    return {
      failures: this.failures,
      successes: this.successes,
      lastFailureAt: this.lastFailureAt,
    }
  }

  private maybeTransitionFromOpenToHalfOpen(): void {
    if (this.state === 'open' && this.nextAttemptAt && Date.now() >= this.nextAttemptAt.getTime()) {
      this.state = 'half-open'
      this.halfOpenAttempts = 0
    }
  }

  private onSuccess(): void {
    this.successes++
    if (this.state === 'half-open') {
      this.state = 'closed'
      this.failures = 0
      this.nextAttemptAt = null
    } else {
      this.failures = 0
    }
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureAt = new Date()

    if (this.state === 'half-open') {
      this.state = 'open'
      this.nextAttemptAt = new Date(Date.now() + this.options.resetTimeoutMs)
    } else if (this.failures >= this.options.failureThreshold) {
      this.state = 'open'
      this.nextAttemptAt = new Date(Date.now() + this.options.resetTimeoutMs)
    }
  }
}

const breakers = new Map<string, CircuitBreaker>()

export function getCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
  let breaker = breakers.get(name)
  if (!breaker) {
    breaker = new CircuitBreaker(name, options ?? DEFAULT_OPTIONS)
    breakers.set(name, breaker)
  }
  return breaker
}

export function isCircuitBreakerError(error: unknown): error is CircuitBreakerError {
  return error instanceof CircuitBreakerError
}
