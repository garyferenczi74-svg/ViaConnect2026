/**
 * Prompt 170f Phase B: Recipe library + suggestion engine source types.
 *
 * Canonical SuggestionRecipe shape per spec §5. Vocab constants for
 * source_kind + match_source + allergen_flags (inherited from 170m
 * ALLERGEN_VOCAB) + diet tags + cuisine tags + meal type tags + units.
 *
 * Per Blueprint Issue #6: ALL canonical_name values lowercase + trimmed
 * everywhere so 170p pantry intersection is deterministic case-insensitive.
 */

import { z } from 'zod';

export const RECIPE_PARSER_VERSION = 'recipes.gordon.v1.0.0';

export const RECIPE_SOURCE_KINDS = [
  'manual',
  'from_meal',
  'from_photo_ai',
  'from_public_template',
  'from_meal_plan',
] as const;

export type RecipeSourceKind = typeof RECIPE_SOURCE_KINDS[number];

export const RECIPE_MATCH_SOURCES = [
  'cascade',
  'curated',
  'off_cache',
  'unmatched',
] as const;

export type RecipeMatchSource = typeof RECIPE_MATCH_SOURCES[number];

export const RECIPE_ALLERGEN_VOCAB = [
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

export type RecipeAllergen = typeof RECIPE_ALLERGEN_VOCAB[number];

export const RECIPE_DIET_TAGS = [
  'vegetarian',
  'vegan',
  'pescatarian',
  'keto',
  'paleo',
  'gluten_free',
  'dairy_free',
  'nut_free',
  'low_carb',
  'high_protein',
  'low_sodium',
  'mediterranean',
  'whole30',
] as const;

export type RecipeDietTag = typeof RECIPE_DIET_TAGS[number];

export const RECIPE_CUISINE_TAGS = [
  'italian',
  'mexican',
  'chinese',
  'japanese',
  'thai',
  'indian',
  'mediterranean',
  'middle_eastern',
  'american',
  'french',
  'korean',
  'vietnamese',
  'greek',
  'spanish',
  'caribbean',
  'african',
] as const;

export type RecipeCuisineTag = typeof RECIPE_CUISINE_TAGS[number];

export const RECIPE_MEAL_TYPE_TAGS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type RecipeMealType = typeof RECIPE_MEAL_TYPE_TAGS[number];

export const RECIPE_UNITS = [
  'g',
  'kg',
  'ml',
  'l',
  'cup',
  'tbsp',
  'tsp',
  'oz',
  'fl_oz',
  'lb',
  'item',
  'slice',
  'clove',
  'pinch',
  'dash',
] as const;

export type RecipeUnit = typeof RECIPE_UNITS[number];

export interface SuggestionRecipe {
  id: string;
  source: 'saved' | 'public_template';
  name: string;
  photoUrl: string | null;
  servings: number;
  cuisineTags: string[];
  dietTags: string[];
  mealTypeTags: string[];
  prepMinutes: number | null;
  ingredientCanonicalNames: string[];
  totalIngredientCount: number;
  requiredIngredientCount: number;
  perServing: {
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    sat_fat_g: number | null;
    fiber_g: number | null;
    sugar_g: number | null;
    sodium_mg: number | null;
  };
  allergenFlags: string[];
  lastLoggedAt: string | null;
  logCount: number;
}

const ingredientInputSchema = z.object({
  raw_name: z.string().min(1).max(160),
  quantity: z.number().positive().max(10000).optional(),
  unit: z.enum(RECIPE_UNITS).optional(),
  is_optional: z.boolean().optional(),
  calories: z.number().min(0).max(5000).optional(),
  protein_g: z.number().min(0).max(500).optional(),
  carbs_g: z.number().min(0).max(1000).optional(),
  fat_g: z.number().min(0).max(500).optional(),
  sat_fat_g: z.number().min(0).max(500).optional(),
  fiber_g: z.number().min(0).max(200).optional(),
  sugar_g: z.number().min(0).max(500).optional(),
  sodium_mg: z.number().min(0).max(50000).optional(),
});

export const createRecipeSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  servings: z.number().int().min(1).max(50).default(1),
  photo_url: z.string().url().nullable().optional(),
  source_kind: z.enum(RECIPE_SOURCE_KINDS).default('manual'),
  source_ref: z.string().uuid().nullable().optional(),
  cuisine_tags: z.array(z.string().max(40)).max(10).default([]),
  diet_tags: z.array(z.string().max(40)).max(15).default([]),
  meal_type_tags: z.array(z.enum(RECIPE_MEAL_TYPE_TAGS)).max(4).default([]),
  prep_minutes: z.number().int().min(0).max(1440).nullable().optional(),
  ingredients: z.array(ingredientInputSchema).min(1).max(50),
  steps: z.array(z.string().min(1).max(2000)).max(30).default([]),
});

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;

export const updateRecipeSchema = createRecipeSchema.partial();
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;

export const logRecipeSchema = z.object({
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  servings_consumed: z.number().positive().max(20).default(1),
  logged_at: z.string().datetime().optional(),
});

export type LogRecipeInput = z.infer<typeof logRecipeSchema>;
