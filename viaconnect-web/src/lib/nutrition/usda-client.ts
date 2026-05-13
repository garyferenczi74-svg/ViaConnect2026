// Prompt #164 Layer 2: search USDA FoodData Central for a food, fetch its
// nutrient detail, scale per serving, and cache the result for 30 days.

import { createAdminClient } from '@/lib/supabase/admin';
import { withAbortTimeout } from '@/lib/utils/with-timeout';
import { getCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { safeLog } from '@/lib/utils/safe-log';
import { AIRouteError, classifyUSDAResponse } from '@/lib/errors/classify-ai';
import { normalizeQuery } from './normalize-query';
import { extractNutrientsPer100g } from './usda-nutrient-ids';
import { unitToGrams } from './typical-weights';

const BASE = 'https://api.nal.usda.gov/fdc/v1';
const TIMEOUT_MS = 6000;
const breaker = getCircuitBreaker('usda-api', { failureThreshold: 5, resetTimeoutMs: 60_000, halfOpenMaxAttempts: 1 });

export interface ItemNutrients {
  calories: number;
  protein_g: number;
  carbs_g: number;
  total_fat_g: number;
  saturated_fat_g: number;
  trans_fat_g: number;
  omega3_g: number;
  sugar_g: number;
  fiber_g: number;
  source: 'usda';
}

interface CacheRow {
  food_name: string;
  fdc_id: number | null;
  serving_size_g: number | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  total_fat_per_100g: number;
  saturated_fat_per_100g: number;
  trans_fat_per_100g: number;
  omega3_per_100g: number;
  sugar_per_100g: number;
  fiber_per_100g: number;
  expires_at: string;
}

export async function lookupFood(name: string, quantity: number, unit: string): Promise<ItemNutrients | null> {
  const normalized = normalizeQuery(name);
  const admin = createAdminClient();

  const { data: cached } = await admin
    .from('usda_food_cache')
    .select('food_name, fdc_id, serving_size_g, calories_per_100g, protein_per_100g, carbs_per_100g, total_fat_per_100g, saturated_fat_per_100g, trans_fat_per_100g, omega3_per_100g, sugar_per_100g, fiber_per_100g, expires_at')
    .eq('query_normalized', normalized)
    .maybeSingle();

  if (cached && new Date(cached.expires_at) > new Date()) {
    return scaleToServing(cached as CacheRow, quantity, unit, normalized);
  }

  const search = await searchUSDA(normalized);
  if (!search) return null;

  const detail = await fetchUSDADetail(search.fdcId);
  const per100g = extractNutrientsPer100g(detail);

  const row: CacheRow = {
    food_name: search.description,
    fdc_id: search.fdcId,
    serving_size_g: 100,
    calories_per_100g: per100g.calories,
    protein_per_100g: per100g.protein_g,
    carbs_per_100g: per100g.carbs_g,
    total_fat_per_100g: per100g.total_fat_g,
    saturated_fat_per_100g: per100g.saturated_fat_g,
    trans_fat_per_100g: per100g.trans_fat_g,
    omega3_per_100g: per100g.omega3_g,
    sugar_per_100g: per100g.sugar_g,
    fiber_per_100g: per100g.fiber_g,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const { error: insErr } = await admin.from('usda_food_cache').insert({
    query_normalized: normalized,
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
    raw_payload: detail,
  });
  if (insErr) safeLog.warn('nutrition.usda-client', 'cache write failed', { error: insErr });
  return scaleToServing(row, quantity, unit, normalized);
}

async function searchUSDA(query: string): Promise<{ fdcId: number; description: string } | null> {
  const key = process.env.USDA_FDC_API_KEY || 'DEMO_KEY';
  if (key === 'DEMO_KEY') safeLog.warn('nutrition.usda-client', 'using DEMO_KEY (30/hr limit)');
  const url = `${BASE}/foods/search?query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy&pageSize=5&api_key=${key}`;
  const res = await breaker.execute(() => withAbortTimeout((s) => fetch(url, { signal: s }), TIMEOUT_MS, 'usda.search'));
  if (!res.ok) {
    const c = classifyUSDAResponse(res.status);
    throw new AIRouteError(c.code, `usda search ${res.status} ${c.code}`, c.httpStatus, c.userMessage);
  }
  const json = await res.json() as { foods?: Array<{ fdcId: number; description: string }> };
  const first = json.foods?.[0];
  if (!first) return null;
  return { fdcId: first.fdcId, description: first.description };
}

async function fetchUSDADetail(fdcId: number): Promise<{ foodNutrients?: Array<{ nutrient?: { id?: number }; amount?: number }> }> {
  const key = process.env.USDA_FDC_API_KEY || 'DEMO_KEY';
  const url = `${BASE}/food/${fdcId}?api_key=${key}`;
  const res = await breaker.execute(() => withAbortTimeout((s) => fetch(url, { signal: s }), TIMEOUT_MS, 'usda.detail'));
  if (!res.ok) {
    const c = classifyUSDAResponse(res.status);
    throw new AIRouteError(c.code, `usda detail ${res.status} ${c.code}`, c.httpStatus, c.userMessage);
  }
  return res.json();
}

function scaleToServing(row: CacheRow, quantity: number, unit: string, foodHint: string): ItemNutrients {
  const grams = unitToGrams(unit, quantity, foodHint) ?? (row.serving_size_g ?? 100);
  const f = grams / 100;
  return {
    calories: Math.round(row.calories_per_100g * f),
    protein_g: round1(row.protein_per_100g * f),
    carbs_g: round1(row.carbs_per_100g * f),
    total_fat_g: round1(row.total_fat_per_100g * f),
    saturated_fat_g: round1(row.saturated_fat_per_100g * f),
    trans_fat_g: round1(row.trans_fat_per_100g * f),
    omega3_g: round1(row.omega3_per_100g * f),
    sugar_g: round1(row.sugar_per_100g * f),
    fiber_g: round1(row.fiber_per_100g * f),
    source: 'usda',
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
