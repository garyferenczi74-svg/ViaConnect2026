// Prompt 183 Task 2 (2026-06-10): unit tests for the My Nutrition hub
// consecutive meal streak. Pure logic, node-env (the repo ships no
// jsdom), so only the pure function is exercised here.

import { describe, it, expect } from 'vitest';
import { computeConsecutiveMealStreak } from '../streak';

describe('computeConsecutiveMealStreak', () => {
  it('returns 0 when today (last element) is 0', () => {
    expect(computeConsecutiveMealStreak([1, 1, 1, 1, 1, 1, 0])).toBe(0);
  });

  it('counts a single day when only today has a meal', () => {
    expect(computeConsecutiveMealStreak([0, 0, 0, 0, 0, 0, 2])).toBe(1);
  });

  it('counts a full week of logged days', () => {
    expect(computeConsecutiveMealStreak([1, 1, 1, 1, 1, 1, 1])).toBe(7);
  });

  it('stops at the first zero counting back from today', () => {
    expect(computeConsecutiveMealStreak([0, 3, 0, 2, 2, 2, 2])).toBe(4);
  });

  it('returns 1 when only today is non zero after a long gap', () => {
    expect(computeConsecutiveMealStreak([5, 0, 0, 0, 0, 0, 1])).toBe(1);
  });

  it('returns 0 for an empty array', () => {
    expect(computeConsecutiveMealStreak([])).toBe(0);
  });

  it('returns 0 for a null input (runtime guard)', () => {
    expect(computeConsecutiveMealStreak(null as unknown as number[])).toBe(0);
  });

  it('caps at 7 even when the array is longer than 7 and all non zero', () => {
    expect(computeConsecutiveMealStreak([1, 1, 1, 1, 1, 1, 1, 1, 1, 1])).toBe(7);
  });

  it('is total over short arrays', () => {
    expect(computeConsecutiveMealStreak([4])).toBe(1);
    expect(computeConsecutiveMealStreak([0])).toBe(0);
  });

  it('treats non finite or negative counts as no meal', () => {
    expect(computeConsecutiveMealStreak([2, 2, Number.NaN, 2, 2])).toBe(2);
    expect(computeConsecutiveMealStreak([2, 2, -1, 2, 2])).toBe(2);
  });
});
