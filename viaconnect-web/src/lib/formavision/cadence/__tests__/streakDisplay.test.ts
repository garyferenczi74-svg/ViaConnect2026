// Prompt 211a W4-2 - Tests for streakDisplay.ts (streak display formatting).
// TDD: written RED first, then made GREEN.

import { describe, it, expect } from 'vitest';
import { formatStreakDisplay } from '../streakDisplay';

const NO_DASHES = /^[^–—]*$/;

describe('formatStreakDisplay', () => {
  it('returns null for a zero or negative streak (no fabricated "0 day streak")', () => {
    expect(formatStreakDisplay(0, 0)).toBeNull();
    expect(formatStreakDisplay(-3, 5)).toBeNull();
    expect(formatStreakDisplay(Number.NaN, 5)).toBeNull();
  });

  it('formats a single scan in the singular ("1 scan"), not "1 scan streak"', () => {
    const d = formatStreakDisplay(1, 1);
    expect(d).not.toBeNull();
    expect(d?.label).toBe('1 scan');
    expect(d?.milestone).toBe('first');
    expect(d?.milestoneLabel).toBe('First scan logged');
  });

  it('formats a multi-scan streak in the plural ("5 scan streak")', () => {
    const d = formatStreakDisplay(5, 8);
    expect(d?.label).toBe('5 scan streak');
  });

  it('awards the highest milestone tier the streak has reached, never inflated', () => {
    expect(formatStreakDisplay(2, 2)?.milestone).toBe('week');
    expect(formatStreakDisplay(4, 4)?.milestone).toBe('fortnight');
    expect(formatStreakDisplay(8, 8)?.milestone).toBe('month');
    expect(formatStreakDisplay(12, 12)?.milestone).toBe('quarter');
    // Between milestones the tier is the last one crossed (3 -> week, not fortnight).
    expect(formatStreakDisplay(3, 3)?.milestone).toBe('week');
  });

  it('marks a personal best only when the current run ties or beats the longest (and is > 1)', () => {
    expect(formatStreakDisplay(6, 6)?.isPersonalBest).toBe(true);
    expect(formatStreakDisplay(7, 6)?.isPersonalBest).toBe(true);
    // Current below the longest: not a personal best.
    expect(formatStreakDisplay(3, 9)?.isPersonalBest).toBe(false);
    // A single scan is never framed as a personal best.
    expect(formatStreakDisplay(1, 1)?.isPersonalBest).toBe(false);
  });

  it('every caption and label is dash-free', () => {
    for (const streak of [1, 2, 4, 8, 12, 20]) {
      const d = formatStreakDisplay(streak, streak);
      expect(d?.label).toMatch(NO_DASHES);
      expect(d?.caption).toMatch(NO_DASHES);
      if (d?.milestoneLabel) expect(d.milestoneLabel).toMatch(NO_DASHES);
    }
  });
});
