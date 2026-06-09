import { describe, it, expect, beforeAll } from 'vitest';
import {
  loadBenchmarkBasket,
  BenchmarkItemSchema,
  BENCHMARK_CATEGORIES,
  type BenchmarkBasket,
} from '../basket';

describe('benchmark basket fixture', () => {
  let basket: BenchmarkBasket;

  beforeAll(() => {
    basket = loadBenchmarkBasket();
  });

  it('loads and validates without throwing', () => {
    expect(() => loadBenchmarkBasket()).not.toThrow();
  });

  it('has between 30 and 40 items', () => {
    expect(basket.items.length).toBeGreaterThanOrEqual(30);
    expect(basket.items.length).toBeLessThanOrEqual(40);
  });

  it('covers all six categories', () => {
    const present = new Set(basket.items.map((item) => item.category));
    for (const category of BENCHMARK_CATEGORIES) {
      expect(present.has(category)).toBe(true);
    }
  });

  it('has at least three dual-logged items, each with both inputs', () => {
    const dual = basket.items.filter((item) => item.dual_logged);
    expect(dual.length).toBeGreaterThanOrEqual(3);
    for (const item of dual) {
      expect(item.text_input).not.toBeNull();
      expect(item.photo_ref).not.toBeNull();
    }
  });

  it('has unique ids', () => {
    const ids = basket.items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tags every target as fdc_derived for now', () => {
    for (const item of basket.items) {
      expect(item.consensus_target.source).toBe('fdc_derived');
    }
  });

  it('records a portion and a basis for every item', () => {
    for (const item of basket.items) {
      expect(item.consensus_target.portion_g).toBeGreaterThan(0);
      expect(item.consensus_target.basis).toBeTruthy();
    }
  });

  it('never has sugar exceeding carbs across the basket', () => {
    for (const item of basket.items) {
      const { carbs_g, sugar_g } = item.consensus_target.values;
      if (carbs_g !== null && sugar_g !== null) {
        expect(sugar_g).toBeLessThanOrEqual(carbs_g);
      }
    }
  });

  it('rejects a malformed item', () => {
    const bad = {
      id: 'broken',
      category: 'not_a_category',
      text_input: 'x',
      photo_ref: null,
      dual_logged: false,
      consensus_target: {},
    };
    expect(BenchmarkItemSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a dual-logged item missing an input', () => {
    const bad = {
      id: 'dual-missing-photo',
      category: 'raw_whole',
      text_input: '1 banana',
      photo_ref: null,
      dual_logged: true,
      consensus_target: {
        source: 'fdc_derived',
        basis: 'raw',
        portion_g: 118,
        values: {
          calories_kcal: 105,
          protein_g: 1.3,
          carbs_g: 27,
          fat_g: 0.4,
          fiber_g: 3.1,
          sugar_g: 14.4,
          sodium_mg: 1,
        },
      },
    };
    expect(BenchmarkItemSchema.safeParse(bad).success).toBe(false);
  });
});
