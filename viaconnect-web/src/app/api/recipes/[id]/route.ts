/**
 * Prompt 170f Phase C: recipe detail + update + archive endpoints.
 *
 * GET /api/recipes/[id] -> full recipe + ingredients + steps for detail view
 * PATCH /api/recipes/[id] -> partial update with nutrition + allergen recompute
 *   when ingredients change
 * DELETE /api/recipes/[id] -> soft archive (sets is_archived=true). Hard delete
 *   is reserved for admin tooling per spec §11.4.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import {
  updateRecipeSchema,
  RECIPE_PARSER_VERSION,
} from '@/lib/recipes/types';
import { normalizeIngredient } from '@/lib/recipes/normalizeIngredient';
import {
  rollupRecipeNutrition,
  type IngredientNutritionInput,
} from '@/lib/recipes/rollupNutrition';
import { deriveAllergensForRecipe } from '@/lib/recipes/deriveAllergens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

function flagDisabled(): boolean {
  return process.env.RECIPES_LIBRARY_ENABLED !== 'true';
}

async function loadOwnedRecipe(admin: ReturnType<typeof createAdminClient>, recipeId: string, userId: string) {
  const { data: recipe } = await admin
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .maybeSingle();
  if (!recipe || recipe.user_id !== userId) return null;
  return recipe;
}

export async function GET(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  if (flagDisabled()) {
    return NextResponse.json({ error: 'Recipe library is temporarily unavailable.' }, { status: 503 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const recipe = await loadOwnedRecipe(admin, ctx.params.id, user.id);
  if (!recipe) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
  }

  const [{ data: ingredients }, { data: steps }] = await Promise.all([
    admin.from('recipe_ingredients').select('*').eq('recipe_id', recipe.id).order('position', { ascending: true }),
    admin.from('recipe_steps').select('*').eq('recipe_id', recipe.id).order('position', { ascending: true }),
  ]);

  return NextResponse.json({ recipe, ingredients: ingredients ?? [], steps: steps ?? [] });
}

export async function PATCH(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  if (flagDisabled()) {
    return NextResponse.json({ error: 'Recipe library is temporarily unavailable.' }, { status: 503 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateRecipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();
  const recipe = await loadOwnedRecipe(admin, ctx.params.id, user.id);
  if (!recipe) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  for (const field of ['name', 'description', 'servings', 'photo_url', 'cuisine_tags', 'diet_tags', 'meal_type_tags', 'prep_minutes'] as const) {
    if (parsed.data[field] !== undefined) update[field] = parsed.data[field];
  }

  let allergenFlags: string[] | null = null;
  if (parsed.data.ingredients) {
    const ingredientsForRollup: IngredientNutritionInput[] = parsed.data.ingredients.map((ing) => ({
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
    update.total_calories = totals.total_calories;
    update.total_protein_g = totals.total_protein_g;
    update.total_carbs_g = totals.total_carbs_g;
    update.total_fat_g = totals.total_fat_g;
    update.total_sat_fat_g = totals.total_sat_fat_g;
    update.total_fiber_g = totals.total_fiber_g;
    update.total_sugar_g = totals.total_sugar_g;
    update.total_sodium_mg = totals.total_sodium_mg;
    update.has_unmatched_ingredients = totals.has_unmatched_ingredients;

    allergenFlags = deriveAllergensForRecipe(parsed.data.ingredients.map((i) => i.raw_name));
    update.allergen_flags = allergenFlags;
    update.parser_version = RECIPE_PARSER_VERSION;
  }

  if (Object.keys(update).length === 0 && !parsed.data.ingredients && !parsed.data.steps) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  if (Object.keys(update).length > 0) {
    const { error: updErr } = await admin.from('recipes').update(update).eq('id', recipe.id);
    if (updErr) {
      safeLog.error('api.recipes.update', 'recipe update failed', { error: updErr, userId: user.id, recipeId: recipe.id });
      return NextResponse.json({ error: 'Could not update recipe' }, { status: 500 });
    }
  }

  if (parsed.data.ingredients) {
    await admin.from('recipe_ingredients').delete().eq('recipe_id', recipe.id);
    const ingredientRows = parsed.data.ingredients.map((ing, position) => {
      const normalized = normalizeIngredient(ing.raw_name);
      return {
        recipe_id: recipe.id,
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
      safeLog.error('api.recipes.update', 'ingredient replace failed', { error: ingErr, recipeId: recipe.id });
      return NextResponse.json({ error: 'Could not save ingredients' }, { status: 500 });
    }
  }

  if (parsed.data.steps) {
    await admin.from('recipe_steps').delete().eq('recipe_id', recipe.id);
    if (parsed.data.steps.length > 0) {
      const stepRows = parsed.data.steps.map((body, position) => ({
        recipe_id: recipe.id,
        position,
        body,
      }));
      await admin.from('recipe_steps').insert(stepRows);
    }
  }

  return NextResponse.json({ recipe_id: recipe.id, updated: true });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  if (flagDisabled()) {
    return NextResponse.json({ error: 'Recipe library is temporarily unavailable.' }, { status: 503 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const recipe = await loadOwnedRecipe(admin, ctx.params.id, user.id);
  if (!recipe) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
  }

  const { error } = await admin.from('recipes').update({ is_archived: true }).eq('id', recipe.id);
  if (error) {
    safeLog.error('api.recipes.archive', 'archive failed', { error, userId: user.id, recipeId: recipe.id });
    return NextResponse.json({ error: 'Could not archive recipe' }, { status: 500 });
  }

  return NextResponse.json({ archived: true, recipe_id: recipe.id });
}
