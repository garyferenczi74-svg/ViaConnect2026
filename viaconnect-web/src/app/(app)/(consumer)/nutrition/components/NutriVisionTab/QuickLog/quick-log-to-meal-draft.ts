// Prompt 170m Phase C: map QuickLogParseResult into the existing MealDraft
// shape so the ReviewingSurface render path is identical across photo, barcode,
// and quick-log entry. Macros stay at zero in v1; the user resolves them via
// the existing FoodSearchDropdown swap affordance on the review screen, which
// hydrates per_100g and recomputes totals on portion change. The cascade
// integration (auto-resolve macros after parse) is filed as a Phase D refinement.

import type { QuickLogParseResult } from '@/lib/nutrition/quick-log/types';
import type {
  MealDraft,
  MealItemDraft,
  MealTotals,
} from '../types';
import { classifyConfidence } from '../types';

const EMPTY_PER_100G = {
  calories_kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  sugar_g: 0,
  sodium_mg: 0,
};

const EMPTY_TOTALS: MealTotals = {
  calories_kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  sugar_g: 0,
  sodium_mg: 0,
  cholesterol_mg: 0,
};

export function quickLogToMealDraft(parse: QuickLogParseResult): MealDraft {
  const items: MealItemDraft[] = parse.meal_items.map((it, idx) => ({
    id: `quick-log-item-${Date.now().toString(36)}-${idx}`,
    food_name: it.food_name,
    portion_grams: it.portion_grams,
    nutrient_source: 'user_entered',
    per_100g: { ...EMPTY_PER_100G },
    calories_kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
    cholesterol_mg: 0,
    cooking_method: it.cooking_method ?? undefined,
    user_modified: false,
    confidence_band: classifyConfidence(it.confidence),
    recognition_confidence: it.confidence,
    caffeine_mg: typeof it.caffeine_mg === 'number' && it.caffeine_mg > 0 ? it.caffeine_mg : undefined,
  }));

  return {
    id: `quick-log-meal-${Date.now().toString(36)}`,
    items,
    totals: { ...EMPTY_TOTALS },
    meal_confidence: parse.meal_items.length > 0
      ? parse.meal_items.reduce((sum, it) => sum + it.confidence, 0) / parse.meal_items.length
      : 0.5,
    warnings: [],
    credit_card_detected: true,
  };
}
