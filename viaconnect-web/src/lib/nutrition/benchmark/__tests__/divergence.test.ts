import { describe, it, expect } from 'vitest';
import {
  signedPct,
  computeItemDivergence,
  aggregateDivergence,
  dualAgreement,
} from '../divergence';
import type { AtwaterCheck, ItemTotals, ItemTrace, MealTrace } from '../tracePipeline';
import type { BenchmarkItem } from '../basket';

function totals(over: Partial<ItemTotals>): ItemTotals {
  return {
    calories_kcal: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    fiber_g: null,
    sugar_g: null,
    sodium_mg: null,
    ...over,
  };
}

function itemTrace(over: Partial<ItemTrace>): ItemTrace {
  return {
    engine: 'text',
    rawInput: 'x',
    identifiedLabel: 'x',
    referenceSource: 'usda',
    referenceId: null,
    matchedName: null,
    detectedBasis: null,
    per100g: null,
    estimatedGrams: null,
    conversionChain: '',
    itemTotals: totals({}),
    nullFields: [],
    error: null,
    ...over,
  };
}

function mealTrace(
  engine: 'text' | 'photo',
  mealTotals: ItemTotals,
  items: ItemTrace[],
  atwater: AtwaterCheck | null = null
): MealTrace {
  return { engine, items, mealTotals, atwater };
}

function benchItem(opts: {
  basis?: BenchmarkItem['consensus_target']['basis'];
  portion_g?: number;
  values: BenchmarkItem['consensus_target']['values'];
}): BenchmarkItem {
  return {
    id: 'item',
    category: 'cooked_whole',
    text_input: 'x',
    photo_ref: null,
    dual_logged: false,
    consensus_target: {
      source: 'fdc_derived',
      basis: opts.basis ?? 'cooked',
      portion_g: opts.portion_g ?? 150,
      values: opts.values,
    },
  };
}

describe('signedPct', () => {
  it('computes signed percent', () => {
    expect(signedPct(110, 100)).toBe(10);
    expect(signedPct(90, 100)).toBe(-10);
  });
  it('returns null when either side is null', () => {
    expect(signedPct(null, 100)).toBeNull();
    expect(signedPct(100, null)).toBeNull();
  });
  it('handles a zero target', () => {
    expect(signedPct(0, 0)).toBe(0);
    expect(signedPct(5, 0)).toBeNull();
  });
});

describe('computeItemDivergence attribution', () => {
  it('flags within_tolerance when calories are within 5 percent', () => {
    const item = benchItem({
      values: { calories_kcal: 195, protein_g: 4, carbs_g: 42, fat_g: 0.4, fiber_g: 0.6, sugar_g: 0.1, sodium_mg: null },
    });
    const trace = mealTrace('text', totals({ calories_kcal: 195, protein_g: 4, carbs_g: 42, fat_g: 0.4, fiber_g: 0.6, sugar_g: 0.1 }), [
      itemTrace({ estimatedGrams: 150 }),
    ]);
    const d = computeItemDivergence(item, trace);
    expect(d.caloriesSignedPct).toBe(0);
    expect(d.dominantStage).toBe('within_tolerance');
  });

  it('flags raw_vs_cooked when grams match but energy is high on a cooked item', () => {
    const item = benchItem({
      basis: 'cooked',
      portion_g: 150,
      values: { calories_kcal: 195, protein_g: 4, carbs_g: 42, fat_g: 0.4, fiber_g: 0.6, sugar_g: 0.1, sodium_mg: null },
    });
    const trace = mealTrace('text', totals({ calories_kcal: 260, protein_g: 5.4, carbs_g: 56, fat_g: 0.5 }), [
      itemTrace({ estimatedGrams: 150, referenceSource: 'usda' }),
    ]);
    const d = computeItemDivergence(item, trace);
    expect(d.gramsSignedPct).toBe(0);
    expect(Math.abs(d.caloriesSignedPct as number)).toBeGreaterThan(5);
    expect(d.dominantStage).toBe('raw_vs_cooked');
  });

  it('flags quantity when grams are far off', () => {
    const item = benchItem({
      values: { calories_kcal: 195, protein_g: 4, carbs_g: 42, fat_g: 0.4, fiber_g: 0.6, sugar_g: 0.1, sodium_mg: null },
    });
    const trace = mealTrace('text', totals({ calories_kcal: 390 }), [
      itemTrace({ estimatedGrams: 300 }),
    ]);
    const d = computeItemDivergence(item, trace);
    expect(d.gramsSignedPct).toBe(100);
    expect(d.dominantStage).toBe('quantity');
  });

  it('flags null_handling when a consensus nutrient is missing but calories are fine', () => {
    const item = benchItem({
      values: { calories_kcal: 195, protein_g: 4, carbs_g: 42, fat_g: 0.4, fiber_g: 0.6, sugar_g: 0.1, sodium_mg: 300 },
    });
    const trace = mealTrace('text', totals({ calories_kcal: 195, protein_g: 4, carbs_g: 42, fat_g: 0.4, sodium_mg: null }), [
      itemTrace({ estimatedGrams: 150 }),
    ]);
    const d = computeItemDivergence(item, trace);
    expect(d.dominantStage).toBe('null_handling');
  });

  it('flags no_reference when nothing matched', () => {
    const item = benchItem({
      values: { calories_kcal: 195, protein_g: 4, carbs_g: 42, fat_g: 0.4, fiber_g: 0.6, sugar_g: 0.1, sodium_mg: null },
    });
    const trace = mealTrace('text', totals({}), [
      itemTrace({ referenceSource: 'usda_miss', estimatedGrams: null }),
    ]);
    const d = computeItemDivergence(item, trace);
    expect(d.dominantStage).toBe('no_reference');
  });

  it('flags atwater_reconciliation when the kcal-to-macro ratio is broken', () => {
    const item = benchItem({
      basis: 'cooked',
      portion_g: 150,
      values: { calories_kcal: 195, protein_g: 4, carbs_g: 42, fat_g: 0.4, fiber_g: 0.6, sugar_g: 0.1, sodium_mg: null },
    });
    const trace = mealTrace(
      'text',
      totals({ calories_kcal: 260, protein_g: 5, carbs_g: 10, fat_g: 1 }),
      [itemTrace({ estimatedGrams: 150 })],
      { macroDerivedKcal: 69, ratio: 0.27, passed: false }
    );
    const d = computeItemDivergence(item, trace);
    expect(d.dominantStage).toBe('atwater_reconciliation');
  });

  it('flags unit_conversion when the unit fell back to a default serving size', () => {
    const item = benchItem({
      basis: 'as_served',
      portion_g: 350,
      values: { calories_kcal: 470, protein_g: 37, carbs_g: 14, fat_g: 30, fiber_g: 4, sugar_g: 3, sodium_mg: null },
    });
    const trace = mealTrace(
      'text',
      totals({ calories_kcal: 130, protein_g: 10, carbs_g: 4, fat_g: 8 }),
      [itemTrace({ estimatedGrams: 100, unitToGramsResolved: false })]
    );
    const d = computeItemDivergence(item, trace);
    expect(d.gramsSignedPct).toBeLessThanOrEqual(-10);
    expect(d.dominantStage).toBe('unit_conversion');
  });
});

describe('aggregateDivergence', () => {
  it('computes MAPE and mean signed error per engine per metric', () => {
    const base = {
      values: { calories_kcal: 100, protein_g: 10, carbs_g: 10, fat_g: 10, fiber_g: 1, sugar_g: 1, sodium_mg: null },
    };
    const over = computeItemDivergence(
      benchItem(base),
      mealTrace('text', totals({ calories_kcal: 110 }), [itemTrace({ estimatedGrams: 150 })])
    );
    const under = computeItemDivergence(
      benchItem(base),
      mealTrace('text', totals({ calories_kcal: 90 }), [itemTrace({ estimatedGrams: 150 })])
    );
    const agg = aggregateDivergence([over, under]);
    const text = agg.find((a) => a.engine === 'text');
    const cal = text?.metrics.find((m) => m.metric === 'calories_kcal');
    expect(cal?.mapePct).toBe(10);
    expect(cal?.meanSignedPct).toBe(0);
    expect(cal?.n).toBe(2);
    // both items exceed 5 percent on calories
    expect(text?.itemsOverTolerance.length).toBe(2);
  });
});

describe('dualAgreement', () => {
  it('agrees within 3 percent at the boundary', () => {
    const r = dualAgreement('m', totals({ calories_kcal: 200 }), totals({ calories_kcal: 206 }));
    expect(r.caloriesPhotoVsTextPct).toBe(3);
    expect(r.agreesWithin3Pct).toBe(true);
  });
  it('disagrees beyond 3 percent', () => {
    const r = dualAgreement('m', totals({ calories_kcal: 200 }), totals({ calories_kcal: 210 }));
    expect(r.caloriesPhotoVsTextPct).toBe(5);
    expect(r.agreesWithin3Pct).toBe(false);
  });
});
