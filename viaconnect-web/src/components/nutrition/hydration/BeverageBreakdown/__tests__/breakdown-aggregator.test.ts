// Prompt 172e Phase D Workstream 1: breakdown aggregator pure helper tests.
//
// Spec section 10 + 5.1: aggregator turns today's hydration events into
// a nine category breakdown with gross + effective ml + percentages.
// Pure function so the test suite reads identical math the UI does.
//
// 170c section 8 contract: the aggregator runs identically in both
// modes; the suppression of absolute numbers happens at the legend
// component. This suite proves the math is mode invariant.

import { describe, it, expect } from 'vitest';
import {
  aggregateBreakdown,
  type BreakdownCatalogRow,
  type BreakdownEvent,
} from '../breakdown-aggregator';
import { BEVERAGE_CATEGORIES } from '../../BeveragePicker/BeveragePicker.types';

const CATALOG: ReadonlyArray<BreakdownCatalogRow> = [
  { slug: 'water_still', category: 'water', hydration_source_kind: 'pure_water', hydration_coefficient: 1.0 },
  { slug: 'coffee_drip', category: 'coffee', hydration_source_kind: 'coffee_tea', hydration_coefficient: 1.0 },
  { slug: 'tea_black', category: 'tea', hydration_source_kind: 'coffee_tea', hydration_coefficient: 1.0 },
  { slug: 'juice_orange', category: 'juice', hydration_source_kind: 'juice_smoothie', hydration_coefficient: 1.2 },
  { slug: 'soda_cola', category: 'pop', hydration_source_kind: 'soda', hydration_coefficient: 1.0 },
  { slug: 'sports_gatorade', category: 'sports_energy', hydration_source_kind: 'sports_drink', hydration_coefficient: 1.0 },
  { slug: 'milk_whole', category: 'milk', hydration_source_kind: 'dairy', hydration_coefficient: 1.3 },
  { slug: 'kombucha', category: 'functional', hydration_source_kind: 'coffee_tea', hydration_coefficient: 1.0 },
  { slug: 'beer_lager', category: 'alcohol', hydration_source_kind: 'alcohol_low', hydration_coefficient: 1.0 },
];

describe('Prompt 172e Phase D aggregateBreakdown empty + zero cases', () => {
  it('returns zero totals + all zero segments when events is empty', () => {
    const result = aggregateBreakdown([], CATALOG);
    expect(result.total_gross_ml).toBe(0);
    expect(result.total_effective_ml).toBe(0);
    expect(result.segments).toHaveLength(BEVERAGE_CATEGORIES.length);
    for (const segment of result.segments) {
      expect(segment.gross_ml).toBe(0);
      expect(segment.effective_ml).toBe(0);
      expect(segment.gross_pct).toBe(0);
      expect(segment.effective_pct).toBe(0);
    }
  });

  it('drops events with non finite or non positive volume_ml', () => {
    const events: BreakdownEvent[] = [
      { meal_id: 'm1', beverage_kind: 'pure_water', beverage_catalog_slug: 'water_still', volume_ml: 0 },
      { meal_id: 'm2', beverage_kind: 'pure_water', beverage_catalog_slug: 'water_still', volume_ml: -100 },
      { meal_id: 'm3', beverage_kind: 'pure_water', beverage_catalog_slug: 'water_still', volume_ml: Number.NaN },
    ];
    const result = aggregateBreakdown(events, CATALOG);
    expect(result.total_gross_ml).toBe(0);
  });

  it('returns segments in canonical BEVERAGE_CATEGORIES order', () => {
    const result = aggregateBreakdown([], CATALOG);
    expect(result.segments.map((s) => s.category)).toEqual([...BEVERAGE_CATEGORIES]);
  });
});

describe('Prompt 172e Phase D aggregateBreakdown via beverage_catalog_slug', () => {
  it('aggregates one water + one coffee + one juice across categories', () => {
    const events: BreakdownEvent[] = [
      { meal_id: 'm1', beverage_kind: 'pure_water', beverage_catalog_slug: 'water_still', volume_ml: 500 },
      { meal_id: 'm2', beverage_kind: 'coffee_tea', beverage_catalog_slug: 'coffee_drip', volume_ml: 240 },
      { meal_id: 'm3', beverage_kind: 'juice_smoothie', beverage_catalog_slug: 'juice_orange', volume_ml: 240 },
    ];
    const result = aggregateBreakdown(events, CATALOG);
    expect(result.total_gross_ml).toBe(980); // 500 + 240 + 240
    // effective: 500 * 1.0 + 240 * 1.0 + 240 * 1.2 = 500 + 240 + 288 = 1028
    expect(result.total_effective_ml).toBe(1028);

    const water = result.segments.find((s) => s.category === 'water')!;
    expect(water.gross_ml).toBe(500);
    expect(water.effective_ml).toBe(500);

    const coffee = result.segments.find((s) => s.category === 'coffee')!;
    expect(coffee.gross_ml).toBe(240);
    expect(coffee.effective_ml).toBe(240);

    const juice = result.segments.find((s) => s.category === 'juice')!;
    expect(juice.gross_ml).toBe(240);
    expect(juice.effective_ml).toBe(288);
  });

  it('sums two coffees from different slugs into one coffee segment', () => {
    const events: BreakdownEvent[] = [
      { meal_id: 'm1', beverage_kind: 'coffee_tea', beverage_catalog_slug: 'coffee_drip', volume_ml: 240 },
      { meal_id: 'm2', beverage_kind: 'coffee_tea', beverage_catalog_slug: 'coffee_drip', volume_ml: 240 },
    ];
    const result = aggregateBreakdown(events, CATALOG);
    const coffee = result.segments.find((s) => s.category === 'coffee')!;
    expect(coffee.gross_ml).toBe(480);
    expect(coffee.effective_ml).toBe(480);
  });

  it('separates coffee_tea kind into coffee and tea by slug', () => {
    // Catalog separates coffee_drip into 'coffee' category and tea_black
    // into 'tea' category, both with same hydration_source_kind 'coffee_tea'.
    const events: BreakdownEvent[] = [
      { meal_id: 'm1', beverage_kind: 'coffee_tea', beverage_catalog_slug: 'coffee_drip', volume_ml: 240 },
      { meal_id: 'm2', beverage_kind: 'coffee_tea', beverage_catalog_slug: 'tea_black', volume_ml: 240 },
    ];
    const result = aggregateBreakdown(events, CATALOG);
    const coffee = result.segments.find((s) => s.category === 'coffee')!;
    const tea = result.segments.find((s) => s.category === 'tea')!;
    expect(coffee.gross_ml).toBe(240);
    expect(tea.gross_ml).toBe(240);
  });

  it('puts milk segment effective above gross via 1.30 coefficient', () => {
    const events: BreakdownEvent[] = [
      { meal_id: 'm1', beverage_kind: 'dairy', beverage_catalog_slug: 'milk_whole', volume_ml: 240 },
    ];
    const result = aggregateBreakdown(events, CATALOG);
    const milk = result.segments.find((s) => s.category === 'milk')!;
    expect(milk.gross_ml).toBe(240);
    expect(milk.effective_ml).toBe(312);
  });
});

describe('Prompt 172e Phase D aggregateBreakdown legacy 170o (no slug)', () => {
  it('maps pure_water source kind to water category when slug is null', () => {
    const events: BreakdownEvent[] = [
      { meal_id: 'm1', beverage_kind: 'pure_water', beverage_catalog_slug: null, volume_ml: 500 },
    ];
    const result = aggregateBreakdown(events, CATALOG);
    const water = result.segments.find((s) => s.category === 'water')!;
    expect(water.gross_ml).toBe(500);
    expect(water.effective_ml).toBe(500);
  });

  it('maps both alcohol_low and alcohol_high to alcohol category', () => {
    const events: BreakdownEvent[] = [
      { meal_id: 'm1', beverage_kind: 'alcohol_low', beverage_catalog_slug: null, volume_ml: 355 },
      { meal_id: 'm2', beverage_kind: 'alcohol_high', beverage_catalog_slug: null, volume_ml: 148 },
    ];
    const result = aggregateBreakdown(events, CATALOG);
    const alcohol = result.segments.find((s) => s.category === 'alcohol')!;
    expect(alcohol.gross_ml).toBe(355 + 148);
  });

  it('maps high_water_food source kind to functional category', () => {
    const events: BreakdownEvent[] = [
      { meal_id: 'm1', beverage_kind: 'high_water_food', beverage_catalog_slug: null, volume_ml: 200 },
    ];
    const result = aggregateBreakdown(events, CATALOG);
    const functional = result.segments.find((s) => s.category === 'functional')!;
    expect(functional.gross_ml).toBe(200);
  });

  it('drops events with unknown beverage_kind that have no slug', () => {
    const events: BreakdownEvent[] = [
      { meal_id: 'm1', beverage_kind: 'unknown_future_kind', beverage_catalog_slug: null, volume_ml: 500 },
    ];
    const result = aggregateBreakdown(events, CATALOG);
    expect(result.total_gross_ml).toBe(0);
  });
});

describe('Prompt 172e Phase D aggregateBreakdown percentages', () => {
  it('reports 60 / 40 percent split for 600 ml water + 400 ml juice', () => {
    const events: BreakdownEvent[] = [
      { meal_id: 'm1', beverage_kind: 'pure_water', beverage_catalog_slug: 'water_still', volume_ml: 600 },
      { meal_id: 'm2', beverage_kind: 'juice_smoothie', beverage_catalog_slug: 'juice_orange', volume_ml: 400 },
    ];
    const result = aggregateBreakdown(events, CATALOG);
    const water = result.segments.find((s) => s.category === 'water')!;
    const juice = result.segments.find((s) => s.category === 'juice')!;
    expect(water.gross_pct).toBe(60);
    expect(juice.gross_pct).toBe(40);
    // effective: water 600 + juice 480 = 1080; water pct 600/1080 = 55.6%
    expect(water.effective_pct).toBe(55.6);
    expect(juice.effective_pct).toBe(44.4);
  });

  it('keeps zero ml categories at 0 percent across both axes', () => {
    const events: BreakdownEvent[] = [
      { meal_id: 'm1', beverage_kind: 'pure_water', beverage_catalog_slug: 'water_still', volume_ml: 500 },
    ];
    const result = aggregateBreakdown(events, CATALOG);
    for (const segment of result.segments) {
      if (segment.category === 'water') continue;
      expect(segment.gross_pct).toBe(0);
      expect(segment.effective_pct).toBe(0);
    }
  });
});

describe('Prompt 172e Phase D aggregateBreakdown determinism', () => {
  it('returns identical output for identical input across two calls', () => {
    const events: BreakdownEvent[] = [
      { meal_id: 'm1', beverage_kind: 'pure_water', beverage_catalog_slug: 'water_still', volume_ml: 500 },
      { meal_id: 'm2', beverage_kind: 'coffee_tea', beverage_catalog_slug: 'coffee_drip', volume_ml: 240 },
    ];
    const a = aggregateBreakdown(events, CATALOG);
    const b = aggregateBreakdown(events, CATALOG);
    expect(a).toEqual(b);
  });
});
