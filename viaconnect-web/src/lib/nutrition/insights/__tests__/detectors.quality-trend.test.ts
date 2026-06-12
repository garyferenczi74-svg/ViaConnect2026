// Prompt 192 Task 2 (TDD first): quality_trend detector tests.

import { describe, expect, it } from 'vitest';
import { detectQualityTrend } from '../detectors/quality-trend';
import { mkInput, mkMeal, WINDOW_DATES } from './fixtures';

function sixDayWeek(scores: number[], proteins?: number[]) {
  return WINDOW_DATES.slice(0, 6).map((date, i) =>
    mkMeal({
      date,
      qualityScore: scores[i],
      proteinG: proteins ? proteins[i] : 60,
      caloriesKcal: 600,
    }),
  );
}

describe('detectQualityTrend', () => {
  it('reports an improving trend with the biggest contributor', () => {
    const meals = sixDayWeek(
      [55, 55, 55, 75, 75, 75],
      [60, 60, 60, 110, 110, 110],
    );
    const facts = detectQualityTrend(mkInput({ scoredMeals: meals }));
    expect(facts).toHaveLength(1);
    const fact = facts[0];
    expect(fact.type).toBe('quality_trend');
    expect(fact.horizon).toBe('weekly');
    expect(fact.snapshot.trend).toBe('improving');
    expect(fact.snapshot.firstHalfAvg).toBe(55);
    expect(fact.snapshot.secondHalfAvg).toBe(75);
    expect(fact.snapshot.deltaPts).toBe(20);
    expect(fact.severity).toBe('positive');
    const contributor = fact.snapshot.contributor as { macro: string };
    expect(contributor.macro).toBe('protein');
  });

  it('reports a declining trend with attention severity', () => {
    const facts = detectQualityTrend(
      mkInput({ scoredMeals: sixDayWeek([80, 80, 80, 60, 60, 60]) }),
    );
    expect(facts).toHaveLength(1);
    expect(facts[0].snapshot.trend).toBe('declining');
    expect(facts[0].severity).toBe('attention');
  });

  it('reports stable inside the 5 point band', () => {
    const facts = detectQualityTrend(
      mkInput({ scoredMeals: sixDayWeek([70, 71, 70, 72, 71, 70]) }),
    );
    expect(facts).toHaveLength(1);
    expect(facts[0].snapshot.trend).toBe('stable');
    expect(facts[0].severity).toBe('info');
  });

  it('needs at least 4 scored days', () => {
    const meals = WINDOW_DATES.slice(0, 3).map((date) => mkMeal({ date, qualityScore: 60 }));
    expect(detectQualityTrend(mkInput({ scoredMeals: meals }))).toHaveLength(0);
  });

  it('skips legacy meals with null qualityScore without crashing', () => {
    const meals = [
      ...sixDayWeek([55, 55, 55, 75, 75, 75]),
      mkMeal({ date: WINDOW_DATES[6], qualityScore: null }),
    ];
    const facts = detectQualityTrend(mkInput({ scoredMeals: meals }));
    expect(facts).toHaveLength(1);
    expect(facts[0].snapshot.scoredDays).toBe(6);
  });
});
