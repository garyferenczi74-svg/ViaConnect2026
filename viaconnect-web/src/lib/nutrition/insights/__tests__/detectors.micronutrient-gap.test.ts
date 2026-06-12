// Prompt 192 Task 2 (TDD first): micronutrient_gap detector tests.
// Spec acceptance: gap on 5 of 7 scored days yields a product suggestion,
// gap on 4 of 7 yields NO suggestion. Only this type may carry one.

import { describe, expect, it } from 'vitest';
import { detectMicronutrientGap } from '../detectors/micronutrient-gap';
import { mkInput, mkMicronutrientDay, WINDOW_DATES } from './fixtures';

const IRON_CANDIDATE = [
  { slug: 'iron-support', name: 'Iron Support', nutrientKeys: ['iron_mg'] },
];

function ironWeek(gapDayCount: number) {
  // Reference for iron_mg is 18; under 70 percent (12.6) counts as a gap day.
  return WINDOW_DATES.map((date, i) =>
    mkMicronutrientDay({ date, totals: { iron_mg: i < gapDayCount ? 8 : 20 } }),
  );
}

describe('detectMicronutrientGap', () => {
  it('a 5 of 7 day gap yields the product suggestion', () => {
    const facts = detectMicronutrientGap(
      mkInput({ micronutrientDays: ironWeek(5), productCandidates: IRON_CANDIDATE }),
    );
    expect(facts).toHaveLength(1);
    const fact = facts[0];
    expect(fact.type).toBe('micronutrient_gap');
    expect(fact.horizon).toBe('weekly');
    expect(fact.snapshot.nutrientKey).toBe('iron_mg');
    expect(fact.snapshot.gapDays).toBe(5);
    expect(fact.snapshot.coveredDays).toBe(7);
    expect(fact.productSuggestion).toEqual({
      slug: 'iron-support',
      name: 'Iron Support',
      reason: expect.any(String),
    });
  });

  it('a 4 of 7 day gap yields NO suggestion even with a candidate available', () => {
    const facts = detectMicronutrientGap(
      mkInput({ micronutrientDays: ironWeek(4), productCandidates: IRON_CANDIDATE }),
    );
    expect(facts).toHaveLength(1);
    expect(facts[0].snapshot.gapDays).toBe(4);
    expect(facts[0].productSuggestion ?? null).toBeNull();
  });

  it('yields no suggestion at 5 of 7 when no candidate covers the nutrient', () => {
    const facts = detectMicronutrientGap(mkInput({ micronutrientDays: ironWeek(5) }));
    expect(facts).toHaveLength(1);
    expect(facts[0].productSuggestion ?? null).toBeNull();
  });

  it('excludes days that are not fully scored and days missing the key (UNKNOWN is not 0)', () => {
    const days = WINDOW_DATES.map((date, i) => {
      if (i === 0) return mkMicronutrientDay({ date, totals: { iron_mg: 1 }, fullyScored: false });
      if (i === 1) return mkMicronutrientDay({ date, totals: {} });
      return mkMicronutrientDay({ date, totals: { iron_mg: i < 5 ? 8 : 20 } });
    });
    const facts = detectMicronutrientGap(mkInput({ micronutrientDays: days }));
    expect(facts).toHaveLength(1);
    // Only 5 covered days (indexes 2..6); 3 of them are gap days.
    expect(facts[0].snapshot.coveredDays).toBe(5);
    expect(facts[0].snapshot.gapDays).toBe(3);
  });

  it('always carries a confidence tier', () => {
    const facts = detectMicronutrientGap(mkInput({ micronutrientDays: ironWeek(5) }));
    expect(['high', 'medium', 'low']).toContain(facts[0].confidence);
  });

  it('emits nothing under 3 gap days or under 3 covered days', () => {
    expect(detectMicronutrientGap(mkInput({ micronutrientDays: ironWeek(2) }))).toHaveLength(0);
    const thinDays = WINDOW_DATES.slice(0, 2).map((date) =>
      mkMicronutrientDay({ date, totals: { iron_mg: 8 } }),
    );
    expect(detectMicronutrientGap(mkInput({ micronutrientDays: thinDays }))).toHaveLength(0);
  });
});
