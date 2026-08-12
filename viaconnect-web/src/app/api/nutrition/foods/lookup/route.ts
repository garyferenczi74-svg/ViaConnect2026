// Prompt #170 Phase 1j: GET /api/nutrition/foods/lookup.
//
// Resolves a single food entry by id (curated UUID, USDA FDC id) or barcode.
// Returns a single ResolvedNutrients or 404. The UI uses this when the user
// taps a food card from /foods/search and wants the full per100g + micros.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { AIRouteError } from '@/lib/errors/classify-ai';
import { newRequestId } from '@/lib/observability/audit-recorder';

import { lookupByBarcode } from '@/lib/nutrition/databases/open-food-facts';
import { lookupFood, EXTRACTION_VERSION } from '@/lib/nutrition/usda-client';
import type { ResolvedNutrients } from '@/lib/nutrition/databases/resolver';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/nutrition/foods/lookup';
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CuratedRow {
  id: string;
  name: string;
  cuisine_tag: string | null;
  density_g_per_ml: number | null;
  per_100g_kcal: number;
  per_100g_protein_g: number | null;
  per_100g_carbs_g: number | null;
  per_100g_fat_g: number | null;
  per_100g_fiber_g: number | null;
  per_100g_sugar_g: number | null;
  per_100g_sodium_mg: number | null;
  per_100g_cholesterol_mg: number | null;
  micronutrients_per_100g_json: unknown;
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
        'Please sign in to look up foods.',
      );
    }
    userId = user.id;

    const url = new URL(req.url);
    const idParam = url.searchParams.get('id');
    const barcodeParam = url.searchParams.get('barcode');
    const supabaseAdmin = createAdminClient();

    if (idParam !== null && idParam.length > 0) {
      const colonIdx = idParam.indexOf(':');
      if (colonIdx <= 0 || colonIdx === idParam.length - 1) {
        throw new AIRouteError(
          'INVALID_INPUT',
          'bad id',
          400,
          'Food id must be in the form "<source>:<key>".',
        );
      }
      const prefix = idParam.slice(0, colonIdx);
      const key = idParam.slice(colonIdx + 1);

      if (prefix === 'curated') {
        if (!UUID_RX.test(key)) {
          throw new AIRouteError(
            'INVALID_INPUT',
            'bad curated id',
            400,
            'Curated food id must be a UUID.',
          );
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabaseAdmin as any)
          .from('farmceutica_curated_foods')
          .select('*')
          .eq('id', key)
          .maybeSingle();
        if (error) {
          safeLog.warn('api.nutrivision.foods.lookup', 'curated lookup error', {
            request_id: requestId,
            error: error.message,
          });
          throw new AIRouteError(
            'API_DOWN',
            `curated: ${error.message}`,
            503,
            'Food database unavailable.',
          );
        }
        if (!data) {
          return NextResponse.json(
            { error: { code: 'NOT_FOUND', message: 'Food not found.', requestId } },
            { status: 404 },
          );
        }
        const resolved = mapCurated(data as CuratedRow);
        return NextResponse.json({ food: resolved, requestId });
      }

      if (prefix === 'usda_fdc') {
        const fdcId = Number(key);
        if (!Number.isInteger(fdcId) || fdcId <= 0) {
          throw new AIRouteError(
            'INVALID_INPUT',
            'bad usda id',
            400,
            'USDA FDC id must be a positive integer.',
          );
        }
        // The legacy USDA client is keyed by name so we lift the cached row by
        // fdc_id directly; the row schema is documented in usda-client.ts.
        // Prompt 186: only extraction_version 2 rows are trusted (v1 rows
        // carried first-hit references and zero-coerced nutrients), and
        // fdc_id is not unique across query keys so we take the first row.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabaseAdmin as any)
          .from('usda_food_cache')
          .select('food_name, fdc_id, serving_size_g, calories_per_100g, protein_per_100g, carbs_per_100g, total_fat_per_100g, sugar_per_100g, fiber_per_100g, sodium_per_100g, cholesterol_per_100g')
          .eq('fdc_id', fdcId)
          .eq('extraction_version', EXTRACTION_VERSION)
          .limit(1)
          .maybeSingle();
        if (error) {
          safeLog.warn('api.nutrivision.foods.lookup', 'usda cache lookup error', {
            request_id: requestId,
            error: error.message,
          });
          throw new AIRouteError(
            'API_DOWN',
            `usda cache: ${error.message}`,
            503,
            'Food database unavailable.',
          );
        }
        if (data) {
          // Prompt 186: unknown nutrients are NULL in the cache, never 0.
          // Core macros must be known to serve the row; optional nutrients
          // are included only when known.
          const numOrNull = (v: unknown): number | null => {
            if (v === null || v === undefined) return null;
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
          };
          const core = {
            calories_kcal: numOrNull(data.calories_per_100g),
            protein_g: numOrNull(data.protein_per_100g),
            carbs_g: numOrNull(data.carbs_per_100g),
            fat_g: numOrNull(data.total_fat_per_100g),
          };
          if (core.calories_kcal !== null && core.protein_g !== null && core.carbs_g !== null && core.fat_g !== null) {
            const per100g: ResolvedNutrients['per100g'] = {
              calories_kcal: core.calories_kcal,
              protein_g: core.protein_g,
              carbs_g: core.carbs_g,
              fat_g: core.fat_g,
            };
            const fiber = numOrNull(data.fiber_per_100g);
            const sugar = numOrNull(data.sugar_per_100g);
            const sodium = numOrNull(data.sodium_per_100g);
            const cholesterol = numOrNull(data.cholesterol_per_100g);
            if (fiber !== null) per100g.fiber_g = fiber;
            if (sugar !== null) per100g.sugar_g = sugar;
            if (sodium !== null) per100g.sodium_mg = sodium;
            if (cholesterol !== null) per100g.cholesterol_mg = cholesterol;
            const resolved: ResolvedNutrients = {
              source: 'usda_fdc',
              foodName: String(data.food_name ?? ''),
              usdaFdcId: fdcId,
              per100g,
            };
            return NextResponse.json({ food: resolved, requestId });
          }
        }
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Food not found.', requestId } },
          { status: 404 },
        );
      }

      throw new AIRouteError(
        'INVALID_INPUT',
        `unknown id prefix: ${prefix}`,
        400,
        'Food id source must be "curated" or "usda_fdc".',
      );
    }

    if (barcodeParam !== null && barcodeParam.length > 0) {
      // Barcode lookup goes straight to OFF. Result mapping to ResolvedNutrients
      // is inlined here so the resolver cascade is reserved for analyze.
      const off = await lookupByBarcode(barcodeParam, { requestId }).catch(() => null);
      if (!off) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Food not found.', requestId } },
          { status: 404 },
        );
      }
      const resolved: ResolvedNutrients = {
        source: 'open_food_facts',
        foodName: off.foodName,
        offBarcode: off.barcode ?? barcodeParam,
        per100g: { ...off.per100g },
      };
      if (off.micronutrientsPer100g !== undefined) {
        resolved.micronutrientsPer100g = off.micronutrientsPer100g;
      }
      return NextResponse.json({ food: resolved, requestId });
    }

    throw new AIRouteError(
      'INVALID_INPUT',
      'no id or barcode',
      400,
      'A food id or barcode is required.',
    );
  } catch (err) {
    const ai = err instanceof AIRouteError
      ? err
      : new AIRouteError('UNKNOWN', String(err), 500, 'Something went wrong. Try again.', err);
    safeLog.warn('api.nutrivision.foods.lookup', 'failure', {
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

function mapCurated(row: CuratedRow): ResolvedNutrients {
  const per100g: ResolvedNutrients['per100g'] = {
    calories_kcal: Number(row.per_100g_kcal ?? 0),
    protein_g: Number(row.per_100g_protein_g ?? 0),
    carbs_g: Number(row.per_100g_carbs_g ?? 0),
    fat_g: Number(row.per_100g_fat_g ?? 0),
  };
  if (row.per_100g_fiber_g !== null) per100g.fiber_g = Number(row.per_100g_fiber_g);
  if (row.per_100g_sugar_g !== null) per100g.sugar_g = Number(row.per_100g_sugar_g);
  if (row.per_100g_sodium_mg !== null) per100g.sodium_mg = Number(row.per_100g_sodium_mg);
  if (row.per_100g_cholesterol_mg !== null) per100g.cholesterol_mg = Number(row.per_100g_cholesterol_mg);

  const resolved: ResolvedNutrients = {
    source: 'farmceutica_curated',
    foodName: String(row.name ?? ''),
    curatedFoodId: String(row.id ?? ''),
    per100g,
  };
  const micros = extractMicronutrients(row.micronutrients_per_100g_json);
  if (micros !== undefined) resolved.micronutrientsPer100g = micros;
  return resolved;
}

function extractMicronutrients(raw: unknown): Record<string, number> | undefined {
  if (raw === null || typeof raw !== 'object') return undefined;
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof value === 'number' && Number.isFinite(value) ? value : Number(value);
    if (Number.isFinite(n)) out[key] = n;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
