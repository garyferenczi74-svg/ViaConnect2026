// Prompt 172e Phase D Workstream 1: pure breakdown aggregator.
//
// Spec section 10: "Beverage breakdown (new section): a today view showing
// composition of intake by category (for example a stacked bar or ring
// segment split such as water, coffee, juice), with gross fluid and
// effective hydration both shown. In safety mode this is composition only,
// no calorie or sugar tally."
//
// This module exposes a pure function aggregateBreakdown that takes the
// today meal_items (joined to the beverage_catalog at read time on the
// server, or merged client side) and produces the BreakdownData shape the
// BreakdownChart + BreakdownLegend render against. Pure, deterministic,
// fully unit testable; no Supabase reads, no clock reads, no env reads.
//
// 170c section 8 contract: the safety mode user sees the same nine
// category segments and the same percentages; only the absolute ml + kcal
// + sugar numerics are stripped at the legend layer. The aggregator
// itself runs identically in both modes; the suppression is downstream.

import type { BeverageCategory } from '../BeveragePicker/BeveragePicker.types';
import { BEVERAGE_CATEGORIES } from '../BeveragePicker/BeveragePicker.types';

/**
 * One row in the today event list that the aggregator consumes. Mirrors
 * the shape of GET /api/nutrition/hydration/today plus an optional
 * beverage_catalog_slug join from Phase C. When the slug is present and
 * the catalog row exists, the aggregator uses the catalog category +
 * hydration_coefficient; when the slug is absent (legacy 170o quick log
 * path), the aggregator falls back to mapping by hydration_source_kind.
 */
export interface BreakdownEvent {
  meal_id: string;
  beverage_kind: string;
  beverage_catalog_slug: string | null;
  volume_ml: number;
}

/**
 * The minimal catalog row shape the aggregator needs. Phase B already
 * defines the full row in BeveragePicker.types; the aggregator pins a
 * narrower contract so a downstream column drop on a non referenced
 * column does not break the breakdown.
 */
export interface BreakdownCatalogRow {
  slug: string;
  category: BeverageCategory;
  hydration_source_kind: string;
  hydration_coefficient: number;
}

export interface BreakdownCategorySegment {
  category: BeverageCategory;
  gross_ml: number;
  effective_ml: number;
  gross_pct: number;
  effective_pct: number;
}

export interface BreakdownData {
  total_gross_ml: number;
  total_effective_ml: number;
  segments: ReadonlyArray<BreakdownCategorySegment>;
}

/**
 * Map a 170o hydration_source_kind to a 172e BeverageCategory for the
 * legacy quick log buttons that have no catalog slug. The 9 source kinds
 * collapse to the 9 categories cleanly with one caveat: high_water_food
 * is not one of the nine UI categories; it falls under functional in the
 * breakdown so a "fruit eaten for hydration" entry has a home. The
 * picker itself does not surface high_water_food (it is a meal save
 * derived signal, not a beverage choice), so this branch fires only on
 * historical rows.
 */
const KIND_TO_CATEGORY: Record<string, BeverageCategory> = {
  pure_water: 'water',
  coffee_tea: 'coffee',
  juice_smoothie: 'juice',
  dairy: 'milk',
  soda: 'pop',
  alcohol_low: 'alcohol',
  alcohol_high: 'alcohol',
  sports_drink: 'sports_energy',
  high_water_food: 'functional',
};

function categoryForEvent(
  event: BreakdownEvent,
  catalogBySlug: Map<string, BreakdownCatalogRow>,
): BeverageCategory | null {
  if (event.beverage_catalog_slug) {
    const row = catalogBySlug.get(event.beverage_catalog_slug);
    if (row) return row.category;
  }
  return KIND_TO_CATEGORY[event.beverage_kind] ?? null;
}

function coefficientForEvent(
  event: BreakdownEvent,
  catalogBySlug: Map<string, BreakdownCatalogRow>,
  catalogByKind: Map<string, BreakdownCatalogRow>,
): number {
  if (event.beverage_catalog_slug) {
    const row = catalogBySlug.get(event.beverage_catalog_slug);
    if (row) return row.hydration_coefficient;
  }
  // Legacy 170o quick log: derive coefficient from the first catalog row
  // matching the source kind. This is a defensive fallback; the 170o
  // adjusted ratio table already lives in hydration-ml-computer for the
  // ring math, and the breakdown surface only needs a category split.
  const row = catalogByKind.get(event.beverage_kind);
  if (row) return row.hydration_coefficient;
  return 1.0;
}

function emptySegments(): BreakdownCategorySegment[] {
  return BEVERAGE_CATEGORIES.map((category) => ({
    category,
    gross_ml: 0,
    effective_ml: 0,
    gross_pct: 0,
    effective_pct: 0,
  }));
}

/**
 * Aggregate today's hydration events into a nine category breakdown.
 *
 * Math:
 *   - segment.gross_ml = sum of volume_ml for events in the category
 *   - segment.effective_ml = sum of (volume_ml * hydration_coefficient)
 *   - segment.gross_pct = gross_ml / total_gross_ml (0 when total is 0)
 *   - segment.effective_pct = effective_ml / total_effective_ml
 *
 * Order: segments come back in the canonical BEVERAGE_CATEGORIES order so
 * the chart bar segments and the legend chips render in a stable left to
 * right sequence. Zero ml segments are included so the chart bar layout
 * is stable across days and the legend lists every category (the UI hides
 * zero rows from the legend at render time per spec section 10 quiet
 * styling).
 *
 * Rounding: gross_ml + effective_ml are rounded to the nearest mL so the
 * sum across segments equals the displayed total. Percentages are
 * computed on the unrounded values then rounded to one decimal so small
 * categories never disappear to 0 percent when they are non zero.
 */
export function aggregateBreakdown(
  events: ReadonlyArray<BreakdownEvent>,
  catalog: ReadonlyArray<BreakdownCatalogRow>,
): BreakdownData {
  const catalogBySlug = new Map<string, BreakdownCatalogRow>();
  for (const row of catalog) {
    catalogBySlug.set(row.slug, row);
  }
  // First match per source kind wins; the catalog is sorted by sort_order
  // ascending so the canonical default beverage for the kind comes first.
  const catalogByKind = new Map<string, BreakdownCatalogRow>();
  for (const row of catalog) {
    if (!catalogByKind.has(row.hydration_source_kind)) {
      catalogByKind.set(row.hydration_source_kind, row);
    }
  }

  const grossByCategory = new Map<BeverageCategory, number>();
  const effectiveByCategory = new Map<BeverageCategory, number>();
  for (const cat of BEVERAGE_CATEGORIES) {
    grossByCategory.set(cat, 0);
    effectiveByCategory.set(cat, 0);
  }

  let totalGross = 0;
  let totalEffective = 0;

  for (const event of events) {
    const volume = Number(event.volume_ml);
    if (!Number.isFinite(volume) || volume <= 0) continue;
    const category = categoryForEvent(event, catalogBySlug);
    if (!category) continue;
    const coefficient = coefficientForEvent(event, catalogBySlug, catalogByKind);
    const effective = volume * (Number.isFinite(coefficient) ? coefficient : 1);

    grossByCategory.set(category, (grossByCategory.get(category) ?? 0) + volume);
    effectiveByCategory.set(category, (effectiveByCategory.get(category) ?? 0) + effective);
    totalGross += volume;
    totalEffective += effective;
  }

  if (totalGross === 0 && totalEffective === 0) {
    return {
      total_gross_ml: 0,
      total_effective_ml: 0,
      segments: emptySegments(),
    };
  }

  const segments: BreakdownCategorySegment[] = BEVERAGE_CATEGORIES.map((category) => {
    const gross = grossByCategory.get(category) ?? 0;
    const effective = effectiveByCategory.get(category) ?? 0;
    return {
      category,
      gross_ml: Math.round(gross),
      effective_ml: Math.round(effective),
      gross_pct: totalGross > 0 ? Math.round((gross / totalGross) * 1000) / 10 : 0,
      effective_pct: totalEffective > 0 ? Math.round((effective / totalEffective) * 1000) / 10 : 0,
    };
  });

  return {
    total_gross_ml: Math.round(totalGross),
    total_effective_ml: Math.round(totalEffective),
    segments,
  };
}
