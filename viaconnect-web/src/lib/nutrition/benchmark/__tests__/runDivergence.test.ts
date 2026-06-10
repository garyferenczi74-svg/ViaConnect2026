import { describe, it, expect } from 'vitest';
import { buildReport, formatReportMarkdown, type EngineRunners } from '../runDivergence';
import { loadBenchmarkBasket } from '../basket';
import { PINNED_INPUTS } from '../pinned-inputs';
import type { ItemTotals, ItemTrace, MealTrace } from '../tracePipeline';

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

function fakeTrace(engine: 'text' | 'photo', calories: number): MealTrace {
  const item: ItemTrace = {
    engine,
    rawInput: 'x',
    identifiedLabel: 'x',
    referenceSource: 'usda',
    referenceId: null,
    matchedName: null,
    detectedBasis: null,
    per100g: null,
    estimatedGrams: 100,
    conversionChain: '',
    itemTotals: totals({ calories_kcal: calories }),
    nullFields: [],
    error: null,
  };
  return { engine, items: [item], mealTotals: totals({ calories_kcal: calories }), atwater: null };
}

describe('buildReport', () => {
  it('runs text for every item and photo for the dual items', async () => {
    const basket = loadBenchmarkBasket();
    const runners: EngineRunners = {
      runText: async () => fakeTrace('text', 200),
      runPhoto: async () => fakeTrace('photo', 210),
    };
    const report = await buildReport(basket, PINNED_INPUTS, runners);
    const dualCount = basket.items.filter((i) => i.dual_logged).length;

    expect(report.items.filter((i) => i.engine === 'text').length).toBe(basket.items.length);
    expect(report.items.filter((i) => i.engine === 'photo').length).toBe(dualCount);
    expect(report.duals.length).toBe(dualCount);
    expect(report.aggregates.some((a) => a.engine === 'text')).toBe(true);
    expect(report.aggregates.some((a) => a.engine === 'photo')).toBe(true);
  });

  it('renders markdown with the key sections', async () => {
    const basket = loadBenchmarkBasket();
    const runners: EngineRunners = {
      runText: async () => fakeTrace('text', 200),
      runPhoto: async () => fakeTrace('photo', 200),
    };
    const md = formatReportMarkdown(await buildReport(basket, PINNED_INPUTS, runners));
    expect(md).toContain('# Prompt 184 Divergence Report');
    expect(md).toContain('## Aggregate: text');
    expect(md).toContain('## Aggregate: photo');
    expect(md).toContain('Dual-engine agreement');
    expect(md).toContain('Per-item detail');
  });
});
