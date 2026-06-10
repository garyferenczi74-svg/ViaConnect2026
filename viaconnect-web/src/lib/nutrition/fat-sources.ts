// Prompt 184b: fat sources reference plus Gordon's fat breakdown resolver.
//
// A fat source (an added cooking or dressing fat like olive oil or butter)
// carries a fatty-acid profile per gram of fat. Gordon resolves a meal's fat
// into a breakdown: the food's intrinsic fat (from USDA) plus the added fat
// attributed to the chosen source. The resolved total saturated grams feed the
// fat-quality component of the Nutrition Score and BOS. Hannah owns the
// health_tier label; Gordon owns these numbers.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CookingOilType } from './cooking-oil/suggester';
import { withTimeout, isTimeoutError } from '../utils/with-timeout';
import { safeLog } from '../utils/safe-log';

export type FatHealthTier = 'favorable' | 'moderate' | 'limit' | 'neutral';

export interface FatSourceProfile {
  id: string;
  slug: string;
  displayName: string;
  saturatedGPerG: number | null;
  monounsaturatedGPerG: number | null;
  polyunsaturatedGPerG: number | null;
  transGPerG: number | null;
  omega3GPerG: number | null;
  omega6GPerG: number | null;
  healthTier: FatHealthTier | null;
  fatQualityValue: number | null;
}

export interface FatBreakdown {
  fat_source_slug: string | null;
  intrinsic_fat_g: number;
  added_fat_g: number;
  // Total saturated for the entry: intrinsic (USDA) plus added (source). NULL
  // when added fat is present but its source is unknown (never coerced to 0).
  saturated_g: number | null;
  // Added-fat fatty acids attributed to the source. NULL when the source has
  // no profile (not_specified or absent).
  added_saturated_g: number | null;
  added_monounsaturated_g: number | null;
  added_polyunsaturated_g: number | null;
  added_trans_g: number | null;
  added_omega3_g: number | null;
  added_omega6_g: number | null;
  // The source's Gordon fat-quality value (0 to 100), copied here so the
  // synchronous scorer can fold it in without a DB lookup. NULL for unknown.
  fat_quality_value: number | null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Map a cooking-oil suggestion type to a fat_sources slug. 'none' is no added
// fat; 'other' maps to the not_specified fallback (unknown profile).
const OIL_TO_SLUG: Record<CookingOilType, string | null> = {
  none: null,
  olive_oil: 'olive_oil',
  evoo: 'extra_virgin_olive_oil',
  avocado_oil: 'avocado_oil',
  coconut_oil: 'coconut_oil',
  butter: 'butter',
  ghee: 'ghee',
  vegetable_canola_oil: 'canola_oil',
  sesame_oil: 'sesame_oil',
  other: 'not_specified',
};

export function cookingOilToFatSourceSlug(type: CookingOilType): string | null {
  return OIL_TO_SLUG[type];
}

export interface ResolveFatInput {
  intrinsicTotalFatG: number;
  intrinsicSaturatedG: number;
  addedFatG: number;
  source: FatSourceProfile | null;
}

/**
 * Resolve a meal's fat into the hybrid breakdown. Intrinsic fat keeps the
 * food's USDA saturated; added fat is attributed to the source profile. The
 * total saturated is the scoring signal; it is NULL when added fat is present
 * with an unknown source, never coerced to 0.
 */
export function resolveFatBreakdown(input: ResolveFatInput): FatBreakdown {
  const { intrinsicTotalFatG, intrinsicSaturatedG, addedFatG, source } = input;
  const hasProfile = source != null && source.saturatedGPerG != null;

  const scaled = (perG: number | null | undefined): number | null =>
    hasProfile && perG != null ? round1(perG * addedFatG) : null;

  const added_saturated_g = scaled(source?.saturatedGPerG);
  const added_monounsaturated_g = scaled(source?.monounsaturatedGPerG);
  const added_polyunsaturated_g = scaled(source?.polyunsaturatedGPerG);
  const added_trans_g = scaled(source?.transGPerG);
  const added_omega3_g = scaled(source?.omega3GPerG);
  const added_omega6_g = scaled(source?.omega6GPerG);

  let saturated_g: number | null;
  if (addedFatG <= 0) {
    saturated_g = round1(intrinsicSaturatedG);
  } else if (added_saturated_g != null) {
    saturated_g = round1(intrinsicSaturatedG + added_saturated_g);
  } else {
    saturated_g = null;
  }

  return {
    fat_source_slug: source?.slug ?? null,
    intrinsic_fat_g: round1(intrinsicTotalFatG),
    added_fat_g: round1(addedFatG),
    saturated_g,
    added_saturated_g,
    added_monounsaturated_g,
    added_polyunsaturated_g,
    added_trans_g,
    added_omega3_g,
    added_omega6_g,
    fat_quality_value: source?.fatQualityValue ?? null,
  };
}

// Prompt 184b section 4: the single fat-attribution switch. 'hybrid' (default)
// keeps a whole food's intrinsic fat on its own USDA saturated profile and lets
// the source contribute its quality; 'simple' makes the dropdown govern the
// entire entry's fat. Flip this constant to change the model without a rewrite.
export const FAT_ATTRIBUTION_MODE: 'hybrid' | 'simple' = 'hybrid';

/**
 * Resolve a parsed meal's fat using FAT_ATTRIBUTION_MODE. Hybrid keeps the
 * food's intrinsic saturated and folds in the source quality; simple attributes
 * the whole total to the source. Manual slider entries bypass this (they carry
 * only a total) and call resolveFatBreakdown directly in one-source form.
 */
export function resolveMealFatBreakdown(args: {
  totalFatG: number;
  saturatedFatG: number;
  source: FatSourceProfile | null;
}): FatBreakdown {
  const { totalFatG, saturatedFatG, source } = args;
  if (FAT_ATTRIBUTION_MODE === 'simple') {
    return resolveFatBreakdown({
      intrinsicTotalFatG: 0,
      intrinsicSaturatedG: 0,
      addedFatG: totalFatG,
      source,
    });
  }
  return resolveFatBreakdown({
    intrinsicTotalFatG: totalFatG,
    intrinsicSaturatedG: saturatedFatG,
    addedFatG: 0,
    source,
  });
}

interface FatSourceRow {
  id: string;
  slug: string;
  display_name: string;
  saturated_g_per_g: number | null;
  monounsaturated_g_per_g: number | null;
  polyunsaturated_g_per_g: number | null;
  trans_g_per_g: number | null;
  omega3_g_per_g: number | null;
  omega6_g_per_g: number | null;
  health_tier: FatHealthTier | null;
  fat_quality_value: number | null;
  is_active: boolean;
  sort_order: number;
}

const SELECT_COLUMNS =
  'id, slug, display_name, saturated_g_per_g, monounsaturated_g_per_g, polyunsaturated_g_per_g, trans_g_per_g, omega3_g_per_g, omega6_g_per_g, health_tier, fat_quality_value, is_active, sort_order';

function rowToProfile(row: FatSourceRow): FatSourceProfile {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    saturatedGPerG: row.saturated_g_per_g,
    monounsaturatedGPerG: row.monounsaturated_g_per_g,
    polyunsaturatedGPerG: row.polyunsaturated_g_per_g,
    transGPerG: row.trans_g_per_g,
    omega3GPerG: row.omega3_g_per_g,
    omega6GPerG: row.omega6_g_per_g,
    healthTier: row.health_tier,
    fatQualityValue: row.fat_quality_value,
  };
}

/** Active fat sources, sorted for the dropdown. Returns [] on error (fail-open). */
export async function loadActiveFatSources(
  client: SupabaseClient
): Promise<FatSourceProfile[]> {
  try {
    const { data, error } = await withTimeout(
      (async () =>
        client
          .from('fat_sources')
          .select(SELECT_COLUMNS)
          .eq('is_active', true)
          .order('sort_order', { ascending: true }))(),
      4000,
      'nutrition.fat-sources.loadActive'
    );
    if (error || !data) {
      if (error) safeLog.warn('nutrition.fat-sources', 'loadActiveFatSources query error', { error });
      return [];
    }
    return (data as FatSourceRow[]).map(rowToProfile);
  } catch (err) {
    safeLog.warn('nutrition.fat-sources', 'loadActiveFatSources failed', {
      error: err,
      timedOut: isTimeoutError(err),
    });
    return [];
  }
}

/** One fat source by slug, or null when missing (fail-open). */
export async function loadFatSourceBySlug(
  client: SupabaseClient,
  slug: string
): Promise<FatSourceProfile | null> {
  try {
    const { data, error } = await withTimeout(
      (async () =>
        client
          .from('fat_sources')
          .select(SELECT_COLUMNS)
          .eq('slug', slug)
          .maybeSingle())(),
      4000,
      'nutrition.fat-sources.loadBySlug'
    );
    if (error || !data) {
      if (error) safeLog.warn('nutrition.fat-sources', 'loadFatSourceBySlug query error', { error, slug });
      return null;
    }
    return rowToProfile(data as FatSourceRow);
  } catch (err) {
    safeLog.warn('nutrition.fat-sources', 'loadFatSourceBySlug failed', {
      error: err,
      slug,
      timedOut: isTimeoutError(err),
    });
    return null;
  }
}

/** One fat source by id, or null when missing (fail-open). */
export async function loadFatSourceById(
  client: SupabaseClient,
  id: string
): Promise<FatSourceProfile | null> {
  try {
    const { data, error } = await withTimeout(
      (async () =>
        client
          .from('fat_sources')
          .select(SELECT_COLUMNS)
          .eq('id', id)
          .maybeSingle())(),
      4000,
      'nutrition.fat-sources.loadById'
    );
    if (error || !data) {
      if (error) safeLog.warn('nutrition.fat-sources', 'loadFatSourceById query error', { error, id });
      return null;
    }
    return rowToProfile(data as FatSourceRow);
  } catch (err) {
    safeLog.warn('nutrition.fat-sources', 'loadFatSourceById failed', {
      error: err,
      id,
      timedOut: isTimeoutError(err),
    });
    return null;
  }
}
