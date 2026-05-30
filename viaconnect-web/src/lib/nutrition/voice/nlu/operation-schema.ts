/**
 * Zod schema for NLU parse output per Prompt 170j §4.1.
 * Validates Claude Haiku 4.5 structured JSON before applying operations to the meal draft.
 *
 * Strict validation prevents malformed AI output from corrupting meal data.
 */

import { z } from 'zod';

const cookingMethodSchema = z.enum([
  'grilled',
  'baked',
  'raw',
  'fried',
  'pan_fried',
  'steamed',
  'boiled',
  'roasted',
]);

// Aligned with CookingOilType in src/lib/nutrition/cooking-oil/suggester.ts.
const oilTypeSchema = z.enum([
  'olive_oil',
  'evoo',
  'avocado_oil',
  'coconut_oil',
  'butter',
  'ghee',
  'vegetable_canola_oil',
  'sesame_oil',
]);

// Aligned with existing useMealItemEdits chip system. Voice users saying
// dietary modifier terms (spicy, gluten_free, etc.) trigger clarification
// per §4.5; dietary modifiers filed for 170j-supplement.
const modifierChipSchema = z.enum([
  'butter',
  'cream',
  'cheese',
  'sauce',
  'grilled',
  'baked',
  'raw',
]);

const macroImpactSchema = z
  .object({
    calories_kcal: z.number().optional(),
    protein_g: z.number().optional(),
    carbs_g: z.number().optional(),
    fat_g: z.number().optional(),
    fiber_g: z.number().optional(),
    sugar_g: z.number().optional(),
    sodium_mg: z.number().optional(),
  })
  .partial();

const baseOperationSchema = z.object({
  confidence: z.number().min(0).max(1),
  natural_language_preview: z.string().min(1).max(200),
  macro_impact_estimate: macroImpactSchema.optional(),
});

const addItemSchema = baseOperationSchema.extend({
  op_kind: z.literal('add_item'),
  food_name: z.string().min(1).max(120),
  portion_grams: z.number().positive(),
  cooking_method: cookingMethodSchema.optional(),
  nutrient_source_hint: z.enum(['auto', 'curated', 'usda']).optional(),
});

const removeItemSchema = baseOperationSchema.extend({
  op_kind: z.literal('remove_item'),
  target_food: z.string().min(1).max(120),
});

const modifyItemPortionSchema = baseOperationSchema.extend({
  op_kind: z.literal('modify_item_portion'),
  target_food: z.string().min(1).max(120),
  new_portion_grams: z.number().positive(),
});

const modifyItemCookingMethodSchema = baseOperationSchema.extend({
  op_kind: z.literal('modify_item_cooking_method'),
  target_food: z.string().min(1).max(120),
  new_cooking_method: cookingMethodSchema,
});

const addCookingOilSchema = baseOperationSchema.extend({
  op_kind: z.literal('add_cooking_oil'),
  target_food: z.string().min(1).max(120),
  oil_type: oilTypeSchema,
  amount_ml: z.number().positive(),
  amount_label: z.string().min(1).max(40),
});

const removeCookingOilSchema = baseOperationSchema.extend({
  op_kind: z.literal('remove_cooking_oil'),
  target_food: z.string().min(1).max(120),
  oil_type: z.union([oilTypeSchema, z.literal('all')]),
});

const changeMealPortionSchema = baseOperationSchema.extend({
  op_kind: z.literal('change_meal_portion'),
  multiplier: z.number().positive().max(10),
});

const addModifierSchema = baseOperationSchema.extend({
  op_kind: z.literal('add_modifier'),
  target_food: z.string().min(1).max(120),
  modifier_chip: modifierChipSchema,
});

const removeModifierSchema = baseOperationSchema.extend({
  op_kind: z.literal('remove_modifier'),
  target_food: z.string().min(1).max(120),
  modifier_chip: modifierChipSchema,
});

const modifyChainCustomizationSchema = baseOperationSchema.extend({
  op_kind: z.literal('modify_chain_customization'),
  slot_key: z.string().min(1).max(40),
  new_option: z.string().min(1).max(80),
});

const undoLastSchema = baseOperationSchema.extend({
  op_kind: z.literal('undo_last'),
});

export const voiceOperationSchema = z.discriminatedUnion('op_kind', [
  addItemSchema,
  removeItemSchema,
  modifyItemPortionSchema,
  modifyItemCookingMethodSchema,
  addCookingOilSchema,
  removeCookingOilSchema,
  changeMealPortionSchema,
  addModifierSchema,
  removeModifierSchema,
  modifyChainCustomizationSchema,
  undoLastSchema,
]);

export const nluParseResultSchema = z.object({
  operations: z.array(voiceOperationSchema).min(0).max(5),
  needs_clarification: z.boolean(),
  clarification_question: z.string().nullable(),
  ambiguous_targets: z.array(z.string()),
  nlu_latency_ms: z.number().nonnegative(),
  nlu_provider_used: z.literal('claude_haiku_4_5'),
});

export type ValidatedNLUParseResult = z.infer<typeof nluParseResultSchema>;
