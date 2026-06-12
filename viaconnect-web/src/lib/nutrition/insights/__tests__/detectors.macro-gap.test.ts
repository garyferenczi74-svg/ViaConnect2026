// Prompt 192 Task 2 (TDD first): macro_gap detector tests.

import { describe, expect, it } from 'vitest';
import { detectMacroGap } from '../detectors/macro-gap';
import { mkInput, mkMeal, TARGETS, WINDOW_DATES, YESTERDAY } from './fixtures';

describe('detectMacroGap daily', () => {
  it('emits one daily fact for the largest covered shortfall', () => {
    const input = mkInput({
      scoredMeals: [
        mkMeal({ date: YESTERDAY, proteinG: 25, fiberG: 4, carbsG: 220, fatTotalG: 65 }),
        mkMeal({ date: YESTERDAY, proteinG: 30, fiberG: 4, carbsG: 0, fatTotalG: 0 }),
      ],
    });
    const facts = detectMacroGap(input);
    const daily = facts.filter((f) => f.horizon === 'daily');
    expect(daily).toHaveLength(1);
    const fact = daily[0];
    expect(fact.type).toBe('macro_gap');
    // fiber 8 of 30 (27 percent) is a deeper shortfall than protein 55 of 120.
    expect(fact.snapshot.macro).toBe('fiber');
    expect(fact.snapshot.actualG).toBe(8);
    expect(fact.snapshot.targetG).toBe(30);
    expect(fact.snapshot.attainmentPct).toBe(27);
    expect(fact.snapshot.date).toBe(YESTERDAY);
    expect(fact.severity).toBe('attention');
    expect(['high', 'medium', 'low']).toContain(fact.confidence);
  });

  it('reports the protein numbers verbatim in the snapshot', () => {
    const input = mkInput({
      scoredMeals: [
        mkMeal({ date: YESTERDAY, proteinG: 25, fiberG: 15, carbsG: 230, fatTotalG: 65 }),
        mkMeal({ date: YESTERDAY, proteinG: 30, fiberG: 15, carbsG: 0, fatTotalG: 0 }),
      ],
    });
    const [fact] = detectMacroGap(input).filter((f) => f.horizon === 'daily');
    expect(fact.snapshot.macro).toBe('protein');
    expect(fact.snapshot.actualG).toBe(55);
    expect(fact.snapshot.targetG).toBe(120);
    expect(fact.snapshot.attainmentPct).toBe(46);
  });

  it('excludes an UNKNOWN macro from daily gap math instead of treating it as 0', () => {
    const input = mkInput({
      scoredMeals: [
        // fiber UNKNOWN on one meal makes the whole day uncovered for fiber.
        mkMeal({
          date: YESTERDAY,
          proteinG: 25,
          fiberG: 0,
          carbsG: 220,
          fatTotalG: 65,
          known: { fiber: false },
        }),
        mkMeal({ date: YESTERDAY, proteinG: 30, fiberG: 2, carbsG: 0, fatTotalG: 0 }),
      ],
    });
    const daily = detectMacroGap(input).filter((f) => f.horizon === 'daily');
    expect(daily).toHaveLength(1);
    // fiber would be the numerically deepest gap if UNKNOWN were counted as 0;
    // the honest detector reports protein instead.
    expect(daily[0].snapshot.macro).toBe('protein');
    expect(daily[0].snapshot.coveredMacros).not.toContain('fiber');
    expect(daily[0].snapshot.coveredMacros).toContain('protein');
  });

  it('ignores legacy meals with null qualityScore', () => {
    const input = mkInput({
      scoredMeals: [mkMeal({ date: YESTERDAY, proteinG: 10, qualityScore: null })],
    });
    expect(detectMacroGap(input)).toHaveLength(0);
  });

  it('returns nothing without targets', () => {
    const input = mkInput({
      targets: null,
      scoredMeals: [mkMeal({ date: YESTERDAY, proteinG: 10 })],
    });
    expect(detectMacroGap(input)).toHaveLength(0);
  });
});

describe('detectMacroGap weekly', () => {
  function weekWithGaps(): ReturnType<typeof mkInput> {
    // protein under 80 percent of target on 5 of 7 days; carbs under on 3.
    const meals = WINDOW_DATES.flatMap((date, i) => [
      mkMeal({
        date,
        proteinG: i < 5 ? 30 : 60,
        carbsG: i < 3 ? 80 : 120,
        fatTotalG: 35,
        fiberG: 15,
      }),
      mkMeal({
        date,
        proteinG: i < 5 ? 30 : 60,
        carbsG: i < 3 ? 80 : 120,
        fatTotalG: 35,
        fiberG: 15,
      }),
    ]);
    return mkInput({ scoredMeals: meals });
  }

  it('emits exactly ONE weekly fact for the dominant recurring gap', () => {
    const weekly = detectMacroGap(weekWithGaps()).filter((f) => f.horizon === 'weekly');
    expect(weekly).toHaveLength(1);
    const fact = weekly[0];
    expect(fact.snapshot.macro).toBe('protein');
    expect(fact.snapshot.gapDays).toBe(5);
    expect(fact.snapshot.coveredDays).toBe(7);
    expect(fact.snapshot.windowDays).toBe(7);
    expect(fact.severity).toBe('attention');
  });

  it('reports partial coverage when a macro is UNKNOWN on some days', () => {
    const meals = WINDOW_DATES.flatMap((date, i) => [
      mkMeal({
        date,
        proteinG: 30,
        carbsG: 125,
        fatTotalG: 35,
        fiberG: 15,
        // protein UNKNOWN on the first two days knocks them out of coverage.
        known: { protein: i >= 2 },
      }),
      mkMeal({ date, proteinG: 30, carbsG: 125, fatTotalG: 35, fiberG: 15 }),
    ]);
    const weekly = detectMacroGap(mkInput({ scoredMeals: meals })).filter(
      (f) => f.horizon === 'weekly' && f.snapshot.macro === 'protein',
    );
    expect(weekly).toHaveLength(1);
    expect(weekly[0].snapshot.coveredDays).toBe(5);
    expect(weekly[0].snapshot.gapDays).toBe(5);
  });

  it('emits nothing weekly when no macro recurs at least 3 gap days', () => {
    const meals = WINDOW_DATES.map((date) =>
      mkMeal({ date, proteinG: 130, carbsG: 260, fatTotalG: 72, fiberG: 32 }),
    );
    const weekly = detectMacroGap(mkInput({ scoredMeals: meals })).filter(
      (f) => f.horizon === 'weekly',
    );
    expect(weekly).toHaveLength(0);
  });

  it('uses stable fingerprints for identical facts across runs', () => {
    const a = detectMacroGap(weekWithGaps());
    const b = detectMacroGap(weekWithGaps());
    expect(a.map((f) => f.factFingerprint)).toEqual(b.map((f) => f.factFingerprint));
    expect(TARGETS.dailyProteinG).toBe(120);
  });
});
