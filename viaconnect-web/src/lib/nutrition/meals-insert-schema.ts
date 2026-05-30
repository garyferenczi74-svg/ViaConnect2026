// Prompt #168d: Zod schema for POST /api/nutrition/meals payload.
//
// The 4 nutrition channels share this contract:
//   quick_log:    inline Quick Logs accordion
//   photo_ai:     /api/nutrition/analyze-photo
//   tracker_api:  partner webhook (deferred; route accepts the enum)
//   full_manual:  LEGACY analyze-text path (does NOT call this route;
//                 enum kept for parity)
//
// Prompt #170 (Phase 1j) adds a parallel NutriVision payload variant. The
// existing MealsInsertPayloadSchema is left untouched so the four legacy
// channels keep their contract intact; the route layer tries the NutriVision
// schema first, then falls back to MealsInsertPayloadSchema.
//
// user_id is intentionally NOT in the payload; the route derives it
// from the auth session per security review.

import { z } from 'zod';

export const MealsInsertPayloadSchema = z.object({
  logged_at: z.string().datetime(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  source: z.enum(['quick_log', 'full_manual', 'photo_ai', 'tracker_api', 'wearable_cgm']),
  source_confidence: z.number().min(0).max(1),
  protein_g: z.number().min(0),
  carbs_g: z.number().min(0),
  fat_total_g: z.number().min(0),
  fat_healthy_g: z.number().min(0),
  fiber_g: z.number().min(0),
  sugar_g: z.number().min(0),
  sodium_mg: z.number().min(0),
  calories_kcal: z.number().min(0),
  calories_auto_calc: z.boolean(),
  whole_food_flag: z.boolean().nullable(),
  meal_name: z.string().nullable(),
  // raw_input is jsonb on the meals table; Quick Logs sends
  // { sliders: {...} }, analyze-text sends source text, future tracker_api
  // will send the partner's raw payload. z.unknown() accepts all three.
  raw_input: z.unknown().nullable(),
  snack_index: z.number().int().min(0).nullable(),
  // #170a supplement §20.D + Deviation B: optional NutriVision photo blob
  // attachment when the user arrived at Quick Logs via the Log-Manually
  // CTA on the NutriVision error card. The column already exists on the
  // meals table (added in 20260516120030 for the NutriVision branch).
  source_photo_blob_id: z.string().uuid().optional(),
});

export type MealsInsertPayload = z.infer<typeof MealsInsertPayloadSchema>;

// ---------------------------------------------------------------------------
// Prompt #170 Phase 1j: NutriVision meal save schema.
//
// Mirrors the per-item shape produced by the analyze pipeline (vision detect,
// nutrient resolver, portion estimator, cooking-oil picker). The route fans
// out to meals + meal_items + corpus + helix + Gordon + BOS on a match.
// ---------------------------------------------------------------------------

export const NutriVisionItemSchema = z.object({
  food_name: z.string().min(1).max(200),
  cuisine_tag: z.string().max(50).optional(),
  food_language: z.string().max(10).optional(),
  bounding_box: z
    .object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })
    .optional(),
  recognition_provider: z.enum(['logmeal', 'gemini', 'claude_vision']).optional(),
  recognition_confidence: z.number().min(0).max(1).optional(),
  portion_grams: z.number().nonnegative().max(5000),
  portion_volume_ml: z.number().nonnegative().max(5000).optional(),
  portion_estimation_method: z
    .enum([
      'lidar',
      'arcore',
      'reference_object',
      'vision_inference',
      'user_override',
      'unknown',
    ])
    .optional(),
  nutrient_source: z
    .enum([
      'farmceutica_curated',
      'usda_fdc',
      'open_food_facts',
      'vision_provider',
      'user_entered',
    ])
    .optional(),
  usda_fdc_id: z.number().int().nonnegative().optional(),
  off_barcode: z.string().max(50).optional(),
  // Prompt 170l Phase 1a: OFF-derived metadata at the item level. All
  // optional; populated when source = 'barcode' (legacy items keep null).
  off_product_name: z.string().max(200).optional(),
  off_brand: z.string().max(100).optional(),
  off_serving_size_g: z.number().nonnegative().max(2000).optional(),
  off_completeness_score: z.number().min(0).max(1).optional(),
  off_nova_group: z.number().int().min(1).max(4).optional(),
  off_nutrition_grade_fr: z.enum(['a', 'b', 'c', 'd', 'e']).optional(),
  user_overrode_macros: z.boolean().default(false),
  curated_food_id: z.string().uuid().optional(),
  calories_kcal: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  fiber_g: z.number().nonnegative().optional(),
  sugar_g: z.number().nonnegative().optional(),
  sodium_mg: z.number().nonnegative().optional(),
  cholesterol_mg: z.number().nonnegative().optional(),
  micronutrients: z.record(z.string(), z.number()).optional(),
  cooking_method: z.string().max(50).optional(),
  cooking_oil: z
    .object({
      type: z.string().max(40),
      amount_ml: z.number().nonnegative().max(60),
      was_suggested_default: z.boolean(),
      suggested_default_type: z.string().max(40),
      suggested_default_amount_ml: z.number().nonnegative().max(60),
    })
    .optional(),
  user_modified: z.boolean().default(false),
});

export const NutriVisionMealInsertSchema = z.object({
  source: z.literal('nutrivision'),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  logged_at: z.string().datetime(),
  meal_confidence: z.number().min(0).max(1).optional(),
  recognition_provider_primary: z.enum(['logmeal', 'gemini', 'claude_vision']).optional(),
  recognition_provider_secondary: z.enum(['logmeal', 'gemini', 'claude_vision']).optional(),
  source_photo_blob_id: z.string().uuid().optional(),
  // #170a supplement §17.2: per-meal plate selector value when no credit card
  // reference was detected. Optional; older clients omit it. Server records on
  // the meal_logs row for downstream portion calibration analysis.
  plate_size: z.enum(['plate_8in', 'plate_10in', 'plate_12in']).optional(),
  items: z.array(NutriVisionItemSchema).min(1).max(50),
  edit_diff: z
    .object({
      itemsAdded: z.number().int().nonnegative(),
      itemsRemoved: z.number().int().nonnegative(),
      itemsModified: z.number().int().nonnegative(),
      oilSelections: z.number().int().nonnegative(),
      portionChanges: z.number().int().nonnegative(),
    })
    .optional(),
});

export type NutriVisionMealInsertPayload = z.infer<typeof NutriVisionMealInsertSchema>;
export type NutriVisionItemPayload = z.infer<typeof NutriVisionItemSchema>;
