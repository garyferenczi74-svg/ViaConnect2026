// Prompt #170 Phase 1j: GET /api/nutrition/foods/search.
//
// Free-text food search across the curated table and the USDA cache.
// Walks both, coalesces results, dedupes by lowercased food name.
// Returns { results: [{ id, name, source, per_100g, cuisine_tag? }] }.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { AIRouteError } from '@/lib/errors/classify-ai';
import { newRequestId } from '@/lib/observability/audit-recorder';

import { normalizeQuery } from '@/lib/nutrition/normalize-query';
import type { CuisineTag } from '@/lib/nutrition/vision/types';

const ROUTE = '/api/nutrition/foods/search';
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

const ALLOWED_CUISINES = new Set<CuisineTag>([
  'north_american', 'mediterranean', 'latin_american', 'east_asian',
  'south_asian', 'southeast_asian', 'middle_eastern', 'african', 'unknown',
]);

interface SearchPer100g {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

interface SearchResult {
  id: string;
  name: string;
  source: 'farmceutica_curated' | 'usda_fdc';
  per_100g: SearchPer100g;
  cuisine_tag?: CuisineTag;
}

interface CuratedRow {
  id: string;
  name: string;
  cuisine_tag: string | null;
  per_100g_kcal: number | null;
  per_100g_protein_g: number | null;
  per_100g_carbs_g: number | null;
  per_100g_fat_g: number | null;
  per_100g_fiber_g: number | null;
  per_100g_sugar_g: number | null;
  per_100g_sodium_mg: number | null;
}

interface UsdaRow {
  fdc_id: number | null;
  food_name: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  total_fat_per_100g: number | null;
  fiber_per_100g: number | null;
  sugar_per_100g: number | null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = newRequestId();
  let userId: string | null = null;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new AIRouteError(
        'UNAUTHENTICATED',
        'no session',
        401,
        'Please sign in to search foods.',
      );
    }
    userId = user.id;

    const url = new URL(req.url);
    const qRaw = url.searchParams.get('q');
    if (typeof qRaw !== 'string' || qRaw.trim().length < 2) {
      throw new AIRouteError(
        'INVALID_INPUT',
        'q missing',
        400,
        'Please enter at least two characters to search.',
      );
    }
    const q = normalizeQuery(qRaw);
    const limitRaw = url.searchParams.get('limit');
    const limit = clampLimit(limitRaw === null ? DEFAULT_LIMIT : Number(limitRaw));
    const cuisineRaw = url.searchParams.get('cuisine');
    const cuisineTagHint = isCuisineTag(cuisineRaw ?? undefined) ? cuisineRaw : null;

    const supabaseAdmin = createAdminClient();
    const half = Math.max(1, Math.floor(limit / 2));

    // Curated text-match (first half).
    let curatedRows: ReadonlyArray<CuratedRow> = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let builder: any = (supabaseAdmin as any)
        .from('farmceutica_curated_foods')
        .select('id, name, cuisine_tag, per_100g_kcal, per_100g_protein_g, per_100g_carbs_g, per_100g_fat_g, per_100g_fiber_g, per_100g_sugar_g, per_100g_sodium_mg')
        .ilike('name', `%${q}%`)
        .limit(half);
      if (cuisineTagHint !== null) {
        builder = builder.eq('cuisine_tag', cuisineTagHint);
      }
      const { data, error } = await builder;
      if (error) {
        safeLog.warn('api.nutrivision.foods.search', 'curated search error', {
          request_id: requestId,
          error: error.message,
        });
      } else if (Array.isArray(data)) {
        curatedRows = data as ReadonlyArray<CuratedRow>;
      }
    } catch (curatedErr) {
      safeLog.warn('api.nutrivision.foods.search', 'curated search threw', {
        request_id: requestId,
        error: curatedErr,
      });
    }

    // USDA cache search by normalized query.
    let usdaRows: ReadonlyArray<UsdaRow> = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseAdmin as any)
        .from('usda_food_cache')
        .select('fdc_id, food_name, calories_per_100g, protein_per_100g, carbs_per_100g, total_fat_per_100g, fiber_per_100g, sugar_per_100g')
        .ilike('food_name', `%${q}%`)
        .limit(half);
      if (error) {
        safeLog.warn('api.nutrivision.foods.search', 'usda cache search error', {
          request_id: requestId,
          error: error.message,
        });
      } else if (Array.isArray(data)) {
        usdaRows = data as ReadonlyArray<UsdaRow>;
      }
    } catch (usdaErr) {
      safeLog.warn('api.nutrivision.foods.search', 'usda cache search threw', {
        request_id: requestId,
        error: usdaErr,
      });
    }

    // Coalesce + dedupe by lowercased name. Curated wins on collision.
    const results: SearchResult[] = [];
    const seen = new Set<string>();
    for (const row of curatedRows) {
      const name = String(row.name ?? '').trim();
      if (name.length === 0) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const cuisineTag = isCuisineTag(row.cuisine_tag) ? row.cuisine_tag : undefined;
      const per_100g: SearchPer100g = {
        calories_kcal: Number(row.per_100g_kcal ?? 0),
        protein_g: Number(row.per_100g_protein_g ?? 0),
        carbs_g: Number(row.per_100g_carbs_g ?? 0),
        fat_g: Number(row.per_100g_fat_g ?? 0),
      };
      if (row.per_100g_fiber_g !== null) per_100g.fiber_g = Number(row.per_100g_fiber_g);
      if (row.per_100g_sugar_g !== null) per_100g.sugar_g = Number(row.per_100g_sugar_g);
      if (row.per_100g_sodium_mg !== null) per_100g.sodium_mg = Number(row.per_100g_sodium_mg);
      const result: SearchResult = {
        id: `curated:${row.id}`,
        name,
        source: 'farmceutica_curated',
        per_100g,
      };
      if (cuisineTag !== undefined) result.cuisine_tag = cuisineTag;
      results.push(result);
      if (results.length >= limit) break;
    }
    if (results.length < limit) {
      for (const row of usdaRows) {
        const name = String(row.food_name ?? '').trim();
        if (name.length === 0) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const fdcId = Number(row.fdc_id ?? NaN);
        if (!Number.isInteger(fdcId) || fdcId <= 0) continue;
        const per_100g: SearchPer100g = {
          calories_kcal: Number(row.calories_per_100g ?? 0),
          protein_g: Number(row.protein_per_100g ?? 0),
          carbs_g: Number(row.carbs_per_100g ?? 0),
          fat_g: Number(row.total_fat_per_100g ?? 0),
        };
        if (row.fiber_per_100g !== null) per_100g.fiber_g = Number(row.fiber_per_100g);
        if (row.sugar_per_100g !== null) per_100g.sugar_g = Number(row.sugar_per_100g);
        results.push({
          id: `usda_fdc:${fdcId}`,
          name,
          source: 'usda_fdc',
          per_100g,
        });
        if (results.length >= limit) break;
      }
    }

    safeLog.info('api.nutrivision.foods.search', 'search ok', {
      request_id: requestId,
      user_id: user.id,
      query: q,
      result_count: results.length,
    });

    return NextResponse.json({ results, requestId });
  } catch (err) {
    const ai = err instanceof AIRouteError
      ? err
      : new AIRouteError('UNKNOWN', String(err), 500, 'Something went wrong. Try again.', err);
    safeLog.warn('api.nutrivision.foods.search', 'failure', {
      request_id: requestId,
      user_id: userId,
      route: ROUTE,
      code: ai.code,
      message: ai.message,
    });
    return NextResponse.json(
      { error: { code: ai.code, message: ai.userMessage, requestId } },
      { status: ai.httpStatus },
    );
  }
}

function clampLimit(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  if (n > MAX_LIMIT) return MAX_LIMIT;
  return Math.floor(n);
}

function isCuisineTag(v: unknown): v is CuisineTag {
  return typeof v === 'string' && ALLOWED_CUISINES.has(v as CuisineTag);
}
