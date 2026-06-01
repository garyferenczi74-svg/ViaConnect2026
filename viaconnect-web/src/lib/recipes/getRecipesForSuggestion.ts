/**
 * Prompt 170f Phase B: canonical recipe query contract per spec §5.
 *
 * The single read path for suggestion consumers (170p pantry scorer +
 * 170q meal planner + Gordon next-meal insight). Every consumer calls
 * this function; direct queries against the recipes / recipe_ingredients
 * tables outside this file are a Phase E audit blocker per Blueprint
 * Issue #5 (single-read-path discipline).
 *
 * Cold-start contract per spec §5: if user has fewer than
 * COLD_START_THRESHOLD (5) saved non-archived recipes,
 * includePublicTemplates defaults to true and templates are returned
 * alongside saved recipes. At or above the threshold, saved recipes
 * return alone unless caller explicitly requests templates.
 *
 * Resilience: 10s timeout wrap + try/catch fail-open returning empty
 * array + structured logging. Suggestion consumers NEVER fail their
 * render path due to this function.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/nutrition/resilience/timeout';
import type { SuggestionRecipe } from './types';

const COLD_START_THRESHOLD = 5;
const QUERY_TIMEOUT_MS = 10_000;

export interface GetRecipesForSuggestionOpts {
  includePublicTemplates?: boolean;
  dietTagFilter?: string[];
  cuisineTagFilter?: string[];
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface SavedRecipeRow {
  id: string;
  name: string;
  photo_url: string | null;
  servings: number;
  cuisine_tags: string[];
  diet_tags: string[];
  meal_type_tags: string[];
  prep_minutes: number | null;
  total_calories: number | null;
  total_protein_g: number | null;
  total_carbs_g: number | null;
  total_fat_g: number | null;
  total_sat_fat_g: number | null;
  total_fiber_g: number | null;
  total_sugar_g: number | null;
  total_sodium_mg: number | null;
  allergen_flags: string[];
  last_logged_at: string | null;
  log_count: number;
}

interface IngredientShape {
  canonical_name: string | null;
  raw_name: string;
  is_optional: boolean;
}

interface TemplateRow {
  id: string;
  name: string;
  photo_url: string | null;
  servings: number;
  cuisine_tags: string[];
  diet_tags: string[];
  meal_type_tags: string[];
  prep_minutes: number | null;
  ingredients: Array<{ canonical_name?: string; raw_name?: string; is_optional?: boolean }>;
  total_calories: number | null;
  total_protein_g: number | null;
  total_carbs_g: number | null;
  total_fat_g: number | null;
  total_sat_fat_g: number | null;
  total_fiber_g: number | null;
  total_sugar_g: number | null;
  total_sodium_mg: number | null;
  allergen_flags: string[];
}

function perServing(total: number | null, servings: number): number | null {
  if (total === null || servings <= 0) return null;
  return Math.round((total / servings) * 100) / 100;
}

function buildSuggestionShape(
  source: 'saved' | 'public_template',
  row: SavedRecipeRow | TemplateRow,
  ingredients: IngredientShape[],
): SuggestionRecipe {
  const requiredCount = ingredients.filter((i) => !i.is_optional).length;
  const canonical = ingredients
    .map((i) => (i.canonical_name ?? i.raw_name ?? '').toLowerCase().trim())
    .filter((s) => s.length > 0);

  return {
    id: row.id,
    source,
    name: row.name,
    photoUrl: row.photo_url,
    servings: row.servings,
    cuisineTags: row.cuisine_tags ?? [],
    dietTags: row.diet_tags ?? [],
    mealTypeTags: row.meal_type_tags ?? [],
    prepMinutes: row.prep_minutes,
    ingredientCanonicalNames: Array.from(new Set(canonical)).sort(),
    totalIngredientCount: ingredients.length,
    requiredIngredientCount: requiredCount > 0 ? requiredCount : ingredients.length,
    perServing: {
      calories: perServing(row.total_calories, row.servings),
      protein_g: perServing(row.total_protein_g, row.servings),
      carbs_g: perServing(row.total_carbs_g, row.servings),
      fat_g: perServing(row.total_fat_g, row.servings),
      sat_fat_g: perServing(row.total_sat_fat_g, row.servings),
      fiber_g: perServing(row.total_fiber_g, row.servings),
      sugar_g: perServing(row.total_sugar_g, row.servings),
      sodium_mg: perServing(row.total_sodium_mg, row.servings),
    },
    allergenFlags: row.allergen_flags ?? [],
    lastLoggedAt: 'last_logged_at' in row ? row.last_logged_at : null,
    logCount: 'log_count' in row ? row.log_count : 0,
  };
}

export async function getRecipesForSuggestion(
  userId: string,
  opts: GetRecipesForSuggestionOpts = {},
): Promise<SuggestionRecipe[]> {
  try {
    return await withTimeout(
      gatherRecipes(userId, opts),
      { timeoutMs: QUERY_TIMEOUT_MS, op: 'getRecipesForSuggestion' },
    );
  } catch (err) {
    safeLog.warn('recipes.getRecipesForSuggestion', 'fail-open empty', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

async function gatherRecipes(
  userId: string,
  opts: GetRecipesForSuggestionOpts,
): Promise<SuggestionRecipe[]> {
  const admin = createAdminClient();

  let savedQuery = admin
    .from('recipes')
    .select('id, name, photo_url, servings, cuisine_tags, diet_tags, meal_type_tags, prep_minutes, total_calories, total_protein_g, total_carbs_g, total_fat_g, total_sat_fat_g, total_fiber_g, total_sugar_g, total_sodium_mg, allergen_flags, last_logged_at, log_count')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('last_logged_at', { ascending: false, nullsFirst: false });

  if (opts.dietTagFilter && opts.dietTagFilter.length > 0) {
    savedQuery = savedQuery.contains('diet_tags', opts.dietTagFilter);
  }
  if (opts.cuisineTagFilter && opts.cuisineTagFilter.length > 0) {
    savedQuery = savedQuery.contains('cuisine_tags', opts.cuisineTagFilter);
  }
  if (opts.mealType) {
    savedQuery = savedQuery.contains('meal_type_tags', [opts.mealType]);
  }

  const savedRes = await savedQuery;
  const savedRows = (savedRes.data ?? []) as SavedRecipeRow[];

  const savedIds = savedRows.map((r) => r.id);
  const ingredientMap = new Map<string, IngredientShape[]>();

  if (savedIds.length > 0) {
    const ingredientRes = await admin
      .from('recipe_ingredients')
      .select('recipe_id, canonical_name, raw_name, is_optional')
      .in('recipe_id', savedIds);
    const ingredientRows = (ingredientRes.data ?? []) as Array<IngredientShape & { recipe_id: string }>;
    for (const row of ingredientRows) {
      const list = ingredientMap.get(row.recipe_id) ?? [];
      list.push({
        canonical_name: row.canonical_name,
        raw_name: row.raw_name,
        is_optional: row.is_optional,
      });
      ingredientMap.set(row.recipe_id, list);
    }
  }

  const savedSuggestions: SuggestionRecipe[] = savedRows.map((row) =>
    buildSuggestionShape('saved', row, ingredientMap.get(row.id) ?? []),
  );

  const wantTemplates = opts.includePublicTemplates ?? savedRows.length < COLD_START_THRESHOLD;
  if (!wantTemplates) return savedSuggestions;

  let templateQuery = admin
    .from('recipe_public_templates')
    .select('id, name, photo_url, servings, cuisine_tags, diet_tags, meal_type_tags, prep_minutes, ingredients, total_calories, total_protein_g, total_carbs_g, total_fat_g, total_sat_fat_g, total_fiber_g, total_sugar_g, total_sodium_mg, allergen_flags')
    .eq('is_published', true)
    .limit(20);

  if (opts.dietTagFilter && opts.dietTagFilter.length > 0) {
    templateQuery = templateQuery.contains('diet_tags', opts.dietTagFilter);
  }
  if (opts.cuisineTagFilter && opts.cuisineTagFilter.length > 0) {
    templateQuery = templateQuery.contains('cuisine_tags', opts.cuisineTagFilter);
  }
  if (opts.mealType) {
    templateQuery = templateQuery.contains('meal_type_tags', [opts.mealType]);
  }

  const templateRes = await templateQuery;
  const templateRows = (templateRes.data ?? []) as TemplateRow[];

  const templateSuggestions: SuggestionRecipe[] = templateRows.map((row) => {
    const ings: IngredientShape[] = Array.isArray(row.ingredients)
      ? row.ingredients.map((i) => ({
          canonical_name: i.canonical_name ?? null,
          raw_name: i.raw_name ?? '',
          is_optional: i.is_optional ?? false,
        }))
      : [];
    return buildSuggestionShape('public_template', row, ings);
  });

  return [...savedSuggestions, ...templateSuggestions];
}
