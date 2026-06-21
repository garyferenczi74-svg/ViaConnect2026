/**
 * src/lib/kb/__tests__/embeddings.test.ts
 *
 * TDD tests for the Gemini text-embedding-004 producer (Prompt 208, Phase 0).
 * Tests:
 *   1. Happy path: returns number[768] on a successful fetch.
 *   2. Failure path: fetch throws -> returns null (fail-open), safeLog.error called.
 *   3. Missing API key: returns null immediately (fail-open).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock safeLog before the module loads so the spy is in place.
vi.mock('@/lib/utils/safe-log', () => ({
  safeLog: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock circuit-breaker so it executes the fn directly (no state machine in tests).
vi.mock('@/lib/utils/circuit-breaker', () => ({
  getCircuitBreaker: vi.fn(() => ({
    execute: vi.fn((fn: () => Promise<unknown>) => fn()),
  })),
  CircuitBreakerError: class CircuitBreakerError extends Error {
    constructor(name: string) {
      super(`Circuit breaker "${name}" is open`);
      this.name = 'CircuitBreakerError';
    }
  },
  isCircuitBreakerError: (e: unknown): boolean =>
    e instanceof Error && e.name === 'CircuitBreakerError',
}));

// Mock withAbortTimeout to call fn(signal) directly (no real timer).
vi.mock('@/lib/utils/with-timeout', () => ({
  withAbortTimeout: vi.fn(
    (fn: (s: AbortSignal) => Promise<unknown>) =>
      fn(new AbortController().signal),
  ),
  TimeoutError: class TimeoutError extends Error {
    constructor(op: string, ms: number) {
      super(`Operation "${op}" timed out after ${ms}ms`);
      this.name = 'TimeoutError';
    }
  },
  isTimeoutError: (e: unknown): boolean =>
    e instanceof Error && e.name === 'TimeoutError',
}));

import { safeLog } from '@/lib/utils/safe-log';

describe('embedText', () => {
  const FAKE_VALUES = Array.from({ length: 768 }, (_, i) => i * 0.001);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key-abc';
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    vi.restoreAllMocks();
  });

  it('returns a 768-length number[] on success', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embedding: { values: FAKE_VALUES } }),
    } as unknown as Response);

    // Import after mocks are set up.
    const { embedText, EMBEDDING_DIMS } = await import('../embeddings');

    const result = await embedText('folate');

    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(true);
    expect(result!.length).toBe(EMBEDDING_DIMS);
    expect(result!.length).toBe(768);
    expect(result![0]).toBeCloseTo(0);
    expect(result![1]).toBeCloseTo(0.001);
  });

  it('returns null and calls safeLog.error when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('network down'));

    const { embedText } = await import('../embeddings');

    const result = await embedText('folate');

    expect(result).toBeNull();
    expect(safeLog.error).toHaveBeenCalledWith(
      'kb.embedText',
      expect.any(String),
      expect.any(Object),
    );
  });

  it('returns null and calls safeLog.error when API key is missing', async () => {
    delete process.env.GEMINI_API_KEY;

    // Ensure fetch is not called on missing key.
    global.fetch = vi.fn();

    const { embedText } = await import('../embeddings');

    const result = await embedText('folate');

    expect(result).toBeNull();
    expect(safeLog.error).toHaveBeenCalledWith(
      'kb.embedText',
      expect.any(String),
      expect.any(Object),
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
