import { describe, it, expect } from 'vitest';
import {
  extractCanonicalNutrients,
  extractFromLabelNutrients,
  CANONICAL_NUTRIENT_MAP,
  FDC_IDS,
  KJ_PER_KCAL,
} from '../fdc-nutrients';

describe('CANONICAL_NUTRIENT_MAP', () => {
  it('covers the Prompt 186 required nutrient set with the canonical ids', () => {
    expect(CANONICAL_NUTRIENT_MAP.calories.selectors[0]).toEqual({ id: 1008, unit: 'kcal' });
    expect(CANONICAL_NUTRIENT_MAP.protein_g.selectors[0].id).toBe(1003);
    expect(CANONICAL_NUTRIENT_MAP.total_fat_g.selectors[0].id).toBe(1004);
    expect(CANONICAL_NUTRIENT_MAP.carbs_g.selectors[0].id).toBe(1005);
    expect(CANONICAL_NUTRIENT_MAP.sugar_g.selectors[0].id).toBe(2000);
    expect(CANONICAL_NUTRIENT_MAP.fiber_g.selectors[0].id).toBe(1079);
    expect(CANONICAL_NUTRIENT_MAP.sodium_mg.selectors[0].id).toBe(1093);
    expect(CANONICAL_NUTRIENT_MAP.saturated_fat_g.selectors[0].id).toBe(1258);
    expect(CANONICAL_NUTRIENT_MAP.cholesterol_mg.selectors[0].id).toBe(1253);
  });
});

describe('extractCanonicalNutrients', () => {
  it('selects energy by id 1008 with unitName kcal, never the kJ row', () => {
    // SR Legacy payloads carry BOTH Energy rows; the kJ row (1062) is listed
    // first in search-shaped arrays. Selecting by name or first match would
    // produce the 4.184x error class from the 186 prompt.
    const { values, derived } = extractCanonicalNutrients({
      foodNutrients: [
        { nutrient: { id: 1062, name: 'Energy', unitName: 'kJ' }, amount: 3699 },
        { nutrient: { id: 1008, name: 'Energy', unitName: 'kcal' }, amount: 884 },
      ],
    });
    expect(values.calories).toBe(884);
    expect(derived).not.toContain('calories');
  });

  it('derives kcal from the kJ row only when no kcal id exists, tagged derived', () => {
    const { values, derived } = extractCanonicalNutrients({
      foodNutrients: [
        { nutrient: { id: FDC_IDS.ENERGY_KJ, name: 'Energy', unitName: 'kJ' }, amount: 1573 },
      ],
    });
    expect(values.calories).toBeCloseTo(1573 / KJ_PER_KCAL, 1);
    expect(derived).toContain('calories');
  });

  it('skips an energy row whose unitName violates the kcal contract', () => {
    const { values, missing } = extractCanonicalNutrients({
      foodNutrients: [
        { nutrient: { id: 1008, name: 'Energy', unitName: 'kJ' }, amount: 3699 },
      ],
    });
    expect(values.calories).toBeNull();
    expect(missing).toContain('calories');
  });

  it('reads the flattened search shape (nutrientId/value/unitName)', () => {
    const { values } = extractCanonicalNutrients({
      foodNutrients: [
        { nutrientId: 1003, nutrientName: 'Protein', unitName: 'G', value: 12.4 },
        { nutrientId: 1004, nutrientName: 'Total lipid (fat)', unitName: 'G', value: 9.9 },
      ],
    });
    expect(values.protein_g).toBeCloseTo(12.4);
    expect(values.total_fat_g).toBeCloseTo(9.9);
  });

  it('never sums fat sub-fractions into total fat', () => {
    const { values } = extractCanonicalNutrients({
      foodNutrients: [
        { nutrient: { id: 1004, name: 'Total lipid (fat)', unitName: 'g' }, amount: 10 },
        { nutrient: { id: 1258, name: 'Fatty acids, total saturated', unitName: 'g' }, amount: 3 },
        { nutrient: { id: 1292, name: 'Fatty acids, total monounsaturated', unitName: 'g' }, amount: 4 },
        { nutrient: { id: 1293, name: 'Fatty acids, total polyunsaturated', unitName: 'g' }, amount: 2 },
      ],
    });
    expect(values.total_fat_g).toBe(10);
    expect(values.saturated_fat_g).toBe(3);
  });

  it('uses Foundation fallbacks: Atwater energy 2047 and Sugars Total 1063', () => {
    const { values, missing } = extractCanonicalNutrients({
      foodNutrients: [
        { nutrient: { id: 2047, name: 'Energy (Atwater General Factors)', unitName: 'kcal' }, amount: 60.11 },
        { nutrient: { id: 2048, name: 'Energy (Atwater Specific Factors)', unitName: 'kcal' }, amount: 54.05 },
        { nutrient: { id: 1063, name: 'Sugars, Total', unitName: 'g' }, amount: 11.42 },
      ],
    });
    expect(values.calories).toBeCloseTo(60.11);
    expect(values.sugar_g).toBeCloseTo(11.42);
    expect(missing).toContain('protein_g');
    expect(values.protein_g).toBeNull();
  });

  it('reports missing nutrients as null with rowsUsed for the structured log', () => {
    const res = extractCanonicalNutrients({
      foodNutrients: [
        { nutrient: { id: 1008, name: 'Energy', unitName: 'kcal' }, amount: 52 },
      ],
    });
    expect(res.values.sugar_g).toBeNull();
    expect(res.missing).toContain('sugar_g');
    expect(res.rowsUsed).toEqual([
      { key: 'calories', id: 1008, name: 'Energy', unit: 'kcal', value: 52 },
    ]);
  });
});

describe('extractFromLabelNutrients', () => {
  it('maps the Branded label shape per serving with unknowns as null', () => {
    // Recorded from FDC 2517161 Cheerios Cereal (per 20 g serving).
    const { values, missing } = extractFromLabelNutrients({
      calories: { value: 71.8 },
      fat: { value: 1.28 },
      carbohydrates: { value: 14.9 },
      protein: { value: 2.56 },
      sugars: { value: 1.03 },
      fiber: { value: 2.06 },
      sodium: { value: 97.4 },
    });
    expect(values.calories).toBeCloseTo(71.8);
    expect(values.total_fat_g).toBeCloseTo(1.28);
    expect(values.cholesterol_mg).toBeNull();
    expect(missing).toContain('cholesterol_mg');
  });
});
