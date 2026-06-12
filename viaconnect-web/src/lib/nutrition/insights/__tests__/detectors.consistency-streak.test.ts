// Prompt 192 Task 2 (TDD first): consistency_streak detector tests.
// Positive reinforcement ONLY: severity is positive or info, never attention,
// and a broken or short streak produces no fact at all (no shaming framing).

import { describe, expect, it } from 'vitest';
import { detectConsistencyStreak } from '../detectors/consistency-streak';
import { mkInput, mkMeal, WINDOW_DATES, YESTERDAY } from './fixtures';

describe('detectConsistencyStreak', () => {
  it('emits a positive fact for a 5 day streak ending yesterday', () => {
    const meals = WINDOW_DATES.slice(2).map((date) => mkMeal({ date }));
    const facts = detectConsistencyStreak(mkInput({ scoredMeals: meals }));
    expect(facts).toHaveLength(1);
    const fact = facts[0];
    expect(fact.type).toBe('consistency_streak');
    expect(fact.horizon).toBe('daily');
    expect(fact.severity).toBe('positive');
    expect(fact.snapshot.streakDays).toBe(5);
    expect(fact.snapshot.endDate).toBe(YESTERDAY);
  });

  it('extends the streak through today when today has a scored meal', () => {
    const meals = [
      ...WINDOW_DATES.slice(4).map((date) => mkMeal({ date })),
      mkMeal({ date: '2026-06-12' }),
    ];
    const facts = detectConsistencyStreak(mkInput({ scoredMeals: meals }));
    expect(facts).toHaveLength(1);
    expect(facts[0].snapshot.streakDays).toBe(4);
    expect(facts[0].snapshot.endDate).toBe('2026-06-12');
  });

  it('never emits attention severity in any fixture', () => {
    const fixtures = [
      mkInput({ scoredMeals: WINDOW_DATES.map((date) => mkMeal({ date })) }),
      mkInput({ scoredMeals: WINDOW_DATES.slice(4).map((date) => mkMeal({ date })) }),
      mkInput({ scoredMeals: [mkMeal({ date: YESTERDAY })] }),
      mkInput({ scoredMeals: [] }),
    ];
    for (const input of fixtures) {
      for (const fact of detectConsistencyStreak(input)) {
        expect(['positive', 'info']).toContain(fact.severity);
      }
    }
  });

  it('emits nothing for a streak under 3 days (no shaming for broken streaks)', () => {
    const meals = [mkMeal({ date: YESTERDAY }), mkMeal({ date: '2026-06-10' })];
    expect(detectConsistencyStreak(mkInput({ scoredMeals: meals }))).toHaveLength(0);
  });

  it('legacy meals with null qualityScore do not count toward the streak', () => {
    const meals = [
      mkMeal({ date: '2026-06-09' }),
      mkMeal({ date: '2026-06-10', qualityScore: null }),
      mkMeal({ date: YESTERDAY }),
    ];
    expect(detectConsistencyStreak(mkInput({ scoredMeals: meals }))).toHaveLength(0);
  });
});
