import { describe, it, expect } from 'vitest';
import {
  NUTRIENT_UPPER_LIMITS,
  sumAgainstUL,
  type NutrientUL,
  type NutrientAmount,
  type ULCheck,
} from '../upperLimits';

describe('NUTRIENT_UPPER_LIMITS dataset', () => {
  it('iron UL is 45 mg', () => {
    expect(NUTRIENT_UPPER_LIMITS.iron.ul).toBe(45);
    expect(NUTRIENT_UPPER_LIMITS.iron.unit).toBe('mg');
  });

  it('vitamin_d UL is 100 mcg', () => {
    expect(NUTRIENT_UPPER_LIMITS.vitamin_d.ul).toBe(100);
    expect(NUTRIENT_UPPER_LIMITS.vitamin_d.unit).toBe('mcg');
  });

  it('folic_acid UL is 1000 mcg', () => {
    expect(NUTRIENT_UPPER_LIMITS.folic_acid.ul).toBe(1000);
    expect(NUTRIENT_UPPER_LIMITS.folic_acid.unit).toBe('mcg');
  });

  it('every entry has a non-empty source', () => {
    for (const [key, entry] of Object.entries(NUTRIENT_UPPER_LIMITS)) {
      expect(entry.source, `${key} source must be non-empty`).toBeTruthy();
      expect(entry.source.length, `${key} source must be non-empty string`).toBeGreaterThan(0);
    }
  });

  it('all 16 nutrients are present', () => {
    const expected = [
      'vitamin_a_preformed',
      'vitamin_d',
      'vitamin_e',
      'vitamin_c',
      'vitamin_b6',
      'folic_acid',
      'niacin',
      'choline',
      'calcium',
      'iron',
      'zinc',
      'copper',
      'selenium',
      'iodine',
      'magnesium_supplemental',
      'manganese',
    ];
    for (const key of expected) {
      expect(NUTRIENT_UPPER_LIMITS, `${key} must exist`).toHaveProperty(key);
    }
  });

  it('source is IOM DRI / NIH ODS for all entries', () => {
    for (const [key, entry] of Object.entries(NUTRIENT_UPPER_LIMITS)) {
      expect(entry.source, `${key} source`).toBe('IOM DRI / NIH ODS');
    }
  });

  it('spot checks additional UL values', () => {
    expect(NUTRIENT_UPPER_LIMITS.vitamin_a_preformed.ul).toBe(3000);
    expect(NUTRIENT_UPPER_LIMITS.vitamin_a_preformed.unit).toBe('mcg');
    expect(NUTRIENT_UPPER_LIMITS.vitamin_e.ul).toBe(1000);
    expect(NUTRIENT_UPPER_LIMITS.vitamin_e.unit).toBe('mg');
    expect(NUTRIENT_UPPER_LIMITS.vitamin_c.ul).toBe(2000);
    expect(NUTRIENT_UPPER_LIMITS.vitamin_b6.ul).toBe(100);
    expect(NUTRIENT_UPPER_LIMITS.niacin.ul).toBe(35);
    expect(NUTRIENT_UPPER_LIMITS.choline.ul).toBe(3500);
    expect(NUTRIENT_UPPER_LIMITS.calcium.ul).toBe(2500);
    expect(NUTRIENT_UPPER_LIMITS.zinc.ul).toBe(40);
    expect(NUTRIENT_UPPER_LIMITS.copper.ul).toBe(10000);
    expect(NUTRIENT_UPPER_LIMITS.copper.unit).toBe('mcg');
    expect(NUTRIENT_UPPER_LIMITS.selenium.ul).toBe(400);
    expect(NUTRIENT_UPPER_LIMITS.iodine.ul).toBe(1100);
    expect(NUTRIENT_UPPER_LIMITS.magnesium_supplemental.ul).toBe(350);
    expect(NUTRIENT_UPPER_LIMITS.manganese.ul).toBe(11);
  });
});

describe('sumAgainstUL', () => {
  it('iron 40 + 10 = 50 exceeds UL of 45', () => {
    const currentStack: NutrientAmount[] = [{ nutrient: 'iron', amount: 40 }];
    const proposed: NutrientAmount[] = [{ nutrient: 'iron', amount: 10 }];
    const result: ULCheck[] = sumAgainstUL(currentStack, proposed);
    const ironCheck = result.find((r) => r.nutrient === 'iron');
    expect(ironCheck).toBeDefined();
    expect(ironCheck!.total).toBe(50);
    expect(ironCheck!.ul).toBe(45);
    expect(ironCheck!.exceeds).toBe(true);
  });

  it('zinc 20 + 10 = 30 does not exceed UL of 40', () => {
    const currentStack: NutrientAmount[] = [{ nutrient: 'zinc', amount: 20 }];
    const proposed: NutrientAmount[] = [{ nutrient: 'zinc', amount: 10 }];
    const result: ULCheck[] = sumAgainstUL(currentStack, proposed);
    const zincCheck = result.find((r) => r.nutrient === 'zinc');
    expect(zincCheck).toBeDefined();
    expect(zincCheck!.total).toBe(30);
    expect(zincCheck!.ul).toBe(40);
    expect(zincCheck!.exceeds).toBe(false);
  });

  it('nutrient with no UL entry (taurine) is absent from result', () => {
    const currentStack: NutrientAmount[] = [{ nutrient: 'taurine', amount: 500 }];
    const proposed: NutrientAmount[] = [{ nutrient: 'taurine', amount: 500 }];
    const result: ULCheck[] = sumAgainstUL(currentStack, proposed);
    const taurineCheck = result.find((r) => r.nutrient === 'taurine');
    expect(taurineCheck).toBeUndefined();
  });

  it('sums the same nutrient across both lists correctly', () => {
    const currentStack: NutrientAmount[] = [
      { nutrient: 'selenium', amount: 200 },
      { nutrient: 'iron', amount: 10 },
    ];
    const proposed: NutrientAmount[] = [
      { nutrient: 'selenium', amount: 150 },
      { nutrient: 'taurine', amount: 1000 },
    ];
    const result: ULCheck[] = sumAgainstUL(currentStack, proposed);
    const seleniumCheck = result.find((r) => r.nutrient === 'selenium');
    expect(seleniumCheck).toBeDefined();
    expect(seleniumCheck!.total).toBe(350);
    expect(seleniumCheck!.ul).toBe(400);
    expect(seleniumCheck!.exceeds).toBe(false);
    const ironCheck = result.find((r) => r.nutrient === 'iron');
    expect(ironCheck).toBeDefined();
    expect(ironCheck!.total).toBe(10);
    expect(ironCheck!.exceeds).toBe(false);
    expect(result.find((r) => r.nutrient === 'taurine')).toBeUndefined();
  });

  it('returns empty array when no nutrient has a UL', () => {
    const result = sumAgainstUL(
      [{ nutrient: 'taurine', amount: 100 }],
      [{ nutrient: 'glycine', amount: 200 }],
    );
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty inputs', () => {
    const result = sumAgainstUL([], []);
    expect(result).toHaveLength(0);
  });

  it('unit is copied from the UL entry', () => {
    // copper UL = 10000 mcg; 5000 + 6000 = 11000 exceeds
    const result = sumAgainstUL(
      [{ nutrient: 'copper', amount: 5000 }],
      [{ nutrient: 'copper', amount: 6000 }],
    );
    const copperCheck = result.find((r) => r.nutrient === 'copper');
    expect(copperCheck).toBeDefined();
    expect(copperCheck!.unit).toBe('mcg');
    expect(copperCheck!.total).toBe(11000);
    expect(copperCheck!.exceeds).toBe(true);
  });

  it('exactly at UL does not exceed', () => {
    const result = sumAgainstUL(
      [{ nutrient: 'iron', amount: 20 }],
      [{ nutrient: 'iron', amount: 25 }],
    );
    const ironCheck = result.find((r) => r.nutrient === 'iron');
    expect(ironCheck).toBeDefined();
    expect(ironCheck!.total).toBe(45);
    expect(ironCheck!.exceeds).toBe(false);
  });
});
