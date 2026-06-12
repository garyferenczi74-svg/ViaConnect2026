// Prompt 192 Task 2 (TDD first): supplement_meal_alignment detector tests.
// The static meal vs stack interaction rules are the checkFoodInteractions
// ruleset (re homed into this module after the 2026-06-12 dead code sweep
// deleted src/lib/nutrition/checkFoodInteractions.ts). The iron plus dairy
// fixture pins the exact legacy output shape so behavior stays identical.

import { describe, expect, it } from 'vitest';
import {
  checkFoodInteractions,
  detectSupplementMealAlignment,
} from '../detectors/supplement-meal-alignment';
import { mkInput, mkMeal, YESTERDAY } from './fixtures';

describe('checkFoodInteractions (re homed static rules)', () => {
  it('matches the legacy iron plus dairy output exactly', () => {
    const out = checkFoodInteractions(
      [{ name: 'Greek Yogurt' }],
      [{ name: 'Iron Bisglycinate' }],
    );
    expect(out).toEqual([
      {
        foodItem: 'Greek Yogurt',
        interactsWith: 'Iron Bisglycinate',
        interactionType: 'absorption',
        severity: 'caution',
        description: 'Calcium competes with iron for absorption',
        recommendation: 'Separate iron supplements and dairy by 2 hours',
      },
    ]);
  });

  it('matches the legacy iron plus caffeine rule', () => {
    const out = checkFoodInteractions([{ name: 'black coffee' }], [{ name: 'Iron Complex' }]);
    expect(out).toEqual([
      {
        foodItem: 'black coffee',
        interactsWith: 'Iron Complex',
        interactionType: 'absorption',
        severity: 'caution',
        description: 'Caffeine and tannins reduce iron absorption',
        recommendation: 'Take iron supplements 1 hour before or 2 hours after coffee',
      },
    ]);
  });
});

describe('detectSupplementMealAlignment', () => {
  it('emits a daily fact whose snapshot interaction equals the checkFoodInteractions output', () => {
    const input = mkInput({
      scoredMeals: [
        mkMeal({ date: YESTERDAY, mealType: 'breakfast', itemNames: ['Greek Yogurt'] }),
      ],
      scheduledSupplements: [{ name: 'Iron Bisglycinate', timingBucket: 'morning' }],
    });
    const facts = detectSupplementMealAlignment(input);
    const interactionFacts = facts.filter((f) => f.snapshot.kind === 'interaction');
    expect(interactionFacts).toHaveLength(1);
    const fact = interactionFacts[0];
    expect(fact.type).toBe('supplement_meal_alignment');
    expect(fact.horizon).toBe('daily');
    expect(fact.severity).toBe('attention');
    expect(fact.snapshot.interaction).toEqual(
      checkFoodInteractions([{ name: 'Greek Yogurt' }], [{ name: 'Iron Bisglycinate' }])[0],
    );
  });

  it('flags a fat soluble supplement scheduled against a low fat bucket', () => {
    const input = mkInput({
      scoredMeals: [
        mkMeal({ date: YESTERDAY, mealType: 'breakfast', fatTotalG: 3 }),
      ],
      scheduledSupplements: [{ name: 'Vitamin D3', timingBucket: 'morning' }],
    });
    const facts = detectSupplementMealAlignment(input);
    const fatFacts = facts.filter((f) => f.snapshot.kind === 'fat_soluble_low_fat');
    expect(fatFacts).toHaveLength(1);
    expect(fatFacts[0].snapshot.supplement).toBe('Vitamin D3');
    expect(fatFacts[0].snapshot.timingBucket).toBe('morning');
    expect(fatFacts[0].snapshot.bucketFatG).toBe(3);
    expect(fatFacts[0].snapshot.thresholdG).toBe(5);
  });

  it('does not flag fat soluble timing when the bucket carries enough fat', () => {
    const input = mkInput({
      scoredMeals: [mkMeal({ date: YESTERDAY, mealType: 'breakfast', fatTotalG: 20 })],
      scheduledSupplements: [{ name: 'Vitamin D3', timingBucket: 'morning' }],
    });
    expect(
      detectSupplementMealAlignment(input).filter((f) => f.snapshot.kind === 'fat_soluble_low_fat'),
    ).toHaveLength(0);
  });

  it('treats UNKNOWN fat as unknown, never as 0 grams', () => {
    const input = mkInput({
      scoredMeals: [
        mkMeal({ date: YESTERDAY, mealType: 'breakfast', fatTotalG: 0, known: { fat: false } }),
      ],
      scheduledSupplements: [{ name: 'Vitamin D3', timingBucket: 'morning' }],
    });
    expect(
      detectSupplementMealAlignment(input).filter((f) => f.snapshot.kind === 'fat_soluble_low_fat'),
    ).toHaveLength(0);
  });

  it('emits nothing when no meals fall in the supplement bucket', () => {
    const input = mkInput({
      scoredMeals: [mkMeal({ date: YESTERDAY, mealType: 'dinner', fatTotalG: 2 })],
      scheduledSupplements: [{ name: 'Vitamin D3', timingBucket: 'morning' }],
    });
    expect(
      detectSupplementMealAlignment(input).filter((f) => f.snapshot.kind === 'fat_soluble_low_fat'),
    ).toHaveLength(0);
  });
});
