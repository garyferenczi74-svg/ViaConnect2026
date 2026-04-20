// Prompt #100 — grace-period policy tests.

import { describe, it, expect } from 'vitest';
import {
  computeGraceDeadline,
  GRACE_HOURS,
  graceHoursFor,
  hoursRemainingInGrace,
  isWithinGracePeriod,
} from '@/lib/map/gracePeriods';

describe('GRACE_HOURS', () => {
  it('matches Prompt #100 §4.3 values', () => {
    expect(GRACE_HOURS.yellow).toBe(168);
    expect(GRACE_HOURS.orange).toBe(72);
    expect(GRACE_HOURS.red).toBe(48);
    expect(GRACE_HOURS.black).toBe(24);
  });
});

describe('graceHoursFor', () => {
  it.each(['yellow', 'orange', 'red', 'black'] as const)('returns numeric hours for %s', (s) => {
    expect(typeof graceHoursFor(s)).toBe('number');
    expect(graceHoursFor(s)).toBeGreaterThan(0);
  });
});

describe('isWithinGracePeriod', () => {
  it('returns true for a future deadline', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(isWithinGracePeriod(future)).toBe(true);
  });
  it('returns false for a past deadline', () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(isWithinGracePeriod(past)).toBe(false);
  });
});

describe('hoursRemainingInGrace', () => {
  it('returns positive for future deadline', () => {
    const now = new Date('2026-04-20T00:00:00Z');
    const deadline = new Date('2026-04-20T12:00:00Z').toISOString();
    expect(hoursRemainingInGrace(deadline, now)).toBe(12);
  });
  it('returns negative after expiry', () => {
    const now = new Date('2026-04-20T12:00:00Z');
    const deadline = new Date('2026-04-20T00:00:00Z').toISOString();
    expect(hoursRemainingInGrace(deadline, now)).toBeLessThan(0);
  });
});

describe('computeGraceDeadline', () => {
  it('adds the correct hours for each severity', () => {
    const t0 = new Date('2026-04-20T00:00:00Z');
    expect(computeGraceDeadline('yellow', t0).toISOString()).toBe('2026-04-27T00:00:00.000Z');
    expect(computeGraceDeadline('orange', t0).toISOString()).toBe('2026-04-23T00:00:00.000Z');
    expect(computeGraceDeadline('red', t0).toISOString()).toBe('2026-04-22T00:00:00.000Z');
    expect(computeGraceDeadline('black', t0).toISOString()).toBe('2026-04-21T00:00:00.000Z');
  });
});
