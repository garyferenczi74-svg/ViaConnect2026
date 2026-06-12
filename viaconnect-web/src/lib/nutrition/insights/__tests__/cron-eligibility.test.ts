// Prompt 192 Task 3 (TDD): pure eligibility builders for the cron route.

import { describe, expect, it } from 'vitest';
import {
  CRON_ROW_PAGE_SIZE,
  CRON_USERS_PER_INVOCATION,
  WEEKLY_MIN_SCORED_DAYS,
  dailyEligibilitySinceIso,
  distinctUserIds,
  pageRange,
  weeklyEligibilitySinceIso,
  weeklyEligibleUserIds,
} from '../cron-eligibility';

const NOW = '2026-06-12T04:30:00.000Z';

describe('eligibility windows', () => {
  it('daily window is exactly 24 hours back', () => {
    expect(dailyEligibilitySinceIso(NOW)).toBe('2026-06-11T04:30:00.000Z');
  });

  it('weekly window is exactly 7 days back', () => {
    expect(weeklyEligibilitySinceIso(NOW)).toBe('2026-06-05T04:30:00.000Z');
  });
});

describe('pageRange', () => {
  it('maps zero based pages to inclusive PostgREST ranges', () => {
    expect(pageRange(0, 1000)).toEqual({ from: 0, to: 999 });
    expect(pageRange(2, 100)).toEqual({ from: 200, to: 299 });
    expect(pageRange(1)).toEqual({ from: CRON_ROW_PAGE_SIZE, to: CRON_ROW_PAGE_SIZE * 2 - 1 });
  });
});

describe('distinctUserIds', () => {
  it('dedupes in first seen order', () => {
    const rows = [{ user_id: 'b' }, { user_id: 'a' }, { user_id: 'b' }, { user_id: 'c' }];
    expect(distinctUserIds(rows)).toEqual(['b', 'a', 'c']);
  });

  it('caps at the per invocation limit', () => {
    const rows = Array.from({ length: 300 }, (_, i) => ({ user_id: `u${i}` }));
    expect(distinctUserIds(rows)).toHaveLength(CRON_USERS_PER_INVOCATION);
    expect(distinctUserIds(rows, 5)).toEqual(['u0', 'u1', 'u2', 'u3', 'u4']);
  });
});

describe('weeklyEligibleUserIds', () => {
  const meal = (userId: string, day: string, hour = 12) => ({
    user_id: userId,
    logged_at: `${day}T${String(hour).padStart(2, '0')}:00:00+00:00`,
  });

  it('requires at least 3 distinct scored days in the window', () => {
    const rows = [
      // u1: 3 distinct days, eligible.
      meal('u1', '2026-06-09'),
      meal('u1', '2026-06-10'),
      meal('u1', '2026-06-11'),
      // u2: 2 distinct days plus a same day duplicate, not eligible.
      meal('u2', '2026-06-10', 8),
      meal('u2', '2026-06-10', 19),
      meal('u2', '2026-06-11'),
      // u3: single day, not eligible.
      meal('u3', '2026-06-11'),
    ];
    expect(weeklyEligibleUserIds(rows)).toEqual(['u1']);
    expect(WEEKLY_MIN_SCORED_DAYS).toBe(3);
  });

  it('counts duplicate meals on the same UTC day once', () => {
    const rows = [
      meal('u1', '2026-06-11', 7),
      meal('u1', '2026-06-11', 12),
      meal('u1', '2026-06-11', 20),
    ];
    expect(weeklyEligibleUserIds(rows)).toEqual([]);
  });

  it('respects the cap and a custom minDays', () => {
    const rows = [
      meal('u1', '2026-06-10'),
      meal('u1', '2026-06-11'),
      meal('u2', '2026-06-10'),
      meal('u2', '2026-06-11'),
    ];
    expect(weeklyEligibleUserIds(rows, 1, 2)).toEqual(['u1']);
    expect(weeklyEligibleUserIds(rows, 10, 2)).toEqual(['u1', 'u2']);
  });
});
