// Prompt 177d Phase E (2026-06-07): calorie-weighted meal quality aggregate.
//
// Pins the 177 spec section 4.5 default: a substantial dinner influences
// the day more than a small snack, and a tiny perfect snack does not
// mask a poor dinner. Pure-function tests; the helper is the swap point
// when a future Gordon-tunable preference (uniform vs weighted) ships.

import { describe, it, expect } from 'vitest';
import {
  calorieWeightedMealQualityScore,
  dailyMacrosHasSignal,
  totalDailyMacrosScore,
} from '@/lib/gordon/daily-aggregate';
import { DAILY_MACRO_WEIGHTS } from '@/lib/gordon/constants';

describe('calorieWeightedMealQualityScore', () => {
  it('returns 0 for an empty day', () => {
    expect(calorieWeightedMealQualityScore([])).toBe(0);
  });

  it('returns the only meal score when only one meal is logged', () => {
    expect(
      calorieWeightedMealQualityScore([{ qualityScore: 72, caloriesKcal: 600 }]),
    ).toBe(72);
  });

  it('weights a small perfect snack less than a substantial poor dinner', () => {
    // 100 kcal at score 100 + 800 kcal at score 30. Calorie weight makes
    // the dinner dominate. Uniform average would have been 65; the
    // weighted result must be much closer to 30 than to 100.
    const result = calorieWeightedMealQualityScore([
      { qualityScore: 100, caloriesKcal: 100 },
      { qualityScore: 30, caloriesKcal: 800 },
    ]);
    // (100*100 + 30*800) / 900 = 38
    expect(result).toBe(38);
    expect(result).toBeLessThan(65);
  });

  it('matches uniform average when all meals are equal calories', () => {
    const result = calorieWeightedMealQualityScore([
      { qualityScore: 80, caloriesKcal: 500 },
      { qualityScore: 60, caloriesKcal: 500 },
      { qualityScore: 40, caloriesKcal: 500 },
    ]);
    expect(result).toBe(60);
  });

  it('clamps qualityScore to [0, 100] before weighting', () => {
    // A noisy fixture with an out-of-range score must not produce a
    // nonsensical aggregate.
    const result = calorieWeightedMealQualityScore([
      { qualityScore: 120, caloriesKcal: 500 },
      { qualityScore: -10, caloriesKcal: 500 },
    ]);
    // Clamped: (100*500 + 0*500) / 1000 = 50
    expect(result).toBe(50);
  });

  it('treats negative or zero caloriesKcal as weight 0', () => {
    // A logged zero-calorie meal does not affect the weighted average.
    const result = calorieWeightedMealQualityScore([
      { qualityScore: 80, caloriesKcal: 600 },
      { qualityScore: 20, caloriesKcal: 0 },
      { qualityScore: 20, caloriesKcal: -100 },
    ]);
    expect(result).toBe(80);
  });

  it('falls back to uniform average when every meal has zero calories', () => {
    // Defensive: no caloric weight means we cannot divide; uniform is
    // the only honest fallback.
    const result = calorieWeightedMealQualityScore([
      { qualityScore: 80, caloriesKcal: 0 },
      { qualityScore: 40, caloriesKcal: 0 },
    ]);
    expect(result).toBe(60);
  });

  it('a tiny perfect snack does not mask a poor large dinner', () => {
    // The 177 spec example: snack 50 kcal at 95, dinner 900 kcal at 25.
    // Uniform average would lie at 60, but the day was clearly a poor
    // nutrition day driven by the dinner. Weighted result must be near
    // 25, not near 60.
    const result = calorieWeightedMealQualityScore([
      { qualityScore: 95, caloriesKcal: 50 },
      { qualityScore: 25, caloriesKcal: 900 },
    ]);
    // (95*50 + 25*900) / 950 = 28.68 -> 29
    expect(result).toBe(29);
    expect(result).toBeLessThan(35);
  });
});

// Prompt 177e (2026-06-07): Total Daily Macros across five tracked macros.
describe('totalDailyMacrosScore', () => {
  it('returns 0 when every attainment is null', () => {
    const result = totalDailyMacrosScore({
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      fiber: null,
    });
    expect(result).toBe(0);
  });

  it('averages five equal attainments correctly under default weights', () => {
    // calories 80 with weight 0.5, four composition macros at 80 with
    // weight 1.0 each -> weighted avg still 80.
    const result = totalDailyMacrosScore({
      calories: 80,
      protein: 80,
      carbs: 80,
      fat: 80,
      fiber: 80,
    });
    expect(result).toBe(80);
  });

  it('weights composition macros more heavily than calories', () => {
    // Composition macros all at 100, calories at 0. Uniform avg would
    // be 80 (one zero out of five equal weights). With calories at
    // half weight, the weighted total = (0*0.5 + 100*4) / 4.5 ~= 88.89.
    const result = totalDailyMacrosScore({
      calories: 0,
      protein: 100,
      carbs: 100,
      fat: 100,
      fiber: 100,
    });
    expect(result).toBe(89);
    expect(result).toBeGreaterThan(80); // > uniform average
  });

  it('weights calories at half a composition macro per DAILY_MACRO_WEIGHTS', () => {
    expect(DAILY_MACRO_WEIGHTS.calories).toBe(0.5);
    expect(DAILY_MACRO_WEIGHTS.protein).toBe(1.0);
    expect(DAILY_MACRO_WEIGHTS.carbs).toBe(1.0);
    expect(DAILY_MACRO_WEIGHTS.fat).toBe(1.0);
    expect(DAILY_MACRO_WEIGHTS.fiber).toBe(1.0);
  });

  it('skips null attainments without zeroing the average', () => {
    // Day where fiber was unknown on every meal. Other four hit 80.
    // Result should be 80, not (80*4 + 0) / 5 = 64.
    const result = totalDailyMacrosScore({
      calories: 80,
      protein: 80,
      carbs: 80,
      fat: 80,
      fiber: null,
    });
    expect(result).toBe(80);
  });

  it('clamps individual attainments to [0, 100] before weighting', () => {
    // Inputs above 100 (overshoot at the macro level) and below 0
    // (impossible but defensive) must not blow up the aggregate.
    const result = totalDailyMacrosScore({
      calories: 150,
      protein: -10,
      carbs: 60,
      fat: 60,
      fiber: 60,
    });
    // clamped: cal=100*0.5 + protein=0*1 + carbs=60 + fat=60 + fiber=60
    // = (50 + 0 + 60 + 60 + 60) / 4.5 = 230/4.5 = 51.11 -> 51
    expect(result).toBe(51);
  });

  it('calories alone still produces a score when every macro is null', () => {
    // Edge: meals logged but none determined any macro past calories.
    // The day should reflect what we know rather than zeroing.
    const result = totalDailyMacrosScore({
      calories: 80,
      protein: null,
      carbs: null,
      fat: null,
      fiber: null,
    });
    expect(result).toBe(80);
  });
});

describe('dailyMacrosHasSignal', () => {
  it('returns false when every macro is null', () => {
    expect(
      dailyMacrosHasSignal({
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
        fiber: null,
      }),
    ).toBe(false);
  });

  it('returns true when at least one macro is non-null', () => {
    expect(
      dailyMacrosHasSignal({
        calories: 80,
        protein: null,
        carbs: null,
        fat: null,
        fiber: null,
      }),
    ).toBe(true);
  });
});
