import { describe, it, expect } from 'vitest';
import { aggregate, type AggregatedItem } from '../aggregate';

const eggUSDA: AggregatedItem = {
  parsed: { name: 'egg', quantity: 2, unit: 'whole' },
  nutrients: { calories: 155, protein_g: 13, carbs_g: 1.1, total_fat_g: 11, saturated_fat_g: 3.3, trans_fat_g: 0, omega3_g: 0.1, sugar_g: 1.1, fiber_g: 0, source: 'usda' },
};
const avocadoUSDA: AggregatedItem = {
  parsed: { name: 'avocado', quantity: 1, unit: 'medium' },
  nutrients: { calories: 160, protein_g: 2, carbs_g: 9, total_fat_g: 15, saturated_fat_g: 2.1, trans_fat_g: 0, omega3_g: 0.1, sugar_g: 0.7, fiber_g: 7, source: 'usda' },
};
const proteinBarFallback: AggregatedItem = {
  parsed: { name: 'protein bar', quantity: 1, unit: 'serving' },
  nutrients: { calories: 200, protein_g: 20, carbs_g: 20, total_fat_g: 7, saturated_fat_g: 3, trans_fat_g: 0, omega3_g: 0, sugar_g: 10, fiber_g: 5, source: 'gemini_fallback' },
};

describe('aggregate', () => {
  it('sums macros across USDA items', () => {
    const r = aggregate([eggUSDA, avocadoUSDA]);
    expect(r.calories).toBe(315);
    expect(r.protein_g).toBe(15);
    expect(r.total_fat_g).toBeCloseTo(26);
  });
  it('marks data_source=usda when all items USDA', () => {
    expect(aggregate([eggUSDA, avocadoUSDA]).data_source).toBe('usda');
  });
  it('marks data_source=gemini_fallback when all items fallback', () => {
    expect(aggregate([proteinBarFallback]).data_source).toBe('gemini_fallback');
  });
  it('marks data_source=mixed when items have both sources', () => {
    expect(aggregate([eggUSDA, proteinBarFallback]).data_source).toBe('mixed');
  });
  it('confidence equals usda fraction', () => {
    expect(aggregate([eggUSDA, proteinBarFallback]).confidence).toBe(0.5);
  });
  it('serving_description concatenates items', () => {
    expect(aggregate([eggUSDA, avocadoUSDA]).serving_description).toBe('2 whole egg, 1 medium avocado');
  });
  it('returns confidence 0 + unknown totals for zero items (caller should have errored upstream)', () => {
    const r = aggregate([]);
    expect(r.confidence).toBe(0);
    expect(r.calories).toBeNull();
  });
  it('keeps a fully unknown nutrient null and lists it in nutrient_flags.unknown', () => {
    const noSugar: AggregatedItem = {
      parsed: { name: 'mystery', quantity: 1, unit: 'whole' },
      nutrients: { ...eggUSDA.nutrients, sugar_g: null },
    };
    const r = aggregate([noSugar]);
    expect(r.sugar_g).toBeNull();
    expect(r.nutrient_flags?.unknown).toContain('sugar_g');
  });
  it('marks a partially unknown nutrient as partial, not zero-filled', () => {
    const noSugar: AggregatedItem = {
      parsed: { name: 'croissant', quantity: 1, unit: 'whole' },
      nutrients: { ...eggUSDA.nutrients, sugar_g: null },
    };
    const r = aggregate([eggUSDA, noSugar]);
    expect(r.sugar_g).toBeCloseTo(1.1);
    expect(r.nutrient_flags?.partial).toContain('sugar_g');
    expect(r.nutrient_flags?.unknown).not.toContain('sugar_g');
  });
  it('downgrades confidence when an item carries the portion or plausibility flag', () => {
    const flagged: AggregatedItem = {
      parsed: { name: 'avocado', quantity: 0.5, unit: 'whole' },
      nutrients: {
        ...avocadoUSDA.nutrients,
        meta: {
          fdcId: 1, dataType: 'SR Legacy', matchedName: 'Avocados, raw',
          grams: 100, gramsMethod: 'default_100g', confidenceDowngraded: true,
          derivedEnergy: false, missingNutrients: [], plausibilityFlagged: false,
          basis: 'per_100g',
        },
      },
    };
    const r = aggregate([eggUSDA, flagged]);
    expect(r.confidence).toBeLessThan(1);
    expect(r.nutrient_flags?.downgraded).toBe(true);
  });
});
