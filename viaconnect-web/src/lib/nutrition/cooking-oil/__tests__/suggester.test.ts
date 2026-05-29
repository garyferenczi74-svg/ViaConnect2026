// Prompt #170 Phase 1g: tests for the cooking-oil smart-default suggester.
//
// Per spec §2.3.5 + §5.5 the suggester returns a non-applied default keyed by
// cookingMethod + cuisineTag. Caller surfaces the default in the picker and the
// user always confirms before macros are applied. Tests cover the full method x
// cuisine matrix exit points, the undefined-cuisine fallback, and the macro
// delta math at canonical densities.

import { describe, it, expect } from 'vitest';
import { suggestCookingOil, oilMacroDelta } from '../suggester';

describe('suggestCookingOil', () => {
  it('raw -> none / 0 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'raw' });
    expect(out.type).toBe('none');
    expect(out.amount_ml).toBe(0);
    expect(out.reasoning).toContain('raw');
  });

  it('steamed -> none / 0 ml regardless of cuisine', () => {
    const out = suggestCookingOil({ cookingMethod: 'steamed', cuisineTag: 'east_asian' });
    expect(out.type).toBe('none');
    expect(out.amount_ml).toBe(0);
  });

  it('boiled -> none / 0 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'boiled' });
    expect(out.type).toBe('none');
    expect(out.amount_ml).toBe(0);
  });

  it('grilled -> none / 0 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'grilled', cuisineTag: 'mediterranean' });
    expect(out.type).toBe('none');
    expect(out.amount_ml).toBe(0);
  });

  it('baked -> none / 0 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'baked' });
    expect(out.type).toBe('none');
    expect(out.amount_ml).toBe(0);
  });

  it('sauteed east_asian -> sesame_oil / 5 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'sauteed', cuisineTag: 'east_asian' });
    expect(out.type).toBe('sesame_oil');
    expect(out.amount_ml).toBe(5);
  });

  it('sauteed mediterranean -> olive_oil / 5 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'sauteed', cuisineTag: 'mediterranean' });
    expect(out.type).toBe('olive_oil');
    expect(out.amount_ml).toBe(5);
  });

  it('sauteed north_american -> olive_oil / 5 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'sauteed', cuisineTag: 'north_american' });
    expect(out.type).toBe('olive_oil');
    expect(out.amount_ml).toBe(5);
  });

  it('sauteed south_asian -> ghee / 5 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'sauteed', cuisineTag: 'south_asian' });
    expect(out.type).toBe('ghee');
    expect(out.amount_ml).toBe(5);
  });

  it('sauteed latin_american -> vegetable_canola_oil / 5 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'sauteed', cuisineTag: 'latin_american' });
    expect(out.type).toBe('vegetable_canola_oil');
    expect(out.amount_ml).toBe(5);
  });

  it('sauteed middle_eastern -> olive_oil / 5 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'sauteed', cuisineTag: 'middle_eastern' });
    expect(out.type).toBe('olive_oil');
    expect(out.amount_ml).toBe(5);
  });

  it('sauteed african -> olive_oil / 5 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'sauteed', cuisineTag: 'african' });
    expect(out.type).toBe('olive_oil');
    expect(out.amount_ml).toBe(5);
  });

  it('sauteed southeast_asian -> vegetable_canola_oil / 5 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'sauteed', cuisineTag: 'southeast_asian' });
    expect(out.type).toBe('vegetable_canola_oil');
    expect(out.amount_ml).toBe(5);
  });

  it('sauteed unknown cuisine -> olive_oil / 5 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'sauteed', cuisineTag: 'unknown' });
    expect(out.type).toBe('olive_oil');
    expect(out.amount_ml).toBe(5);
  });

  it('sauteed undefined cuisine -> olive_oil / 5 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'sauteed' });
    expect(out.type).toBe('olive_oil');
    expect(out.amount_ml).toBe(5);
  });

  it('fried mediterranean -> olive_oil / 5 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'fried', cuisineTag: 'mediterranean' });
    expect(out.type).toBe('olive_oil');
    expect(out.amount_ml).toBe(5);
  });

  it('fried north_american -> vegetable_canola_oil / 10 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'fried', cuisineTag: 'north_american' });
    expect(out.type).toBe('vegetable_canola_oil');
    expect(out.amount_ml).toBe(10);
  });

  it('fried latin_american -> vegetable_canola_oil / 10 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'fried', cuisineTag: 'latin_american' });
    expect(out.type).toBe('vegetable_canola_oil');
    expect(out.amount_ml).toBe(10);
  });

  it('fried southeast_asian -> vegetable_canola_oil / 10 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'fried', cuisineTag: 'southeast_asian' });
    expect(out.type).toBe('vegetable_canola_oil');
    expect(out.amount_ml).toBe(10);
  });

  it('fried east_asian -> vegetable_canola_oil / 10 ml (peanut aliased)', () => {
    const out = suggestCookingOil({ cookingMethod: 'fried', cuisineTag: 'east_asian' });
    expect(out.type).toBe('vegetable_canola_oil');
    expect(out.amount_ml).toBe(10);
  });

  it('fried south_asian -> ghee / 10 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'fried', cuisineTag: 'south_asian' });
    expect(out.type).toBe('ghee');
    expect(out.amount_ml).toBe(10);
  });

  it('fried middle_eastern -> olive_oil / 10 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'fried', cuisineTag: 'middle_eastern' });
    expect(out.type).toBe('olive_oil');
    expect(out.amount_ml).toBe(10);
  });

  it('fried african -> olive_oil / 10 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'fried', cuisineTag: 'african' });
    expect(out.type).toBe('olive_oil');
    expect(out.amount_ml).toBe(10);
  });

  it('fried undefined cuisine -> vegetable_canola_oil / 10 ml', () => {
    const out = suggestCookingOil({ cookingMethod: 'fried' });
    expect(out.type).toBe('vegetable_canola_oil');
    expect(out.amount_ml).toBe(10);
  });

  it('deep_fried any cuisine -> vegetable_canola_oil / 15 ml', () => {
    for (const cuisine of [
      'north_american', 'mediterranean', 'latin_american', 'east_asian',
      'south_asian', 'southeast_asian', 'middle_eastern', 'african', 'unknown',
    ] as const) {
      const out = suggestCookingOil({ cookingMethod: 'deep_fried', cuisineTag: cuisine });
      expect(out.type).toBe('vegetable_canola_oil');
      expect(out.amount_ml).toBe(15);
    }
  });

  it('unknown method -> none / 0 ml fallback', () => {
    const out = suggestCookingOil({ cookingMethod: 'unknown' });
    expect(out.type).toBe('none');
    expect(out.amount_ml).toBe(0);
  });

  it('reasoning is dash-free and ends with confirm phrasing', () => {
    const out = suggestCookingOil({ cookingMethod: 'sauteed', cuisineTag: 'east_asian' });
    expect(out.reasoning).not.toMatch(/[—–]/);
    expect(out.reasoning.toLowerCase()).toContain('confirm');
  });
});

describe('oilMacroDelta', () => {
  it('none returns all zeros regardless of amount', () => {
    const d = oilMacroDelta({ type: 'none', amount_ml: 99 });
    expect(d.calories_kcal).toBe(0);
    expect(d.fat_g).toBe(0);
    expect(d.saturated_fat_g).toBe(0);
  });

  it('any oil at 0 ml returns all zeros', () => {
    const d = oilMacroDelta({ type: 'olive_oil', amount_ml: 0 });
    expect(d.calories_kcal).toBe(0);
    expect(d.fat_g).toBe(0);
    expect(d.saturated_fat_g).toBe(0);
  });

  it('olive_oil 5 ml: calories ~ 40, fat ~ 4.6, sat ~ 0.6', () => {
    // mass_g = 5 * 0.915 = 4.575
    // calories = 884 * 0.04575 = 40.45 -> 40
    // fat_g = 100 * 0.04575 = 4.575 -> 4.6
    // sat_fat = 14 * 0.04575 = 0.6405 -> 0.6
    const d = oilMacroDelta({ type: 'olive_oil', amount_ml: 5 });
    expect(d.calories_kcal).toBe(40);
    expect(d.fat_g).toBeCloseTo(4.6, 1);
    expect(d.saturated_fat_g).toBeCloseTo(0.6, 1);
  });

  it('evoo 5 ml matches olive_oil 5 ml (same density profile)', () => {
    const olive = oilMacroDelta({ type: 'olive_oil', amount_ml: 5 });
    const evoo = oilMacroDelta({ type: 'evoo', amount_ml: 5 });
    expect(evoo).toEqual(olive);
  });

  it('butter 15 ml: matches mass x per-100g math', () => {
    // mass_g = 15 * 0.911 = 13.665
    // calories = 717 * 0.13665 = 97.98 -> 98
    // fat_g = 81 * 0.13665 = 11.07 -> 11.1
    // sat_fat = 51 * 0.13665 = 6.97 -> 7.0
    const d = oilMacroDelta({ type: 'butter', amount_ml: 15 });
    expect(d.calories_kcal).toBe(98);
    expect(d.fat_g).toBeCloseTo(11.1, 1);
    expect(d.saturated_fat_g).toBeCloseTo(7.0, 1);
  });

  it('coconut_oil 10 ml: saturated fat is dominant', () => {
    // mass_g = 10 * 0.924 = 9.24
    // calories = 892 * 0.0924 = 82.42 -> 82
    // fat_g = 100 * 0.0924 = 9.24 -> 9.2
    // sat_fat = 87 * 0.0924 = 8.04 -> 8.0
    const d = oilMacroDelta({ type: 'coconut_oil', amount_ml: 10 });
    expect(d.calories_kcal).toBe(82);
    expect(d.fat_g).toBeCloseTo(9.2, 1);
    expect(d.saturated_fat_g).toBeCloseTo(8.0, 1);
  });

  it('ghee 5 ml matches authoritative density', () => {
    // mass_g = 5 * 0.911 = 4.555
    // calories = 900 * 0.04555 = 40.995 -> 41
    // fat_g = 100 * 0.04555 = 4.555 -> 4.6
    // sat_fat = 62 * 0.04555 = 2.824 -> 2.8
    const d = oilMacroDelta({ type: 'ghee', amount_ml: 5 });
    expect(d.calories_kcal).toBe(41);
    expect(d.fat_g).toBeCloseTo(4.6, 1);
    expect(d.saturated_fat_g).toBeCloseTo(2.8, 1);
  });

  it('vegetable_canola_oil 15 ml deep-fry default', () => {
    // mass_g = 15 * 0.920 = 13.8
    // calories = 884 * 0.138 = 121.99 -> 122
    // fat_g = 100 * 0.138 = 13.8
    // sat_fat = 7 * 0.138 = 0.966 -> 1.0
    const d = oilMacroDelta({ type: 'vegetable_canola_oil', amount_ml: 15 });
    expect(d.calories_kcal).toBe(122);
    expect(d.fat_g).toBeCloseTo(13.8, 1);
    expect(d.saturated_fat_g).toBeCloseTo(1.0, 1);
  });

  it('sesame_oil 5 ml saute default', () => {
    // mass_g = 5 * 0.920 = 4.6
    // calories = 884 * 0.046 = 40.66 -> 41
    // fat_g = 100 * 0.046 = 4.6
    // sat_fat = 14 * 0.046 = 0.644 -> 0.6
    const d = oilMacroDelta({ type: 'sesame_oil', amount_ml: 5 });
    expect(d.calories_kcal).toBe(41);
    expect(d.fat_g).toBeCloseTo(4.6, 1);
    expect(d.saturated_fat_g).toBeCloseTo(0.6, 1);
  });

  it('avocado_oil 10 ml matches authoritative density', () => {
    // mass_g = 10 * 0.913 = 9.13
    // calories = 884 * 0.0913 = 80.71 -> 81
    // fat_g = 100 * 0.0913 = 9.13 -> 9.1
    // sat_fat = 12 * 0.0913 = 1.0956 -> 1.1
    const d = oilMacroDelta({ type: 'avocado_oil', amount_ml: 10 });
    expect(d.calories_kcal).toBe(81);
    expect(d.fat_g).toBeCloseTo(9.1, 1);
    expect(d.saturated_fat_g).toBeCloseTo(1.1, 1);
  });

  it('other treated as neutral oil (vegetable_canola_oil density)', () => {
    const veg = oilMacroDelta({ type: 'vegetable_canola_oil', amount_ml: 10 });
    const other = oilMacroDelta({ type: 'other', amount_ml: 10 });
    expect(other).toEqual(veg);
  });
});
