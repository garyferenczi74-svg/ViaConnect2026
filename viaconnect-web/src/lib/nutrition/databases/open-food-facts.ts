// Prompt #170 Phase 1e: Open Food Facts (OFF) client.
//
// Third source in the resolver cascade: Curated -> USDA -> OFF -> vision built-in.
// OFF is a community-maintained product database with both barcode and text-search
// endpoints. We map nutriments -> a normalized per100g shape. Sodium and
// cholesterol in OFF are stored in grams; we multiply by 1000 to surface mg.
//
// The outbound HTTP call carries only the barcode or query string. No user_id,
// no email, no PHI. This module intentionally does not import @/lib/supabase/*.
//
// Error mapping:
//   - 404 barcode      -> null (expected miss, not an error)
//   - status:0 200     -> null (OFF's "not found in db" 200 shape)
//   - 5xx + network    -> AIRouteError API_DOWN
//   - bad JSON         -> AIRouteError MALFORMED_RESPONSE
//   - missing kcal     -> null (caller treats as "OFF lookup failed")
//
// Hard rules honored: no em or en dashes anywhere, no emojis, no any.

import { AIRouteError } from '@/lib/errors/classify-ai';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout, isTimeoutError } from '@/lib/nutrition/resilience/timeout';
import { getCircuitBreaker } from '@/lib/utils/circuit-breaker';

export type OFFSource = 'open_food_facts';

export interface OFFPer100g {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  cholesterol_mg?: number;
}

export interface OFFNutrients {
  source: OFFSource;
  foodName: string;
  brandName?: string;
  barcode?: string;
  per100g: OFFPer100g;
  micronutrientsPer100g?: Record<string, number>;
}

export interface OFFLookupOpts {
  requestId: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

const DEFAULT_BASE_URL = 'https://world.openfoodfacts.org';
const DEFAULT_TIMEOUT_MS = 4000;
const BARCODE_PATH = (code: string) => `/api/v2/product/${encodeURIComponent(code)}.json`;
const SEARCH_PATH = '/cgi/search.pl';
const SEARCH_FIELDS = 'product_name,brands,code,nutriments';
const SEARCH_PAGE_SIZE = 5;

const breaker = getCircuitBreaker('open-food-facts-api', {
  failureThreshold: 5,
  resetTimeoutMs: 60_000,
  halfOpenMaxAttempts: 1,
});

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Look up a product by barcode. Returns null on 404 (expected miss), throws
 * AIRouteError on API_DOWN or MALFORMED_RESPONSE.
 */
export async function lookupByBarcode(
  barcode: string,
  opts: OFFLookupOpts,
): Promise<OFFNutrients | null> {
  const url = `${DEFAULT_BASE_URL}${BARCODE_PATH(barcode)}`;
  const start = performance.now();
  const res = await fetchOff(url, opts, 'off.barcode');

  if (res.status === 404) {
    // Expected miss: product not in OFF. Caller cascades to text search.
    return null;
  }

  if (!res.ok) {
    safeLog.warn('nutrition.off.api_down', 'off barcode non-200', {
      request_id: opts.requestId,
      status: res.status,
      barcode,
    });
    throw new AIRouteError(
      'API_DOWN',
      `off: ${res.status}`,
      503,
      'Food database unreachable, please retry.',
    );
  }

  const raw = await parseJsonOrThrow(res, opts.requestId);
  const product = extractProduct(raw);
  if (product === null) {
    // OFF returns 200 with status:0 when product is not found in db.
    return null;
  }

  const mapped = mapProduct(product, barcode);
  if (mapped === null) return null;

  const latencyMs = Math.max(0, Math.round(performance.now() - start));
  safeLog.info('nutrition.off.hit', 'off barcode hit', {
    request_id: opts.requestId,
    barcode_or_query: barcode,
    food_name: mapped.foodName,
    latency_ms: latencyMs,
  });
  return mapped;
}

/**
 * Search by free-text query. Returns the first parseable product, or null.
 */
export async function searchByText(
  query: string,
  opts: OFFLookupOpts,
): Promise<OFFNutrients | null> {
  const url = `${DEFAULT_BASE_URL}${SEARCH_PATH}?search_terms=${encodeURIComponent(query)}&json=1&page_size=${SEARCH_PAGE_SIZE}&fields=${SEARCH_FIELDS}`;
  const start = performance.now();
  const res = await fetchOff(url, opts, 'off.search');

  if (!res.ok) {
    safeLog.warn('nutrition.off.api_down', 'off search non-200', {
      request_id: opts.requestId,
      status: res.status,
      query,
    });
    throw new AIRouteError(
      'API_DOWN',
      `off: ${res.status}`,
      503,
      'Food database unreachable, please retry.',
    );
  }

  const raw = await parseJsonOrThrow(res, opts.requestId);
  const products = extractProducts(raw);
  if (products.length === 0) return null;

  for (const product of products) {
    const mapped = mapProduct(product, undefined);
    if (mapped !== null) {
      const latencyMs = Math.max(0, Math.round(performance.now() - start));
      safeLog.info('nutrition.off.hit', 'off search hit', {
        request_id: opts.requestId,
        barcode_or_query: query,
        food_name: mapped.foodName,
        latency_ms: latencyMs,
      });
      return mapped;
    }
  }
  return null;
}

// ----------------------------------------------------------------------------
// Internals
// ----------------------------------------------------------------------------

async function fetchOff(
  url: string,
  opts: OFFLookupOpts,
  op: string,
): Promise<Response> {
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    return await breaker.execute(() =>
      withTimeout(fetchImpl(url, { method: 'GET', headers: { Accept: 'application/json' } }), {
        timeoutMs,
        op,
        requestId: opts.requestId,
      }),
    );
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('nutrition.off.api_down', 'off timeout', {
        request_id: opts.requestId,
        op,
      });
      throw new AIRouteError(
        'API_DOWN',
        'off: timeout',
        504,
        'Food database slow, please retry.',
      );
    }
    if (err instanceof AIRouteError) throw err;
    safeLog.warn('nutrition.off.api_down', 'off fetch error', {
      request_id: opts.requestId,
      op,
      error: err,
    });
    throw new AIRouteError(
      'API_DOWN',
      'off: fetch failed',
      503,
      'Food database unreachable, please retry.',
    );
  }
}

async function parseJsonOrThrow(res: Response, requestId: string): Promise<unknown> {
  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    safeLog.warn('nutrition.off.bad_body', 'off body read failed', {
      request_id: requestId,
      error: err,
    });
    throw new AIRouteError(
      'MALFORMED_RESPONSE',
      'off: body read failed',
      502,
      'Food database returned malformed response.',
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    safeLog.warn('nutrition.off.bad_json', 'off json parse failed', {
      request_id: requestId,
      preview: text.slice(0, 200),
    });
    throw new AIRouteError(
      'MALFORMED_RESPONSE',
      'off: bad json',
      502,
      'Food database returned malformed response.',
    );
  }
}

interface RawProduct {
  product_name?: unknown;
  brands?: unknown;
  code?: unknown;
  nutriments?: unknown;
}

function extractProduct(raw: unknown): RawProduct | null {
  if (raw === null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  // OFF barcode shape: { status: 1, product: { ... } }. status:0 = not found.
  if (r.status === 0) return null;
  const product = r.product;
  if (product === null || typeof product !== 'object') return null;
  return product as RawProduct;
}

function extractProducts(raw: unknown): ReadonlyArray<RawProduct> {
  if (raw === null || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.products)) return [];
  return r.products.filter(
    (p): p is RawProduct => p !== null && typeof p === 'object',
  );
}

function mapProduct(product: RawProduct, fallbackBarcode: string | undefined): OFFNutrients | null {
  const nutriments = product.nutriments;
  if (nutriments === null || typeof nutriments !== 'object') return null;
  const n = nutriments as Record<string, unknown>;

  const calories = toFiniteNumber(n['energy-kcal_100g']);
  if (calories === null) return null;

  const protein = toFiniteNumber(n.proteins_100g) ?? 0;
  const carbs = toFiniteNumber(n.carbohydrates_100g) ?? 0;
  const fat = toFiniteNumber(n.fat_100g) ?? 0;

  const fiberRaw = toFiniteNumber(n.fiber_100g);
  const sugarRaw = toFiniteNumber(n.sugars_100g);
  const sodiumGramsRaw = toFiniteNumber(n.sodium_100g);
  const cholesterolGramsRaw = toFiniteNumber(n.cholesterol_100g);

  const per100g: OFFPer100g = {
    calories_kcal: calories,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
  };
  if (fiberRaw !== null) per100g.fiber_g = fiberRaw;
  if (sugarRaw !== null) per100g.sugar_g = sugarRaw;
  if (sodiumGramsRaw !== null) per100g.sodium_mg = sodiumGramsRaw * 1000;
  if (cholesterolGramsRaw !== null) per100g.cholesterol_mg = cholesterolGramsRaw * 1000;

  const foodName = typeof product.product_name === 'string' && product.product_name.length > 0
    ? product.product_name
    : 'unknown';

  const brandName = typeof product.brands === 'string' && product.brands.length > 0
    ? product.brands
    : undefined;

  const barcode = typeof product.code === 'string' && product.code.length > 0
    ? product.code
    : fallbackBarcode;

  return {
    source: 'open_food_facts',
    foodName,
    brandName,
    barcode,
    per100g,
  };
}

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : null;
  }
  if (typeof v === 'string' && v.length > 0) {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

// ----------------------------------------------------------------------------
// Prompt 170l Phase 1a: richer OFFProduct return type + direct-to-OFF lookup.
//
// The existing lookupByBarcode + OFFNutrients shape stays untouched so the
// resolver cascade (Curated > USDA > OFF > vision) keeps its contract. The
// 170l flow needs Nova group, NutriScore, Eco-Score, allergens, completeness,
// ingredients text, image URL and serving size, none of which OFFNutrients
// surfaces. lookupProductByBarcode adds a `fields=` query param to minimize
// payload per OFF citizenship + spec §3.5.
// ----------------------------------------------------------------------------

export interface OFFProduct {
  code: string;
  product_name: string | null;
  brands: string | null;
  nutriments: Record<string, number> | null;
  image_url: string | null;
  nutriscore_grade: string | null;
  nova_group: number | null;
  ecoscore_grade: string | null;
  ingredients_text: string | null;
  allergens_tags: string[] | null;
  serving_size: string | null;
  completeness: number | null;
  // Prompt 171b Phase 2: caffeine per 100g/100ml when OFF has it (energy
  // drinks like Red Bull / Monster / Celsius commonly carry this). Derived
  // from nutriments['caffeine_100g'] or nutriments['caffeine_100ml']. The
  // per-serving caffeine_mg is computed downstream via serving_size_g.
  caffeine_per_100g_mg: number | null;
}

const PRODUCT_FIELDS = [
  'product_name',
  'brands',
  'code',
  'nutriments',
  'image_url',
  'nutriscore_grade',
  'nova_group',
  'ecoscore_grade',
  'ingredients_text',
  'allergens_tags',
  'serving_size',
  'completeness',
  // Prompt 171b Phase 2: request caffeine fields from OFF v2.
  'caffeine_value',
  'caffeine_unit',
  'caffeine_100g',
  'caffeine_100ml',
].join(',');

const PRODUCT_BARCODE_PATH = (code: string) =>
  `/api/v2/product/${encodeURIComponent(code)}.json?fields=${PRODUCT_FIELDS}`;

export async function lookupProductByBarcode(
  barcode: string,
  opts: OFFLookupOpts,
): Promise<OFFProduct | null> {
  const url = `${DEFAULT_BASE_URL}${PRODUCT_BARCODE_PATH(barcode)}`;
  const start = performance.now();
  const res = await fetchOff(url, opts, 'off.product.barcode');

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    safeLog.warn('nutrition.off.api_down', 'off product barcode non-200', {
      request_id: opts.requestId,
      status: res.status,
      barcode,
    });
    throw new AIRouteError(
      'API_DOWN',
      `off: ${res.status}`,
      503,
      'Food database unreachable, please retry.',
    );
  }

  const raw = await parseJsonOrThrow(res, opts.requestId);
  const product = extractProduct(raw);
  if (product === null) {
    return null;
  }

  const mapped = mapFullProduct(product, barcode);
  const latencyMs = Math.max(0, Math.round(performance.now() - start));
  safeLog.info('nutrition.off.product_hit', 'off product hit', {
    request_id: opts.requestId,
    barcode,
    product_name: mapped.product_name,
    latency_ms: latencyMs,
  });
  return mapped;
}

interface RawFullProduct extends RawProduct {
  image_url?: unknown;
  nutriscore_grade?: unknown;
  nova_group?: unknown;
  ecoscore_grade?: unknown;
  ingredients_text?: unknown;
  allergens_tags?: unknown;
  serving_size?: unknown;
  completeness?: unknown;
}

function mapFullProduct(
  product: RawProduct,
  fallbackBarcode: string,
): OFFProduct {
  const p = product as RawFullProduct;
  const nutriments = p.nutriments;
  const nutrimentsRecord: Record<string, number> | null =
    nutriments !== null && typeof nutriments === 'object'
      ? Object.fromEntries(
          Object.entries(nutriments as Record<string, unknown>).flatMap(
            ([k, v]) => {
              const n = toFiniteNumber(v);
              return n === null ? [] : [[k, n]];
            },
          ),
        )
      : null;

  const code = typeof p.code === 'string' && p.code.length > 0
    ? p.code
    : fallbackBarcode;

  return {
    code,
    product_name: typeof p.product_name === 'string' && p.product_name.length > 0
      ? p.product_name
      : null,
    brands: typeof p.brands === 'string' && p.brands.length > 0
      ? p.brands
      : null,
    nutriments: nutrimentsRecord,
    image_url: typeof p.image_url === 'string' && p.image_url.length > 0
      ? p.image_url
      : null,
    nutriscore_grade:
      typeof p.nutriscore_grade === 'string' && p.nutriscore_grade.length > 0
        ? p.nutriscore_grade
        : null,
    nova_group: toFiniteNumber(p.nova_group),
    ecoscore_grade:
      typeof p.ecoscore_grade === 'string' && p.ecoscore_grade.length > 0
        ? p.ecoscore_grade
        : null,
    ingredients_text:
      typeof p.ingredients_text === 'string' && p.ingredients_text.length > 0
        ? p.ingredients_text
        : null,
    allergens_tags: Array.isArray(p.allergens_tags)
      ? p.allergens_tags.filter((tag): tag is string => typeof tag === 'string')
      : null,
    serving_size:
      typeof p.serving_size === 'string' && p.serving_size.length > 0
        ? p.serving_size
        : null,
    completeness: toFiniteNumber(p.completeness),
    caffeine_per_100g_mg: extractCaffeinePer100g(nutrimentsRecord),
  };
}

// Prompt 171b Phase 2: extract per-100g caffeine in mg from OFF nutriments.
// OFF stores caffeine in several possible fields depending on the product type:
//   caffeine_100g   - per 100 g (solids: coffee beans, chocolate)
//   caffeine_100ml  - per 100 ml (beverages: coffee drinks, energy drinks)
//   caffeine_value  + caffeine_unit - per serving when the above are absent
// For ready-to-drink products we prefer caffeine_100ml since serving_size
// for those is typically expressed in ml; for solids we prefer caffeine_100g.
// In either case we return a single number that represents caffeine per 100g
// (or per 100ml, which downstream code treats as equivalent for simple
// scaling against parsed serving_size_g).
function extractCaffeinePer100g(
  nutriments: Record<string, number> | null,
): number | null {
  if (nutriments === null) return null;
  const per100ml = toFiniteNumber(nutriments['caffeine_100ml']);
  if (per100ml !== null && per100ml > 0) return per100ml;
  const per100g = toFiniteNumber(nutriments['caffeine_100g']);
  if (per100g !== null && per100g > 0) return per100g;
  return null;
}
