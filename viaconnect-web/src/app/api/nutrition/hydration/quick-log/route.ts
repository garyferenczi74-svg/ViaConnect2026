/**
 * Prompt 170o Phase 1 Phase B: hydration quick-log endpoint.
 *
 * Logs a hydration_only meal. Surfaces: Dashboard widget + NutriVision card
 * + FAB sheet + Detail view + meal-save-with-beverage (when the regular meal
 * save flow captures a beverage). 5-minute deduplication per spec §3.4.
 * Triggers BOS recompute (hydration as 11th source slice; v1 returns null
 * for the score component pending Phase 2 calibration after 170h ratifies).
 *
 * Prompt 172e Phase C: when the request body carries a beverage_slug from
 * the BeveragePicker, the route looks up the catalog row, computes the
 * effective caffeine mg, applies the alcohol diuretic reduction when the
 * row is alcoholic and the user is above the daily threshold, and persists
 * beverage_catalog_slug + caffeine_mg on the inserted meal_items row.
 * The 171b caffeine engine reads meal_items.caffeine_mg directly so no
 * engine touch is required. The legacy quick log buttons that pass only
 * beverage_kind continue to work unchanged.
 *
 * Prompt 172e Phase F: when a catalog driven log lands (beverage_slug
 * present, not deduplicated), the route attaches three coarse signal
 * columns to the existing 20pct sampled telemetry insert
 * (beverage_catalog_slug, effective_volume_bucket,
 * caffeine_contributed_flag) and emits the
 * nutrivision_hydration_catalog_log Helix event. If the post log distinct
 * catalog category count for the day just hit 3, the route also emits
 * nutrivision_hydration_catalog_diversity_3 (once_per_day frequency
 * limit handled by the earning engine). Telemetry never carries the
 * safety mode boolean and never carries raw mg values per spec section
 * 12. Helix events stay consumer portal only by inheritance.
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
import {
  computeEffectiveCaffeineMg,
  shouldAttributeCaffeineForBeverageSlug,
} from '@/lib/nutrition/hydration/caffeine-attribution';
import {
  applyAlcoholDiureticReduction,
  getAlcoholDiureticThresholdDrinks,
  ALCOHOL_DIURETIC_FLOOR,
} from '@/lib/nutrition/hydration/alcohol-config';
import {
  buildPhaseFTelemetryFields,
} from '@/lib/nutrition/hydration/phase-f-telemetry';
import {
  countDistinctCatalogCategoriesToday,
  shouldFireDiversity3,
} from '@/lib/nutrition/hydration/phase-f-helix';
import { creditEarning } from '@/lib/helix/earning-engine';
import type { PricingSupabaseClient } from '@/lib/pricing/supabase-types';

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

interface CatalogRowForLog {
  slug: string;
  display_name: string;
  default_volume_ml: number;
  caffeine_mg_per_serving: number;
  is_alcoholic: boolean;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Prompt 177m (2026-06-09): 170o launch gate removed. The env var
  // HYDRATION_TRACKING_ENABLED was never set to 'true' in production
  // and every hydration log POST short circuited with a 503 before
  // touching the database; the UI therefore appeared to do nothing.
  // Hydration is GA and ships unconditionally; rollback now flows
  // through the same channels every other GA feature uses.

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

  const { volume_ml, beverage_kind, captured_at, log_surface, beverage_slug } = parsed.data;
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

  // Phase C: hydrate the catalog row when a slug is present so we can
  // attribute caffeine + apply the alcohol diuretic reduction. The slug
  // is optional so the legacy quick log buttons that pass only
  // beverage_kind continue to work unchanged.
  let catalogRow: CatalogRowForLog | null = null;
  if (beverage_slug) {
    const { data: catalogData, error: catalogErr } = await admin
      .from('beverage_catalog')
      .select('slug, display_name, default_volume_ml, caffeine_mg_per_serving, is_alcoholic')
      .eq('slug', beverage_slug)
      .eq('is_active', true)
      .maybeSingle();
    if (catalogErr) {
      safeLog.warn('api.hydration.quick_log', 'catalog lookup failed (continuing without caffeine attribution)', {
        error: catalogErr,
        userId: user.id,
        beverage_slug,
      });
    } else if (catalogData) {
      catalogRow = catalogData as CatalogRowForLog;
    }
  }

  // Phase C: catalog display_name wins over the legacy kind based name so
  // the timeline and edit panel show "Cold Brew Coffee" instead of the
  // generic "Coffee or tea" when the user picks via the catalog.
  const foodName = catalogRow?.display_name ?? FOOD_NAME_BY_KIND[beverage_kind];

  let hydrationMl = computeHydrationMl({
    source_kind: beverage_kind,
    portion_volume_ml: volume_ml,
    counting_mode: countingMode,
    food_name: foodName,
  });

  // Phase C Workstream 2: apply the dose dependent diuretic reduction
  // when the row is alcoholic. The math runs in every mode; the COPY
  // (alcohol diuretic threshold note) is suppressed in safety mode by
  // the picker layer per shouldShowDiureticCopy.
  if (catalogRow?.is_alcoholic && hydrationMl > 0) {
    const drinksToday = await countDailyAlcoholicDrinks({
      admin,
      user_id: user.id,
      day_anchor_iso: loggedAtIso,
    });
    const threshold = getAlcoholDiureticThresholdDrinks();
    const reduced = applyAlcoholDiureticReduction(
      hydrationMl,
      drinksToday,
      threshold,
      ALCOHOL_DIURETIC_FLOOR,
    );
    hydrationMl = Math.round(reduced * 100) / 100;
  }

  // Phase C Workstream 1: compute the effective caffeine for the logged
  // serving. The 171b engine reads meal_items.caffeine_mg directly on
  // its next scoring pass; no engine touch required.
  const effectiveCaffeineMg = catalogRow
    ? computeEffectiveCaffeineMg({
        caffeine_mg_per_serving: catalogRow.caffeine_mg_per_serving,
        default_volume_ml: catalogRow.default_volume_ml,
        volume_ml,
      })
    : 0;
  const attributeCaffeine = shouldAttributeCaffeineForBeverageSlug({
    deduplicated: false, // the dedup short circuit returned above; this branch is the non dedup path
    beverage_kind,
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

  const mealItemInsert: Record<string, unknown> = {
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
  };
  if (beverage_slug && catalogRow) {
    mealItemInsert.beverage_catalog_slug = beverage_slug;
  }
  if (attributeCaffeine && effectiveCaffeineMg > 0) {
    mealItemInsert.caffeine_mg = effectiveCaffeineMg;
  }

  const { error: itemErr } = await admin
    .from('meal_items')
    .insert(mealItemInsert);

  if (itemErr) {
    safeLog.warn('api.hydration.quick_log', 'meal_item insert failed (meal already saved)', {
      error: itemErr,
      userId: user.id,
      mealId,
    });
  }

  // Phase F: compute the three coarse signal columns. These ride on the
  // existing 20pct sampled telemetry insert below and inform the Helix
  // diversity_3 check. Spec section 12 forbidden fields
  // (safety_mode_enabled, raw mg values, user_id beyond user_hash) are
  // never present in the helper output.
  const phaseFFields = buildPhaseFTelemetryFields({
    beverage_slug: beverage_slug ?? null,
    volume_ml,
    effective_caffeine_mg: effectiveCaffeineMg,
    attribute_caffeine: attributeCaffeine,
  });

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
        beverage_catalog_slug: phaseFFields.beverage_catalog_slug,
        effective_volume_bucket: phaseFFields.effective_volume_bucket,
        caffeine_contributed_flag: phaseFFields.caffeine_contributed_flag,
      });
    } catch (telemetryErr) {
      safeLog.warn('api.hydration.quick_log', 'telemetry insert failed (non-fatal)', {
        error: telemetryErr,
      });
    }
  }

  // Phase F: emit Helix events on catalog driven logs only. Legacy 170o
  // quick log button paths (no beverage_slug) fall through unchanged. A
  // dedup hit short circuited above so this branch is the genuine new
  // log path. Each event is fire and forget: a failure logs a warning
  // and does not block the response. The diversity_3 event fires only
  // when the post log distinct category count is exactly 3
  // (shouldFireDiversity3); counts of 1, 2 are not at threshold yet and
  // counts of 4+ already crossed earlier in the day (the once_per_day
  // frequency limit handled by the earning engine catches re emissions
  // either way; the route gate keeps the call volume tight).
  if (beverage_slug && catalogRow) {
    const pricingClient = admin as unknown as PricingSupabaseClient;
    try {
      await creditEarning(pricingClient, {
        userId: user.id,
        eventTypeId: 'nutrivision_hydration_catalog_log',
        referenceId: mealId,
        metadata: {
          source: 'hydration_quick_log',
          beverage_catalog_slug: beverage_slug,
        },
      });
    } catch (helixErr) {
      safeLog.warn('api.hydration.quick_log', 'catalog_log helix award failed (non-fatal)', {
        error: helixErr,
        userId: user.id,
      });
    }

    try {
      const distinctCount = await countDistinctCatalogCategoriesToday({
        admin,
        user_id: user.id,
        day_anchor_iso: loggedAtIso,
      });
      if (shouldFireDiversity3(distinctCount)) {
        await creditEarning(pricingClient, {
          userId: user.id,
          eventTypeId: 'nutrivision_hydration_catalog_diversity_3',
          referenceId: mealId,
          metadata: {
            source: 'hydration_quick_log',
            beverage_catalog_slug: beverage_slug,
            post_log_distinct_categories: distinctCount,
          },
        });
      }
    } catch (helixErr) {
      safeLog.warn('api.hydration.quick_log', 'diversity_3 helix award failed (non-fatal)', {
        error: helixErr,
        userId: user.id,
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

/**
 * Phase C Workstream 2: count alcoholic drinks the user has already
 * logged in the local UTC day for the captured_at anchor. Queries
 * meal_items joined to meals via meal_id, filtered to rows whose
 * beverage_catalog_slug joins to a beverage_catalog row with
 * is_alcoholic = true OR whose hydration_source_kind is alcohol_low /
 * alcohol_high (covers legacy 170o quick log path that has no slug).
 * Defensive: any DB error returns 0 so the reduction never fires
 * pessimistically on an admin auth fail.
 */
async function countDailyAlcoholicDrinks(args: {
  admin: ReturnType<typeof createAdminClient>;
  user_id: string;
  day_anchor_iso: string;
}): Promise<number> {
  const dayStart = new Date(args.day_anchor_iso);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayStartIso = dayStart.toISOString();

  try {
    const { count, error } = await args.admin
      .from('meal_items')
      .select('id, meals!inner(user_id, logged_at)', { count: 'exact', head: true })
      .eq('meals.user_id', args.user_id)
      .gte('meals.logged_at', dayStartIso)
      .lte('meals.logged_at', args.day_anchor_iso)
      .in('hydration_source_kind', ['alcohol_low', 'alcohol_high']);
    if (error) {
      safeLog.warn('api.hydration.quick_log', 'daily alcohol count query failed (defaulting to 0)', {
        error,
        userId: args.user_id,
      });
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    safeLog.warn('api.hydration.quick_log', 'daily alcohol count threw (defaulting to 0)', {
      error: err,
      userId: args.user_id,
    });
    return 0;
  }
}

function hashUserId(userId: string): string {
  let h = 5381;
  for (let i = 0; i < userId.length; i++) {
    h = ((h << 5) + h) ^ userId.charCodeAt(i);
  }
  return Math.abs(h).toString(36);
}
