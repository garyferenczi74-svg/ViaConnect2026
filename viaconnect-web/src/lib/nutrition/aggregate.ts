// Prompt #164 Layer 3, rebuilt by Prompt 186: sum per-item nutrients into the
// final NutritionAnalysis shape that nutrition_logs persists. Pure. No I/O.
//
// Unknown handling (Prompt 186 / 177d data contract): an item nutrient that
// could not be extracted is null, never 0. A meal total is the sum of the
// KNOWN item values; it is null only when no item knows the nutrient. When
// some but not all items know a nutrient, the total is a partial sum and the
// nutrient is listed in nutrient_flags.partial so the UI can mark it
// estimated rather than presenting fake precision (the golden-meal defect
// displayed 2.5 g sugar as if known while the apple's sugar was missing).

import type { ParsedItem } from './parsed-meal-schema';
import type { NutritionAnalysis, DataSource } from './schema';
import type { ItemNutrientMeta } from './usda-client';

export interface AggregatedItemNutrients {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  total_fat_g: number | null;
  saturated_fat_g: number | null;
  trans_fat_g: number | null;
  omega3_g: number | null;
  sugar_g: number | null;
  fiber_g: number | null;
  sodium_mg?: number | null;
  cholesterol_mg?: number | null;
  source: 'usda' | 'gemini_fallback';
  meta?: ItemNutrientMeta;
}

export interface AggregatedItem {
  parsed: ParsedItem;
  nutrients: AggregatedItemNutrients;
}

const SUMMED_KEYS = [
  'calories',
  'protein_g',
  'carbs_g',
  'total_fat_g',
  'saturated_fat_g',
  'sugar_g',
  'fiber_g',
  'sodium_mg',
] as const;

type SummedKey = (typeof SUMMED_KEYS)[number];

function round1(n: number): number { return Math.round(n * 10) / 10; }

function sumKnown(items: AggregatedItem[], key: SummedKey): { total: number | null; unknownCount: number } {
  let seen = false;
  let total = 0;
  let unknownCount = 0;
  for (const item of items) {
    const v = item.nutrients[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      seen = true;
      total += v;
    } else {
      unknownCount += 1;
    }
  }
  return { total: seen ? total : null, unknownCount };
}

export function aggregate(items: AggregatedItem[]): NutritionAnalysis {
  if (items.length === 0) {
    return {
      calories: null, protein_g: null, carbs_g: null, total_fat_g: null,
      saturated_fat_g: null, sugar_g: null, fiber_g: null, sodium_mg: null,
      confidence: 0, ai_notes: 'No items identified.', serving_description: '',
      data_source: 'gemini_fallback',
      nutrient_flags: { partial: [], unknown: [...SUMMED_KEYS], downgraded: false },
    };
  }

  const sums = {} as Record<SummedKey, { total: number | null; unknownCount: number }>;
  for (const key of SUMMED_KEYS) sums[key] = sumKnown(items, key);

  const partial: string[] = [];
  const unknown: string[] = [];
  for (const key of SUMMED_KEYS) {
    if (sums[key].total === null) unknown.push(key);
    else if (sums[key].unknownCount > 0) partial.push(key);
  }

  // Portion-default or plausibility-flagged items downgrade the whole meal's
  // confidence (Prompt 186 Phase 2/3).
  const downgraded = items.some(
    (i) => i.nutrients.meta?.confidenceDowngraded === true || i.nutrients.meta?.plausibilityFlagged === true,
  );

  const usdaCount = items.filter((i) => i.nutrients.source === 'usda').length;
  const total = items.length;
  const baseConfidence = total === 0 ? 0 : usdaCount / total;
  const confidence = Math.round(baseConfidence * (downgraded ? 0.8 : 1) * 100) / 100;
  const data_source: DataSource =
    usdaCount === total ? 'usda' : usdaCount === 0 ? 'gemini_fallback' : 'mixed';

  const serving_description = items
    .map((i) => `${i.parsed.quantity} ${i.parsed.unit} ${i.parsed.name}`)
    .join(', ')
    .slice(0, 2000);

  const ai_notes =
    data_source === 'usda'
      ? `Nutrition data from USDA FoodData Central. ${total} ${total === 1 ? 'item' : 'items'} matched.`
      : data_source === 'mixed'
        ? `Nutrition data from USDA FoodData Central for ${usdaCount} of ${total} items. Others estimated.`
        : `Nutrition values estimated. These foods are not in the USDA database.`;

  const calories = sums.calories.total === null ? null : Math.round(sums.calories.total);

  return {
    calories,
    protein_g: sums.protein_g.total === null ? null : round1(sums.protein_g.total),
    carbs_g: sums.carbs_g.total === null ? null : round1(sums.carbs_g.total),
    total_fat_g: sums.total_fat_g.total === null ? null : round1(sums.total_fat_g.total),
    saturated_fat_g: sums.saturated_fat_g.total === null ? null : round1(sums.saturated_fat_g.total),
    sugar_g: sums.sugar_g.total === null ? null : round1(sums.sugar_g.total),
    fiber_g: sums.fiber_g.total === null ? null : round1(sums.fiber_g.total),
    sodium_mg: sums.sodium_mg.total === null ? null : round1(sums.sodium_mg.total),
    confidence,
    ai_notes,
    serving_description,
    data_source,
    nutrient_flags: { partial, unknown, downgraded },
  };
}
