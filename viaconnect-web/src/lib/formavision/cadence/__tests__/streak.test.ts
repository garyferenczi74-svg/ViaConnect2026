// Prompt 211a W4-1 - Tests for streak.ts (scan streak pure logic).
// TDD: written RED first, then implementation made them GREEN.
//
// computeStreakUpdate is deterministic: dates are injected, no Date.now inside
// the pure function. A scan within the cadence window extends the streak; a gap
// beyond the window resets to 1; a same-day repeat is idempotent (no double
// count). It never fabricates a streak the dates do not support.

import { describe, it, expect } from 'vitest';
import {
  computeStreakUpdate,
  WEEKLY_WINDOW_DAYS,
  BIWEEKLY_WINDOW_DAYS,
  CADENCE_GRACE_DAYS,
  type ScanStreakState,
} from '../streak';

const FRESH: ScanStreakState = {
  currentStreak: 0,
  longestStreak: 0,
  lastScanDate: null,
  streakStartedAt: null,
};

describe('computeStreakUpdate', () => {
  it('starts a streak at 1 from a fresh (never scanned) state', () => {
    const next = computeStreakUpdate(FRESH, '2026-07-10', WEEKLY_WINDOW_DAYS);
    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(1);
    expect(next.lastScanDate).toBe('2026-07-10');
    expect(next.streakStartedAt).toBe('2026-07-10');
  });

  it('extends the streak when the next scan is inside the weekly window (7 + grace)', () => {
    const prev: ScanStreakState = {
      currentStreak: 3,
      longestStreak: 3,
      lastScanDate: '2026-07-03',
      streakStartedAt: '2026-06-19',
    };
    // 7 days later, inside weekly window.
    const next = computeStreakUpdate(prev, '2026-07-10', WEEKLY_WINDOW_DAYS);
    expect(next.currentStreak).toBe(4);
    expect(next.longestStreak).toBe(4);
    expect(next.lastScanDate).toBe('2026-07-10');
    expect(next.streakStartedAt).toBe('2026-06-19');
  });

  it('extends when the gap is within the grace days past the nominal window', () => {
    const prev: ScanStreakState = {
      currentStreak: 2,
      longestStreak: 5,
      lastScanDate: '2026-07-01',
      streakStartedAt: '2026-06-24',
    };
    // Weekly window 7 + grace 2 = 9 day tolerance. 9 days later still extends.
    const next = computeStreakUpdate(prev, '2026-07-10', WEEKLY_WINDOW_DAYS);
    expect(next.currentStreak).toBe(3);
    // longest is preserved because 3 < 5.
    expect(next.longestStreak).toBe(5);
  });

  it('resets the streak to 1 when the gap exceeds the window plus grace', () => {
    const prev: ScanStreakState = {
      currentStreak: 6,
      longestStreak: 6,
      lastScanDate: '2026-06-01',
      streakStartedAt: '2026-04-27',
    };
    // Far beyond weekly window + grace. Reset to 1, but longest is retained.
    const next = computeStreakUpdate(prev, '2026-07-10', WEEKLY_WINDOW_DAYS);
    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(6);
    expect(next.lastScanDate).toBe('2026-07-10');
    expect(next.streakStartedAt).toBe('2026-07-10');
  });

  it('is idempotent on a same-day repeat scan (no double count)', () => {
    const prev: ScanStreakState = {
      currentStreak: 4,
      longestStreak: 4,
      lastScanDate: '2026-07-10',
      streakStartedAt: '2026-06-19',
    };
    const next = computeStreakUpdate(prev, '2026-07-10', WEEKLY_WINDOW_DAYS);
    expect(next.currentStreak).toBe(4);
    expect(next.longestStreak).toBe(4);
    expect(next.lastScanDate).toBe('2026-07-10');
    expect(next.streakStartedAt).toBe('2026-06-19');
  });

  it('honors the biweekly window (14 + grace) for a 14 day gap', () => {
    const prev: ScanStreakState = {
      currentStreak: 1,
      longestStreak: 1,
      lastScanDate: '2026-06-26',
      streakStartedAt: '2026-06-26',
    };
    // 14 days later would RESET under weekly but EXTENDS under biweekly.
    const weekly = computeStreakUpdate(prev, '2026-07-10', WEEKLY_WINDOW_DAYS);
    const biweekly = computeStreakUpdate(prev, '2026-07-10', BIWEEKLY_WINDOW_DAYS);
    expect(weekly.currentStreak).toBe(1); // reset
    expect(biweekly.currentStreak).toBe(2); // extended
  });

  it('raises longestStreak only when the new current exceeds the old longest', () => {
    const prev: ScanStreakState = {
      currentStreak: 8,
      longestStreak: 8,
      lastScanDate: '2026-07-03',
      streakStartedAt: '2026-05-15',
    };
    const next = computeStreakUpdate(prev, '2026-07-10', WEEKLY_WINDOW_DAYS);
    expect(next.currentStreak).toBe(9);
    expect(next.longestStreak).toBe(9);
  });

  it('treats a scan dated before the last scan as out of order and does not fabricate a longer streak', () => {
    const prev: ScanStreakState = {
      currentStreak: 4,
      longestStreak: 4,
      lastScanDate: '2026-07-10',
      streakStartedAt: '2026-06-19',
    };
    // A stale/earlier date must never increment the count nor rewind lastScanDate.
    const next = computeStreakUpdate(prev, '2026-07-05', WEEKLY_WINDOW_DAYS);
    expect(next.currentStreak).toBe(4);
    expect(next.lastScanDate).toBe('2026-07-10');
    expect(next.streakStartedAt).toBe('2026-06-19');
  });

  it('exposes named window and grace constants (no magic numbers leak)', () => {
    expect(WEEKLY_WINDOW_DAYS).toBe(7);
    expect(BIWEEKLY_WINDOW_DAYS).toBe(14);
    expect(CADENCE_GRACE_DAYS).toBeGreaterThan(0);
  });
});
