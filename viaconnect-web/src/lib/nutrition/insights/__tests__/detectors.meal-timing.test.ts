// Prompt 192 Task 2 (TDD first): meal_timing_pattern detector tests.

import { describe, expect, it } from 'vitest';
import { detectMealTimingPattern } from '../detectors/meal-timing-pattern';
import { mkInput, mkMeal, WINDOW_DATES } from './fixtures';

describe('detectMealTimingPattern', () => {
  it('detects recurring late eating and emits one weekly fact', () => {
    const meals = WINDOW_DATES.flatMap((date, i) => [
      mkMeal({ date, mealType: 'breakfast', loggedAt: `${date}T08:00:00.000Z` }),
      mkMeal({ date, mealType: 'lunch', loggedAt: `${date}T14:00:00.000Z` }),
      mkMeal({
        date,
        mealType: 'dinner',
        loggedAt: i < 4 ? `${date}T21:30:00.000Z` : `${date}T18:30:00.000Z`,
      }),
    ]);
    const facts = detectMealTimingPattern(mkInput({ scoredMeals: meals }));
    expect(facts).toHaveLength(1);
    const fact = facts[0];
    expect(fact.type).toBe('meal_timing_pattern');
    expect(fact.horizon).toBe('weekly');
    expect(fact.snapshot.pattern).toBe('late_eating');
    expect(fact.snapshot.patternDays).toBe(4);
    expect(fact.snapshot.daysWithMeals).toBe(7);
  });

  it('detects long daytime gaps between meals', () => {
    const meals = WINDOW_DATES.flatMap((date, i) => [
      mkMeal({ date, mealType: 'breakfast', loggedAt: `${date}T08:00:00.000Z` }),
      mkMeal({
        date,
        mealType: 'dinner',
        loggedAt: i < 3 ? `${date}T18:30:00.000Z` : `${date}T14:00:00.000Z`,
      }),
    ]);
    const facts = detectMealTimingPattern(mkInput({ scoredMeals: meals }));
    expect(facts).toHaveLength(1);
    expect(facts[0].snapshot.pattern).toBe('long_daytime_gap');
    expect(facts[0].snapshot.patternDays).toBe(3);
  });

  it('detects skipped breakfasts', () => {
    const meals = WINDOW_DATES.flatMap((date, i) =>
      i < 4
        ? [mkMeal({ date, mealType: 'lunch', loggedAt: `${date}T13:00:00.000Z` })]
        : [
            mkMeal({ date, mealType: 'breakfast', loggedAt: `${date}T08:00:00.000Z` }),
            mkMeal({ date, mealType: 'lunch', loggedAt: `${date}T13:00:00.000Z` }),
          ],
    );
    const facts = detectMealTimingPattern(mkInput({ scoredMeals: meals }));
    expect(facts).toHaveLength(1);
    expect(facts[0].snapshot.pattern).toBe('skipped_breakfast');
    expect(facts[0].snapshot.patternDays).toBe(4);
  });

  it('emits only the strongest pattern when several would qualify', () => {
    // 5 late days beats 3 skipped breakfast days.
    const meals = WINDOW_DATES.flatMap((date, i) => {
      const dinner = mkMeal({
        date,
        mealType: 'dinner',
        loggedAt: i < 5 ? `${date}T22:00:00.000Z` : `${date}T18:00:00.000Z`,
      });
      if (i < 3) return [dinner];
      return [mkMeal({ date, mealType: 'breakfast', loggedAt: `${date}T08:00:00.000Z` }), dinner];
    });
    const facts = detectMealTimingPattern(mkInput({ scoredMeals: meals }));
    expect(facts).toHaveLength(1);
    expect(facts[0].snapshot.pattern).toBe('late_eating');
    expect(facts[0].snapshot.patternDays).toBe(5);
  });

  it('ignores legacy meals with null qualityScore', () => {
    const meals = WINDOW_DATES.map((date) =>
      mkMeal({
        date,
        mealType: 'dinner',
        loggedAt: `${date}T22:00:00.000Z`,
        qualityScore: null,
      }),
    );
    expect(detectMealTimingPattern(mkInput({ scoredMeals: meals }))).toHaveLength(0);
  });

  it('emits nothing under the 3 pattern day threshold', () => {
    const meals = WINDOW_DATES.flatMap((date, i) => [
      mkMeal({ date, mealType: 'breakfast', loggedAt: `${date}T08:00:00.000Z` }),
      mkMeal({
        date,
        mealType: 'dinner',
        loggedAt: i < 2 ? `${date}T22:00:00.000Z` : `${date}T15:00:00.000Z`,
      }),
    ]);
    expect(detectMealTimingPattern(mkInput({ scoredMeals: meals }))).toHaveLength(0);
  });
});
