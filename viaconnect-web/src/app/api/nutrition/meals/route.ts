// Prompt #168d: POST /api/nutrition/meals.
//
// Single server entry point for nutrition channels:
//   quick_log:    inline Quick Logs accordion (path 1)
//   photo_ai:     analyze-photo writes via scoreMealForServerInsert directly
//                 today; future migration may consolidate to this route
//   tracker_api:  partner webhook deferred to #168e (path 4)
//   full_manual:  LEGACY analyze-text path is the #168c exception and does
//                 NOT call this route. Source enum accepts it for parity.
//
// Hardening per standing rule:
//   user_id from supabase.auth.getUser() (NEVER from the body)
//   Zod validation with 400 on parse failure
//   replace-on-save for B/L/D handled server-side
//   scoreMealForServerInsert is the single Gordon entry point
//   awardNutritionLogPoints (Helix) + recomputeNutritionDimension (BOS)
//     fire best-effort and never fail the response
//   10 second AbortController timeout wraps the handler
//   safeLog.{info,warn,error} for structured logging

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { MealsInsertPayloadSchema } from '@/lib/nutrition/meals-insert-schema';
import { scoreMealForServerInsert } from '@/lib/gordon/scoreMealForServerInsert';
import { awardNutritionLogPoints } from '@/lib/nutrition/helix-bridge';
import { recomputeNutritionDimension } from '@/lib/nutrition/bos-bridge';
import type { MealSource } from '@/lib/gordon/types';
import type { NutritionSource } from '@/lib/nutrition/schema';

// The Helix bridge expects the legacy NutritionSource enum (manual_text,
// photo_ai, barcode, imported, quick_calories). The new meals route uses
// MealSource (quick_log, full_manual, photo_ai, tracker_api, wearable_cgm).
// Map at the call site so the bridge contract stays typed. When the
// production Helix integration upgrades to MealSource, this is the
// single edit point.
function mealSourceToNutritionSource(source: MealSource): NutritionSource {
  switch (source) {
    case 'quick_log':    return 'quick_calories';
    case 'full_manual':  return 'manual_text';
    case 'photo_ai':     return 'photo_ai';
    case 'tracker_api':  return 'imported';
    case 'wearable_cgm': return 'imported';
  }
}

export async function POST(req: NextRequest) {
  // @supabase/supabase-js v2 does not natively accept an AbortSignal for
  // .from(...) query chains, so this timeout guards the surrounding awaits
  // (Helix + BOS bridges + any future signal support) rather than aborting
  // the SQL itself. The hard cap is still enforced because anything past
  // 10s will throw a TimeoutError out of one of the awaited promises.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = MealsInsertPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const startOfDay = new Date(payload.logged_at);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    // Replace-on-save for B/L/D: one entry per type per day. Snacks stack
    // via snack_index so they skip this step.
    if (payload.meal_type !== 'snack') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deleteErr } = await (supabase as any)
        .from('meals')
        .delete()
        .eq('user_id', user.id)
        .eq('meal_type', payload.meal_type)
        .gte('logged_at', startOfDay.toISOString())
        .lt('logged_at', endOfDay.toISOString());
      if (deleteErr) {
        safeLog.warn('api.nutrition.meals', 'replace-on-save delete failed (continuing)', {
          userId: user.id,
          mealType: payload.meal_type,
          error: deleteErr,
        });
      }
    }

    const scored = await scoreMealForServerInsert(supabase, {
      userId: user.id,
      loggedAt: payload.logged_at,
      mealType: payload.meal_type,
      source: payload.source,
      sourceConfidence: payload.source_confidence,
      proteinG: payload.protein_g,
      carbsG: payload.carbs_g,
      fatTotalG: payload.fat_total_g,
      fatHealthyG: payload.fat_healthy_g,
      fiberG: payload.fiber_g,
      sugarG: payload.sugar_g,
      sodiumMg: payload.sodium_mg,
      caloriesKcal: payload.calories_kcal,
      caloriesAutoCalc: payload.calories_auto_calc,
      wholeFoodFlag: payload.whole_food_flag,
      mealName: payload.meal_name,
    });

    const insertRow = {
      user_id: user.id,
      logged_at: payload.logged_at,
      meal_type: payload.meal_type,
      source: payload.source,
      source_confidence: payload.source_confidence,
      protein_g: payload.protein_g,
      carbs_g: payload.carbs_g,
      fat_total_g: payload.fat_total_g,
      fat_healthy_g: payload.fat_healthy_g,
      fiber_g: payload.fiber_g,
      sugar_g: payload.sugar_g,
      sodium_mg: payload.sodium_mg,
      calories_kcal: payload.calories_kcal,
      calories_auto_calc: payload.calories_auto_calc,
      whole_food_flag: payload.whole_food_flag,
      meal_name: payload.meal_name,
      raw_input: payload.raw_input,
      snack_index: payload.snack_index,
      quality_score: scored.quality_score,
      quality_tier: scored.quality_tier,
      score_breakdown: scored.score_breakdown,
      scored_at: scored.scored_at,
      gordon_version: scored.gordon_version,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: insertedRaw, error: insertErr } = await (supabase as any)
      .from('meals')
      .insert(insertRow)
      .select('meal_id, quality_score, quality_tier')
      .single();

    const inserted = insertedRaw as { meal_id: string; quality_score: number; quality_tier: string } | null;

    if (insertErr || !inserted) {
      safeLog.error('api.nutrition.meals', 'insert failed', { userId: user.id, error: insertErr });
      return NextResponse.json({ error: 'Could not save meal' }, { status: 500 });
    }

    try {
      await awardNutritionLogPoints({
        userId: user.id,
        source: mealSourceToNutritionSource(payload.source),
      });
    } catch (rewardErr) {
      safeLog.warn('api.nutrition.meals', 'helix award failed', { userId: user.id, error: rewardErr });
    }

    try {
      await recomputeNutritionDimension({ userId: user.id, date: payload.logged_at });
    } catch (bosErr) {
      safeLog.warn('api.nutrition.meals', 'bos recompute failed', { userId: user.id, error: bosErr });
    }

    return NextResponse.json({
      meal_id: inserted.meal_id,
      quality_score: inserted.quality_score,
      quality_tier: inserted.quality_tier,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      safeLog.warn('api.nutrition.meals', 'timeout 10s', { error: err });
      return NextResponse.json({ error: 'Save timed out' }, { status: 504 });
    }
    safeLog.error('api.nutrition.meals', 'unexpected', { error: err });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  } finally {
    clearTimeout(timeoutId);
  }
}
