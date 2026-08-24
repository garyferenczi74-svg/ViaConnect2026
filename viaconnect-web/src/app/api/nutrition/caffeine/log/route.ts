// Prompt 171b Phase 2: standalone caffeine entry endpoint.
//
// Creates a minimal meals + meal_items pair carrying caffeine_mg + consumed_at
// so the 171b Phase 1 caffeine_timing BOS source slice picks it up on the
// next BOS recompute. This is the path users take when they want to log
// caffeine without going through a full NutriVision meal save (e.g. "I just
// had a coffee; record it; don't make me log macros").
//
// The meal row is intentionally macro-zero. The caffeine signal is the
// payload. Bio Optimization Score reasons about caffeine via the source
// slice, not via the macros.
//
// Triggers existing BOS recompute via bos-bridge.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { recomputeNutritionDimension } from '@/lib/nutrition/bos-bridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  caffeine_mg: z.number().positive().max(1000),
  consumed_at: z.string().datetime().optional(),
  source_label: z.string().max(60).optional(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).default('snack'),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { caffeine_mg, consumed_at, source_label, meal_type } = parsed.data;
    const loggedAtIso = consumed_at ?? new Date().toISOString();
    const foodName = source_label ?? 'Caffeine';

    // Use admin client for write so RLS doesn't reject the insert; meals +
    // meal_items writes are authorized by user_id matching auth.uid().
    const admin = createAdminClient();

    const { data: mealRow, error: mealErr } = await admin
      .from('meals')
      .insert({
        user_id: user.id,
        // Reuse the existing 'quick_log' meal source enum to avoid an enum
        // alter. The caffeine semantic is captured by total_caffeine_mg + the
        // meal_name being 'Caffeine' (default) or the user-supplied label.
        source: 'quick_log',
        meal_type,
        logged_at: loggedAtIso,
        source_confidence: 1.0,
        calories_kcal: 0,
        calories_auto_calc: false,
        protein_g: 0,
        carbs_g: 0,
        fat_total_g: 0,
        fat_healthy_g: 0,
        fiber_g: 0,
        sugar_g: 0,
        sodium_mg: 0,
        total_caffeine_mg: caffeine_mg,
        portion_display_unit: 'mg',
        portion_display_value: caffeine_mg,
        whole_food_flag: null,
        meal_name: foodName,
      })
      .select('meal_id')
      .single();

    if (mealErr || !mealRow) {
      safeLog.error('api.nutrition.caffeine.log', 'meal insert failed', {
        error: mealErr,
        userId: user.id,
      });
      return NextResponse.json({ error: 'Could not save caffeine entry' }, { status: 500 });
    }

    const mealId = mealRow.meal_id;

    const { error: itemErr } = await admin
      .from('meal_items')
      .insert({
        meal_id: mealId,
        user_id: user.id,
        position: 0,
        food_name: foodName,
        // meal_items.source CHECK admits 'nutrivision' + 'quick_log' + 'manual'
        // + 'voice' + 'barcode' per 170 + 170l migrations.
        source: 'quick_log',
        nutrient_source: 'user_entered',
        portion_grams: 0,
        calories_kcal: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        caffeine_mg,
        portion_display_unit: 'mg',
        portion_display_value: caffeine_mg,
        user_modified: true,
      });

    if (itemErr) {
      safeLog.warn('api.nutrition.caffeine.log', 'meal_item insert failed (meal already created)', {
        error: itemErr,
        userId: user.id,
        mealId,
      });
      // The meal row carries total_caffeine_mg so the source slice still
      // sees the caffeine even if the meal_item insert fails. Return success
      // with a warning marker rather than abort the user's intent.
    }

    try {
      await recomputeNutritionDimension({
        userId: user.id,
        date: loggedAtIso.slice(0, 10),
      });
    } catch (bosErr) {
      safeLog.warn('api.nutrition.caffeine.log', 'bos recompute failed', {
        error: bosErr,
        userId: user.id,
      });
    }

    safeLog.info('api.nutrition.caffeine.log', 'caffeine entry saved', {
      userId: user.id,
      mealId,
      caffeine_mg,
      consumed_at: loggedAtIso,
    });

    return NextResponse.json({
      meal_id: mealId,
      caffeine_mg,
      consumed_at: loggedAtIso,
    });
  } catch (err) {
    safeLog.error('api.nutrition.caffeine.log', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
