// Prompt 172e Phase D Workstream 3: electrolyte aggregator pure helper tests.
//
// Spec section 10 + 7: sums sodium, potassium, magnesium from beverage
// catalog rows joined via beverage_catalog_slug, scaled by logged volume.
// Pure function so the test suite reads identical math the UI does.

import { describe, it, expect } from 'vitest';
import {
  aggregateElectrolytes,
  hasElectrolyteSummary,
  type ElectrolyteCatalogRow,
  type ElectrolyteEvent,
} from '../electrolyte-aggregator';

const CATALOG: ReadonlyArray<ElectrolyteCatalogRow> = [
  // Still water: trace minerals
  { slug: 'water_still', category: 'water', default_volume_ml: 240, sodium_mg: 5, potassium_mg: 0, magnesium_mg: 0 },
  // Coconut water: notable potassium
  { slug: 'water_coconut', category: 'water', default_volume_ml: 330, sodium_mg: 70, potassium_mg: 600, magnesium_mg: 60 },
  // ORS: high sodium + potassium
  { slug: 'ors_standard', category: 'sports_energy', default_volume_ml: 500, sodium_mg: 750, potassium_mg: 750, magnesium_mg: 0 },
  // Whole milk: small potassium + magnesium
  { slug: 'milk_whole', category: 'milk', default_volume_ml: 240, sodium_mg: 105, potassium_mg: 322, magnesium_mg: 24 },
  // Coffee: trace minerals
  { slug: 'coffee_drip', category: 'coffee', default_volume_ml: 240, sodium_mg: 5, potassium_mg: 116, magnesium_mg: 7 },
];

describe('Prompt 172e Phase D aggregateElectrolytes empty cases', () => {
  it('returns zero totals with zero count for empty events', () => {
    const result = aggregateElectrolytes([], CATALOG);
    expect(result).toEqual({
      sodium_mg: 0,
      potassium_mg: 0,
      magnesium_mg: 0,
      contributing_event_count: 0,
    });
  });

  it('drops events without a beverage_catalog_slug (legacy 170o quick log)', () => {
    const events: ElectrolyteEvent[] = [
      { meal_id: 'm1', beverage_catalog_slug: null, volume_ml: 500 },
    ];
    const result = aggregateElectrolytes(events, CATALOG);
    expect(result.contributing_event_count).toBe(0);
    expect(result.sodium_mg).toBe(0);
  });

  it('drops events with unknown slug not present in catalog', () => {
    const events: ElectrolyteEvent[] = [
      { meal_id: 'm1', beverage_catalog_slug: 'unknown_slug', volume_ml: 500 },
    ];
    const result = aggregateElectrolytes(events, CATALOG);
    expect(result.contributing_event_count).toBe(0);
  });

  it('drops events with non finite or non positive volume_ml', () => {
    const events: ElectrolyteEvent[] = [
      { meal_id: 'm1', beverage_catalog_slug: 'water_still', volume_ml: 0 },
      { meal_id: 'm2', beverage_catalog_slug: 'water_still', volume_ml: -100 },
      { meal_id: 'm3', beverage_catalog_slug: 'water_still', volume_ml: Number.NaN },
    ];
    const result = aggregateElectrolytes(events, CATALOG);
    expect(result.contributing_event_count).toBe(0);
  });
});

describe('Prompt 172e Phase D aggregateElectrolytes single beverage cases', () => {
  it('coconut water 330 ml contributes 70 mg sodium, 600 mg potassium, 60 mg magnesium', () => {
    const events: ElectrolyteEvent[] = [
      { meal_id: 'm1', beverage_catalog_slug: 'water_coconut', volume_ml: 330 },
    ];
    const result = aggregateElectrolytes(events, CATALOG);
    expect(result.sodium_mg).toBe(70);
    expect(result.potassium_mg).toBe(600);
    expect(result.magnesium_mg).toBe(60);
    expect(result.contributing_event_count).toBe(1);
  });

  it('coconut water 660 ml (double serving) contributes 2x electrolytes', () => {
    const events: ElectrolyteEvent[] = [
      { meal_id: 'm1', beverage_catalog_slug: 'water_coconut', volume_ml: 660 },
    ];
    const result = aggregateElectrolytes(events, CATALOG);
    expect(result.sodium_mg).toBe(140);
    expect(result.potassium_mg).toBe(1200);
    expect(result.magnesium_mg).toBe(120);
  });

  it('ORS 500 ml at default 500 ml contributes 750 mg sodium + 750 mg potassium', () => {
    const events: ElectrolyteEvent[] = [
      { meal_id: 'm1', beverage_catalog_slug: 'ors_standard', volume_ml: 500 },
    ];
    const result = aggregateElectrolytes(events, CATALOG);
    expect(result.sodium_mg).toBe(750);
    expect(result.potassium_mg).toBe(750);
    expect(result.magnesium_mg).toBe(0);
  });
});

describe('Prompt 172e Phase D aggregateElectrolytes multi beverage sum', () => {
  it('coffee 240 + milk 240 + coconut 330 sums sodium 5 + 105 + 70 = 180', () => {
    const events: ElectrolyteEvent[] = [
      { meal_id: 'm1', beverage_catalog_slug: 'coffee_drip', volume_ml: 240 },
      { meal_id: 'm2', beverage_catalog_slug: 'milk_whole', volume_ml: 240 },
      { meal_id: 'm3', beverage_catalog_slug: 'water_coconut', volume_ml: 330 },
    ];
    const result = aggregateElectrolytes(events, CATALOG);
    expect(result.sodium_mg).toBe(180);
    // potassium: 116 + 322 + 600 = 1038
    expect(result.potassium_mg).toBe(1038);
    // magnesium: 7 + 24 + 60 = 91
    expect(result.magnesium_mg).toBe(91);
    expect(result.contributing_event_count).toBe(3);
  });

  it('mixed slug + null events contribute only the slug rows', () => {
    const events: ElectrolyteEvent[] = [
      { meal_id: 'm1', beverage_catalog_slug: 'water_coconut', volume_ml: 330 },
      { meal_id: 'm2', beverage_catalog_slug: null, volume_ml: 500 },
    ];
    const result = aggregateElectrolytes(events, CATALOG);
    expect(result.sodium_mg).toBe(70);
    expect(result.contributing_event_count).toBe(1);
  });
});

describe('Prompt 172e Phase D hasElectrolyteSummary', () => {
  it('returns false for zero count', () => {
    expect(
      hasElectrolyteSummary({
        sodium_mg: 0,
        potassium_mg: 0,
        magnesium_mg: 0,
        contributing_event_count: 0,
      }),
    ).toBe(false);
  });

  it('returns false when all three minerals are zero even with positive count', () => {
    // Edge case: an unrecognized future beverage with all zeros in the
    // catalog. The summary should hide rather than render zeros that
    // read as a clinical assertion of insufficiency.
    expect(
      hasElectrolyteSummary({
        sodium_mg: 0,
        potassium_mg: 0,
        magnesium_mg: 0,
        contributing_event_count: 1,
      }),
    ).toBe(false);
  });

  it('returns true when any mineral is positive with positive count', () => {
    expect(
      hasElectrolyteSummary({
        sodium_mg: 1,
        potassium_mg: 0,
        magnesium_mg: 0,
        contributing_event_count: 1,
      }),
    ).toBe(true);
    expect(
      hasElectrolyteSummary({
        sodium_mg: 0,
        potassium_mg: 100,
        magnesium_mg: 0,
        contributing_event_count: 1,
      }),
    ).toBe(true);
  });
});

describe('Prompt 172e Phase D aggregateElectrolytes determinism', () => {
  it('returns identical output for identical input across two calls', () => {
    const events: ElectrolyteEvent[] = [
      { meal_id: 'm1', beverage_catalog_slug: 'water_coconut', volume_ml: 330 },
      { meal_id: 'm2', beverage_catalog_slug: 'milk_whole', volume_ml: 240 },
    ];
    const a = aggregateElectrolytes(events, CATALOG);
    const b = aggregateElectrolytes(events, CATALOG);
    expect(a).toEqual(b);
  });
});
