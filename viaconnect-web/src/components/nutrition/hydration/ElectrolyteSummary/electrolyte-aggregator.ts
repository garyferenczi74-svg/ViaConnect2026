// Prompt 172e Phase D Workstream 3: pure electrolyte aggregator.
//
// Spec section 10: "Electrolyte summary (from the catalog and 17a): a
// quiet line summarizing sodium, potassium, and magnesium from beverages
// for the day. Suppressed numerically in safety mode."
//
// Sums per row contributions where the row has a beverage_catalog_slug
// join. Each catalog row carries sodium_mg + potassium_mg + magnesium_mg
// per serving at default_volume_ml; the aggregator scales by the logged
// volume ratio so a 480 ml coffee contributes 2x the per serving value.
//
// 170c section 8 contract: aggregator runs identically in both modes;
// the absolute mg numbers are suppressed at the ElectrolyteSummary
// component layer per the safety mode microcopy variant.

import type { BeverageCategory } from '../BeveragePicker/BeveragePicker.types';

export interface ElectrolyteEvent {
  meal_id: string;
  beverage_catalog_slug: string | null;
  volume_ml: number;
}

export interface ElectrolyteCatalogRow {
  slug: string;
  category: BeverageCategory;
  default_volume_ml: number;
  sodium_mg: number;
  potassium_mg: number;
  magnesium_mg: number;
}

export interface ElectrolyteTotals {
  sodium_mg: number;
  potassium_mg: number;
  magnesium_mg: number;
  contributing_event_count: number;
}

/**
 * Sum sodium, potassium, magnesium across today's beverage events. Only
 * rows with a beverage_catalog_slug that resolves to a catalog row
 * contribute; legacy 170o quick log entries without a slug carry no
 * electrolyte attribution because the source kind cannot disambiguate
 * (e.g. plain coffee carries trace minerals; a coconut water carries
 * meaningful potassium; the source kind coffee_tea cannot distinguish).
 *
 * Math:
 *   per row contribution = (row.{mineral}_mg) * (volume_ml / default_volume_ml)
 *   total = sum across all events
 *
 * Rounding: each mineral total is rounded to the nearest whole mg.
 *
 * Pure function: no Supabase reads, no clock reads, no env reads.
 */
export function aggregateElectrolytes(
  events: ReadonlyArray<ElectrolyteEvent>,
  catalog: ReadonlyArray<ElectrolyteCatalogRow>,
): ElectrolyteTotals {
  const bySlug = new Map<string, ElectrolyteCatalogRow>();
  for (const row of catalog) {
    bySlug.set(row.slug, row);
  }

  let sodium = 0;
  let potassium = 0;
  let magnesium = 0;
  let count = 0;

  for (const event of events) {
    const volume = Number(event.volume_ml);
    if (!Number.isFinite(volume) || volume <= 0) continue;
    if (!event.beverage_catalog_slug) continue;
    const row = bySlug.get(event.beverage_catalog_slug);
    if (!row) continue;
    const defaultVolume = Number(row.default_volume_ml);
    if (!Number.isFinite(defaultVolume) || defaultVolume <= 0) continue;
    const scale = volume / defaultVolume;
    sodium += Number(row.sodium_mg ?? 0) * scale;
    potassium += Number(row.potassium_mg ?? 0) * scale;
    magnesium += Number(row.magnesium_mg ?? 0) * scale;
    count += 1;
  }

  return {
    sodium_mg: Math.round(sodium),
    potassium_mg: Math.round(potassium),
    magnesium_mg: Math.round(magnesium),
    contributing_event_count: count,
  };
}

/**
 * Whether the electrolyte summary should render at all. Returns false
 * when there is nothing to summarize (no contributing events, or every
 * mineral is zero), so the component can hide the line entirely instead
 * of rendering "0 mg sodium, 0 mg potassium, 0 mg magnesium." which
 * reads as a clinical assertion of insufficiency.
 */
export function hasElectrolyteSummary(totals: ElectrolyteTotals): boolean {
  if (totals.contributing_event_count === 0) return false;
  return totals.sodium_mg > 0 || totals.potassium_mg > 0 || totals.magnesium_mg > 0;
}
