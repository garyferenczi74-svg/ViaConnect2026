/**
 * Prompt 170l Phase 1c-2: convert an OFF lookup result into a MealItemDraft
 * that drops cleanly into useMealItemEdits + the existing review surface.
 *
 * Portion math: OFF reports macros per 100g. Serving size (when known) is a
 * string like "170 g". When unknown we default to 100g. The user's portion
 * multiplier (0.5x / 1x / 2x etc.) scales serving_size_g, not 100g.
 */

import type { OFFProduct } from '@/lib/nutrition/barcode/types';
import type {
  MealItemDraft,
  FoodSwapPer100g,
  ConfidenceBand,
} from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';

const SERVING_SIZE_GRAMS_REGEX = /(\d+(?:\.\d+)?)\s*g/i;
const DEFAULT_PORTION_GRAMS = 100;

function parseServingSizeGrams(servingSize: string | null): number | null {
  if (servingSize === null) return null;
  const m = SERVING_SIZE_GRAMS_REGEX.exec(servingSize);
  if (!m) return null;
  const n = Number.parseFloat(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function safeNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function nutrimentsToPer100g(
  nutriments: Record<string, number> | null,
): FoodSwapPer100g | null {
  if (nutriments === null) return null;
  const calories = safeNumber(nutriments['energy-kcal_100g']);
  if (calories === null) return null;
  const protein = safeNumber(nutriments['proteins_100g']) ?? 0;
  const carbs = safeNumber(nutriments['carbohydrates_100g']) ?? 0;
  const fat = safeNumber(nutriments['fat_100g']) ?? 0;
  const per100g: FoodSwapPer100g = {
    calories_kcal: calories,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
  };
  const fiber = safeNumber(nutriments['fiber_100g']);
  if (fiber !== null) per100g.fiber_g = fiber;
  const sugar = safeNumber(nutriments['sugars_100g']);
  if (sugar !== null) per100g.sugar_g = sugar;
  // OFF stores sodium in grams; surface mg here.
  const sodiumG = safeNumber(nutriments['sodium_100g']);
  if (sodiumG !== null) per100g.sodium_mg = sodiumG * 1000;
  return per100g;
}

function isNovaGroup(n: number | null): n is 1 | 2 | 3 | 4 {
  return n === 1 || n === 2 || n === 3 || n === 4;
}

function isNutriScoreGrade(s: string | null): s is 'a' | 'b' | 'c' | 'd' | 'e' {
  return s === 'a' || s === 'b' || s === 'c' || s === 'd' || s === 'e';
}

function generateClientId(): string {
  return `barcode-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface ConvertOFFOptions {
  /** Multiplier the user picked on the portion quick chips. Default 1x. */
  portionMultiplier?: number;
  /** Override the serving size in grams if OFF lacks it or user set custom. */
  servingSizeOverrideG?: number;
  /** Confidence band defaults to 'high' for barcode-keyed lookups. */
  confidenceBand?: ConfidenceBand;
}

export function convertOFFProductToMealItemDraft(
  product: OFFProduct,
  opts: ConvertOFFOptions = {},
): MealItemDraft | null {
  const per100g = nutrimentsToPer100g(product.nutriments);
  if (per100g === null) return null;

  const multiplier = opts.portionMultiplier ?? 1;
  const servingSizeG =
    opts.servingSizeOverrideG
    ?? parseServingSizeGrams(product.serving_size)
    ?? DEFAULT_PORTION_GRAMS;
  const portionGrams = Math.max(1, Math.round(servingSizeG * multiplier));
  const ratio = portionGrams / 100;

  const draft: MealItemDraft = {
    id: generateClientId(),
    food_name: product.product_name ?? product.code,
    nutrient_source: 'open_food_facts',
    off_barcode: product.code,
    from_barcode_scan: true,
    per_100g: per100g,
    portion_grams: portionGrams,
    calories_kcal: Math.round(per100g.calories_kcal * ratio),
    protein_g: Number((per100g.protein_g * ratio).toFixed(1)),
    carbs_g: Number((per100g.carbs_g * ratio).toFixed(1)),
    fat_g: Number((per100g.fat_g * ratio).toFixed(1)),
    user_modified: false,
    confidence_band: opts.confidenceBand ?? 'high',
  };

  if (per100g.fiber_g !== undefined) {
    draft.fiber_g = Number((per100g.fiber_g * ratio).toFixed(1));
  }
  if (per100g.sugar_g !== undefined) {
    draft.sugar_g = Number((per100g.sugar_g * ratio).toFixed(1));
  }
  if (per100g.sodium_mg !== undefined) {
    draft.sodium_mg = Math.round(per100g.sodium_mg * ratio);
  }

  if (product.product_name !== null) draft.off_product_name = product.product_name;
  if (product.brands !== null) draft.off_brand = product.brands;
  const ssg = parseServingSizeGrams(product.serving_size);
  if (ssg !== null) draft.off_serving_size_g = ssg;
  if (product.completeness !== null) draft.off_completeness_score = product.completeness;
  if (isNovaGroup(product.nova_group)) draft.off_nova_group = product.nova_group;
  if (isNutriScoreGrade(product.nutriscore_grade)) {
    draft.off_nutrition_grade_fr = product.nutriscore_grade;
  }

  return draft;
}

/**
 * Recalc derived macros against a new portion_grams. Used by the portion
 * quick-chip selector on the product confirmation screen.
 */
export function rescalePortion(
  draft: MealItemDraft,
  portionGrams: number,
): MealItemDraft {
  const safeGrams = Math.max(1, Math.round(portionGrams));
  const ratio = safeGrams / 100;
  const updated: MealItemDraft = {
    ...draft,
    portion_grams: safeGrams,
    calories_kcal: Math.round(draft.per_100g.calories_kcal * ratio),
    protein_g: Number((draft.per_100g.protein_g * ratio).toFixed(1)),
    carbs_g: Number((draft.per_100g.carbs_g * ratio).toFixed(1)),
    fat_g: Number((draft.per_100g.fat_g * ratio).toFixed(1)),
  };
  if (draft.per_100g.fiber_g !== undefined) {
    updated.fiber_g = Number((draft.per_100g.fiber_g * ratio).toFixed(1));
  }
  if (draft.per_100g.sugar_g !== undefined) {
    updated.sugar_g = Number((draft.per_100g.sugar_g * ratio).toFixed(1));
  }
  if (draft.per_100g.sodium_mg !== undefined) {
    updated.sodium_mg = Math.round(draft.per_100g.sodium_mg * ratio);
  }
  return updated;
}

export function buildBlankSlateDraft(barcode: string): MealItemDraft {
  // 170l Phase 1c-2 NotFoundFallback path: user enters macros manually.
  // Zero per_100g + zero macros; user fills via MacroEditPanel.
  return {
    id: generateClientId(),
    food_name: `Packaged food (${barcode})`,
    nutrient_source: 'user_entered',
    off_barcode: barcode,
    from_barcode_scan: true,
    user_overrode_macros: true,
    per_100g: { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    portion_grams: 100,
    calories_kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    user_modified: true,
    confidence_band: 'low',
  };
}
