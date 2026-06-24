/**
 * src/components/journey/today/__tests__/progressFraction.test.ts
 *
 * TDD tests for the pure progressFraction helper (Prompt 208g Task G-T5).
 *
 * progressFraction(value, target): number | null
 *   - Returns value / target clamped to 0..1.
 *   - Returns null when value is null, target is null, target <= 0, or either
 *     argument is non-finite.
 *   - Pure: never throws, always deterministic.
 *
 * Node-safe (.test.ts), picked up by the existing glob:
 *   src/**\/__tests__\/**\/*.test.ts  (vitest.config.ts include).
 * Do NOT edit vitest.config.ts.
 *
 * Written RED before the helper exists, then GREEN once implemented.
 */

import { describe, it, expect } from 'vitest';
import { progressFraction } from '../TodayStats';

describe('progressFraction', () => {
  it('returns 0.5 for value=500 target=1000', () => {
    expect(progressFraction(500, 1000)).toBe(0.5);
  });

  it('clamps to 1 when value >= target (value=1000, target=1000)', () => {
    expect(progressFraction(1000, 1000)).toBe(1);
  });

  it('clamps to 1 when value exceeds target (value=1500, target=1000)', () => {
    expect(progressFraction(1500, 1000)).toBe(1);
  });

  it('returns 0 for value=0 target=1000', () => {
    expect(progressFraction(0, 1000)).toBe(0);
  });

  it('returns null when value is null', () => {
    expect(progressFraction(null, 1000)).toBeNull();
  });

  it('returns null when target is null', () => {
    expect(progressFraction(500, null)).toBeNull();
  });

  it('returns null when target is 0', () => {
    expect(progressFraction(500, 0)).toBeNull();
  });

  it('returns null when target is negative', () => {
    expect(progressFraction(500, -100)).toBeNull();
  });

  it('returns null when value is Infinity', () => {
    expect(progressFraction(Infinity, 1000)).toBeNull();
  });

  it('returns null when value is NaN', () => {
    expect(progressFraction(NaN, 1000)).toBeNull();
  });

  it('returns null when target is Infinity', () => {
    expect(progressFraction(500, Infinity)).toBeNull();
  });

  it('returns null when target is NaN', () => {
    expect(progressFraction(500, NaN)).toBeNull();
  });

  it('never throws for any combination of null and non-finite inputs', () => {
    expect(() => progressFraction(null, null)).not.toThrow();
    expect(() => progressFraction(NaN, NaN)).not.toThrow();
    expect(() => progressFraction(Infinity, -Infinity)).not.toThrow();
    expect(() => progressFraction(null, 0)).not.toThrow();
  });

  it('is deterministic: same inputs always return the same output', () => {
    expect(progressFraction(750, 1000)).toBe(progressFraction(750, 1000));
    expect(progressFraction(null, 500)).toBe(progressFraction(null, 500));
  });

  it('works for fractional values (value=333 target=1000 -> ~0.333)', () => {
    const result = progressFraction(333, 1000);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(0.333, 2);
  });
});
