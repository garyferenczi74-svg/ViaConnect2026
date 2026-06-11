import { describe, it, expect } from 'vitest';
import { USDA_NUTRIENT_IDS, extractNutrientsPer100g } from '../usda-nutrient-ids';

describe('USDA_NUTRIENT_IDS', () => {
  it('has the canonical ids', () => {
    expect(USDA_NUTRIENT_IDS.ENERGY_KCAL).toBe(1008);
    expect(USDA_NUTRIENT_IDS.PROTEIN_G).toBe(1003);
    expect(USDA_NUTRIENT_IDS.OMEGA3_DHA_G).toBe(1272);
  });
});

describe('extractNutrientsPer100g', () => {
  it('reads nutrients out of a USDA foodNutrients array', () => {
    const payload = {
      foodNutrients: [
        { nutrient: { id: 1008 }, amount: 155 },
        { nutrient: { id: 1003 }, amount: 13 },
        { nutrient: { id: 1004 }, amount: 11 },
        { nutrient: { id: 1258 }, amount: 3.3 },
        { nutrient: { id: 1404 }, amount: 0.1 },
      ],
    };
    const out = extractNutrientsPer100g(payload);
    expect(out.calories).toBe(155);
    expect(out.protein_g).toBe(13);
    expect(out.total_fat_g).toBe(11);
    expect(out.saturated_fat_g).toBeCloseTo(3.3);
    expect(out.omega3_g).toBeCloseTo(0.1);
  });
  it('handles missing nutrients as UNKNOWN (null), never 0', () => {
    // Prompt 186: the golden-meal defect cached Foundation foods at 0 kcal
    // and displayed missing sugar as 0. Missing now stays null.
    const out = extractNutrientsPer100g({ foodNutrients: [] });
    expect(out.calories).toBeNull();
    expect(out.fiber_g).toBeNull();
  });
  it('falls back to Atwater energy ids for Foundation foods', () => {
    // Foundation foods (e.g. Pineapple, raw 2346398) carry no 1008 row;
    // energy publishes as 2047/2048 kcal.
    const out = extractNutrientsPer100g({
      foodNutrients: [
        { nutrient: { id: 2047, name: 'Energy (Atwater General Factors)', unitName: 'kcal' }, amount: 60.11 },
        { nutrient: { id: 1063, name: 'Sugars, Total', unitName: 'g' }, amount: 11.42 },
      ],
    });
    expect(out.calories).toBeCloseTo(60.11);
    expect(out.sugar_g).toBeCloseTo(11.42);
  });
  it('sums all four omega-3 sub-nutrients into omega3_g', () => {
    const payload = {
      foodNutrients: [
        { nutrient: { id: 1404 }, amount: 0.5 },
        { nutrient: { id: 1278 }, amount: 0.3 },
        { nutrient: { id: 1272 }, amount: 0.2 },
        { nutrient: { id: 1280 }, amount: 0.1 },
      ],
    };
    expect(extractNutrientsPer100g(payload).omega3_g).toBeCloseTo(1.1);
  });
});
