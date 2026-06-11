// Prompt 183 Task 4 (2026-06-10): unit tests for the pure helpers behind the
// read only Today's Meals accordion. Deterministic fixtures with an injected
// `now` and UTC timezone so date boundaries do not depend on the host clock.

import { describe, it, expect } from 'vitest';
import type { Meal, MealType } from '@/lib/gordon/types';
import {
  groupTodaysMealsByType,
  hydrationPercentToTarget,
  hydrationRemainingMl,
  localDateKey,
  mealTypeAggregateScore,
  mealTypeTotals,
  MEAL_TYPE_ORDER,
} from '../nutritionTodaysMeals.helpers';

const TZ = 'UTC';
// Fixed now: 2026-06-10T12:00:00Z. Today's local key (UTC) is 2026-06-10.
const NOW = new Date('2026-06-10T12:00:00.000Z');

// Minimal Meal factory: only the fields the helpers read are meaningful; the
// rest are filled with inert defaults so the object satisfies the Meal type.
function meal(partial: Partial<Meal> & { mealType: MealType; loggedAt: string }): Meal {
  return {
    mealId: partial.mealId ?? Math.random().toString(36).slice(2),
    userId: 'u1',
    loggedAt: partial.loggedAt,
    mealType: partial.mealType,
    source: 'quick_log',
    sourceConfidence: 1,
    proteinG: partial.proteinG ?? 0,
    carbsG: partial.carbsG ?? 0,
    fatTotalG: partial.fatTotalG ?? 0,
    fatSourceId: null,
    fatBreakdown: null,
    fatQualityContribution: null,
    fiberG: partial.fiberG ?? 0,
    sugarG: partial.sugarG ?? 0,
    sodiumMg: 0,
    caloriesKcal: partial.caloriesKcal ?? 0,
    caloriesAutoCalc: false,
    wholeFoodFlag: null,
    ingredientsList: null,
    mealName: partial.mealName ?? null,
    notes: null,
    rawInput: null,
    legacyNutritionLogId: null,
    qualityScore: partial.qualityScore ?? null,
    qualityTier: null,
    scoreBreakdown: null,
    scoredAt: null,
    gordonVersion: null,
    snackIndex: null,
    createdAt: partial.loggedAt,
    updatedAt: partial.loggedAt,
  };
}

describe('MEAL_TYPE_ORDER', () => {
  it('lists the four meal types in display order', () => {
    expect(MEAL_TYPE_ORDER).toEqual(['breakfast', 'lunch', 'dinner', 'snack']);
  });
});

describe('groupTodaysMealsByType', () => {
  it('keeps only today and buckets by meal type', () => {
    const meals: Meal[] = [
      meal({ mealType: 'breakfast', loggedAt: '2026-06-10T08:00:00.000Z' }),
      meal({ mealType: 'breakfast', loggedAt: '2026-06-10T09:30:00.000Z' }),
      meal({ mealType: 'lunch', loggedAt: '2026-06-10T13:00:00.000Z' }),
      // Yesterday: excluded.
      meal({ mealType: 'dinner', loggedAt: '2026-06-09T19:00:00.000Z' }),
    ];
    const grouped = groupTodaysMealsByType(meals, NOW, TZ);
    expect(grouped.breakfast).toHaveLength(2);
    expect(grouped.lunch).toHaveLength(1);
    expect(grouped.dinner).toHaveLength(0);
    expect(grouped.snack).toHaveLength(0);
  });

  it('always returns all four buckets even with no meals', () => {
    const grouped = groupTodaysMealsByType([], NOW, TZ);
    expect(Object.keys(grouped).sort()).toEqual(['breakfast', 'dinner', 'lunch', 'snack']);
    expect(grouped.breakfast).toEqual([]);
  });

  it('excludes a meal from a different local day in the same window', () => {
    const meals: Meal[] = [meal({ mealType: 'snack', loggedAt: '2026-06-08T12:00:00.000Z' })];
    const grouped = groupTodaysMealsByType(meals, NOW, TZ);
    expect(grouped.snack).toHaveLength(0);
  });
});

describe('mealTypeTotals', () => {
  it('sums the five macros plus calories', () => {
    const meals: Meal[] = [
      meal({ mealType: 'lunch', loggedAt: '2026-06-10T13:00:00.000Z', proteinG: 30, carbsG: 40, fatTotalG: 10, fiberG: 5, sugarG: 8, caloriesKcal: 400 }),
      meal({ mealType: 'lunch', loggedAt: '2026-06-10T13:30:00.000Z', proteinG: 20, carbsG: 10, fatTotalG: 5, fiberG: 3, sugarG: 2, caloriesKcal: 200 }),
    ];
    expect(mealTypeTotals(meals)).toEqual({
      protein: 50,
      carbs: 50,
      fat: 15,
      fiber: 8,
      sugar: 10,
      kcal: 600,
    });
  });

  it('returns all zeros for an empty set', () => {
    expect(mealTypeTotals([])).toEqual({ protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, kcal: 0 });
  });
});

describe('mealTypeAggregateScore', () => {
  it('returns null when no meal carries a quality score', () => {
    const meals: Meal[] = [
      meal({ mealType: 'dinner', loggedAt: '2026-06-10T19:00:00.000Z', qualityScore: null, caloriesKcal: 500 }),
    ];
    expect(mealTypeAggregateScore(meals)).toBeNull();
  });

  it('returns null for an empty set', () => {
    expect(mealTypeAggregateScore([])).toBeNull();
  });

  it('calorie weights the scored meals only', () => {
    const meals: Meal[] = [
      meal({ mealType: 'dinner', loggedAt: '2026-06-10T19:00:00.000Z', qualityScore: 90, caloriesKcal: 100 }),
      meal({ mealType: 'dinner', loggedAt: '2026-06-10T19:30:00.000Z', qualityScore: 60, caloriesKcal: 300 }),
      // Unscored: excluded from the aggregate.
      meal({ mealType: 'dinner', loggedAt: '2026-06-10T20:00:00.000Z', qualityScore: null, caloriesKcal: 9999 }),
    ];
    // weighted: (90*100 + 60*300) / 400 = 27000/400 = 67.5 -> 68
    expect(mealTypeAggregateScore(meals)).toBe(68);
  });
});

describe('hydrationRemainingMl', () => {
  it('returns target minus logged', () => {
    expect(hydrationRemainingMl(800, 2000)).toBe(1200);
  });

  it('clamps at zero when over target', () => {
    expect(hydrationRemainingMl(2500, 2000)).toBe(0);
  });

  it('treats non finite inputs as zero', () => {
    expect(hydrationRemainingMl(Number.NaN, 2000)).toBe(2000);
  });
});

describe('hydrationPercentToTarget', () => {
  it('computes the rounded percent of target', () => {
    expect(hydrationPercentToTarget(1000, 2000)).toBe(50);
  });

  it('clamps to 100 when over target', () => {
    expect(hydrationPercentToTarget(3000, 2000)).toBe(100);
  });

  it('returns 0 when the target is not positive', () => {
    expect(hydrationPercentToTarget(500, 0)).toBe(0);
  });
});

describe('localDateKey', () => {
  it('returns the local calendar day for a valid ISO instant in the given timezone', () => {
    expect(localDateKey('2026-06-10T12:00:00.000Z', 'UTC')).toBe('2026-06-10');
  });

  it('returns an empty string for an empty input', () => {
    expect(localDateKey('', 'UTC')).toBe('');
  });

  it('returns an empty string for an unparseable input', () => {
    expect(localDateKey('not a date', 'UTC')).toBe('');
  });
});
