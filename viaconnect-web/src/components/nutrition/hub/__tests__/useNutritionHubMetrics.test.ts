// Prompt 183 Task 2 (2026-06-10): unit tests for the pure helpers that
// drive the My Nutrition hub gauges. The hook body itself is not
// unit-testable in node-env (it needs a browser supabase client), so the
// pure pieces are exported and tested here. UTC is used as the timezone
// so date boundaries are deterministic across machines.

import { describe, it, expect } from 'vitest';
import {
  withTimeout,
  sevenDayKeys,
  dailyMealCountsFromRows,
  computeTodayNutrition,
  type HubMealRow,
  type HubMacroTargets,
} from '../useNutritionHubMetrics';

const TZ = 'UTC';

// A fixed "now": 2026-06-10T12:00:00Z. The 7 day window runs
// 2026-06-04 .. 2026-06-10 inclusive.
const NOW = new Date('2026-06-10T12:00:00.000Z');

function iso(dateYmd: string, time = '08:00:00'): string {
  return `${dateYmd}T${time}.000Z`;
}

describe('withTimeout', () => {
  it('resolves a fast promise before the timeout fires', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok');
  });

  it('rejects once the timeout elapses', async () => {
    const slow = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 50);
    });
    // Canonical lib/utils/with-timeout throws TimeoutError, whose message
    // reads "... timed out after Nms".
    await expect(withTimeout(slow, 5)).rejects.toThrow(/timed out/);
  });

  it('propagates a fast rejection rather than the timeout', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 1000)).rejects.toThrow('boom');
  });
});

describe('sevenDayKeys', () => {
  it('returns 7 keys oldest to newest ending today', () => {
    const keys = sevenDayKeys(NOW, TZ);
    expect(keys).toHaveLength(7);
    expect(keys[0]).toBe('2026-06-04');
    expect(keys[6]).toBe('2026-06-10');
  });
});

describe('dailyMealCountsFromRows', () => {
  it('groups rows by local day into a length 7 oldest..today array', () => {
    const rows: HubMealRow[] = [
      { logged_at: iso('2026-06-10'), quality_score: 80 },
      { logged_at: iso('2026-06-10', '19:00:00'), quality_score: 60 },
      { logged_at: iso('2026-06-09'), quality_score: 50 },
      { logged_at: iso('2026-06-04'), quality_score: 70 },
    ];
    // index: 06-04, 05, 06, 07, 08, 09, 10
    expect(dailyMealCountsFromRows(rows, NOW, TZ)).toEqual([1, 0, 0, 0, 0, 1, 2]);
  });

  it('counts a meal even when its quality score is null (logging activity)', () => {
    const rows: HubMealRow[] = [{ logged_at: iso('2026-06-10'), quality_score: null }];
    expect(dailyMealCountsFromRows(rows, NOW, TZ)[6]).toBe(1);
  });

  it('ignores rows outside the 7 day window', () => {
    const rows: HubMealRow[] = [{ logged_at: iso('2026-06-01'), quality_score: 90 }];
    expect(dailyMealCountsFromRows(rows, NOW, TZ)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('discards a meal on the day just before the window (7 local days back)', () => {
    // 2026-06-03 is the local day immediately before the oldest in-window
    // day (2026-06-04), i.e. 7 local days before today. The sinceIso slop
    // buffer may over-fetch such a row, but the per-day grouping must drop
    // it: no in-window bucket exists for that key.
    const rows: HubMealRow[] = [
      { logged_at: iso('2026-06-03', '23:00:00'), quality_score: 85 },
    ];
    expect(dailyMealCountsFromRows(rows, NOW, TZ)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('returns all zeros for no rows', () => {
    expect(dailyMealCountsFromRows([], NOW, TZ)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('computeTodayNutrition', () => {
  const targets: HubMacroTargets = {
    dailyKcal: 2000,
    dailyProteinG: 100,
    dailyCarbsG: 200,
    dailyFatTotalG: 80,
    dailyFiberG: 30,
  };

  it('returns empty object when no scored meals today', () => {
    const rows: HubMealRow[] = [
      { logged_at: iso('2026-06-09'), quality_score: 80, calories_kcal: 500 },
    ];
    expect(computeTodayNutrition(rows, targets, NOW, TZ)).toEqual({});
  });

  it('excludes legacy rows with a null quality score', () => {
    const rows: HubMealRow[] = [
      { logged_at: iso('2026-06-10'), quality_score: null, calories_kcal: 800, protein_g: 50 },
    ];
    expect(computeTodayNutrition(rows, targets, NOW, TZ)).toEqual({});
  });

  it('computes the calorie weighted nutrition score and meal count', () => {
    const rows: HubMealRow[] = [
      { logged_at: iso('2026-06-10', '08:00:00'), quality_score: 90, calories_kcal: 100 },
      { logged_at: iso('2026-06-10', '13:00:00'), quality_score: 60, calories_kcal: 300 },
    ];
    const result = computeTodayNutrition(rows, targets, NOW, TZ);
    // weighted: (90*100 + 60*300) / 400 = 27000/400 = 67.5 -> 68
    expect(result.nutritionScore).toBe(68);
    expect(result.nutritionMealCount).toBe(2);
  });

  it('computes per macro attainment capped at 100', () => {
    const rows: HubMealRow[] = [
      {
        logged_at: iso('2026-06-10'),
        quality_score: 75,
        calories_kcal: 1000,
        protein_g: 50, // 50/100 = 50%
        carbs_g: 100, // 100/200 = 50%
        fat_total_g: 200, // 200/80 -> capped 100%
        fiber_g: 15, // 15/30 = 50%
      },
    ];
    const result = computeTodayNutrition(rows, targets, NOW, TZ);
    expect(result.proteinPct).toBe(50);
    expect(result.carbsPct).toBe(50);
    expect(result.fatPct).toBe(100);
    expect(result.fiberPct).toBe(50);
    expect(typeof result.dailyMacrosPct).toBe('number');
    expect(result.dailyMacrosPct).toBeGreaterThanOrEqual(0);
    expect(result.dailyMacrosPct).toBeLessThanOrEqual(100);
  });

  // Prompt 183a (2026-06-11): the absolute consumed grams are surfaced for the
  // Daily Macros readout row, as rounded integers, summed across today's scored
  // meals. The percent attainment above is unchanged.
  it('surfaces the absolute consumed grams summed across today scored meals', () => {
    const rows: HubMealRow[] = [
      {
        logged_at: iso('2026-06-10', '08:00:00'),
        quality_score: 80,
        calories_kcal: 600,
        protein_g: 40.4,
        carbs_g: 70.6,
        fat_total_g: 18.2,
        fiber_g: 9.5,
      },
      {
        logged_at: iso('2026-06-10', '13:00:00'),
        quality_score: 60,
        calories_kcal: 800,
        protein_g: 30.1,
        carbs_g: 50.2,
        fat_total_g: 12.3,
        fiber_g: 5.4,
      },
    ];
    const result = computeTodayNutrition(rows, targets, NOW, TZ);
    // protein: 40.4 + 30.1 = 70.5 -> 71; carbs: 70.6 + 50.2 = 120.8 -> 121;
    // fat: 18.2 + 12.3 = 30.5 -> 31; fiber: 9.5 + 5.4 = 14.9 -> 15.
    expect(result.proteinG).toBe(71);
    expect(result.carbsG).toBe(121);
    expect(result.fatG).toBe(31);
    expect(result.fiberG).toBe(15);
  });

  it('leaves the gram values undefined when there are no scored meals today', () => {
    const rows: HubMealRow[] = [
      { logged_at: iso('2026-06-09'), quality_score: 80, calories_kcal: 500, protein_g: 30 },
    ];
    const result = computeTodayNutrition(rows, targets, NOW, TZ);
    expect(result.proteinG).toBeUndefined();
    expect(result.carbsG).toBeUndefined();
    expect(result.fatG).toBeUndefined();
    expect(result.fiberG).toBeUndefined();
  });
});
