// Prompt 177d Phase E (2026-06-07): calorie-weighted meal quality aggregate.
//
// Pins the 177 spec section 4.5 default: a substantial dinner influences
// the day more than a small snack, and a tiny perfect snack does not
// mask a poor dinner. Pure-function tests; the helper is the swap point
// when a future Gordon-tunable preference (uniform vs weighted) ships.

import { describe, it, expect } from 'vitest';
import { calorieWeightedMealQualityScore } from '@/lib/gordon/daily-aggregate';

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
