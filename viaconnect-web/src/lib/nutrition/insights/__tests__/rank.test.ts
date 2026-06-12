// Prompt 192 Task 2 (TDD first): ranking, dedup, caps, cold start gates.

import { describe, expect, it } from 'vitest';
import { selectInsights } from '../rank';
import { mkFact, mkInput, mkMeal, WINDOW_DATES, YESTERDAY } from './fixtures';

function mealsOnDates(dates: string[], perDay: number): ReturnType<typeof mkMeal>[] {
  return dates.flatMap((date) =>
    Array.from({ length: perDay }, () => mkMeal({ date })),
  );
}

describe('cold start gates', () => {
  it('under 3 scored meals generates nothing at all', () => {
    const input = mkInput({ scoredMeals: mealsOnDates([YESTERDAY], 2) });
    const facts = [
      mkFact({ type: 'consistency_streak', horizon: 'daily', severity: 'positive' }),
      mkFact({ type: 'macro_gap', horizon: 'daily' }),
    ];
    expect(selectInsights(facts, input)).toHaveLength(0);
  });

  it('legacy null score meals do not count toward the cold start meal total', () => {
    const meals = [
      ...mealsOnDates([YESTERDAY], 2),
      mkMeal({ date: YESTERDAY, qualityScore: null }),
    ];
    const input = mkInput({ scoredMeals: meals });
    expect(selectInsights([mkFact({ type: 'macro_gap', horizon: 'daily' })], input)).toHaveLength(0);
  });

  it('with 3 to 10 scored meals only daily consistency_streak and macro_gap pass', () => {
    const input = mkInput({
      scoredMeals: mealsOnDates(WINDOW_DATES.slice(2), 2),
    });
    const facts = [
      mkFact({ type: 'consistency_streak', horizon: 'daily', severity: 'positive', factFingerprint: 'a' }),
      mkFact({ type: 'macro_gap', horizon: 'daily', factFingerprint: 'b' }),
      mkFact({ type: 'macro_gap', horizon: 'weekly', factFingerprint: 'c' }),
      mkFact({ type: 'hydration_correlation', horizon: 'daily', factFingerprint: 'd' }),
      mkFact({ type: 'quality_trend', horizon: 'weekly', factFingerprint: 'e' }),
    ];
    const selected = selectInsights(facts, input);
    expect(selected.map((f) => `${f.type}:${f.horizon}`).sort()).toEqual([
      'consistency_streak:daily',
      'macro_gap:daily',
    ]);
  });

  it('above 10 scored meals all types pass when the weekly day gate holds', () => {
    const input = mkInput({ scoredMeals: mealsOnDates(WINDOW_DATES.slice(1), 2) });
    const facts = [
      mkFact({ type: 'quality_trend', horizon: 'weekly', factFingerprint: 'a' }),
      mkFact({ type: 'hydration_correlation', horizon: 'daily', factFingerprint: 'b' }),
    ];
    expect(selectInsights(facts, input)).toHaveLength(2);
  });

  it('weekly facts need at least 3 scored days in the prior 7', () => {
    // 12 scored meals but only 2 distinct dates.
    const input = mkInput({
      scoredMeals: mealsOnDates([YESTERDAY, '2026-06-10'], 6),
    });
    const facts = [
      mkFact({ type: 'macro_gap', horizon: 'weekly', factFingerprint: 'a' }),
      mkFact({ type: 'macro_gap', horizon: 'daily', factFingerprint: 'b' }),
    ];
    const selected = selectInsights(facts, input);
    expect(selected.map((f) => f.horizon)).toEqual(['daily']);
  });
});

describe('dedup against prior active insights', () => {
  const fullInput = (prior: ReturnType<typeof mkInput>['priorActiveInsights']) =>
    mkInput({
      scoredMeals: mealsOnDates(WINDOW_DATES, 2),
      priorActiveInsights: prior,
    });

  it('suppresses a fact whose fingerprint matches a still active prior of the same type', () => {
    const fact = mkFact({ type: 'macro_gap', horizon: 'daily', factFingerprint: 'same_gap' });
    const selected = selectInsights(
      [fact],
      fullInput([{ type: 'macro_gap', factFingerprint: 'same_gap', severity: 'info' }]),
    );
    expect(selected).toHaveLength(0);
  });

  it('admits the fact again when severity increased', () => {
    const fact = mkFact({
      type: 'macro_gap',
      horizon: 'daily',
      severity: 'attention',
      factFingerprint: 'same_gap',
    });
    const selected = selectInsights(
      [fact],
      fullInput([{ type: 'macro_gap', factFingerprint: 'same_gap', severity: 'info' }]),
    );
    expect(selected).toHaveLength(1);
  });

  it('does not suppress across different types with the same fingerprint', () => {
    const fact = mkFact({ type: 'quality_trend', horizon: 'weekly', factFingerprint: 'shared' });
    const selected = selectInsights(
      [fact],
      fullInput([{ type: 'macro_gap', factFingerprint: 'shared', severity: 'info' }]),
    );
    expect(selected).toHaveLength(1);
  });
});

describe('caps', () => {
  const fullInput = () => mkInput({ scoredMeals: mealsOnDates(WINDOW_DATES, 2) });

  it('caps daily insights at 3, keeping the highest severity first', () => {
    const facts = [
      mkFact({ horizon: 'daily', severity: 'info', factFingerprint: 'd1' }),
      mkFact({ horizon: 'daily', severity: 'attention', factFingerprint: 'd2' }),
      mkFact({ horizon: 'daily', severity: 'info', factFingerprint: 'd3' }),
      mkFact({ horizon: 'daily', severity: 'attention', factFingerprint: 'd4' }),
      mkFact({ horizon: 'daily', severity: 'positive', factFingerprint: 'd5' }),
    ];
    const selected = selectInsights(facts, fullInput());
    expect(selected).toHaveLength(3);
    expect(selected.filter((f) => f.severity === 'attention')).toHaveLength(2);
  });

  it('caps weekly insights at 5', () => {
    const facts = Array.from({ length: 7 }, (_, i) =>
      mkFact({ horizon: 'weekly', factFingerprint: `w${i}` }),
    );
    expect(selectInsights(facts, fullInput())).toHaveLength(5);
  });

  it('caps apply per horizon independently', () => {
    const facts = [
      ...Array.from({ length: 4 }, (_, i) =>
        mkFact({ horizon: 'daily', factFingerprint: `d${i}` }),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        mkFact({ horizon: 'weekly', factFingerprint: `w${i}` }),
      ),
    ];
    const selected = selectInsights(facts, fullInput());
    expect(selected.filter((f) => f.horizon === 'daily')).toHaveLength(3);
    expect(selected.filter((f) => f.horizon === 'weekly')).toHaveLength(5);
  });
});
