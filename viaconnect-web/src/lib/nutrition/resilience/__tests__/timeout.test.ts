// Prompt #170 Phase 1b: tests for the NutriVision pipeline timeout wrapper.
// Mirrors the test style used elsewhere in src/lib/nutrition/__tests__.

import { describe, it, expect, vi } from 'vitest';
import { withTimeout, TimeoutError, isTimeoutError } from '../timeout';

describe('withTimeout', () => {
  it('resolves with the promise value when it settles before the timeout', async () => {
    const fast = new Promise<string>((resolve) => {
      setTimeout(() => resolve('ok'), 5);
    });
    const result = await withTimeout(fast, { timeoutMs: 100, op: 'unit.fast' });
    expect(result).toBe('ok');
  });

  it('throws TimeoutError when the timeout elapses first', async () => {
    const slow = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 200);
    });
    await expect(
      withTimeout(slow, { timeoutMs: 20, op: 'unit.slow', requestId: 'req-1' }),
    ).rejects.toBeInstanceOf(TimeoutError);
  });

  it('attaches timeoutMs and op to the thrown TimeoutError', async () => {
    const slow = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 200);
    });
    try {
      await withTimeout(slow, { timeoutMs: 15, op: 'unit.attach' });
      throw new Error('should not reach');
    } catch (err) {
      expect(isTimeoutError(err)).toBe(true);
      if (isTimeoutError(err)) {
        expect(err.timeoutMs).toBe(15);
        expect(err.op).toBe('unit.attach');
        expect(err.name).toBe('TimeoutError');
      }
    }
  });

  it('isTimeoutError type-guards correctly against other errors', () => {
    expect(isTimeoutError(new TimeoutError('x', 1))).toBe(true);
    expect(isTimeoutError(new Error('nope'))).toBe(false);
    expect(isTimeoutError('string')).toBe(false);
    expect(isTimeoutError(null)).toBe(false);
    expect(isTimeoutError(undefined)).toBe(false);
  });

  it('rejects with the promise rejection (not TimeoutError) when promise rejects before timeout', async () => {
    const rejecting = Promise.reject(new Error('boom'));
    await expect(
      withTimeout(rejecting, { timeoutMs: 100, op: 'unit.reject' }),
    ).rejects.toMatchObject({ message: 'boom' });
  });

  it('does not leak a timer after a fast resolve', async () => {
    const spy = vi.spyOn(global, 'clearTimeout');
    const fast = Promise.resolve('done');
    await withTimeout(fast, { timeoutMs: 100, op: 'unit.cleanup' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
