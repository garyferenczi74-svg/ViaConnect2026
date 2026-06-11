// Prompt #164 Layer 2, rebuilt by Prompt 186: search USDA FoodData Central
// for a food, RANK the candidates (never take the raw first hit), fetch the
// detail, extract through the canonical nutrient ID map (UNKNOWN stays null,
// never 0), resolve grams through the portionToGrams resolver (FDC
// foodPortions first), scale, and cache for 30 days.
//
// Permanent per-item structured logging (Prompt 186 Phase 1): every analyzed
// item logs the matched fdcId and dataType, the raw nutrient rows used, the
// gram weight and how it was resolved, the multiplier, and the final output.

import { createAdminClient } from '@/lib/supabase/admin';
import { withAbortTimeout } from '@/lib/utils/with-timeout';
import { getCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { safeLog } from '@/lib/utils/safe-log';
import { AIRouteError, classifyUSDAResponse } from '@/lib/errors/classify-ai';
import { normalizeQuery } from './normalize-query';
import {
  extractCanonicalNutrients,
  extractFromLabelNutrients,
  type CanonicalNutrients,
} from './fdc-nutrients';
import { rankFdcCandidates, type FdcSearchCandidate } from './fdc-ranking';
import { portionToGrams, type FdcFoodPortion, type PortionMethod } from './portion-to-grams';

const BASE = 'https://api.nal.usda.gov/fdc/v1';
const TIMEOUT_MS = 6000;
// Shared so the search URL and the benchmark trace cannot drift apart.
// Branded foods enter through the barcode/OFF path, not generic text search.
const USDA_DATA_TYPES = 'Foundation,SR Legacy,Survey (FNDDS)';
const SEARCH_PAGE_SIZE = 25;
// Cache rows written before the Prompt 186 extraction rebuild carried
// first-hit references and zero-coerced nutrients; v2 rows are the only
// trusted ones. The 186 migration purges v1 rows; this filter guards any
// stragglers until TTL. Exported for the foods/lookup cache reader.
export const EXTRACTION_VERSION = 2;
const breaker = getCircuitBreaker('usda-api', { failureThreshold: 5, resetTimeoutMs: 60_000, halfOpenMaxAttempts: 1 });

// Prompt 186 Phase 3: per-item plausibility bounds. A single parsed portion
// of a common food beyond these is flagged for re-estimation before display.
export const ITEM_PLAUSIBILITY_MAX_KCAL = 900;
export const ITEM_PLAUSIBILITY_MAX_FAT_G = 60;

export interface ItemNutrientMeta {
  fdcId: number | null;
  dataType: string | null;
  matchedName: string | null;
  grams: number;
  gramsMethod: PortionMethod;
  // True when the gram weight came from the flat default or a water-density
  // guess on a solid: the meal confidence must downgrade (Prompt 186 Phase 2).
  confidenceDowngraded: boolean;
  derivedEnergy: boolean;
  // Canonical keys that could not be extracted: UNKNOWN, never 0.
  missingNutrients: string[];
  // Phase 3 bound check: item exceeds plausible kcal/fat for one portion.
  plausibilityFlagged: boolean;
  basis: 'per_100g' | 'label_serving';
}

export interface ItemNutrients {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  total_fat_g: number | null;
  saturated_fat_g: number | null;
  trans_fat_g: number | null;
  omega3_g: number | null;
  sugar_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  cholesterol_mg: number | null;
  source: 'usda';
  meta: ItemNutrientMeta;
}

// Prompt 184 Phase 0 trace surface for the benchmark harness; extended by 186
// with the portion method and missing-nutrient list. The routes never pass
// it, so production behavior is unchanged by tracing.
export interface UsdaLookupTrace {
  cacheHit?: boolean;
  dataType?: string;
  matchedName?: string;
  fdcId?: number | null;
  servingSizeG?: number | null;
  grams?: number;
  unitToGramsResolved?: boolean;
  gramsMethod?: PortionMethod;
  missingNutrients?: string[];
  rankingScore?: number;
  firstHitOverridden?: boolean;
  per100g?: {
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    total_fat_g: number | null;
    saturated_fat_g: number | null;
    trans_fat_g: number | null;
    omega3_g: number | null;
    sugar_g: number | null;
    fiber_g: number | null;
  };
}

interface CacheRow {
  food_name: string;
  fdc_id: number | null;
  serving_size_g: number | null;
  calories_per_100g: number | string | null;
  protein_per_100g: number | string | null;
  carbs_per_100g: number | string | null;
  total_fat_per_100g: number | string | null;
  saturated_fat_per_100g: number | string | null;
  trans_fat_per_100g: number | string | null;
  omega3_per_100g: number | string | null;
  sugar_per_100g: number | string | null;
  fiber_per_100g: number | string | null;
  sodium_per_100g?: number | string | null;
  cholesterol_per_100g?: number | string | null;
  data_type?: string | null;
  food_portions?: FdcFoodPortion[] | null;
  expires_at: string;
}

const LOG_SCOPE = 'nutrition.usda-client';

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function lookupFood(
  name: string,
  quantity: number,
  unit: string,
  trace?: UsdaLookupTrace,
  preparation?: string,
): Promise<ItemNutrients | null> {
  const normalized = normalizeQuery(preparation ? `${name} ${preparation}` : name);
  const admin = createAdminClient();

  const { data: cached } = await admin
    .from('usda_food_cache')
    .select('food_name, fdc_id, serving_size_g, calories_per_100g, protein_per_100g, carbs_per_100g, total_fat_per_100g, saturated_fat_per_100g, trans_fat_per_100g, omega3_per_100g, sugar_per_100g, fiber_per_100g, sodium_per_100g, cholesterol_per_100g, data_type, food_portions, expires_at, extraction_version')
    .eq('query_normalized', normalized)
    .eq('extraction_version', EXTRACTION_VERSION)
    .maybeSingle();

  if (cached && new Date(cached.expires_at) > new Date()) {
    if (trace) trace.cacheHit = true;
    return scaleToServing(cached as CacheRow, quantity, unit, name, trace);
  }

  const search = await searchUSDA(normalized, preparation);
  if (!search) return null;

  const detail = await fetchUSDADetail(search.fdcId);
  const dataType = typeof detail.dataType === 'string' ? detail.dataType : search.dataType ?? null;
  const extraction = extractCanonicalNutrients(detail);
  let values = extraction.values;
  let basis: 'per_100g' | 'label_serving' = 'per_100g';
  let servingSizeG: number | null = null;

  // Branded foods: labelNutrients (per serving) and foodNutrients (per 100g)
  // both exist; exactly ONE basis per item. Per-100g rows win when present;
  // the label basis is the fallback, converted to per-100g through the
  // serving gram weight so downstream scaling stays uniform.
  const detailServing = num(detail.servingSize);
  const servingUnitIsGrams = typeof detail.servingSizeUnit === 'string'
    && ['g', 'grm', 'gram', 'grams'].includes(detail.servingSizeUnit.toLowerCase());
  if (servingUnitIsGrams && detailServing && detailServing > 0) servingSizeG = detailServing;

  if (dataType === 'Branded' && values.calories === null && detail.labelNutrients && servingSizeG) {
    const label = extractFromLabelNutrients(detail.labelNutrients);
    const toPer100 = (v: number | null): number | null => (v === null ? null : (v / servingSizeG) * 100);
    values = {
      calories: toPer100(label.values.calories),
      protein_g: toPer100(label.values.protein_g),
      carbs_g: toPer100(label.values.carbs_g),
      total_fat_g: toPer100(label.values.total_fat_g),
      saturated_fat_g: toPer100(label.values.saturated_fat_g),
      trans_fat_g: toPer100(label.values.trans_fat_g),
      omega3_g: null,
      sugar_g: toPer100(label.values.sugar_g),
      fiber_g: toPer100(label.values.fiber_g),
      sodium_mg: toPer100(label.values.sodium_mg),
      cholesterol_mg: toPer100(label.values.cholesterol_mg),
    };
    basis = 'label_serving';
  }

  safeLog.info(LOG_SCOPE, 'reference selected', {
    query: normalized,
    fdc_id: search.fdcId,
    data_type: dataType,
    matched_name: search.description,
    ranking_score: search.rankingScore,
    first_hit_overridden: search.firstHitOverridden,
    basis,
    rows_used: extraction.rowsUsed,
    derived: extraction.derived,
    missing: extraction.missing,
  });

  // No extractable energy AND no macros at all: a reference this empty is
  // worse than the AI estimator. Treat as a miss (fail open to fallback).
  if (
    values.calories === null &&
    values.protein_g === null &&
    values.carbs_g === null &&
    values.total_fat_g === null
  ) {
    safeLog.warn(LOG_SCOPE, 'reference unusable: no energy and no macros', {
      query: normalized, fdc_id: search.fdcId, data_type: dataType,
    });
    return null;
  }

  const foodPortions: FdcFoodPortion[] = Array.isArray(detail.foodPortions)
    ? (detail.foodPortions as FdcFoodPortion[]).slice(0, 12).map((p) => ({
        amount: p.amount,
        gramWeight: p.gramWeight,
        modifier: p.modifier,
        portionDescription: p.portionDescription,
        measureUnit: p.measureUnit ? { name: p.measureUnit.name } : undefined,
      }))
    : [];

  const row: CacheRow = {
    food_name: search.description,
    fdc_id: search.fdcId,
    serving_size_g: servingSizeG,
    calories_per_100g: values.calories,
    protein_per_100g: values.protein_g,
    carbs_per_100g: values.carbs_g,
    total_fat_per_100g: values.total_fat_g,
    saturated_fat_per_100g: values.saturated_fat_g,
    trans_fat_per_100g: values.trans_fat_g,
    omega3_per_100g: values.omega3_g,
    sugar_per_100g: values.sugar_g,
    fiber_per_100g: values.fiber_g,
    sodium_per_100g: values.sodium_mg,
    cholesterol_per_100g: values.cholesterol_mg,
    data_type: dataType,
    food_portions: foodPortions,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const { error: upsertErr } = await admin.from('usda_food_cache').upsert({
    query_normalized: normalized,
    extraction_version: EXTRACTION_VERSION,
    food_name: row.food_name,
    fdc_id: row.fdc_id,
    serving_size_g: row.serving_size_g,
    calories_per_100g: row.calories_per_100g,
    protein_per_100g: row.protein_per_100g,
    carbs_per_100g: row.carbs_per_100g,
    total_fat_per_100g: row.total_fat_per_100g,
    saturated_fat_per_100g: row.saturated_fat_per_100g,
    trans_fat_per_100g: row.trans_fat_per_100g,
    omega3_per_100g: row.omega3_per_100g,
    sugar_per_100g: row.sugar_per_100g,
    fiber_per_100g: row.fiber_per_100g,
    sodium_per_100g: row.sodium_per_100g,
    cholesterol_per_100g: row.cholesterol_per_100g,
    data_type: row.data_type,
    food_portions: row.food_portions,
    raw_payload: detail,
    cached_at: new Date().toISOString(),
    expires_at: row.expires_at,
  }, { onConflict: 'query_normalized' });
  if (upsertErr) safeLog.warn(LOG_SCOPE, 'cache write failed', { error: upsertErr });
  if (trace) {
    trace.cacheHit = false;
    trace.dataType = dataType ?? USDA_DATA_TYPES;
    trace.rankingScore = search.rankingScore;
    trace.firstHitOverridden = search.firstHitOverridden;
  }
  return scaleToServing(row, quantity, unit, name, trace, { derivedEnergy: extraction.derived.includes('calories'), basis });
}

interface SearchSelection {
  fdcId: number;
  description: string;
  dataType?: string;
  rankingScore: number;
  firstHitOverridden: boolean;
}

interface SearchResponseFood extends FdcSearchCandidate {
  fdcId: number;
  description: string;
  dataType?: string;
}

async function searchUSDA(query: string, preparation?: string): Promise<SearchSelection | null> {
  const key = process.env.USDA_FDC_API_KEY || 'DEMO_KEY';
  if (key === 'DEMO_KEY') safeLog.warn(LOG_SCOPE, 'using DEMO_KEY (30/hr limit)');
  const base = `${BASE}/foods/search?query=${encodeURIComponent(query)}&dataType=${encodeURIComponent(USDA_DATA_TYPES)}&pageSize=${SEARCH_PAGE_SIZE}&api_key=${key}`;

  let foods = await runSearch(`${base}&requireAllWords=true`);
  if (foods.length === 0) {
    // requireAllWords can zero out legitimate queries (typos, word forms);
    // fail open to the unrestricted search and let ranking filter.
    foods = await runSearch(base);
  }
  if (foods.length === 0) return null;

  const ranked = rankFdcCandidates(query, preparation, foods);
  if (!ranked.best) {
    safeLog.warn(LOG_SCOPE, 'no acceptable reference candidate', {
      query,
      raw_first_hit: foods[0]?.description,
      best_score: ranked.bestScore,
    });
    return null;
  }
  return {
    fdcId: ranked.best.fdcId,
    description: ranked.best.description,
    dataType: ranked.best.dataType,
    rankingScore: ranked.bestScore,
    firstHitOverridden: ranked.firstHitOverridden,
  };
}

async function runSearch(url: string): Promise<SearchResponseFood[]> {
  const res = await breaker.execute(() => withAbortTimeout((s) => fetch(url, { signal: s }), TIMEOUT_MS, 'usda.search'));
  if (!res.ok) {
    const c = classifyUSDAResponse(res.status);
    throw new AIRouteError(c.code, `usda search ${res.status} ${c.code}`, c.httpStatus, c.userMessage);
  }
  const json = await res.json() as { foods?: SearchResponseFood[] };
  return (json.foods ?? []).filter((f) => typeof f?.fdcId === 'number' && typeof f?.description === 'string');
}

interface USDADetail {
  fdcId?: number;
  description?: string;
  dataType?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  labelNutrients?: Record<string, { value?: number }>;
  foodNutrients?: unknown[];
  foodPortions?: unknown[];
}

async function fetchUSDADetail(fdcId: number): Promise<USDADetail> {
  const key = process.env.USDA_FDC_API_KEY || 'DEMO_KEY';
  const url = `${BASE}/food/${fdcId}?api_key=${key}`;
  const res = await breaker.execute(() => withAbortTimeout((s) => fetch(url, { signal: s }), TIMEOUT_MS, 'usda.detail'));
  if (!res.ok) {
    const c = classifyUSDAResponse(res.status);
    throw new AIRouteError(c.code, `usda detail ${res.status} ${c.code}`, c.httpStatus, c.userMessage);
  }
  return res.json();
}

function scaleToServing(
  row: CacheRow,
  quantity: number,
  unit: string,
  foodHint: string,
  trace?: UsdaLookupTrace,
  flags?: { derivedEnergy?: boolean; basis?: 'per_100g' | 'label_serving' },
): ItemNutrients {
  const portion = portionToGrams({
    unit,
    quantity,
    foodHint,
    foodPortions: row.food_portions ?? null,
    brandedServingGrams: num(row.serving_size_g),
  });
  const grams = portion.grams;
  const f = grams / 100;

  const per100g: CanonicalNutrients = {
    calories: num(row.calories_per_100g),
    protein_g: num(row.protein_per_100g),
    carbs_g: num(row.carbs_per_100g),
    total_fat_g: num(row.total_fat_per_100g),
    saturated_fat_g: num(row.saturated_fat_per_100g),
    trans_fat_g: num(row.trans_fat_per_100g),
    omega3_g: num(row.omega3_per_100g),
    sugar_g: num(row.sugar_per_100g),
    fiber_g: num(row.fiber_per_100g),
    sodium_mg: num(row.sodium_per_100g),
    cholesterol_mg: num(row.cholesterol_per_100g),
  };

  const scaleInt = (v: number | null): number | null => (v === null ? null : Math.round(v * f));
  const scale1 = (v: number | null): number | null => (v === null ? null : round1(v * f));

  const calories = scaleInt(per100g.calories);
  const total_fat_g = scale1(per100g.total_fat_g);

  const missingNutrients = (Object.keys(per100g) as Array<keyof CanonicalNutrients>)
    .filter((k) => per100g[k] === null)
    .map(String);

  const plausibilityFlagged =
    (calories !== null && calories > ITEM_PLAUSIBILITY_MAX_KCAL) ||
    (total_fat_g !== null && total_fat_g > ITEM_PLAUSIBILITY_MAX_FAT_G);

  const meta: ItemNutrientMeta = {
    fdcId: row.fdc_id,
    dataType: row.data_type ?? null,
    matchedName: row.food_name,
    grams,
    gramsMethod: portion.method,
    confidenceDowngraded: portion.downgraded,
    derivedEnergy: flags?.derivedEnergy ?? false,
    missingNutrients,
    plausibilityFlagged,
    basis: flags?.basis ?? 'per_100g',
  };

  // Prompt 186 Phase 1 permanent structured logging: one line per analyzed
  // item with the reference, the rows, the grams, and the output.
  safeLog.info(LOG_SCOPE, 'item scaled', {
    query_hint: foodHint,
    fdc_id: meta.fdcId,
    data_type: meta.dataType,
    matched_name: meta.matchedName,
    grams,
    grams_method: portion.method,
    grams_downgraded: portion.downgraded,
    portion_label: portion.portionLabel,
    multiplier: Math.round(f * 1000) / 1000,
    per_100g: per100g,
    output: { calories, total_fat_g },
    missing: missingNutrients,
    plausibility_flagged: plausibilityFlagged,
  });

  if (plausibilityFlagged) {
    safeLog.warn(LOG_SCOPE, 'plausibility bound exceeded for single item', {
      query_hint: foodHint,
      matched_name: meta.matchedName,
      calories,
      total_fat_g,
      max_kcal: ITEM_PLAUSIBILITY_MAX_KCAL,
      max_fat_g: ITEM_PLAUSIBILITY_MAX_FAT_G,
    });
  }

  if (trace) {
    trace.matchedName = row.food_name;
    trace.fdcId = row.fdc_id;
    trace.servingSizeG = num(row.serving_size_g);
    trace.grams = grams;
    trace.unitToGramsResolved = portion.method !== 'default_100g';
    trace.gramsMethod = portion.method;
    trace.missingNutrients = missingNutrients;
    if (row.data_type) trace.dataType = row.data_type;
    trace.per100g = {
      calories: per100g.calories,
      protein_g: per100g.protein_g,
      carbs_g: per100g.carbs_g,
      total_fat_g: per100g.total_fat_g,
      saturated_fat_g: per100g.saturated_fat_g,
      trans_fat_g: per100g.trans_fat_g,
      omega3_g: per100g.omega3_g,
      sugar_g: per100g.sugar_g,
      fiber_g: per100g.fiber_g,
    };
  }

  return {
    calories,
    protein_g: scale1(per100g.protein_g),
    carbs_g: scale1(per100g.carbs_g),
    total_fat_g,
    saturated_fat_g: scale1(per100g.saturated_fat_g),
    trans_fat_g: scale1(per100g.trans_fat_g),
    omega3_g: scale1(per100g.omega3_g),
    sugar_g: scale1(per100g.sugar_g),
    fiber_g: scale1(per100g.fiber_g),
    sodium_mg: scale1(per100g.sodium_mg),
    cholesterol_mg: scale1(per100g.cholesterol_mg),
    source: 'usda',
    meta,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
