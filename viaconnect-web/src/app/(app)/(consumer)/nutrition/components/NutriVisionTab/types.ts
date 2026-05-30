// Prompt #170 Phase 1l: NutriVisionTab local component types.
//
// These types live next to the UI tree because they describe the shape the
// /api/nutrition/photo/analyze response is normalized into for client edits.
// The save payload still validates against NutriVisionMealInsertSchema from
// @/lib/nutrition/meals-insert-schema; this file mirrors that contract with
// component-friendly defaults (everything optional that the analyze route
// can omit).
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import type { CookingOilSelection } from '@/lib/nutrition/cooking-oil/types';

export type RecognitionProvider = 'logmeal' | 'gemini' | 'claude_vision';

export type NutrientSource =
  | 'farmceutica_curated'
  | 'usda_fdc'
  | 'open_food_facts'
  | 'vision_provider'
  | 'user_entered';

export type ConfidenceBand = 'high' | 'medium' | 'low';

export type Phase =
  | 'idle'
  | 'capturing'
  | 'analyzing'
  | 'reviewing'
  | 'saving'
  | 'confirmed'
  // #170a supplement §20.1: analysis failures land on a structured error card
  // instead of a toast. The error phase preserves the captured photo + lets
  // the user retry, log manually, or discard.
  | 'error'
  // Prompt 170l Phase 1c-2: barcode entry path phases.
  //   scanning            barcode scanner overlay active (Hannah 11.2)
  //   product_confirm     OFF product confirmation screen (Hannah 11.4)
  //   product_not_found   OFF lookup miss fallback (Hannah 11.5)
  | 'scanning'
  | 'product_confirm'
  | 'product_not_found';

export type ProgressStage = 'reading' | 'portions' | 'nutrients' | 'idle';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FoodSwapPer100g {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

export interface FoodSwapReplacement {
  name: string;
  nutrient_source: NutrientSource;
  usda_fdc_id?: number;
  off_barcode?: string;
  curated_food_id?: string;
  per_100g: FoodSwapPer100g;
}

export interface CookingOilSuggestion {
  type: string;
  amount_ml: number;
  reasoning: string;
}

export interface MealItemDraft {
  id: string;
  food_name: string;
  cuisine_tag?: string;
  bounding_box?: BoundingBox;
  recognition_provider?: RecognitionProvider;
  recognition_confidence?: number;
  portion_grams: number;
  portion_volume_ml?: number;
  portion_estimation_method?:
    | 'lidar'
    | 'arcore'
    | 'reference_object'
    | 'vision_inference'
    | 'user_override'
    | 'unknown';
  nutrient_source: NutrientSource;
  usda_fdc_id?: number;
  off_barcode?: string;
  // Prompt 170l Phase 1c-2: OFF-derived metadata when this item came from a
  // barcode scan. from_barcode_scan drives the "Scanned" chip on the result
  // review card (Hannah 11.7).
  from_barcode_scan?: boolean;
  off_product_name?: string;
  off_brand?: string;
  off_serving_size_g?: number;
  off_completeness_score?: number;
  off_nova_group?: number;
  off_nutrition_grade_fr?: 'a' | 'b' | 'c' | 'd' | 'e';
  user_overrode_macros?: boolean;
  curated_food_id?: string;
  // Per-100g composition kept on the draft so the client can recalculate
  // macros on portion change without another API round trip. Hydrated from
  // the analyze response by deriving per_100g = current / portion_grams * 100.
  per_100g: FoodSwapPer100g;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  cholesterol_mg?: number;
  micronutrients?: Record<string, number>;
  cooking_method?: string;
  cooking_oil?: CookingOilSelection;
  cooking_oil_suggestion?: CookingOilSuggestion;
  user_modified: boolean;
  confidence_band: ConfidenceBand;
}

export interface MealTotals {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  cholesterol_mg: number;
}

// Prompt #170a supplement §17.2: PlateSelectorKind mirrors the lib enum
// subset that the UI lets the user pick. Kept inline so the component file
// does not need to re-import from lib/portion/types just to type the draft.
export type PlateSelectorKind = 'plate_8in' | 'plate_10in' | 'plate_12in';

export interface MealDraft {
  id: string;
  source_photo_blob_id?: string;
  thumbnail_url?: string;
  items: MealItemDraft[];
  totals: MealTotals;
  meal_confidence: number;
  recognition_provider_primary?: RecognitionProvider;
  recognition_provider_secondary?: RecognitionProvider;
  warnings: string[];
  // #170a supplement §17.2: server-side flag from analyze response. When the
  // vision pass detected a credit card we skip the plate selector entirely.
  // Optional so older response shapes still type-check.
  credit_card_detected?: boolean;
  // #170a supplement §17.2: per-meal plate-size choice. Stamped on the meal
  // payload when the user picks a chip and rides the meal_logs row.
  plate_size?: PlateSelectorKind;
}

export interface EditDiff {
  itemsAdded: number;
  itemsRemoved: number;
  itemsModified: number;
  oilSelections: number;
  portionChanges: number;
}

export interface RecentMealSummary {
  meal_id: string;
  logged_at: string;
  meal_type: MealType;
  calories_kcal: number;
  thumbnail_url?: string;
  item_count: number;
}

export interface SaveResponse {
  meal_id: string;
  gordon: {
    bio_optimization_delta: number | null;
    copy: string | null;
    quality_score: number;
    quality_tier: string;
  };
  dashboard_crossover: {
    nutrition_dimension_recompute_queued: boolean;
  };
  helix_events_emitted: ReadonlyArray<string>;
  corpus_row_written: boolean;
  requestId: string;
}

// Modifier chips per spec §10.5. Whole meal additions vs per-item swaps.
export type ModifierChip =
  | 'butter'
  | 'cream'
  | 'cheese'
  | 'sauce'
  | 'grilled'
  | 'baked'
  | 'raw';

// Prompt #170 Phase 1q hotfix 10 (#170a supplement §18): thresholds raised
// from 0.75/0.5 to 0.85/0.55 to match supplement spec. Env-configurable so
// they can be tuned post-launch without a redeploy. NEXT_PUBLIC_ prefix
// required because this module is imported by client components.
const HIGH_THRESHOLD =
  Number(process.env.NEXT_PUBLIC_NUTRIVISION_CONFIDENCE_HIGH_THRESHOLD) || 0.85;
const MEDIUM_THRESHOLD =
  Number(process.env.NEXT_PUBLIC_NUTRIVISION_CONFIDENCE_MEDIUM_THRESHOLD) || 0.55;

export function classifyConfidence(score: number | undefined): ConfidenceBand {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'medium';
  if (score >= HIGH_THRESHOLD) return 'high';
  if (score >= MEDIUM_THRESHOLD) return 'medium';
  return 'low';
}

export function detectMealTypeForNow(d: Date = new Date()): MealType {
  const minutes = d.getHours() * 60 + d.getMinutes();
  // 04:00 to 10:30 breakfast
  if (minutes >= 4 * 60 && minutes < 10 * 60 + 30) return 'breakfast';
  // 10:30 to 15:00 lunch
  if (minutes >= 10 * 60 + 30 && minutes < 15 * 60) return 'lunch';
  // 15:00 to 21:00 dinner
  if (minutes >= 15 * 60 && minutes < 21 * 60) return 'dinner';
  // 21:00 to 04:00 snack
  return 'snack';
}
