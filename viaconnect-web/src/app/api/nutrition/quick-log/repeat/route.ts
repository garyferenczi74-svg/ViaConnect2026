/**
 * Prompt 170m Phase B: Quick Log one-tap repeat endpoint.
 *
 * User tapped a Recent card. Duplicates the source meal as a new meals row
 * with repeated_from_meal_id pointing to the source, duplicates the
 * meal_items rows, fires BOS recompute. The user does NOT re-edit; this
 * is the "I had the exact thing again" affordance from spec §9.4.
 *
 * The repeated_from_meal_id link supports the frequency-weighted recency
 * ranking in the Recent row: a meal that's been repeated 3+ times surfaces
 * earlier than purely recent ones.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { recomputeNutritionDimension } from '@/lib/nutrition/bos-bridge';
import { QUICK_LOG_PARSER_VERSION } from '@/lib/nutrition/quick-log/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  source_meal_id: z.string().uuid(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  captured_at: z.string().datetime().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.QUICK_LOG_TEXT_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'Quick Log is temporarily unavailable.' },
      { status: 503 },
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { source_meal_id, captured_at } = parsed.data;
  const loggedAtIso = captured_at ?? new Date().toISOString();

  const admin = createAdminClient();

  // Look up the source meal. Verify it belongs to this user (no
  // cross-account repeat exploits).
  const { data: sourceMeal, error: sourceMealErr } = await admin
    .from('meals')
    .select('meal_id, user_id, meal_type, text_input, text_input_locale, source, total_caffeine_mg, source_confidence, calories_kcal, protein_g, carbs_g, fat_total_g, fat_healthy_g, fiber_g, sugar_g, sodium_mg')
    .eq('meal_id', source_meal_id)
    .single();

  if (sourceMealErr || !sourceMeal) {
    return NextResponse.json({ error: 'Source meal not found' }, { status: 404 });
  }
  if (sourceMeal.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (sourceMeal.source !== 'quick_log') {
    return NextResponse.json(
      { error: 'Only Quick Log meals can be repeated via this endpoint' },
      { status: 400 },
    );
  }

  const mealType = parsed.data.meal_type ?? (sourceMeal.meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack');

  const { data: newMeal, error: newMealErr } = await admin
    .from('meals')
    .insert({
      user_id: user.id,
      source: 'quick_log',
      meal_type: mealType,
      logged_at: loggedAtIso,
      source_confidence: sourceMeal.source_confidence ?? 0.85,
      calories_kcal: sourceMeal.calories_kcal ?? 0,
      calories_auto_calc: true,
      protein_g: sourceMeal.protein_g ?? 0,
      carbs_g: sourceMeal.carbs_g ?? 0,
      fat_total_g: sourceMeal.fat_total_g ?? 0,
      fat_healthy_g: sourceMeal.fat_healthy_g ?? 0,
      fiber_g: sourceMeal.fiber_g ?? 0,
      sugar_g: sourceMeal.sugar_g ?? 0,
      sodium_mg: sourceMeal.sodium_mg ?? 0,
      text_input: sourceMeal.text_input ?? null,
      text_input_locale: sourceMeal.text_input_locale ?? 'en-US',
      quick_log_parser_version: QUICK_LOG_PARSER_VERSION,
      repeated_from_meal_id: source_meal_id,
      total_caffeine_mg: sourceMeal.total_caffeine_mg ?? null,
    })
    .select('meal_id')
    .single();

  if (newMealErr || !newMeal) {
    safeLog.error('api.quick_log.repeat', 'new meal insert failed', {
      error: newMealErr,
      userId: user.id,
    });
    return NextResponse.json({ error: 'Could not duplicate meal' }, { status: 500 });
  }

  const newMealId = newMeal.meal_id;

  const { data: sourceItems, error: sourceItemsErr } = await admin
    .from('meal_items')
    .select('food_name, portion_grams, parsed_portion_grams, cooking_method, source_text_span, entry_modality_hint, caffeine_mg, recognition_confidence, position, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, cholesterol_mg, usda_fdc_id, off_barcode, curated_food_id, nutrient_source, off_product_name, off_brand, off_serving_size_g, off_completeness_score, off_nova_group, off_nutrition_grade_fr, user_overrode_macros, portion_display_unit, portion_display_value')
    .eq('meal_id', source_meal_id)
    .order('position', { ascending: true });

  if (sourceItemsErr) {
    safeLog.warn('api.quick_log.repeat', 'source items fetch failed', {
      error: sourceItemsErr,
      mealId: source_meal_id,
    });
  }

  const itemsToInsert = (sourceItems ?? []).map((it) => ({
    meal_id: newMealId,
    user_id: user.id,
    position: it.position,
    food_name: it.food_name,
    source: 'quick_log',
    nutrient_source: it.nutrient_source ?? 'user_entered',
    portion_grams: it.portion_grams,
    parsed_portion_grams: it.parsed_portion_grams,
    cooking_method: it.cooking_method,
    source_text_span: it.source_text_span,
    entry_modality_hint: 'quick_log_text',
    caffeine_mg: it.caffeine_mg,
    recognition_confidence: it.recognition_confidence,
    user_modified: false,
    calories_kcal: it.calories_kcal ?? 0,
    protein_g: it.protein_g ?? 0,
    carbs_g: it.carbs_g ?? 0,
    fat_g: it.fat_g ?? 0,
    fiber_g: it.fiber_g ?? 0,
    sugar_g: it.sugar_g ?? 0,
    sodium_mg: it.sodium_mg ?? 0,
    cholesterol_mg: it.cholesterol_mg ?? 0,
    usda_fdc_id: it.usda_fdc_id,
    off_barcode: it.off_barcode,
    curated_food_id: it.curated_food_id,
    off_product_name: it.off_product_name,
    off_brand: it.off_brand,
    off_serving_size_g: it.off_serving_size_g,
    off_completeness_score: it.off_completeness_score,
    off_nova_group: it.off_nova_group,
    off_nutrition_grade_fr: it.off_nutrition_grade_fr,
    user_overrode_macros: it.user_overrode_macros ?? false,
    portion_display_unit: it.portion_display_unit,
    portion_display_value: it.portion_display_value,
  }));

  if (itemsToInsert.length > 0) {
    const { error: itemsErr } = await admin
      .from('meal_items')
      .insert(itemsToInsert);
    if (itemsErr) {
      safeLog.warn('api.quick_log.repeat', 'item duplication failed', {
        error: itemsErr,
        newMealId,
      });
    }
  }

  try {
    await recomputeNutritionDimension({
      userId: user.id,
      date: loggedAtIso.slice(0, 10),
    });
  } catch (bosErr) {
    safeLog.warn('api.quick_log.repeat', 'bos recompute failed', {
      error: bosErr,
      userId: user.id,
    });
  }

  safeLog.info('api.quick_log.repeat', 'meal repeated', {
    userId: user.id,
    sourceMealId: source_meal_id,
    newMealId,
  });

  return NextResponse.json({
    meal_id: newMealId,
    source_meal_id,
    items_count: itemsToInsert.length,
  });
}
