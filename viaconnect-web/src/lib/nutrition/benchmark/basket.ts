/**
 * Prompt 184 Phase 0 benchmark basket. A versioned, fixed set of meal items
 * with consensus nutrition targets. The divergence harness runs both engines
 * (NutriVision photo, Log Your Meal text) against this basket to measure
 * accuracy, and it doubles as the permanent regression guard.
 *
 * Targets are FDC-derived placeholders until the five-app medians are supplied
 * by Gary; see basket.fixture.ts. The loader validates the fixture so a typo in
 * the data fails loudly at load time rather than skewing the report.
 */

import { z } from 'zod';
import { RAW_BENCHMARK_BASKET } from './basket.fixture';

export const BENCHMARK_CATEGORIES = [
  'raw_whole',
  'cooked_whole',
  'mixed_plate',
  'packaged_barcoded',
  'restaurant_hidden_fat',
  'beverage',
] as const;

export type BenchmarkCategory = (typeof BENCHMARK_CATEGORIES)[number];

/**
 * Per-nutrient consensus values for one item, already scaled to the item
 * portion. A genuine measured value (including a true 0, such as carbs in
 * chicken) is recorded as a number. null is used only when the nutrient is
 * not characterized for the item, mirroring the NULL-not-0 rule the engines
 * follow for un-extractable values. sugar_g is a subset of carbs_g and may
 * not exceed it.
 */
export const NutrientTargetSchema = z
  .object({
    calories_kcal: z.number().min(0),
    protein_g: z.number().min(0).nullable(),
    carbs_g: z.number().min(0).nullable(),
    fat_g: z.number().min(0).nullable(),
    fiber_g: z.number().min(0).nullable(),
    sugar_g: z.number().min(0).nullable(),
    sodium_mg: z.number().min(0).nullable(),
  })
  .refine(
    (v) => v.carbs_g === null || v.sugar_g === null || v.sugar_g <= v.carbs_g,
    { message: 'sugar_g cannot exceed carbs_g (sugar is a subset of carbs)' }
  );

export const ConsensusTargetSchema = z.object({
  source: z.enum(['five_app_median', 'fdc_derived']),
  // basis is central to Prompt 184: a raw row scored against a cooked portion
  // is the leading suspected error, so every target records its basis.
  basis: z.enum(['raw', 'cooked', 'as_packaged', 'as_served']),
  portion_g: z.number().positive(),
  fdc_id: z.number().int().positive().optional(),
  values: NutrientTargetSchema,
  note: z.string().max(300).optional(),
});

export const BenchmarkItemSchema = z
  .object({
    id: z.string().min(1),
    category: z.enum(BENCHMARK_CATEGORIES),
    text_input: z.string().min(1).nullable(),
    photo_ref: z.string().min(1).nullable(),
    dual_logged: z.boolean(),
    consensus_target: ConsensusTargetSchema,
  })
  .refine((item) => item.text_input !== null || item.photo_ref !== null, {
    message: 'each item needs at least one of text_input or photo_ref',
  })
  .refine(
    (item) =>
      !item.dual_logged ||
      (item.text_input !== null && item.photo_ref !== null),
    { message: 'dual_logged items must have both text_input and photo_ref' }
  );

export const BenchmarkBasketSchema = z.object({
  version: z.string().regex(/^\d+$/),
  generated_basis: z.string().min(1),
  items: z.array(BenchmarkItemSchema).min(30).max(40),
});

export type NutrientTarget = z.infer<typeof NutrientTargetSchema>;
export type ConsensusTarget = z.infer<typeof ConsensusTargetSchema>;
export type BenchmarkItem = z.infer<typeof BenchmarkItemSchema>;
export type BenchmarkBasket = z.infer<typeof BenchmarkBasketSchema>;

/**
 * Validates and returns the benchmark basket. Throws a ZodError with a clear
 * path if the fixture is malformed.
 */
export function loadBenchmarkBasket(): BenchmarkBasket {
  return BenchmarkBasketSchema.parse(RAW_BENCHMARK_BASKET);
}
