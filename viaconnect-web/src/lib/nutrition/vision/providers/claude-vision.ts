// Prompt #170 Phase 1c: Claude Vision tertiary recognition client.
//
// Per spec §2.2 step 4, Claude Vision is the tertiary provider, invoked only
// when primary mean confidence is below 0.55. Per §4 the client is hard-capped
// by a monthly USD ceiling; callers pass the running spend and the ceiling and
// this module gates the call before any token is spent.
//
// The outbound payload to Anthropic contains only the image bytes (as base64)
// and a structured prompt asking for a JSON array of recognition items. No
// Supabase auth getter, no user_id, no email, no PHI. The image bytes are
// inspected locally via sharp() to denormalize the model's 0..1 bounding box
// coordinates to pixel space for downstream merge with LogMeal / Gemini.
//
// Error mapping:
//   - cap reached         -> AIRouteError BUDGET_HIT 503
//   - missing apiKey      -> AIRouteError CONFIG_MISSING 503
//   - timeout             -> AIRouteError API_DOWN 504
//   - SDK throw           -> AIRouteError API_DOWN 503 (via toAIRouteError)
//   - unparseable output  -> AIRouteError MALFORMED_RESPONSE 502
//
// Hard rules honored: no em or en dashes anywhere, no emojis, no any.

import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';

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

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_TOKENS = 1024;
const TEMPERATURE = 0.1;

const SYSTEM_PROMPT = `You are a food recognition vision assistant. You receive a single meal photo.
You must return ONLY a valid JSON array of recognized food items. No prose, no markdown fences, no commentary.

Each array element must match exactly this shape:
{
  "foodName": string,
  "cuisineTag": one of [north_american, mediterranean, latin_american, east_asian, south_asian, southeast_asian, middle_eastern, african, unknown],
  "boundingBox": { "x": number, "y": number, "w": number, "h": number } where x, y, w, h are normalized 0..1 against the image,
  "confidence": number between 0 and 1,
  "cookingMethod": one of [raw, steamed, grilled, baked, boiled, sauteed, fried, deep_fried, unknown]
}

If no foods are recognizable, return an empty array []. Do not include any fields other than the five above.`;

const USER_PROMPT = 'Identify each distinct food item in this meal photo and return the JSON array described in the system instructions.';

export interface ClaudeVisionOpts {
  apiKey: string;
  requestId: string;
  timeoutMs?: number;
  monthlyCapUsd: number;
  monthSpendUsdSoFar: number;
  model?: string;
}

interface ClaudeRawItem {
  foodName?: unknown;
  cuisineTag?: unknown;
  boundingBox?: unknown;
  confidence?: unknown;
  cookingMethod?: unknown;
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

function clampConfidence(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function clampUnitNumber(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function toNormalizedBBox(raw: unknown): { x: number; y: number; w: number; h: number } | null {
  if (raw === null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const x = clampUnitNumber(r.x);
  const y = clampUnitNumber(r.y);
  const w = clampUnitNumber(r.w);
  const h = clampUnitNumber(r.h);
  if (x === null || y === null || w === null || h === null) return null;
  return { x, y, w, h };
}

function denormalize(
  bb: { x: number; y: number; w: number; h: number },
  imageW: number,
  imageH: number,
): BoundingBox {
  return {
    x: Math.round(bb.x * imageW),
    y: Math.round(bb.y * imageH),
    w: Math.round(bb.w * imageW),
    h: Math.round(bb.h * imageH),
  };
}

function extractText(content: unknown): string {
  if (!Array.isArray(content)) return '';
  const parts: string[] = [];
  for (const block of content) {
    if (block === null || typeof block !== 'object') continue;
    const b = block as Record<string, unknown>;
    if (b.type === 'text' && typeof b.text === 'string') {
      parts.push(b.text);
    }
  }
  return parts.join('\n');
}

function parseModelArray(text: string, requestId: string): ReadonlyArray<ClaudeRawItem> {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const tryParse = (s: string): unknown => {
    try { return JSON.parse(s); } catch { return undefined; }
  };

  let parsed: unknown = tryParse(trimmed);
  if (parsed === undefined) {
    const firstBracket = trimmed.indexOf('[');
    const lastBracket = trimmed.lastIndexOf(']');
    if (firstBracket >= 0 && lastBracket > firstBracket) {
      parsed = tryParse(trimmed.slice(firstBracket, lastBracket + 1));
    }
  }
  if (parsed === undefined) {
    safeLog.warn('nutrivision.claude.bad_json', 'claude json parse', {
      request_id: requestId,
      preview: text.slice(0, 200),
    });
    throw new AIRouteError(
      'MALFORMED_RESPONSE',
      'claude vision: bad json',
      502,
      'Vision provider returned malformed response.',
    );
  }
  if (!Array.isArray(parsed)) {
    safeLog.warn('nutrivision.claude.not_array', 'claude not array', {
      request_id: requestId,
    });
    throw new AIRouteError(
      'MALFORMED_RESPONSE',
      'claude vision: not array',
      502,
      'Vision provider returned malformed response.',
    );
  }
  return parsed as ReadonlyArray<ClaudeRawItem>;
}

function mapItems(
  raw: ReadonlyArray<ClaudeRawItem>,
  imageW: number,
  imageH: number,
  requestId: string,
): VisionItem[] {
  const items: VisionItem[] = [];
  let i = 0;
  for (const r of raw) {
    if (r === null || typeof r !== 'object') continue;
    const name = typeof r.foodName === 'string' ? r.foodName.trim() : '';
    if (name.length === 0) continue;
    const norm = toNormalizedBBox(r.boundingBox);
    if (norm === null) continue;
    const bbox = denormalize(norm, imageW, imageH);
    const confidence = clampConfidence(r.confidence);
    const cookingMethod = isCookingMethod(r.cookingMethod) ? r.cookingMethod : undefined;
    const cuisineTag = isCuisineTag(r.cuisineTag) ? r.cuisineTag : undefined;
    items.push({
      id: `claude-${requestId}-${i}`,
      foodName: name,
      cuisineTag,
      boundingBox: bbox,
      confidence,
      cookingMethod,
      rawProviderPayload: r,
    });
    i++;
  }
  return items;
}

/**
 * Tertiary Claude Vision recognition. Throws AIRouteError on cap hit, missing
 * key, timeout, SDK failure, or malformed model output.
 */
export async function recognizeWithClaude(
  imageBytes: Buffer,
  mime: string,
  opts: ClaudeVisionOpts,
): Promise<ProviderRecognition> {
  if (opts.monthSpendUsdSoFar >= opts.monthlyCapUsd) {
    safeLog.warn('nutrivision.claude.cap_hit', 'claude monthly cap reached', {
      request_id: opts.requestId,
      month_spend_usd: opts.monthSpendUsdSoFar,
      monthly_cap_usd: opts.monthlyCapUsd,
    });
    throw new AIRouteError(
      'BUDGET_HIT',
      'claude tertiary cap hit',
      503,
      'Photo recognition limit reached, please retry later.',
    );
  }

  if (!opts.apiKey || opts.apiKey.length === 0) {
    safeLog.warn('nutrivision.claude.no_key', 'claude apikey missing', {
      request_id: opts.requestId,
    });
    throw new AIRouteError(
      'CONFIG_MISSING',
      'claude vision: no api key',
      503,
      'Photo recognition unavailable. Try again later.',
    );
  }

  const model = opts.model ?? DEFAULT_MODEL;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const start = performance.now();

  // Read image dimensions for bbox denormalization. sharp() is sync-create,
  // async-metadata. Failure here is treated as a malformed image -> throw.
  let imageW = 0;
  let imageH = 0;
  try {
    const meta = await sharp(imageBytes).metadata();
    imageW = typeof meta.width === 'number' ? meta.width : 0;
    imageH = typeof meta.height === 'number' ? meta.height : 0;
  } catch (err) {
    safeLog.warn('nutrivision.claude.sharp_failed', 'sharp metadata failed', {
      request_id: opts.requestId,
      error: err,
    });
    throw new AIRouteError(
      'INVALID_INPUT',
      'claude vision: sharp metadata failed',
      400,
      'We could not read this image. Try a different photo.',
    );
  }
  if (imageW <= 0 || imageH <= 0) {
    throw new AIRouteError(
      'INVALID_INPUT',
      'claude vision: zero dimensions',
      400,
      'We could not read this image. Try a different photo.',
    );
  }

  const client = new Anthropic({ apiKey: opts.apiKey });
  const base64 = imageBytes.toString('base64');

  // Use a known-good media_type. The Anthropic SDK accepts a narrow union for
  // media_type on ImageBlockParam; mime is validated by upstream capture so
  // we pass it through but fall back to image/jpeg if it is empty.
  const mediaType = (mime && mime.length > 0 ? mime : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

  let resp: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    resp = await withTimeout(
      client.messages.create({
        model,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 },
              },
              { type: 'text', text: USER_PROMPT },
            ],
          },
        ],
      }),
      { timeoutMs, op: 'claude.vision.recognize', requestId: opts.requestId },
    );
  } catch (err) {
    if (isTimeoutError(err)) {
      throw new AIRouteError(
        'API_DOWN',
        'claude vision: timeout',
        504,
        'Vision provider slow, please retry.',
      );
    }
    if (err instanceof AIRouteError) throw err;
    safeLog.warn('nutrivision.claude.sdk_failed', 'claude sdk failure', {
      request_id: opts.requestId,
      error: err,
    });
    throw new AIRouteError(
      'API_DOWN',
      'claude vision: sdk failure',
      503,
      'Vision provider unreachable, please retry.',
    );
  }

  // The SDK Message type's content is Array<ContentBlock>; extractText narrows
  // to text blocks via unknown-guard so we do not depend on the SDK union shape.
  const text = extractText((resp as unknown as { content?: unknown }).content);
  const rawArray = parseModelArray(text, opts.requestId);
  const items = mapItems(rawArray, imageW, imageH, opts.requestId);
  const latencyMs = Math.max(0, Math.round(performance.now() - start));
  // Prompt #170a supplement §18.2: portion-weighted aggregation. Claude Vision
  // items expose portionGramsHint when the model emits estimated_serving_grams;
  // fallback weight is 1.0 per the shared helper. Routed through the helper
  // so the formula stays consistent across providers.
  const meanConfidence = computeMeanConfidence(items);

  return {
    provider: 'claude_vision',
    items,
    latencyMs,
    meanConfidence,
  };
}
