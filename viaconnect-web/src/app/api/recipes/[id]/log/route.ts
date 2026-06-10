/**
 * Prompt 170f Phase C: recipe -> meal log endpoint per spec §9.
 *
 * Inserts a meals row with derived totals = recipe.total_X × servings_consumed.
 * Stamps meals.recipe_id FK so PDP detail view can show "last logged Xd ago".
 * Increments recipes.log_count + sets last_logged_at via direct UPDATE (no
 * trigger; avoids race conditions when a user logs the same recipe twice
 * inside the same second).
 *
 * Fires BOS recompute via recomputeNutritionDimension per the standard
 * meal-write contract.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { recomputeNutritionDimension } from '@/lib/nutrition/bos-bridge';
import { logRecipeSchema } from '@/lib/recipes/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

function safeMul(perServing: number | null, servingsConsumed: number): number {
  if (typeof perServing !== 'number' || !Number.isFinite(perServing) || perServing < 0) return 0;
  return Math.round(perServing * servingsConsumed * 100) / 100;
}

export async function POST(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  if (process.env.RECIPES_LIBRARY_ENABLED !== 'true') {
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

  const parsed = logRecipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: recipe } = await admin
    .from('recipes')
    .select('id, user_id, name, servings, total_calories, total_protein_g, total_carbs_g, total_fat_g, total_sat_fat_g, total_fiber_g, total_sugar_g, total_sodium_mg, log_count')
    .eq('id', ctx.params.id)
    .maybeSingle();

  if (!recipe || recipe.user_id !== user.id) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
  }

  const servingsConsumed = parsed.data.servings_consumed;
  const servings = recipe.servings > 0 ? recipe.servings : 1;
  const perServing = (total: number | null) => (typeof total === 'number' ? total / servings : null);

  const loggedAtIso = parsed.data.logged_at ?? new Date().toISOString();
  const mealType = parsed.data.meal_type ?? 'snack';

  const { data: mealRow, error: mealErr } = await admin
    .from('meals')
    .insert({
      user_id: user.id,
      source: 'quick_log',
      meal_type: mealType,
      meal_name: recipe.name,
      logged_at: loggedAtIso,
      source_confidence: 1.0,
      calories_kcal: safeMul(perServing(recipe.total_calories), servingsConsumed),
      calories_auto_calc: true,
      protein_g: safeMul(perServing(recipe.total_protein_g), servingsConsumed),
      carbs_g: safeMul(perServing(recipe.total_carbs_g), servingsConsumed),
      fat_total_g: safeMul(perServing(recipe.total_fat_g), servingsConsumed),
      fiber_g: safeMul(perServing(recipe.total_fiber_g), servingsConsumed),
      sugar_g: safeMul(perServing(recipe.total_sugar_g), servingsConsumed),
      sodium_mg: safeMul(perServing(recipe.total_sodium_mg), servingsConsumed),
      recipe_id: recipe.id,
    })
    .select('meal_id')
    .single();

  if (mealErr || !mealRow) {
    safeLog.error('api.recipes.log', 'meal insert failed', { error: mealErr, userId: user.id, recipeId: recipe.id });
    return NextResponse.json({ error: 'Could not log recipe' }, { status: 500 });
  }

  const { error: updErr } = await admin
    .from('recipes')
    .update({ log_count: recipe.log_count + 1, last_logged_at: loggedAtIso })
    .eq('id', recipe.id);
  if (updErr) {
    safeLog.warn('api.recipes.log', 'log_count update failed (non-fatal)', { error: updErr, recipeId: recipe.id });
  }

  try {
    await recomputeNutritionDimension({ userId: user.id, date: loggedAtIso.slice(0, 10) });
  } catch (bosErr) {
    safeLog.warn('api.recipes.log', 'bos recompute failed', { error: bosErr, userId: user.id });
  }

  return NextResponse.json({
    meal_id: mealRow.meal_id,
    recipe_id: recipe.id,
    servings_consumed: servingsConsumed,
  });
}
