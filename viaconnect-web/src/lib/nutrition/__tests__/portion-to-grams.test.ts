import { describe, it, expect } from 'vitest';
import { portionToGrams } from '../portion-to-grams';

// FDC foodPortions recorded from the live API on 2026-06-11 (tmp/186/fixtures).
const APPLE_PORTIONS = [
  { amount: 1, gramWeight: 109, modifier: 'cup slices', measureUnit: { name: 'undetermined' } },
  { amount: 1, gramWeight: 182, modifier: 'medium (3" dia)', measureUnit: { name: 'undetermined' } },
  { amount: 1, gramWeight: 149, modifier: 'small (2-3/4" dia)', measureUnit: { name: 'undetermined' } },
  { amount: 1, gramWeight: 242, modifier: 'NLEA serving', measureUnit: { name: 'undetermined' } },
  { amount: 1, gramWeight: 223, modifier: 'large (3-1/4" dia)', measureUnit: { name: 'undetermined' } },
];

const AVOCADO_PORTIONS = [
  { amount: 1, gramWeight: 136, modifier: 'fruit, without skin and seed', measureUnit: { name: 'undetermined' } },
  { amount: 1, gramWeight: 230, modifier: 'cup, pureed', measureUnit: { name: 'undetermined' } },
  { amount: 1, gramWeight: 50, modifier: 'NLEA serving', measureUnit: { name: 'undetermined' } },
];

describe('portionToGrams', () => {
  it('direct mass units bypass everything', () => {
    expect(portionToGrams({ unit: 'g', quantity: 150, foodHint: 'rice' })).toMatchObject({
      grams: 150, method: 'direct_unit', downgraded: false,
    });
    expect(portionToGrams({ unit: 'oz', quantity: 1, foodHint: 'almonds' }).grams).toBeCloseTo(28.35, 1);
  });

  it('whole apple resolves through the FDC medium portion (182 g)', () => {
    const r = portionToGrams({ unit: 'whole', quantity: 1, foodHint: 'apple', foodPortions: APPLE_PORTIONS });
    expect(r.grams).toBe(182);
    expect(r.method).toBe('fdc_portion');
    expect(r.downgraded).toBe(false);
  });

  it('large apple picks the large portion directly, no double multiplier', () => {
    const r = portionToGrams({ unit: 'large', quantity: 1, foodHint: 'apple', foodPortions: APPLE_PORTIONS });
    expect(r.grams).toBe(223);
  });

  it('half a whole avocado resolves through the fruit portion (68 g edible)', () => {
    const r = portionToGrams({ unit: 'whole', quantity: 0.5, foodHint: 'avocado', foodPortions: AVOCADO_PORTIONS });
    expect(r.grams).toBe(68);
    expect(r.method).toBe('fdc_portion');
  });

  it('cup of apple uses the cup portion, not water density', () => {
    const r = portionToGrams({ unit: 'cup', quantity: 1, foodHint: 'apple', foodPortions: APPLE_PORTIONS });
    expect(r.grams).toBe(109);
    expect(r.method).toBe('fdc_portion');
  });

  it('falls back to the curated table when no portions exist (egg 50 g)', () => {
    const r = portionToGrams({ unit: 'whole', quantity: 2, foodHint: 'egg' });
    expect(r.grams).toBe(100);
    expect(r.method).toBe('curated_table');
    expect(r.downgraded).toBe(false);
  });

  it('sourdough slice uses the raised curated weight (55 g)', () => {
    const r = portionToGrams({ unit: 'slice', quantity: 1, foodHint: 'sourdough bread' });
    expect(r.grams).toBe(55);
    expect(r.method).toBe('curated_table');
  });

  it('cup of a solid via water density carries the downgrade flag (cheerios trap)', () => {
    const r = portionToGrams({ unit: 'cup', quantity: 1, foodHint: 'cheerios' });
    expect(r.grams).toBe(240);
    expect(r.method).toBe('curated_table');
    expect(r.downgraded).toBe(true);
  });

  it('cup of a liquid via water density is trusted', () => {
    const r = portionToGrams({ unit: 'cup', quantity: 1, foodHint: 'whole milk' });
    expect(r.downgraded).toBe(false);
  });

  it('branded serving grams resolve the serving unit', () => {
    const r = portionToGrams({ unit: 'serving', quantity: 2, foodHint: 'cheerios cereal', brandedServingGrams: 20 });
    expect(r.grams).toBe(40);
    expect(r.method).toBe('fdc_portion');
  });

  it('the last-resort default is 100 g per count WITH the downgrade flag, never silent', () => {
    const r = portionToGrams({ unit: 'serving', quantity: 1, foodHint: 'mystery stew' });
    expect(r.grams).toBe(100);
    expect(r.method).toBe('default_100g');
    expect(r.downgraded).toBe(true);
  });
});
