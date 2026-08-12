/**
 * Prompt 170f Phase C: recipe library list + create endpoints.
 *
 * GET /api/recipes -> user's non-archived recipes (light shape for library list)
 * POST /api/recipes -> create a recipe + ingredients + steps + nutrition rollup
 *
 * Master kill switch: RECIPES_LIBRARY_ENABLED env flag must be 'true'.
 * Defaults false until Phase E ratification per spec §18.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import {
  createRecipeSchema,
  RECIPE_PARSER_VERSION,
  type CreateRecipeInput,
} from '@/lib/recipes/types';
import { normalizeIngredient } from '@/lib/recipes/normalizeIngredient';
import {
  rollupRecipeNutrition,
  type IngredientNutritionInput,
} from '@/lib/recipes/rollupNutrition';
import { deriveAllergensForRecipe } from '@/lib/recipes/deriveAllergens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function flagDisabled(): boolean {
  return process.env.RECIPES_LIBRARY_ENABLED !== 'true';
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
  if (flagDisabled()) {
    return NextResponse.json({ error: 'Recipe library is temporarily unavailable.' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('recipes')
    .select('id, name, photo_url, servings, cuisine_tags, diet_tags, meal_type_tags, prep_minutes, total_calories, total_protein_g, total_carbs_g, total_fat_g, allergen_flags, last_logged_at, log_count, has_unmatched_ingredients, created_at, updated_at')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('last_logged_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    safeLog.error('api.recipes.list', 'select failed', { error, userId: user.id });
    return NextResponse.json({ error: 'Could not load recipes' }, { status: 500 });
  }

  return NextResponse.json({ recipes: data ?? [] });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (flagDisabled()) {
    return NextResponse.json({ error: 'Recipe library is temporarily unavailable.' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createRecipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }

  return await persistRecipe(user.id, parsed.data);
}

async function persistRecipe(userId: string, input: CreateRecipeInput): Promise<NextResponse> {
  const admin = createAdminClient();

  const ingredientsForRollup: IngredientNutritionInput[] = input.ingredients.map((ing) => ({
    calories: ing.calories,
    protein_g: ing.protein_g,
    carbs_g: ing.carbs_g,
    fat_g: ing.fat_g,
    sat_fat_g: ing.sat_fat_g,
    fiber_g: ing.fiber_g,
    sugar_g: ing.sugar_g,
    sodium_mg: ing.sodium_mg,
    is_optional: ing.is_optional,
  }));
  const totals = rollupRecipeNutrition(ingredientsForRollup);

  const rawNames = input.ingredients.map((i) => i.raw_name);
  const allergenFlags = deriveAllergensForRecipe(rawNames);

  const { data: recipeRow, error: recipeErr } = await admin
    .from('recipes')
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description ?? null,
      servings: input.servings,
      photo_url: input.photo_url ?? null,
      source_kind: input.source_kind,
      source_ref: input.source_ref ?? null,
      cuisine_tags: input.cuisine_tags,
      diet_tags: input.diet_tags,
      meal_type_tags: input.meal_type_tags,
      prep_minutes: input.prep_minutes ?? null,
      total_calories: totals.total_calories,
      total_protein_g: totals.total_protein_g,
      total_carbs_g: totals.total_carbs_g,
      total_fat_g: totals.total_fat_g,
      total_sat_fat_g: totals.total_sat_fat_g,
      total_fiber_g: totals.total_fiber_g,
      total_sugar_g: totals.total_sugar_g,
      total_sodium_mg: totals.total_sodium_mg,
      has_unmatched_ingredients: totals.has_unmatched_ingredients,
      allergen_flags: allergenFlags,
      parser_version: RECIPE_PARSER_VERSION,
    })
    .select('id')
    .single();

  if (recipeErr || !recipeRow) {
    safeLog.error('api.recipes.create', 'insert failed', { error: recipeErr, userId });
    return NextResponse.json({ error: 'Could not create recipe' }, { status: 500 });
  }

  const recipeId = recipeRow.id;

  const ingredientRows = input.ingredients.map((ing, position) => {
    const normalized = normalizeIngredient(ing.raw_name);
    return {
      recipe_id: recipeId,
      position,
      raw_name: ing.raw_name,
      canonical_name: normalized.canonical_name,
      quantity: ing.quantity ?? normalized.quantity,
      unit: ing.unit ?? normalized.unit,
      grams_equivalent: normalized.grams_equivalent,
      is_optional: ing.is_optional ?? false,
      calories: ing.calories ?? null,
      protein_g: ing.protein_g ?? null,
      carbs_g: ing.carbs_g ?? null,
      fat_g: ing.fat_g ?? null,
      sat_fat_g: ing.sat_fat_g ?? null,
      fiber_g: ing.fiber_g ?? null,
      sugar_g: ing.sugar_g ?? null,
      sodium_mg: ing.sodium_mg ?? null,
      match_source: normalized.match_source,
    };
  });

  const { error: ingErr } = await admin.from('recipe_ingredients').insert(ingredientRows);
  if (ingErr) {
    safeLog.error('api.recipes.create', 'ingredient insert failed', { error: ingErr, userId, recipeId });
    await admin.from('recipes').delete().eq('id', recipeId);
    return NextResponse.json({ error: 'Could not save recipe ingredients' }, { status: 500 });
  }

  if (input.steps.length > 0) {
    const stepRows = input.steps.map((body, position) => ({
      recipe_id: recipeId,
      position,
      body,
    }));
    const { error: stepErr } = await admin.from('recipe_steps').insert(stepRows);
    if (stepErr) {
      safeLog.warn('api.recipes.create', 'step insert failed (non-fatal)', { error: stepErr, recipeId });
    }
  }

  return NextResponse.json({ recipe_id: recipeId, totals, allergen_flags: allergenFlags });
}
