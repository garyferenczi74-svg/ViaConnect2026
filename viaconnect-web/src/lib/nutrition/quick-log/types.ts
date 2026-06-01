/**
 * Prompt 170m Phase B: Quick Log NLU types + Zod schemas.
 *
 * Output schema mirrors Gordon's Blueprint draft Section 2 verbatim. The
 * Zod schemas gate every API response so the UI never receives malformed
 * NLU output.
 *
 * Cold-start NLU (no meal_draft context). Inverse of 170j voice-edit which
 * parses operations against an existing draft. Same Haiku 4.5 model;
 * different system prompt; different output schema.
 */

import { z } from 'zod';

export const QUICK_LOG_PARSER_VERSION = 'quick-log.haiku.v1.1.0';
export const QUICK_LOG_HAIKU_MODEL = 'claude-haiku-4-5-20251001';

export const COOKING_METHODS = [
  'raw',
  'boiled',
  'steamed',
  'poached',
  'scrambled',
  'fried',
  'pan_fried',
  'deep_fried',
  'baked',
  'roasted',
  'grilled',
  'broiled',
  'sauteed',
  'braised',
  'slow_cooked',
  'smoked',
  'microwaved',
  'air_fried',
  'toasted',
  'cooked',
  'unspecified',
] as const;

export const ALLERGEN_VOCAB = [
  'peanuts',
  'tree_nuts',
  'milk',
  'eggs',
  'soy',
  'wheat',
  'fish',
  'shellfish',
  'sesame',
  'gluten',
] as const;

// Prompt 170o Phase 1 Phase B-2: hydration recognition. Parser emits both
// fields on beverage meal_items; null on non-beverages. Server computes
// hydration_ml from portion_volume_ml * ratio(kind, counting_mode).
export const HYDRATION_SOURCE_KINDS_PARSER = [
  'pure_water',
  'coffee_tea',
  'juice_smoothie',
  'dairy',
  'soda',
  'alcohol_low',
  'alcohol_high',
  'sports_drink',
  'high_water_food',
] as const;

const quickLogMealItemSchema = z.object({
  food_name: z.string().min(1).max(160),
  portion_grams: z.number().min(1).max(5000),
  portion_label_user: z.string().max(80).nullable(),
  cooking_method: z.string().max(40).nullable(),
  modifiers: z.array(z.string().max(40)).max(20),
  // Prompt 170o Phase 1 hydration fields (v1.1.0 parser):
  hydration_source_kind: z.enum(HYDRATION_SOURCE_KINDS_PARSER).nullable().optional(),
  portion_volume_ml: z.number().min(0).max(5000).nullable().optional(),
  source_text_span: z.string().max(500),
  caffeine_mg: z.number().min(0).max(1000).nullable().optional(),
  confidence: z.number().min(0).max(1),
});

const restaurantContextSchema = z.object({
  chain_slug: z.string().min(1).max(60),
  chain_name: z.string().min(1).max(80),
  confidence: z.number().min(0).max(1),
});

const recipeMatchHintSchema = z.object({
  hint_text: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1),
});

const brandedProductHintSchema = z.object({
  brand: z.string().min(1).max(80),
  product_name: z.string().min(1).max(120),
  linked_meal_item_index: z.number().int().min(0),
  confidence: z.number().min(0).max(1),
});

const clarificationQuestionSchema = z.object({
  question_text: z.string().min(1).max(200),
  linked_meal_item_index: z.number().int().min(0),
  option_chips: z.array(z.string().min(1).max(40)).min(2).max(6),
});

const splitSuggestionSchema = z.object({
  suggested_splits: z.array(z.object({
    meal_name: z.string().min(1).max(40),
    meal_item_indices: z.array(z.number().int().min(0)),
  })).min(2).max(5),
  confidence: z.number().min(0).max(1),
});

export const quickLogParseResultSchema = z.object({
  meal_items: z.array(quickLogMealItemSchema).max(50),
  restaurant_context_detected: restaurantContextSchema.nullable(),
  recipe_match_hint: recipeMatchHintSchema.nullable(),
  branded_product_hints: z.array(brandedProductHintSchema).max(20),
  dietary_restriction_flags: z.array(z.string()).max(20),
  needs_clarification: z.boolean(),
  clarification_questions: z.array(clarificationQuestionSchema).max(3),
  split_into_multiple_meals_suggestion: splitSuggestionSchema.nullable(),
  nlu_latency_ms: z.number().int().min(0),
  nlu_provider_used: z.string().optional(),
  parser_version: z.string().optional(),
});

export type QuickLogMealItem = z.infer<typeof quickLogMealItemSchema>;
export type QuickLogParseResult = z.infer<typeof quickLogParseResultSchema>;
export type RestaurantContext = z.infer<typeof restaurantContextSchema>;
export type RecipeMatchHint = z.infer<typeof recipeMatchHintSchema>;
export type BrandedProductHint = z.infer<typeof brandedProductHintSchema>;
export type ClarificationQuestion = z.infer<typeof clarificationQuestionSchema>;
export type SplitSuggestion = z.infer<typeof splitSuggestionSchema>;
