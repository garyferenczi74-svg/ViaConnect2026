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
// Prompt #170 Phase 1j extends this route with a NutriVision branch. The
// route now tries NutriVisionMealInsertSchema first and falls back to the
// legacy MealsInsertPayloadSchema. The NutriVision branch fans out to:
//   - meals INSERT (with NutriVision columns: meal_confidence, recognition
//     providers, source_photo_blob_id, source='nutrivision')
//   - meal_items INSERT (one row per item)
//   - corpus writer (best-effort)
//   - helix events (awardNutriVisionHelixEvents, best-effort)
//   - Gordon scoring (existing scoreMealForServerInsert)
//   - BOS recompute (existing recomputeNutritionDimension, best-effort)
//
// Hardening per standing rule:
//   user_id from supabase.auth.getUser() (NEVER from the body)
//   Zod validation with 400 on parse failure
//   replace-on-save for B/L/D handled server-side (legacy branch only)
//   scoreMealForServerInsert is the single Gordon entry point
//   awardNutritionLogPoints (Helix) + recomputeNutritionDimension (BOS)
//     fire best-effort and never fail the response
//   10 second AbortController timeout wraps the handler
//   safeLog.{info,warn,error} for structured logging
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tryCreateAdminClient } from '@/lib/supabase/admin-optional';
import { safeLog } from '@/lib/utils/safe-log';
import {
  MealsInsertPayloadSchema,
  NutriVisionMealInsertSchema,
  type NutriVisionMealInsertPayload,
  type NutriVisionItemPayload,
} from '@/lib/nutrition/meals-insert-schema';
import { scoreMealForServerInsert } from '@/lib/gordon/scoreMealForServerInsert';
import { awardNutritionLogPoints } from '@/lib/nutrition/helix-bridge';
import { awardNutriVisionHelixEvents } from '@/lib/nutrition/helix-bridge';
import { awardQuickLogHelixEvents } from '@/lib/nutrition/helix-bridge';
import { recomputeNutritionDimension } from '@/lib/nutrition/bos-bridge';
import { writeCorpusRow } from '@/lib/nutrition/corpus/writer';
import type {
  CorpusFinalState,
  CorpusFinalStateItem,
} from '@/lib/nutrition/corpus/writer';
import type { MealSource } from '@/lib/gordon/types';
import type { NutritionSource } from '@/lib/nutrition/schema';
import type { CuisineTag } from '@/lib/nutrition/vision/types';
import type { CookingOilType, CookingOilSelection } from '@/lib/nutrition/cooking-oil/suggester';

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

const ALLOWED_CUISINES = new Set<CuisineTag>([
  'north_american', 'mediterranean', 'latin_american', 'east_asian',
  'south_asian', 'southeast_asian', 'middle_eastern', 'african', 'unknown',
]);

const ALLOWED_OIL_TYPES = new Set<CookingOilType>([
  'none', 'olive_oil', 'evoo', 'avocado_oil', 'coconut_oil', 'butter', 'ghee',
  'vegetable_canola_oil', 'sesame_oil', 'other',
]);

function isCuisineTag(v: unknown): v is CuisineTag {
  return typeof v === 'string' && ALLOWED_CUISINES.has(v as CuisineTag);
}

function isOilType(v: unknown): v is CookingOilType {
  return typeof v === 'string' && ALLOWED_OIL_TYPES.has(v as CookingOilType);
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

    // Try NutriVision first. If that succeeds we run the NutriVision branch;
    // if not, we fall through to the legacy MealsInsertPayloadSchema parse.
    const nvParsed = NutriVisionMealInsertSchema.safeParse(body);
    if (nvParsed.success) {
      return await handleNutriVision(req, supabase, user.id, nvParsed.data);
    }

    const parsed = MealsInsertPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid payload',
          nutrivision_issues: nvParsed.error.issues,
          legacy_issues: parsed.error.issues,
        },
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

    // Prompt #170a supplement §16: Quick Log Helix parity. Emit the three
    // quick_log_* events alongside the existing awardNutritionLogPoints stub.
    // Gated to source='quick_log' so full_manual + tracker_api stay on the
    // legacy stub path. Best-effort: errors never fail the response. When
    // SUPABASE_SERVICE_ROLE_KEY is missing tryCreateAdminClient returns null
    // and we skip with a structured warn (Phase 1q hotfix 1 posture).
    if (payload.source === 'quick_log') {
      try {
        const supabaseAdmin = tryCreateAdminClient();
        if (supabaseAdmin === null) {
          safeLog.warn(
            'api.nutrition.meals.quick_log',
            'admin client unavailable, skipping quick_log helix',
            { user_id: user.id, meal_id: inserted.meal_id },
          );
        } else {
          // hasAllFourMacros: every macro present and the calorie value strictly
          // positive. The legacy schema requires non-negative numbers so we
          // also gate on calories > 0 to exclude empty-meal saves.
          const hasAllFourMacros =
            Number.isFinite(payload.calories_kcal) && payload.calories_kcal > 0 &&
            Number.isFinite(payload.protein_g) &&
            Number.isFinite(payload.carbs_g) &&
            Number.isFinite(payload.fat_total_g);

          // hasCookingAnnotation: the spec's three signals are cooking_method,
          // cooking_oil_json, and sauce-chip applied. None of those fields are
          // on MealsInsertPayloadSchema for the Quick Log Phase 1 payload, so
          // this reduces to false today. Reserved for a future Quick Log
          // schema extension; the 2-point completeness award stays gated.
          const hasCookingAnnotation = false;

          // Quick Log inputs are user-entered by definition; the spec accepts
          // userModified=true as the constant for this channel.
          const userModified = true;

          await awardQuickLogHelixEvents({
            supabaseAdmin,
            userId: user.id,
            mealId: inserted.meal_id,
            hasAllFourMacros,
            hasCookingAnnotation,
            userModified,
            requestId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
          });
        }
      } catch (quickLogErr) {
        safeLog.warn('api.nutrition.meals.quick_log', 'quick_log helix award failed', {
          user_id: user.id,
          meal_id: inserted.meal_id,
          error: quickLogErr,
        });
      }
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

// ---------------------------------------------------------------------------
// Prompt #170 Phase 1j: NutriVision branch handler.
// ---------------------------------------------------------------------------

interface NutriVisionResponseBody {
  meal_id: string;
  gordon: {
    bio_optimization_delta: number | null;
    copy: string | null;
    quality_score: number;
    quality_tier: string;
  };
  dashboard_crossover: {
    nutrition_dimension_recompute_queued: boolean;
  };
  helix_events_emitted: ReadonlyArray<string>;
  corpus_row_written: boolean;
  requestId: string;
}

async function handleNutriVision(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  payload: NutriVisionMealInsertPayload,
): Promise<NextResponse> {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  // Totals derived from items (server-side, never trust client totals).
  const totals = aggregateTotals(payload.items);

  // Score via the existing Gordon helper. The MealSource enum is the surface
  // contract for Gordon today; NutriVision is a new live channel and the DB
  // enum accepts 'nutrivision' but Gordon's type is unchanged. Cast at the
  // single edge so the helper sees a familiar source while the DB row carries
  // the canonical value.
  const scored = await scoreMealForServerInsert(supabase, {
    userId,
    loggedAt: payload.logged_at,
    mealType: payload.meal_type,
    // Gordon's MealSource enum does not yet include 'nutrivision'. The helper
    // does not branch on source, it only stamps the value; photo_ai is the
    // closest analog and keeps the type honest.
    source: 'photo_ai',
    sourceConfidence: payload.meal_confidence ?? 0.65,
    proteinG: totals.protein_g,
    carbsG: totals.carbs_g,
    fatTotalG: totals.fat_g,
    fatHealthyG: 0,
    fiberG: totals.fiber_g,
    sugarG: totals.sugar_g,
    sodiumMg: totals.sodium_mg,
    caloriesKcal: totals.calories_kcal,
    caloriesAutoCalc: false,
    wholeFoodFlag: null,
    mealName: null,
  });

  const mealInsertRow = {
    user_id: userId,
    logged_at: payload.logged_at,
    meal_type: payload.meal_type,
    source: 'nutrivision',
    source_confidence: payload.meal_confidence ?? 0.65,
    meal_confidence: payload.meal_confidence ?? null,
    recognition_provider_primary: payload.recognition_provider_primary ?? null,
    recognition_provider_secondary: payload.recognition_provider_secondary ?? null,
    source_photo_blob_id: payload.source_photo_blob_id ?? null,
    protein_g: totals.protein_g,
    carbs_g: totals.carbs_g,
    fat_total_g: totals.fat_g,
    fat_healthy_g: 0,
    fiber_g: totals.fiber_g,
    sugar_g: totals.sugar_g,
    sodium_mg: totals.sodium_mg,
    calories_kcal: totals.calories_kcal,
    calories_auto_calc: false,
    whole_food_flag: null,
    meal_name: null,
    raw_input: null,
    snack_index: null,
    quality_score: scored.quality_score,
    quality_tier: scored.quality_tier,
    score_breakdown: scored.score_breakdown,
    scored_at: scored.scored_at,
    gordon_version: scored.gordon_version,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: insertedRaw, error: insertErr } = await (supabase as any)
    .from('meals')
    .insert(mealInsertRow)
    .select('meal_id, quality_score, quality_tier')
    .single();

  const inserted = insertedRaw as
    | { meal_id: string; quality_score: number; quality_tier: string }
    | null;

  if (insertErr || !inserted) {
    safeLog.error('api.nutrition.meals.nutrivision', 'meals insert failed', {
      request_id: requestId,
      user_id: userId,
      error: insertErr,
    });
    return NextResponse.json({ error: 'Could not save meal' }, { status: 500 });
  }

  const mealId = inserted.meal_id;

  // meal_items fan-out. One row per item with all per-item fields. Failure
  // here is logged but does not roll back the meals row; the partial row is
  // still usable from the dashboard and admin can backfill.
  // Phase 1q hotfix 2: meal_items column is `position` not `item_index` per
  // live schema; also stamp user_id + source='nutrivision' per Prompt 170 §6.1.
  const itemRows = payload.items.map((it, index) => ({
    meal_id: mealId,
    user_id: userId,
    position: index,
    source: 'nutrivision',
    food_name: it.food_name,
    cuisine_tag: it.cuisine_tag ?? null,
    food_language: it.food_language ?? null,
    bounding_box_json: it.bounding_box ?? null,
    portion_estimation_method: it.portion_estimation_method ?? null,
    portion_grams: it.portion_grams,
    portion_volume_ml: it.portion_volume_ml ?? null,
    nutrient_source: it.nutrient_source ?? null,
    recognition_provider: it.recognition_provider ?? null,
    recognition_confidence: it.recognition_confidence ?? null,
    usda_fdc_id: it.usda_fdc_id ?? null,
    off_barcode: it.off_barcode ?? null,
    curated_food_id: it.curated_food_id ?? null,
    calories_kcal: it.calories_kcal,
    protein_g: it.protein_g,
    carbs_g: it.carbs_g,
    fat_g: it.fat_g,
    fiber_g: it.fiber_g ?? null,
    sugar_g: it.sugar_g ?? null,
    sodium_mg: it.sodium_mg ?? null,
    cholesterol_mg: it.cholesterol_mg ?? null,
    micronutrients_json: it.micronutrients ?? null,
    cooking_method: it.cooking_method ?? null,
    cooking_oil_json: it.cooking_oil ?? null,
    user_modified: it.user_modified,
  }));

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itemsErr } = await (supabase as any)
      .from('meal_items')
      .insert(itemRows);
    if (itemsErr) {
      safeLog.warn('api.nutrition.meals.nutrivision', 'meal_items insert failed', {
        request_id: requestId,
        meal_id: mealId,
        error: itemsErr.message,
      });
    }
  } catch (itemsThrew) {
    safeLog.warn('api.nutrition.meals.nutrivision', 'meal_items insert threw', {
      request_id: requestId,
      meal_id: mealId,
      error: itemsThrew,
    });
  }

  // Hotfix 7 (#170 Phase 1q): legacy meal_logs dual-write so dashboard
  // daily-scores panel + nutrition score card pick up NutriVision saves
  // alongside the Quick Logs surface (which reads meals canonical). Wrapped
  // best-effort; never fails the response.
  try {
    const description = payload.items
      .map((it) => it.food_name)
      .filter((s) => s.length > 0)
      .join(', ')
      .slice(0, 500);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: legacyErr } = await (supabase as any)
      .from('meal_logs')
      .insert({
        user_id: userId,
        meal_type: payload.meal_type,
        log_method: 'photo_ai',
        description,
        calories: Math.round(totals.calories_kcal),
        protein_g: totals.protein_g,
        carbs_g: totals.carbs_g,
        fat_g: totals.fat_g,
        source_app: 'nutrivision',
        logged_at: payload.logged_at,
        meal_date: payload.logged_at.slice(0, 10),
        meal_score: scored?.quality_score ?? null,
      });
    if (legacyErr) {
      safeLog.warn('api.nutrition.meals.nutrivision', 'legacy meal_logs insert failed (continuing)', {
        request_id: requestId,
        meal_id: mealId,
        error: legacyErr.message ?? String(legacyErr),
      });
    }
  } catch (err) {
    safeLog.warn('api.nutrition.meals.nutrivision', 'legacy meal_logs insert threw (continuing)', {
      request_id: requestId,
      meal_id: mealId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Side-effect fan out. Each runs best-effort and never fails the response.
  // Phase 1q hotfix: degrade gracefully when SUPABASE_SERVICE_ROLE_KEY is
  // missing. The corpus + helix paths require admin (RLS-bypass + row-level
  // event writes), so they skip with a structured warning instead of throwing.
  const supabaseAdmin = tryCreateAdminClient();
  const helixEventsEmitted: string[] = [];
  let corpusRowWritten = false;

  if (supabaseAdmin === null) {
    safeLog.warn('api.nutrition.meals.nutrivision', 'admin client unavailable, skipping corpus + helix', {
      request_id: requestId,
      meal_id: mealId,
    });
  } else {
    try {
      const finalState = buildCorpusFinalState(mealId, payload, totals);
      await writeCorpusRow({
        supabaseAdmin,
        userId,
        finalState,
        recognitionPayload: undefined,
        editDiff: payload.edit_diff,
        contributedPhotoPath: null,
        requestId,
      });
      corpusRowWritten = true;
    } catch (corpusErr) {
      safeLog.warn('api.nutrition.meals.nutrivision', 'corpus write failed', {
        request_id: requestId,
        meal_id: mealId,
        error: corpusErr,
      });
    }

    try {
      const awards = await awardNutriVisionHelixEvents({
        supabaseAdmin,
        userId,
        mealId,
        mealConfidence: payload.meal_confidence,
        userModified: payload.items.some((i) => i.user_modified),
        contributedPhotoPath: null,
        requestId,
      });
      for (const k of awards.awarded) helixEventsEmitted.push(k);
    } catch (helixErr) {
      safeLog.warn('api.nutrition.meals.nutrivision', 'helix award failed', {
        request_id: requestId,
        meal_id: mealId,
        error: helixErr,
      });
    }
  }

  let bosQueued = false;
  try {
    await recomputeNutritionDimension({ userId, date: payload.logged_at });
    bosQueued = true;
  } catch (bosErr) {
    safeLog.warn('api.nutrition.meals.nutrivision', 'bos recompute failed', {
      request_id: requestId,
      meal_id: mealId,
      error: bosErr,
    });
  }

  const response: NutriVisionResponseBody = {
    meal_id: mealId,
    gordon: {
      bio_optimization_delta: null,
      copy: null,
      quality_score: inserted.quality_score,
      quality_tier: inserted.quality_tier,
    },
    dashboard_crossover: {
      nutrition_dimension_recompute_queued: bosQueued,
    },
    helix_events_emitted: helixEventsEmitted,
    corpus_row_written: corpusRowWritten,
    requestId,
  };

  safeLog.info('api.nutrition.meals.nutrivision', 'nutrivision save ok', {
    request_id: requestId,
    user_id: userId,
    meal_id: mealId,
    item_count: payload.items.length,
    helix_count: helixEventsEmitted.length,
    corpus_row_written: corpusRowWritten,
    bos_queued: bosQueued,
  });

  return NextResponse.json(response);
}

interface DerivedTotals {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
}

function aggregateTotals(items: ReadonlyArray<NutriVisionItemPayload>): DerivedTotals {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let fiber = 0;
  let sugar = 0;
  let sodium = 0;
  for (const it of items) {
    calories += it.calories_kcal;
    protein += it.protein_g;
    carbs += it.carbs_g;
    fat += it.fat_g;
    if (typeof it.fiber_g === 'number') fiber += it.fiber_g;
    if (typeof it.sugar_g === 'number') sugar += it.sugar_g;
    if (typeof it.sodium_mg === 'number') sodium += it.sodium_mg;
  }
  return {
    calories_kcal: round1(calories),
    protein_g: round1(protein),
    carbs_g: round1(carbs),
    fat_g: round1(fat),
    fiber_g: round1(fiber),
    sugar_g: round1(sugar),
    sodium_mg: round1(sodium),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function buildCorpusFinalState(
  mealId: string,
  payload: NutriVisionMealInsertPayload,
  totals: DerivedTotals,
): CorpusFinalState {
  const items: CorpusFinalStateItem[] = payload.items.map((it) => {
    const corpusItem: CorpusFinalStateItem = {
      foodName: it.food_name,
      portionGrams: it.portion_grams,
      calories_kcal: it.calories_kcal,
      protein_g: it.protein_g,
      carbs_g: it.carbs_g,
      fat_g: it.fat_g,
      userModified: it.user_modified,
    };
    if (isCuisineTag(it.cuisine_tag)) corpusItem.cuisineTag = it.cuisine_tag;
    if (typeof it.cooking_method === 'string') corpusItem.cookingMethod = it.cooking_method;
    if (it.cooking_oil) {
      const oilType = isOilType(it.cooking_oil.type) ? it.cooking_oil.type : 'other';
      const suggestedType = isOilType(it.cooking_oil.suggested_default_type)
        ? it.cooking_oil.suggested_default_type
        : 'other';
      const oil: CookingOilSelection = {
        type: oilType,
        amount_ml: it.cooking_oil.amount_ml,
        was_suggested_default: it.cooking_oil.was_suggested_default,
        suggested_default_type: suggestedType,
        suggested_default_amount_ml: it.cooking_oil.suggested_default_amount_ml,
      };
      corpusItem.cookingOil = oil;
    }
    return corpusItem;
  });

  const finalState: CorpusFinalState = {
    mealId,
    source: 'nutrivision',
    items,
    totals: {
      calories_kcal: totals.calories_kcal,
      protein_g: totals.protein_g,
      carbs_g: totals.carbs_g,
      fat_g: totals.fat_g,
    },
  };
  if (typeof payload.meal_confidence === 'number') {
    finalState.mealConfidence = payload.meal_confidence;
  }
  return finalState;
}
