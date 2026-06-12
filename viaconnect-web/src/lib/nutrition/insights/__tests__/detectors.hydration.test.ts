// Prompt 192 Task 2 (TDD first): hydration_correlation detector tests.
// Facts must carry correlational framing only; causal language is a
// compliance gate concern and the fact itself flags the framing.

import { describe, expect, it } from 'vitest';
import { detectHydrationCorrelation } from '../detectors/hydration-correlation';
import { mkHydrationDay, mkInput, mkMeal, WINDOW_DATES, YESTERDAY } from './fixtures';

describe('detectHydrationCorrelation daily', () => {
  it('emits a daily fact when yesterday landed well under target', () => {
    const input = mkInput({
      hydrationDays: [mkHydrationDay({ date: YESTERDAY, totalMl: 900, targetMl: 2500 })],
    });
    const daily = detectHydrationCorrelation(input).filter((f) => f.horizon === 'daily');
    expect(daily).toHaveLength(1);
    const fact = daily[0];
    expect(fact.type).toBe('hydration_correlation');
    expect(fact.snapshot.totalMl).toBe(900);
    expect(fact.snapshot.targetMl).toBe(2500);
    expect(fact.snapshot.attainmentPct).toBe(36);
    expect(fact.snapshot.framing).toBe('correlational');
    expect(fact.severity).toBe('attention');
  });

  it('emits nothing daily at 70 percent of target', () => {
    const input = mkInput({
      hydrationDays: [mkHydrationDay({ date: YESTERDAY, totalMl: 1750, targetMl: 2500 })],
    });
    expect(detectHydrationCorrelation(input).filter((f) => f.horizon === 'daily')).toHaveLength(0);
  });

  it('emits nothing daily without a target', () => {
    const input = mkInput({
      hydrationDays: [mkHydrationDay({ date: YESTERDAY, totalMl: 100, targetMl: null })],
    });
    expect(detectHydrationCorrelation(input).filter((f) => f.horizon === 'daily')).toHaveLength(0);
  });
});

describe('detectHydrationCorrelation weekly', () => {
  it('reports below target days plus low quality co occurrence with correlational framing', () => {
    const hydrationDays = WINDOW_DATES.map((date, i) =>
      mkHydrationDay({ date, totalMl: i < 3 ? 1200 : 2400, targetMl: 2500 }),
    );
    // The three low hydration days are also low quality days (score 50).
    const meals = WINDOW_DATES.map((date, i) =>
      mkMeal({ date, qualityScore: i < 3 ? 50 : 80 }),
    );
    const facts = detectHydrationCorrelation(mkInput({ hydrationDays, scoredMeals: meals }));
    const weekly = facts.filter((f) => f.horizon === 'weekly');
    expect(weekly).toHaveLength(1);
    const fact = weekly[0];
    expect(fact.snapshot.coveredDays).toBe(7);
    expect(fact.snapshot.daysBelowTarget).toBe(3);
    expect(fact.snapshot.framing).toBe('correlational');
    const co = fact.snapshot.coOccurrence as {
      lowHydrationLowQualityDays: number;
      comparedDays: number;
    };
    expect(co.lowHydrationLowQualityDays).toBe(3);
    expect(co.comparedDays).toBe(7);
  });

  it('excludes days without a target from coverage', () => {
    const hydrationDays = WINDOW_DATES.map((date, i) =>
      mkHydrationDay({
        date,
        totalMl: 1200,
        targetMl: i < 2 ? null : 2500,
      }),
    );
    const weekly = detectHydrationCorrelation(mkInput({ hydrationDays })).filter(
      (f) => f.horizon === 'weekly',
    );
    expect(weekly).toHaveLength(1);
    expect(weekly[0].snapshot.coveredDays).toBe(5);
  });

  it('emits nothing weekly with under 3 covered days', () => {
    const hydrationDays = WINDOW_DATES.slice(0, 2).map((date) =>
      mkHydrationDay({ date, totalMl: 500, targetMl: 2500 }),
    );
    expect(
      detectHydrationCorrelation(mkInput({ hydrationDays })).filter((f) => f.horizon === 'weekly'),
    ).toHaveLength(0);
  });
});
