/**
 * Prompt 170f Phase C: clone public template into user's library.
 *
 * POST /api/recipes/templates/[id]/save -> insert a fresh recipes row owned
 * by the user with source_kind='from_public_template' + source_ref=<templateId>,
 * mirroring the template's ingredients + steps + nutrition + allergen flags.
 * Bumps the template's save_count.
 *
 * Idempotent at the template+user level: if the user already cloned this
 * template and the clone is non-archived, returns the existing recipe_id
 * instead of duplicating.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { RECIPE_PARSER_VERSION } from '@/lib/recipes/types';
import { normalizeIngredient } from '@/lib/recipes/normalizeIngredient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

interface TemplateIngredient {
  raw_name?: string;
  canonical_name?: string;
  quantity?: number;
  unit?: string;
  is_optional?: boolean;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  sat_fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

export async function POST(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  if (process.env.RECIPES_LIBRARY_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Recipe library is temporarily unavailable.' }, { status: 503 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: template } = await admin
    .from('recipe_public_templates')
    .select('*')
    .eq('id', ctx.params.id)
    .eq('is_published', true)
    .maybeSingle();

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const { data: existing } = await admin
    .from('recipes')
    .select('id')
    .eq('user_id', user.id)
    .eq('source_kind', 'from_public_template')
    .eq('source_ref', template.id)
    .eq('is_archived', false)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ recipe_id: existing.id, deduped: true });
  }

  const { data: recipeRow, error: recipeErr } = await admin
    .from('recipes')
    .insert({
      user_id: user.id,
      name: template.name,
      description: template.description ?? null,
      servings: template.servings,
      photo_url: template.photo_url ?? null,
      source_kind: 'from_public_template',
      source_ref: template.id,
      cuisine_tags: template.cuisine_tags ?? [],
      diet_tags: template.diet_tags ?? [],
      meal_type_tags: template.meal_type_tags ?? [],
      prep_minutes: template.prep_minutes ?? null,
      total_calories: template.total_calories ?? 0,
      total_protein_g: template.total_protein_g ?? 0,
      total_carbs_g: template.total_carbs_g ?? 0,
      total_fat_g: template.total_fat_g ?? 0,
      total_sat_fat_g: template.total_sat_fat_g ?? 0,
      total_fiber_g: template.total_fiber_g ?? 0,
      total_sugar_g: template.total_sugar_g ?? 0,
      total_sodium_mg: template.total_sodium_mg ?? 0,
      has_unmatched_ingredients: false,
      allergen_flags: template.allergen_flags ?? [],
      parser_version: RECIPE_PARSER_VERSION,
    })
    .select('id')
    .single();

  if (recipeErr || !recipeRow) {
    safeLog.error('api.recipes.templates.save', 'recipe insert failed', { error: recipeErr, userId: user.id, templateId: template.id });
    return NextResponse.json({ error: 'Could not save template' }, { status: 500 });
  }

  const recipeId = recipeRow.id;
  const templateIngredients: TemplateIngredient[] = Array.isArray(template.ingredients) ? template.ingredients : [];

  if (templateIngredients.length > 0) {
    const ingredientRows = templateIngredients.map((ing, position) => {
      const rawName = ing.raw_name ?? ing.canonical_name ?? `Ingredient ${position + 1}`;
      const normalized = normalizeIngredient(rawName);
      return {
        recipe_id: recipeId,
        position,
        raw_name: rawName,
        canonical_name: (ing.canonical_name ?? normalized.canonical_name).toLowerCase().trim(),
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
    await admin.from('recipe_ingredients').insert(ingredientRows);
  }

  if (Array.isArray(template.steps) && template.steps.length > 0) {
    const stepRows = template.steps.map((body: string, position: number) => ({
      recipe_id: recipeId,
      position,
      body,
    }));
    await admin.from('recipe_steps').insert(stepRows);
  }

  await admin
    .from('recipe_public_templates')
    .update({ save_count: (template.save_count ?? 0) + 1 })
    .eq('id', template.id);

  return NextResponse.json({ recipe_id: recipeId, from_template: template.id });
}
