/**
 * src/hooks/journey/__tests__/useTodayMealLogs.test.ts
 *
 * TDD for the pure aggregateMealRows helper exported from useTodayMealLogs.
 * Prompt 208j Task J-T3.
 *
 * Rules: no em-dashes, no emojis, no `any`.
 */

import { describe, it, expect } from 'vitest';
import { aggregateMealRows } from '../useTodayMealLogs';

// ---------------------------------------------------------------------------
// aggregateMealRows
// ---------------------------------------------------------------------------

describe('aggregateMealRows', () => {
  it('returns all zeros for an empty array', () => {
    const result = aggregateMealRows([]);
    expect(result).toEqual({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });

  it('sums a single row correctly', () => {
    const result = aggregateMealRows([
      { calories: 500, protein_g: 30, carbs_g: 60, fat_g: 15 },
    ]);
    expect(result).toEqual({ calories: 500, protein_g: 30, carbs_g: 60, fat_g: 15 });
  });

  it('sums multiple rows correctly', () => {
    const result = aggregateMealRows([
      { calories: 400, protein_g: 20, carbs_g: 50, fat_g: 10 },
      { calories: 300, protein_g: 15, carbs_g: 35, fat_g: 8 },
      { calories: 200, protein_g: 10, carbs_g: 25, fat_g: 5 },
    ]);
    expect(result).toEqual({ calories: 900, protein_g: 45, carbs_g: 110, fat_g: 23 });
  });

  it('treats null fields as 0', () => {
    const result = aggregateMealRows([
      { calories: null, protein_g: null, carbs_g: null, fat_g: null },
      { calories: 200, protein_g: 10, carbs_g: 25, fat_g: 5 },
    ]);
    expect(result).toEqual({ calories: 200, protein_g: 10, carbs_g: 25, fat_g: 5 });
  });

  it('treats non-numeric string fields as 0', () => {
    const result = aggregateMealRows([
      {
        calories: 'abc' as unknown as number,
        protein_g: null,
        carbs_g: 'xyz' as unknown as number,
        fat_g: null,
      },
    ]);
    expect(result).toEqual({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });

  it('parses numeric string fields correctly', () => {
    const result = aggregateMealRows([
      {
        calories: '300' as unknown as number,
        protein_g: '20' as unknown as number,
        carbs_g: '40' as unknown as number,
        fat_g: '10' as unknown as number,
      },
    ]);
    expect(result).toEqual({ calories: 300, protein_g: 20, carbs_g: 40, fat_g: 10 });
  });

  it('treats NaN fields as 0', () => {
    const result = aggregateMealRows([
      { calories: NaN, protein_g: NaN, carbs_g: NaN, fat_g: NaN },
      { calories: 100, protein_g: 5, carbs_g: 12, fat_g: 3 },
    ]);
    expect(result).toEqual({ calories: 100, protein_g: 5, carbs_g: 12, fat_g: 3 });
  });

  it('treats Infinity fields as 0', () => {
    const result = aggregateMealRows([
      { calories: Infinity, protein_g: -Infinity, carbs_g: Infinity, fat_g: -Infinity },
    ]);
    expect(result).toEqual({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });

  it('never throws on a completely empty object row', () => {
    expect(() =>
      aggregateMealRows([{} as unknown as { calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }]),
    ).not.toThrow();
    const result = aggregateMealRows([{} as unknown as { calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }]);
    expect(result).toEqual({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });

  it('handles a mix of valid and null fields across many rows', () => {
    const result = aggregateMealRows([
      { calories: 100, protein_g: null, carbs_g: 20, fat_g: null },
      { calories: null, protein_g: 15, carbs_g: null, fat_g: 8 },
      { calories: 50, protein_g: 5, carbs_g: null, fat_g: 2 },
    ]);
    expect(result).toEqual({ calories: 150, protein_g: 20, carbs_g: 20, fat_g: 10 });
  });
});
