import { describe, it, expect } from 'vitest';
import { tickState } from '../useCountdown';

describe('tickState', () => {
  it('drives display from elapsed time', () => {
    expect(tickState(0, 0, 5).display).toBe(5);
    expect(tickState(0, 2200, 5).display).toBe(3); // 2.2s elapsed
    expect(tickState(0, 5000, 5)).toEqual({ display: 0, done: true });
    expect(tickState(0, 9000, 5).display).toBe(0); // clamped, still done
  });
});
