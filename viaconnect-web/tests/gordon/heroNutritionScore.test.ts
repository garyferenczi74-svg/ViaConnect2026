// Hub hero Nutrition Score: daily macro attainment vs nutrition_targets
// plus a food-pattern-only +/-15 modifier and a goal_direction tilt.
// Slot-weighted calorieWeightedMealQualityScore must not drive the hero.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { assignTier } from '@/lib/gordon/constants';
import {
  calorieWeightedMealQualityScore,
  dailyFoodPatternQuality,
  foodPatternQualityModifier,
  goalDirectionTilt,
  heroNutritionScore,
  mealFoodPatternQuality,
  FOOD_PATTERN_MODIFIER_NAMES,
  type FoodPatternModifier,
  type HeroNutritionScoreInput,
} from '@/lib/gordon/daily-aggregate';

const SLOT_FIT_MODIFIERS: FoodPatternModifier[] = [
  { name: 'Protein Fit', value: -10 },
  { name: 'Carb Fit', value: -10 },
  { name: 'Fat Fit', value: -10 },
  { name: 'Calorie Fit', value: -5 },
  { name: 'Fiber Bonus', value: 0 },
];

const NEUTRAL_FOOD_PATTERN: FoodPatternModifier[] = [
  { name: 'Sugar Penalty', value: 0 },
  { name: 'Saturated Fat Penalty', value: 0 },
  { name: 'Sodium Penalty', value: 0 },
  { name: 'Whole Food Bonus', value: 0 },
];

const WORST_FOOD_PATTERN: FoodPatternModifier[] = [
  { name: 'Sugar Penalty', value: -20 },
  { name: 'Saturated Fat Penalty', value: -15 },
  { name: 'Sodium Penalty', value: -15 },
  { name: 'Whole Food Bonus', value: 0 },
];

function baseInput(overrides: Partial<HeroNutritionScoreInput> = {}): HeroNutritionScoreInput {
  return {
    dailyMacrosPct: 90,
    dailyFoodQuality: 50,
    goalDirection: null,
    caloriesConsumed: 1800,
    dailyKcal: 2000,
    proteinConsumed: 90,
    dailyProteinG: 100,
    ...overrides,
  };
}

describe('food-pattern quality input', () => {
  it('uses only sugar, saturated fat, sodium, and whole-food modifiers', () => {
    expect(FOOD_PATTERN_MODIFIER_NAMES).toEqual([
      'Sugar Penalty',
      'Saturated Fat Penalty',
      'Sodium Penalty',
      'Whole Food Bonus',
    ]);
  });

  it('ignores meal-slot protein / carb / fat / calorie fit', () => {
    const leaked = mealFoodPatternQuality([
      ...SLOT_FIT_MODIFIERS,
      ...NEUTRAL_FOOD_PATTERN,
    ]);
    expect(leaked).toBe(50);
    expect(foodPatternQualityModifier(leaked)).toBe(0);

    const daily = dailyFoodPatternQuality([
      { modifiers: [...SLOT_FIT_MODIFIERS, ...WORST_FOOD_PATTERN] },
    ]);
    // 50 - 20 - 15 - 15 = 0. Slot-fit -35 must not pull this lower.
    expect(daily).toBe(0);
    expect(foodPatternQualityModifier(daily)).toBe(-15);
  });

  it('does not treat an empty meal list as a 0 quality score', () => {
    expect(dailyFoodPatternQuality([])).toBe(50);
    expect(dailyFoodPatternQuality([])).not.toBe(0);
    expect(calorieWeightedMealQualityScore([])).toBe(0);
  });

  it('must not call calorieWeightedMealQualityScore for the quality input', () => {
    const src = readFileSync(
      path.resolve(process.cwd(), 'src/lib/gordon/daily-aggregate.ts'),
      'utf-8',
    );
    const heroBlock = src.slice(src.indexOf('FOOD_PATTERN_MODIFIER_NAMES'));
    expect(heroBlock).toContain('heroNutritionScore');
    expect(heroBlock).not.toMatch(/calorieWeightedMealQualityScore\(/);
    expect(heroBlock).not.toContain('lbm_kg');
    expect(heroBlock).not.toContain('lbmKg');
  });
});

describe('heroNutritionScore locked formula', () => {
  it('(a) 90% macros + slot-quality 30 paints Excellent, never Fair', () => {
    const slotWeighted30 = calorieWeightedMealQualityScore([
      { qualityScore: 30, caloriesKcal: 1196 },
      { qualityScore: 30, caloriesKcal: 436 },
    ]);
    expect(slotWeighted30).toBe(30);
    expect(assignTier(slotWeighted30)).toBe('Fair');

    const score = heroNutritionScore(
      baseInput({
        dailyMacrosPct: 90,
        // Feeding the old 30 as quality would be a -15 leak. The hero
        // quality input is food-pattern 50, not the slot-weighted 30.
        dailyFoodQuality: 50,
      }),
    );
    expect(score).toBe(90);
    expect(score).toBeGreaterThanOrEqual(60);
    expect(['Excellent', 'Perfection']).toContain(assignTier(score));
    expect(assignTier(score)).not.toBe('Fair');
    expect(score).not.toBe(30);
  });

  it('(a) even a leaked slot-quality 30 modifier still lands Excellent on a 90% day', () => {
    const leaked = heroNutritionScore(baseInput({ dailyFoodQuality: 30 }));
    expect(foodPatternQualityModifier(30)).toBe(-15);
    expect(leaked).toBe(75);
    expect(assignTier(leaked)).toBe('Excellent');
  });

  it('(b) macros >= 80 => Nutrition Score >= 40 after the modifier', () => {
    const score = heroNutritionScore(
      baseInput({
        dailyMacrosPct: 80,
        dailyFoodQuality: 0,
        goalDirection: 'lose',
        caloriesConsumed: 4000,
        dailyKcal: 2000,
      }),
    );
    expect(score).toBeGreaterThanOrEqual(40);
    expect(assignTier(score)).not.toBe('Fair');
    expect(assignTier(score)).not.toBe('Poor');
  });

  it('(e) lose kcal overshoot does not dump a true 90% day below Excellent', () => {
    const tilt = goalDirectionTilt(
      baseInput({
        goalDirection: 'lose',
        caloriesConsumed: 3000,
        dailyKcal: 2000,
      }),
    );
    expect(tilt).toBe(-15);

    const score = heroNutritionScore(
      baseInput({
        dailyMacrosPct: 90,
        dailyFoodQuality: 0,
        goalDirection: 'lose',
        caloriesConsumed: 3000,
        dailyKcal: 2000,
      }),
    );
    expect(score).toBeGreaterThanOrEqual(60);
    expect(assignTier(score)).toBe('Excellent');
  });

  it('(e) gain protein-miss tilt does not double-count or dump a 90% day', () => {
    const tilt = goalDirectionTilt(
      baseInput({
        goalDirection: 'gain',
        proteinConsumed: 55,
        dailyProteinG: 100,
        dailyMacrosPct: 90,
      }),
    );
    expect(tilt).toBe(0);

    const score = heroNutritionScore(
      baseInput({
        dailyMacrosPct: 90,
        dailyFoodQuality: 0,
        goalDirection: 'gain',
        proteinConsumed: 55,
        dailyProteinG: 100,
      }),
    );
    expect(score).toBeGreaterThanOrEqual(60);
    expect(assignTier(score)).toBe('Excellent');
  });

  it('null goal_direction skips the tilt and still scores the five macros', () => {
    const lose = goalDirectionTilt(
      baseInput({
        goalDirection: 'lose',
        caloriesConsumed: 3000,
        dailyKcal: 2000,
      }),
    );
    expect(lose).toBeLessThan(0);
    expect(
      goalDirectionTilt(
        baseInput({
          goalDirection: null,
          caloriesConsumed: 3000,
          dailyKcal: 2000,
        }),
      ),
    ).toBe(0);
    expect(
      heroNutritionScore(
        baseInput({
          goalDirection: null,
          caloriesConsumed: 3000,
          dailyKcal: 2000,
          dailyFoodQuality: 50,
        }),
      ),
    ).toBe(90);
  });
});
