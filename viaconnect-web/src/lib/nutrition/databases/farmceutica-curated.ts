// Prompt #170 Phase 1e: Farmceutica curated foods client.
//
// First source in the resolver cascade. Lookup against farmceutica_curated_foods
// Supabase table with two passes: exact ILIKE match (preferred, optionally
// restricted by cuisine_tag hint), then GIN tsvector textSearch fallback.
//
// The Supabase query carries only the normalized food name and an optional
// cuisine_tag filter. The supabase client is passed in by the caller
// (the resolver), so this module does not import createAdminClient or any
// auth getter. No user_id, no email, no PHI ever travels through here.
//
// Hard rules honored: no em or en dashes anywhere, no emojis, no any.

import type { SupabaseClient } from '@supabase/supabase-js';

import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout, isTimeoutError } from '@/lib/nutrition/resilience/timeout';
import type { CuisineTag } from '../vision/types';
import { normalizeQuery } from '../normalize-query';

const TABLE = 'farmceutica_curated_foods';
const DEFAULT_TIMEOUT_MS = 2500;

export type CuratedSource = 'farmceutica_curated';

export interface CuratedPer100g {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  cholesterol_mg?: number;
}

export interface CuratedNutrients {
  source: CuratedSource;
  curatedFoodId: string;
  foodName: string;
  cuisineTag?: CuisineTag;
  densityGPerMl?: number;
  per100g: CuratedPer100g;
  micronutrientsPer100g?: Record<string, number>;
}

export interface CuratedLookupOpts {
  supabaseAdmin: SupabaseClient;
  requestId: string;
  cuisineTagHint?: CuisineTag;
}

interface CuratedRow {
  id?: unknown;
  name?: unknown;
  cuisine_tag?: unknown;
  density_g_per_ml?: unknown;
  per_100g_kcal?: unknown;
  per_100g_protein_g?: unknown;
  per_100g_carbs_g?: unknown;
  per_100g_fat_g?: unknown;
  per_100g_fiber_g?: unknown;
  per_100g_sugar_g?: unknown;
  per_100g_sodium_mg?: unknown;
  per_100g_cholesterol_mg?: unknown;
  micronutrients_per_100g_json?: unknown;
}

const ALLOWED_CUISINES: ReadonlyArray<CuisineTag> = [
  'north_american', 'mediterranean', 'latin_american', 'east_asian',
  'south_asian', 'southeast_asian', 'middle_eastern', 'african', 'unknown',
];

function isCuisineTag(v: unknown): v is CuisineTag {
  return typeof v === 'string' && (ALLOWED_CUISINES as ReadonlyArray<string>).includes(v);
}

/**
 * Look up a food in the curated table. Returns null when nothing matches the
 * normalized query, leaving the caller to cascade to USDA.
 */
export async function lookupCurated(
  query: string,
  opts: CuratedLookupOpts,
): Promise<CuratedNutrients | null> {
  const normalized = normalizeQuery(query);

  try {
    const result = await withTimeout(runLookup(normalized, opts), {
      timeoutMs: DEFAULT_TIMEOUT_MS,
      op: 'curated.lookup',
      requestId: opts.requestId,
    });
    return result;
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('nutrition.curated.timeout', 'curated lookup timed out', {
        request_id: opts.requestId,
        query: normalized,
      });
      return null;
    }
    throw err;
  }
}

async function runLookup(normalized: string, opts: CuratedLookupOpts): Promise<CuratedNutrients | null> {
  // Pass 1: exact name match. Use ILIKE for case-insensitive match against the
  // already lowercased normalized query. cuisine_tag is optional restriction.
  let exactBuilder = opts.supabaseAdmin
    .from(TABLE)
    .select('*')
    .ilike('name', normalized);
  if (opts.cuisineTagHint !== undefined && opts.cuisineTagHint !== 'unknown') {
    exactBuilder = exactBuilder.eq('cuisine_tag', opts.cuisineTagHint);
  }
  const exactRes = await exactBuilder.limit(1);
  if (exactRes.error !== null && exactRes.error !== undefined) {
    safeLog.warn('nutrition.curated.exact_failed', 'curated exact query error', {
      request_id: opts.requestId,
      query: normalized,
      error: exactRes.error,
    });
  }
  const exactRows = Array.isArray(exactRes.data) ? (exactRes.data as ReadonlyArray<CuratedRow>) : [];
  if (exactRows.length > 0) {
    const mapped = mapRow(exactRows[0]);
    if (mapped !== null) {
      safeLog.info('nutrition.curated.hit', 'curated exact hit', {
        request_id: opts.requestId,
        food_name: mapped.foodName,
        cuisine_tag: mapped.cuisineTag,
      });
      return mapped;
    }
  }

  // Pass 2: tsvector textSearch fallback. Uses the GIN index on name.
  const vectorRes = await opts.supabaseAdmin
    .from(TABLE)
    .select('*')
    .textSearch('name', normalized, { type: 'websearch' })
    .limit(1);
  if (vectorRes.error !== null && vectorRes.error !== undefined) {
    safeLog.warn('nutrition.curated.vector_failed', 'curated tsvector query error', {
      request_id: opts.requestId,
      query: normalized,
      error: vectorRes.error,
    });
    return null;
  }
  const vectorRows = Array.isArray(vectorRes.data) ? (vectorRes.data as ReadonlyArray<CuratedRow>) : [];
  if (vectorRows.length > 0) {
    const mapped = mapRow(vectorRows[0]);
    if (mapped !== null) {
      safeLog.info('nutrition.curated.hit', 'curated vector hit', {
        request_id: opts.requestId,
        food_name: mapped.foodName,
        cuisine_tag: mapped.cuisineTag,
      });
      return mapped;
    }
  }

  return null;
}

function mapRow(row: CuratedRow): CuratedNutrients | null {
  const id = typeof row.id === 'string' ? row.id : null;
  const name = typeof row.name === 'string' ? row.name : null;
  if (id === null || name === null) return null;

  const calories = toFiniteNumber(row.per_100g_kcal);
  if (calories === null) return null;

  const protein = toFiniteNumber(row.per_100g_protein_g) ?? 0;
  const carbs = toFiniteNumber(row.per_100g_carbs_g) ?? 0;
  const fat = toFiniteNumber(row.per_100g_fat_g) ?? 0;
  const fiber = toFiniteNumber(row.per_100g_fiber_g);
  const sugar = toFiniteNumber(row.per_100g_sugar_g);
  const sodium = toFiniteNumber(row.per_100g_sodium_mg);
  const cholesterol = toFiniteNumber(row.per_100g_cholesterol_mg);

  const per100g: CuratedPer100g = {
    calories_kcal: calories,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
  };
  if (fiber !== null) per100g.fiber_g = fiber;
  if (sugar !== null) per100g.sugar_g = sugar;
  if (sodium !== null) per100g.sodium_mg = sodium;
  if (cholesterol !== null) per100g.cholesterol_mg = cholesterol;

  const cuisineTag = isCuisineTag(row.cuisine_tag) ? row.cuisine_tag : undefined;
  const density = toFiniteNumber(row.density_g_per_ml);
  const micronutrients = extractMicronutrients(row.micronutrients_per_100g_json);

  const out: CuratedNutrients = {
    source: 'farmceutica_curated',
    curatedFoodId: id,
    foodName: name,
    cuisineTag,
    per100g,
  };
  if (density !== null) out.densityGPerMl = density;
  if (micronutrients !== undefined) out.micronutrientsPer100g = micronutrients;
  return out;
}

function toFiniteNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.length > 0) {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function extractMicronutrients(raw: unknown): Record<string, number> | undefined {
  if (raw === null || typeof raw !== 'object') return undefined;
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const num = toFiniteNumber(value);
    if (num !== null) out[key] = num;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
