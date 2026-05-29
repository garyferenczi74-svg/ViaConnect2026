// Prompt #170 Phase 1c: LogMeal Food AI primary recognition client.
//
// Per spec §2.2 LogMeal is the primary provider. The outbound call sends
// multipart form data with the image and an opaque request_id only. No
// Supabase auth getter, no user_id, no email, no PHI. This module
// intentionally does not import from @/lib/supabase/* (verified by test).
//
// LogMeal's documented endpoint is POST /v2/image/segmentation/complete.
// Response shape we map from: { segmentation_results: [{ foodName,
// confidence, bbox: { x, y, w, h }, cookingMethod?, cuisineTag? }] }.
// Polygon responses are reduced to their tight bounding box upstream by
// LogMeal; we treat bbox as already-rectangular per spec note.
//
// Error mapping:
//   - missing apiKey       -> AIRouteError CONFIG_MISSING 503
//   - timeout              -> AIRouteError API_DOWN 504
//   - non-200 from LogMeal -> AIRouteError API_DOWN 503
//   - JSON parse failure   -> AIRouteError MALFORMED_RESPONSE 502
//
// Hard rules honored: no em or en dashes anywhere, no emojis, no any.

import { AIRouteError } from '@/lib/errors/classify-ai';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout, isTimeoutError } from '@/lib/nutrition/resilience/timeout';
import { computeMeanConfidence } from '../reconcile';
import type {
  BoundingBox,
  CookingMethod,
  CuisineTag,
  ProviderRecognition,
  VisionItem,
} from '../types';

const DEFAULT_BASE_URL = 'https://api.logmeal.es';
const DEFAULT_TIMEOUT_MS = 5000;
const SEGMENTATION_PATH = '/v2/image/segmentation/complete';

export interface LogMealOpts {
  apiKey: string;
  baseUrl?: string;
  requestId: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

interface LogMealRawSegment {
  foodName?: unknown;
  confidence?: unknown;
  bbox?: unknown;
  cookingMethod?: unknown;
  cuisineTag?: unknown;
  foodLanguage?: unknown;
}

interface LogMealRawResponse {
  segmentation_results?: unknown;
}

const ALLOWED_COOKING_METHODS: ReadonlyArray<CookingMethod> = [
  'raw', 'steamed', 'grilled', 'baked', 'boiled',
  'sauteed', 'fried', 'deep_fried', 'unknown',
];

const ALLOWED_CUISINES: ReadonlyArray<CuisineTag> = [
  'north_american', 'mediterranean', 'latin_american', 'east_asian',
  'south_asian', 'southeast_asian', 'middle_eastern', 'african', 'unknown',
];

function isCookingMethod(v: unknown): v is CookingMethod {
  return typeof v === 'string' && (ALLOWED_COOKING_METHODS as ReadonlyArray<string>).includes(v);
}

function isCuisineTag(v: unknown): v is CuisineTag {
  return typeof v === 'string' && (ALLOWED_CUISINES as ReadonlyArray<string>).includes(v);
}

function toBoundingBox(raw: unknown): BoundingBox | null {
  if (raw === null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const x = Number(r.x);
  const y = Number(r.y);
  const w = Number(r.w);
  const h = Number(r.h);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) {
    return null;
  }
  return { x, y, w, h };
}

function clampConfidence(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function mapSegments(raw: LogMealRawResponse, requestId: string): VisionItem[] {
  if (!Array.isArray(raw.segmentation_results)) return [];
  const items: VisionItem[] = [];
  let i = 0;
  for (const s of raw.segmentation_results as ReadonlyArray<LogMealRawSegment>) {
    if (s === null || typeof s !== 'object') continue;
    const bbox = toBoundingBox(s.bbox);
    if (bbox === null) continue;
    const name = typeof s.foodName === 'string' ? s.foodName.trim() : '';
    if (name.length === 0) continue;
    const confidence = clampConfidence(s.confidence);
    const cookingMethod = isCookingMethod(s.cookingMethod) ? s.cookingMethod : undefined;
    const cuisineTag = isCuisineTag(s.cuisineTag) ? s.cuisineTag : undefined;
    const foodLanguage = typeof s.foodLanguage === 'string' ? s.foodLanguage : undefined;
    items.push({
      id: `logmeal-${requestId}-${i}`,
      foodName: name,
      foodLanguage,
      cuisineTag,
      boundingBox: bbox,
      confidence,
      cookingMethod,
      rawProviderPayload: s,
    });
    i++;
  }
  return items;
}

function buildFormData(imageBytes: Buffer, mime: string, requestId: string): FormData {
  // FormData is the Web-standard multipart container; image bytes go through
  // as a Blob with the correct MIME. The request_id is opaque (UUID v4 from
  // newRequestId or upstream caller). No user identifier ever travels here.
  const form = new FormData();
  const blob = new Blob([new Uint8Array(imageBytes)], { type: mime });
  form.append('image', blob, 'meal');
  form.append('request_id', requestId);
  return form;
}

async function parseJsonOrThrow(res: Response, requestId: string): Promise<LogMealRawResponse> {
  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    safeLog.warn('nutrivision.logmeal.read_body_failed', 'logmeal body read', {
      request_id: requestId,
      error: err,
    });
    throw new AIRouteError(
      'MALFORMED_RESPONSE',
      'logmeal: body read failed',
      502,
      'Vision provider returned malformed response.',
    );
  }
  try {
    return JSON.parse(text) as LogMealRawResponse;
  } catch {
    safeLog.warn('nutrivision.logmeal.bad_json', 'logmeal json parse', {
      request_id: requestId,
      preview: text.slice(0, 200),
    });
    throw new AIRouteError(
      'MALFORMED_RESPONSE',
      'logmeal: bad json',
      502,
      'Vision provider returned malformed response.',
    );
  }
}

/**
 * Run LogMeal Food AI primary recognition against an image buffer. Returns a
 * shaped ProviderRecognition. Throws AIRouteError on missing key, timeout,
 * non-200, or JSON parse failure per spec mapping above.
 */
export async function recognizeWithLogMeal(
  imageBytes: Buffer,
  mime: string,
  opts: LogMealOpts,
): Promise<ProviderRecognition> {
  if (!opts.apiKey || opts.apiKey.length === 0) {
    safeLog.warn('nutrivision.logmeal.no_key', 'logmeal apikey missing', {
      request_id: opts.requestId,
    });
    throw new AIRouteError(
      'CONFIG_MISSING',
      'logmeal: no api key',
      503,
      'Photo recognition unavailable. Try again later.',
    );
  }

  const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
  const url = `${baseUrl}${SEGMENTATION_PATH}`;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = opts.fetch ?? globalThis.fetch;

  const start = performance.now();
  let res: Response;
  try {
    res = await withTimeout(
      fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${opts.apiKey}`,
          Accept: 'application/json',
        },
        body: buildFormData(imageBytes, mime, opts.requestId),
      }),
      { timeoutMs, op: 'logmeal.recognize', requestId: opts.requestId },
    );
  } catch (err) {
    if (isTimeoutError(err)) {
      throw new AIRouteError(
        'API_DOWN',
        'logmeal: timeout',
        504,
        'Vision provider slow, please retry.',
      );
    }
    if (err instanceof AIRouteError) throw err;
    safeLog.warn('nutrivision.logmeal.fetch_failed', 'logmeal fetch error', {
      request_id: opts.requestId,
      error: err,
    });
    throw new AIRouteError(
      'API_DOWN',
      'logmeal: fetch failed',
      503,
      'Vision provider unreachable, please retry.',
    );
  }

  if (!res.ok) {
    safeLog.warn('nutrivision.logmeal.non_200', 'logmeal non-200', {
      request_id: opts.requestId,
      status: res.status,
    });
    throw new AIRouteError(
      'API_DOWN',
      `logmeal: ${res.status}`,
      503,
      'Vision provider unreachable, please retry.',
    );
  }

  const raw = await parseJsonOrThrow(res, opts.requestId);
  const items = mapSegments(raw, opts.requestId);
  const latencyMs = Math.max(0, Math.round(performance.now() - start));
  // Prompt #170a supplement §18.2: portion-weighted aggregation. LogMeal items
  // do not yet expose portionGramsHint, so weight falls back to 1.0 across
  // items and the result equals the simple mean. Routed through the shared
  // helper so the formula stays consistent across providers.
  const meanConfidence = computeMeanConfidence(items);

  return {
    provider: 'logmeal',
    items,
    latencyMs,
    meanConfidence,
  };
}
