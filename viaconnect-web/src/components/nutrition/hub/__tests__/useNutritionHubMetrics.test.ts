// Prompt 183 Task 2 (2026-06-10): unit tests for the pure helpers that
// drive the My Nutrition hub gauges. The hook body itself is not
// unit-testable in node-env (it needs a browser supabase client), so the
// pure pieces are exported and tested here. UTC is used as the timezone
// so date boundaries are deterministic across machines.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { assignTier } from '@/lib/gordon/constants';
import { nutritionHubScoreCenter, nutritionHubScorePaint } from '../nutritionHubScoreDisplay';
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

  it('computes the hero from daily macros, not the calorie-weighted slot score', () => {
    const rows: HubMealRow[] = [
      {
        logged_at: iso('2026-06-10', '08:00:00'),
        quality_score: 90,
        calories_kcal: 1800,
        protein_g: 90,
        carbs_g: 180,
        fat_total_g: 72,
        fiber_g: 27,
      },
      {
        logged_at: iso('2026-06-10', '13:00:00'),
        quality_score: 30,
        calories_kcal: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_total_g: 0,
        fiber_g: 0,
      },
    ];
    const result = computeTodayNutrition(rows, targets, NOW, TZ);
    // Both meals count; totals hit 90% of each target. Slot score 30
    // on the second meal must not paint the hero Fair.
    expect(result.dailyMacrosPct).toBe(90);
    expect(result.nutritionScore).toBe(90);
    expect(result.nutritionMealCount).toBe(2);
    expect(['Excellent', 'Perfection']).toContain(assignTier(result.nutritionScore ?? 0));
  });

  it('(a) 90% macros + dinner slot-quality 30 => hero Excellent, not Fair/30', () => {
    const rows: HubMealRow[] = [
      {
        logged_at: iso('2026-06-10', '19:00:00'),
        quality_score: 30,
        calories_kcal: 1800,
        protein_g: 90,
        carbs_g: 180,
        fat_total_g: 72,
        fiber_g: 27,
        score_breakdown: {
          modifiers: [
            { name: 'Protein Fit', value: -10 },
            { name: 'Carb Fit', value: -10 },
            { name: 'Fat Fit', value: -10 },
            { name: 'Calorie Fit', value: -5 },
            { name: 'Sugar Penalty', value: 0 },
            { name: 'Saturated Fat Penalty', value: 0 },
            { name: 'Sodium Penalty', value: 0 },
            { name: 'Whole Food Bonus', value: 0 },
          ],
        },
      },
    ];
    const result = computeTodayNutrition(rows, targets, NOW, TZ);
    expect(result.dailyMacrosPct).toBe(90);
    expect(result.nutritionScore).toBeDefined();
    expect(result.nutritionScore).toBeGreaterThanOrEqual(60);
    expect(result.nutritionScore).not.toBe(30);
    expect(['Excellent', 'Perfection']).toContain(assignTier(result.nutritionScore ?? 0));
    expect(assignTier(result.nutritionScore ?? 0)).not.toBe('Fair');
  });

  it('(b) macros >= 80 floors the hero at 40 (Good) after the modifier', () => {
    const rows: HubMealRow[] = [
      {
        logged_at: iso('2026-06-10'),
        quality_score: 25,
        calories_kcal: 1600,
        protein_g: 80,
        carbs_g: 160,
        fat_total_g: 64,
        fiber_g: 24,
        score_breakdown: {
          modifiers: [
            { name: 'Sugar Penalty', value: -20 },
            { name: 'Saturated Fat Penalty', value: -15 },
            { name: 'Sodium Penalty', value: -15 },
            { name: 'Whole Food Bonus', value: 0 },
          ],
        },
      },
    ];
    const loseTargets: HubMacroTargets = { ...targets, goalDirection: 'lose' };
    const result = computeTodayNutrition(rows, loseTargets, NOW, TZ);
    expect(result.dailyMacrosPct).toBe(80);
    expect(result.nutritionScore).toBeDefined();
    expect(result.nutritionScore ?? 0).toBeGreaterThanOrEqual(40);
  });

  it('(c) no real meals => nutritionScore undefined, display is -- UNKNOWN never 0', () => {
    const empty = computeTodayNutrition([], targets, NOW, TZ);
    expect(empty.nutritionScore).toBeUndefined();
    expect(empty.dailyMacrosPct).toBeUndefined();
    const center = nutritionHubScoreCenter(empty.nutritionScore);
    expect(nutritionHubScorePaint(center)).toBe('-- UNKNOWN');
    expect(center.value).not.toBe(0);
    expect(center.value).not.toBe('0');
  });

  it('(c) no real nutrition_targets row => UNKNOWN even when meals exist', () => {
    const rows: HubMealRow[] = [
      {
        logged_at: iso('2026-06-10'),
        quality_score: 80,
        calories_kcal: 1800,
        protein_g: 90,
        carbs_g: 180,
        fat_total_g: 72,
        fiber_g: 27,
      },
    ];
    const result = computeTodayNutrition(rows, null, NOW, TZ);
    expect(result).toEqual({});
    expect(result.nutritionScore).toBeUndefined();
    expect(nutritionHubScorePaint(nutritionHubScoreCenter(result.nutritionScore))).toBe(
      '-- UNKNOWN',
    );
  });

  it('(d) quality input ignores meal-slot protein / carb / fat fit', () => {
    const rows: HubMealRow[] = [
      {
        logged_at: iso('2026-06-10'),
        quality_score: 30,
        calories_kcal: 1800,
        protein_g: 90,
        carbs_g: 180,
        fat_total_g: 72,
        fiber_g: 27,
        score_breakdown: {
          modifiers: [
            { name: 'Protein Fit', value: -10 },
            { name: 'Carb Fit', value: -10 },
            { name: 'Fat Fit', value: -10 },
            { name: 'Calorie Fit', value: -5 },
            { name: 'Sugar Penalty', value: 0 },
            { name: 'Saturated Fat Penalty', value: 0 },
            { name: 'Sodium Penalty', value: 0 },
            { name: 'Whole Food Bonus', value: 0 },
          ],
        },
      },
    ];
    const result = computeTodayNutrition(rows, targets, NOW, TZ);
    // Neutral food-pattern + 90% macros => 90, not 90-15 from slot fit.
    expect(result.nutritionScore).toBe(90);
  });

  it('(e) lose overshoot on a 90% macros day stays Excellent', () => {
    const rows: HubMealRow[] = [
      {
        logged_at: iso('2026-06-10'),
        quality_score: 30,
        calories_kcal: 3000,
        protein_g: 89,
        carbs_g: 178,
        fat_total_g: 71,
        fiber_g: 27,
        score_breakdown: {
          modifiers: [
            { name: 'Sugar Penalty', value: -20 },
            { name: 'Saturated Fat Penalty', value: -15 },
            { name: 'Sodium Penalty', value: -15 },
            { name: 'Whole Food Bonus', value: 0 },
          ],
        },
      },
    ];
    const loseTargets: HubMacroTargets = { ...targets, goalDirection: 'lose' };
    const result = computeTodayNutrition(rows, loseTargets, NOW, TZ);
    expect(result.dailyMacrosPct).toBeGreaterThanOrEqual(90);
    expect(result.nutritionScore ?? 0).toBeGreaterThanOrEqual(60);
    expect(['Excellent', 'Perfection']).toContain(assignTier(result.nutritionScore ?? 0));
  });

  it('(e) gain protein-miss on a 90% macros day stays Excellent', () => {
    const rows: HubMealRow[] = [
      {
        logged_at: iso('2026-06-10'),
        quality_score: 30,
        calories_kcal: 2000,
        protein_g: 55,
        carbs_g: 200,
        fat_total_g: 80,
        fiber_g: 30,
        score_breakdown: {
          modifiers: [
            { name: 'Sugar Penalty', value: -20 },
            { name: 'Saturated Fat Penalty', value: -15 },
            { name: 'Sodium Penalty', value: -15 },
            { name: 'Whole Food Bonus', value: 0 },
          ],
        },
      },
    ];
    const gainTargets: HubMacroTargets = { ...targets, goalDirection: 'gain' };
    const result = computeTodayNutrition(rows, gainTargets, NOW, TZ);
    expect(result.dailyMacrosPct).toBeGreaterThanOrEqual(90);
    expect(result.nutritionScore ?? 0).toBeGreaterThanOrEqual(60);
    expect(['Excellent', 'Perfection']).toContain(assignTier(result.nutritionScore ?? 0));
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

  it('keeps nutritionScore and dailyMacrosPct undefined when todayMealCount is 0', () => {
    expect(computeTodayNutrition([], targets, NOW, TZ).nutritionScore).toBeUndefined();
    expect(computeTodayNutrition([], targets, NOW, TZ).dailyMacrosPct).toBeUndefined();
  });

  it('returns a finite nutritionScore and 0 dailyMacrosPct for a 0-intake scored meal', () => {
    const rows: HubMealRow[] = [
      {
        logged_at: iso('2026-06-10'),
        quality_score: 70,
        calories_kcal: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_total_g: 0,
        fiber_g: 0,
      },
    ];
    const result = computeTodayNutrition(rows, targets, NOW, TZ);
    expect(result.nutritionMealCount).toBe(1);
    expect(Number.isFinite(result.nutritionScore)).toBe(true);
    expect(result.nutritionScore).not.toBeNaN();
    expect(result.dailyMacrosPct).toBe(0);
  });
});

describe('useNutritionHubMetrics source lock', () => {
  const source = readFileSync(
    path.resolve(__dirname, '..', 'useNutritionHubMetrics.ts'),
    'utf-8',
  );

  it('does not use calorieWeightedMealQualityScore or generateTargets', () => {
    expect(source).not.toContain('calorieWeightedMealQualityScore');
    expect(source).not.toContain('generateTargets');
    expect(source).not.toContain("from '@/lib/gordon/generateTargets'");
    expect(source).toContain('heroNutritionScore');
    expect(source).toContain('dailyFoodPatternQuality');
  });

  it('reads only Jeffery live nutrition_targets columns; no lbm_kg', () => {
    expect(source).toContain(
      "'daily_kcal, daily_protein_g, daily_carbs_g, daily_fat_total_g, daily_fiber_g, goal_direction'",
    );
    expect(source).not.toContain('lbm_kg');
    expect(source).not.toContain('lbmKg');
    expect(source).not.toContain('body_fat_fraction');
    expect(source).not.toContain('meal_distribution');
  });

  it('does not fold hydration into Nutrition Score', () => {
    expect(source).not.toContain('hydration');
  });
});
