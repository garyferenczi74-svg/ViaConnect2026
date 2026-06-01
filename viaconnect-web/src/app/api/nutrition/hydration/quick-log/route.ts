/**
 * Prompt 170o Phase 1 Phase B: hydration quick-log endpoint.
 *
 * Logs a hydration_only meal. Surfaces: Dashboard widget + NutriVision card
 * + FAB sheet + Detail view + meal-save-with-beverage (when the regular meal
 * save flow captures a beverage). 5-minute deduplication per spec §3.4.
 * Triggers BOS recompute (hydration as 11th source slice; v1 returns null
 * for the score component pending Phase 2 calibration after 170h ratifies).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { recomputeNutritionDimension } from '@/lib/nutrition/bos-bridge';
import {
  QuickLogRequestSchema,
  type HydrationSourceKind,
} from '@/lib/nutrition/hydration/types';
import { computeHydrationMl } from '@/lib/nutrition/hydration/hydration-ml-computer';
import {
  checkHydrationDeduplication,
} from '@/lib/nutrition/hydration/deduplication-checker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FOOD_NAME_BY_KIND: Record<HydrationSourceKind, string> = {
  pure_water: 'Water',
  coffee_tea: 'Coffee or tea',
  juice_smoothie: 'Juice',
  dairy: 'Milk',
  soda: 'Soda',
  alcohol_low: 'Beer',
  alcohol_high: 'Wine',
  sports_drink: 'Sports drink',
  high_water_food: 'High-water-content food',
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.HYDRATION_TRACKING_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'Hydration tracking is temporarily unavailable.' },
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

  const parsed = QuickLogRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { volume_ml, beverage_kind, captured_at, log_surface } = parsed.data;
  const loggedAtIso = captured_at ?? new Date().toISOString();
  const admin = createAdminClient();

  const dedup = await checkHydrationDeduplication({
    admin,
    user_id: user.id,
    beverage_kind,
    captured_at_iso: loggedAtIso,
  });

  if (dedup.deduplicated) {
    safeLog.info('api.hydration.quick_log', 'deduplicated', {
      userId: user.id,
      referenceMealId: dedup.reference_meal_id,
      surface: log_surface,
    });
    return NextResponse.json({
      meal_id: dedup.reference_meal_id,
      deduplicated: true,
      hydration_ml_logged: 0,
    });
  }

  const { data: profileRow } = await admin
    .from('profiles')
    .select('hydration_counting_mode')
    .eq('id', user.id)
    .maybeSingle();
  const countingMode = (profileRow?.hydration_counting_mode === 'adjusted'
    ? 'adjusted'
    : 'conservative') as 'conservative' | 'adjusted';

  const foodName = FOOD_NAME_BY_KIND[beverage_kind];
  const hydrationMl = computeHydrationMl({
    source_kind: beverage_kind,
    portion_volume_ml: volume_ml,
    counting_mode: countingMode,
    food_name: foodName,
  });

  const { data: mealRow, error: mealErr } = await admin
    .from('meals')
    .insert({
      user_id: user.id,
      source: 'quick_log',
      meal_kind: 'hydration_only',
      meal_type: 'snack',
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
      meal_name: foodName,
    })
    .select('meal_id')
    .single();

  if (mealErr || !mealRow) {
    safeLog.error('api.hydration.quick_log', 'meal insert failed', {
      error: mealErr,
      userId: user.id,
    });
    return NextResponse.json({ error: 'Could not save hydration log' }, { status: 500 });
  }

  const mealId = mealRow.meal_id;

  const { error: itemErr } = await admin
    .from('meal_items')
    .insert({
      meal_id: mealId,
      user_id: user.id,
      position: 0,
      food_name: foodName,
      source: 'quick_log',
      nutrient_source: 'user_entered',
      portion_grams: volume_ml,
      portion_volume_ml: volume_ml,
      hydration_source_kind: beverage_kind,
      hydration_ml: hydrationMl,
      user_modified: false,
      calories_kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    });

  if (itemErr) {
    safeLog.warn('api.hydration.quick_log', 'meal_item insert failed (meal already saved)', {
      error: itemErr,
      userId: user.id,
      mealId,
    });
  }

  if (Math.random() < 0.2) {
    try {
      const userHash = hashUserId(user.id);
      await admin.from('hydration_log_sessions').insert({
        user_hash: userHash,
        meal_id: mealId,
        log_surface,
        volume_ml,
        beverage_kind,
        was_quick_log: true,
        was_voice_input: false,
        was_deduplicated: false,
      });
    } catch (telemetryErr) {
      safeLog.warn('api.hydration.quick_log', 'telemetry insert failed (non-fatal)', {
        error: telemetryErr,
      });
    }
  }

  try {
    await recomputeNutritionDimension({
      userId: user.id,
      date: loggedAtIso.slice(0, 10),
    });
  } catch (bosErr) {
    safeLog.warn('api.hydration.quick_log', 'bos recompute failed', {
      error: bosErr,
      userId: user.id,
    });
  }

  return NextResponse.json({
    meal_id: mealId,
    hydration_ml_logged: hydrationMl,
    deduplicated: false,
  });
}

function hashUserId(userId: string): string {
  let h = 5381;
  for (let i = 0; i < userId.length; i++) {
    h = ((h << 5) + h) ^ userId.charCodeAt(i);
  }
  return Math.abs(h).toString(36);
}
