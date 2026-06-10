// Prompt #164 Layer 3: sum per-item nutrients into the final NutritionAnalysis
// shape that nutrition_logs persists. Pure. No I/O.

import type { ParsedItem } from './parsed-meal-schema';
import type { NutritionAnalysis, DataSource } from './schema';

export interface AggregatedItem {
  parsed: ParsedItem;
  nutrients: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    total_fat_g: number;
    saturated_fat_g: number;
    trans_fat_g: number;
    omega3_g: number;
    sugar_g: number;
    fiber_g: number;
    source: 'usda' | 'gemini_fallback';
  };
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function sum(xs: number[]): number { return xs.reduce((a, b) => a + b, 0); }

export function aggregate(items: AggregatedItem[]): NutritionAnalysis {
  if (items.length === 0) {
    return {
      calories: 0, protein_g: 0, carbs_g: 0, total_fat_g: 0,
      saturated_fat_g: 0, sugar_g: 0, fiber_g: 0,
      confidence: 0, ai_notes: 'No items identified.', serving_description: '',
      data_source: 'gemini_fallback',
    };
  }

  const calories = Math.round(sum(items.map((i) => i.nutrients.calories)));
  const protein_g = round1(sum(items.map((i) => i.nutrients.protein_g)));
  const carbs_g = round1(sum(items.map((i) => i.nutrients.carbs_g)));
  const total_fat_g = round1(sum(items.map((i) => i.nutrients.total_fat_g)));
  const saturated_fat_g = round1(sum(items.map((i) => i.nutrients.saturated_fat_g)));
  const sugar_g = round1(sum(items.map((i) => i.nutrients.sugar_g)));
  const fiber_g = round1(sum(items.map((i) => i.nutrients.fiber_g)));

  const usdaCount = items.filter((i) => i.nutrients.source === 'usda').length;
  const total = items.length;
  const confidence = total === 0 ? 0 : Math.round((usdaCount / total) * 100) / 100;
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

  return {
    calories,
    protein_g,
    carbs_g,
    total_fat_g,
    saturated_fat_g,
    sugar_g,
    fiber_g,
    confidence,
    ai_notes,
    serving_description,
    data_source,
  };
}
