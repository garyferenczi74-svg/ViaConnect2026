// Prompt #170 Phase 1e: nutrient resolution cascade.
//
// Per Prompt 170 §2.2 step 6 + 170a §5.3 the order is:
//   1. Curated (Farmceutica)
//   2. USDA FDC
//   3. Open Food Facts barcode (if barcodeHint provided)
//   4. Open Food Facts text search
//   5. Vision provider built-in (if visionFallback provided)
// Returns null if no source matches.
//
// Each step is independently try/wrapped. An error from one source (e.g. USDA
// circuit open, OFF 5xx) does not block subsequent steps; the failure is logged
// at warn level and the cascade continues. This keeps a single brittle source
// from sinking the whole recognition path.
//
// Hard rules honored: no em or en dashes anywhere, no emojis, no any.

import type { SupabaseClient } from '@supabase/supabase-js';

import { safeLog } from '@/lib/utils/safe-log';
import type { CuisineTag } from '../vision/types';
import { lookupFood } from '../usda-client';
import type { ItemNutrients } from '../usda-client';
import { lookupCurated } from './farmceutica-curated';
import type { CuratedNutrients } from './farmceutica-curated';
import { lookupByBarcode, searchByText } from './open-food-facts';
import type { OFFNutrients } from './open-food-facts';

export type NutrientSource =
  | 'farmceutica_curated'
  | 'usda_fdc'
  | 'open_food_facts'
  | 'vision_provider'
  | 'user_entered';

export interface ResolvedPer100g {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  cholesterol_mg?: number;
}

export interface ResolvedNutrients {
  source: NutrientSource;
  foodName: string;
  per100g: ResolvedPer100g;
  micronutrientsPer100g?: Record<string, number>;
  curatedFoodId?: string;
  usdaFdcId?: number;
  offBarcode?: string;
}

export interface VisionFallback {
  per100g: ResolvedPer100g;
  micronutrientsPer100g?: Record<string, number>;
}

export interface ResolveOpts {
  // Optional per Phase 1q hotfix: when the service-role key is missing the
  // route passes undefined and the resolver skips the curated lookup step,
  // falling through to USDA + OFF + vision-only.
  supabaseAdmin?: SupabaseClient;
  requestId: string;
  cuisineTagHint?: CuisineTag;
  barcodeHint?: string;
  visionFallback?: VisionFallback;
  fetch?: typeof globalThis.fetch;
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Resolve nutrients for a food name by walking the cascade. Returns the first
 * successful source. Each step is isolated by try/catch so a single source
 * failure does not abort the cascade.
 */
export async function resolveNutrients(
  foodName: string,
  opts: ResolveOpts,
): Promise<ResolvedNutrients | null> {
  // Step 1: Curated. Skipped when the caller could not build a service-role
  // admin client (Phase 1q hotfix). The cascade proceeds to USDA + OFF, and
  // the vision-provider fallback if those also miss.
  if (opts.supabaseAdmin) {
    const supabaseAdmin = opts.supabaseAdmin;
    const curated = await tryStep('farmceutica_curated', opts.requestId, () =>
      lookupCurated(foodName, {
        supabaseAdmin,
        requestId: opts.requestId,
        cuisineTagHint: opts.cuisineTagHint,
      }),
    );
    if (curated !== null) {
      const mapped = mapCurated(curated);
      logMatch(opts.requestId, foodName, mapped.source);
      return mapped;
    }
  }

  // Step 2: USDA FDC. Request 100g so the returned ItemNutrients is already
  // shaped per 100g for us to map straight through.
  const usda = await tryStep('usda_fdc', opts.requestId, () =>
    lookupFood(foodName, 100, 'g'),
  );
  if (usda !== null) {
    const mapped = mapUsda(usda, foodName);
    logMatch(opts.requestId, foodName, mapped.source);
    return mapped;
  }

  // Step 3: OFF barcode (if hint).
  if (opts.barcodeHint !== undefined && opts.barcodeHint.length > 0) {
    const offBarcode = await tryStep('open_food_facts', opts.requestId, () =>
      lookupByBarcode(opts.barcodeHint as string, {
        requestId: opts.requestId,
        fetch: opts.fetch,
      }),
    );
    if (offBarcode !== null) {
      const mapped = mapOff(offBarcode);
      logMatch(opts.requestId, foodName, mapped.source);
      return mapped;
    }
  }

  // Step 4: OFF text search.
  const offText = await tryStep('open_food_facts', opts.requestId, () =>
    searchByText(foodName, {
      requestId: opts.requestId,
      fetch: opts.fetch,
    }),
  );
  if (offText !== null) {
    const mapped = mapOff(offText);
    logMatch(opts.requestId, foodName, mapped.source);
    return mapped;
  }

  // Step 5: Vision provider built-in.
  if (opts.visionFallback !== undefined) {
    const mapped: ResolvedNutrients = {
      source: 'vision_provider',
      foodName,
      per100g: opts.visionFallback.per100g,
    };
    if (opts.visionFallback.micronutrientsPer100g !== undefined) {
      mapped.micronutrientsPer100g = opts.visionFallback.micronutrientsPer100g;
    }
    logMatch(opts.requestId, foodName, mapped.source);
    return mapped;
  }

  return null;
}

// ----------------------------------------------------------------------------
// Internals
// ----------------------------------------------------------------------------

async function tryStep<T>(
  source: NutrientSource,
  requestId: string,
  fn: () => Promise<T | null>,
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    safeLog.warn('nutrition.resolver.step_failed', 'resolver step failed', {
      request_id: requestId,
      source,
      error_class: errorClass(err),
    });
    return null;
  }
}

function errorClass(err: unknown): string {
  if (err === null || err === undefined) return 'unknown';
  if (err instanceof Error) return err.name;
  return typeof err;
}

function logMatch(requestId: string, foodName: string, source: NutrientSource): void {
  safeLog.info('nutrition.resolver.match', 'resolver match', {
    request_id: requestId,
    food_name: foodName,
    source,
  });
}

function mapCurated(curated: CuratedNutrients): ResolvedNutrients {
  const out: ResolvedNutrients = {
    source: 'farmceutica_curated',
    foodName: curated.foodName,
    per100g: { ...curated.per100g },
    curatedFoodId: curated.curatedFoodId,
  };
  if (curated.micronutrientsPer100g !== undefined) {
    out.micronutrientsPer100g = curated.micronutrientsPer100g;
  }
  return out;
}

function mapUsda(usda: ItemNutrients, foodName: string): ResolvedNutrients {
  // The existing USDA client requests 100g so the returned ItemNutrients is
  // already per 100g. Sodium and cholesterol are not surfaced by the legacy
  // client; the resolver leaves those undefined per spec.
  return {
    source: 'usda_fdc',
    foodName,
    per100g: {
      calories_kcal: usda.calories,
      protein_g: usda.protein_g,
      carbs_g: usda.carbs_g,
      fat_g: usda.total_fat_g,
      fiber_g: usda.fiber_g,
      sugar_g: usda.sugar_g,
    },
  };
}

function mapOff(off: OFFNutrients): ResolvedNutrients {
  const out: ResolvedNutrients = {
    source: 'open_food_facts',
    foodName: off.foodName,
    per100g: { ...off.per100g },
  };
  if (off.barcode !== undefined) out.offBarcode = off.barcode;
  if (off.micronutrientsPer100g !== undefined) {
    out.micronutrientsPer100g = off.micronutrientsPer100g;
  }
  return out;
}
