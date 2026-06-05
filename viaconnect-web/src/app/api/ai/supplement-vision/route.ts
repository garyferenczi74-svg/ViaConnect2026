import { NextResponse } from 'next/server';
import { safeLog } from '@/lib/utils/safe-log';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runProviderRouter } from '@/lib/caq/supplement-extraction/provider-router';
import { matchAllExtracted } from '@/lib/caq/supplement-extraction/canonical-match';
import { logExtractionAttempt } from '@/lib/caq/supplement-extraction/observability';
import {
  getPhotoAiAnthropicApiKey,
  getPhotoAiGeminiApiKey,
} from '@/lib/caq/supplement-extraction/config';
import {
  validateAndNormalize,
  isValidationError,
} from '@/lib/caq/supplement-extraction/validate';
import type {
  ExtractedSupplement,
  ExtractionOutcomeCode,
  ExtractionResult,
  ModelTier,
  TierAttempt,
} from '@/lib/caq/supplement-extraction/types';

// Prompt 175h Section 2.1 + 2.2 (2026-06-05): the Photo AI path now
// accepts a multi-image payload {images: [{imageBase64, mimeType, role}]}
// where role is 'front' or 'ingredients'. Each image passes the same
// 175f integrity floor independently. The route merges the two
// extractions by role (front wins for brand+name+serving, ingredients
// wins for the ingredients list). The legacy single-image payload
// {imageBase64, mimeType} continues to work unchanged for callers that
// have not migrated to the two-photo flow.
export type ImageRole = 'front' | 'ingredients';
const VALID_ROLES: ReadonlyArray<ImageRole> = ['front', 'ingredients'];

interface NormalizedImageInput {
  imageBase64: string;
  mimeType: string | null;
  role: ImageRole | null;
}

interface PerImageReport {
  role: ImageRole | null;
  receivedBytes: number;
  outcomeCode: ExtractionOutcomeCode;
  itemCount: number;
  escalated: boolean;
  modelTier: ModelTier;
}

// Prompt 175b (2026-06-04): supplement label OCR route, provider-routed.
//
// Pipeline per request:
//   1. validateAndNormalize (sharp strips EXIF, caps dimensions, HEIC convert)
//   2. runProviderRouter: Gemini 2.5 Pro primary; Claude Sonnet fallback
//      when Gemini fails or returns below the confidence threshold
//      (gated by CAQ_SUPPLEMENT_CLAUDE_FALLBACK_ENABLED, default on).
//   3. matchAllExtracted against the canonical supplement database
//   4. logExtractionAttempt to caq_supplement_extraction_log via admin client
//   5. Translate ExtractionResult -> legacy IdentifiedProduct so the
//      existing CAQ Phase 3 UI keeps working without a UI rewrite.
//
// Env keys (Gary set these on Vercel 2026-06-04):
//   PHOTO_AI_GEMINI_API_KEY    - Gemini primary OCR
//   PHOTO_AI_ANTHROPIC_API_KEY - Claude Sonnet fallback
// Legacy GEMINI_API_KEY + ANTHROPIC_API_KEY are read as a fallback so
// nothing breaks if both names coexist. Resolution lives in config.ts.
//
// Every user-facing error string is neutral and routes through one of the
// USER_MESSAGE_FOR_* constants. The string "ANTHROPIC_API_KEY not set in
// .env.local" must NEVER reach the browser; server-side safeLog retains
// the actual condition.

export const maxDuration = 90;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Prompt 175b hotfix 2 (2026-06-05): unified neutral copy. Every
// server-failure path (provider 429, provider 5xx, parse failure,
// circuit open, timeout, unhandled) surfaces the same calm sentence
// because the user's next action is identical in every case: drop to
// the manual search. The prior "Photo analysis hit a snag. Please try
// again" copy was misleading because no amount of retry helps when
// both providers are unavailable.
const USER_MESSAGE_FOR_MANUAL_FALLBACK =
  'We could not read your label automatically. Please add it using the search below.';
const USER_MESSAGE_FOR_UNSUPPORTED =
  'Unsupported image format. Please use a JPEG, PNG, WebP, or HEIC photo.';
// Prompt 175f Section 2.4: a distinct user-facing message for the
// no_image_received case so the surface tells the user the photo did
// not reach the server, instead of the generic "could not read"
// language that conflates "tried but failed" with "nothing arrived".
const USER_MESSAGE_FOR_NO_IMAGE =
  'We did not receive a photo. Please try again.';

// Prompt 175f Section 2.2 + 2.4: minimum payload floor (in raw decoded
// bytes) below which the route concludes the image never reached the
// server in a meaningful form. Anything smaller than this cannot be a
// real JPEG label capture; a JPEG with even a stub label is several KB.
// Trip value is intentionally generous so a legitimately compressed
// label (down to 800 KB target) never trips it from above, while an
// empty body or a fragment trips it cleanly.
const SUPPLEMENT_VISION_MIN_PAYLOAD_BYTES = 5_000;

/**
 * Prompt 175f Section 11.O three-point trace: estimate the raw byte
 * length of a base64 string without allocating a full Buffer. base64 is
 * ~33 percent overhead so length / 4 * 3 minus padding gives the
 * decoded byte count. Pure function so the floor check is testable
 * without a request.
 */
export function approximateBase64ByteLength(base64: string): number {
  if (typeof base64 !== 'string' || base64.length === 0) return 0;
  let pad = 0;
  if (base64.endsWith('==')) pad = 2;
  else if (base64.endsWith('=')) pad = 1;
  return Math.max(0, Math.floor((base64.length / 4) * 3) - pad);
}

/**
 * Prompt 175f Section 2.4: returns true when the payload is below the
 * "no_image_received" floor. Centralizes the integer comparison so the
 * floor + the route + the tests all agree on the same threshold.
 */
export function isPayloadBelowFloor(base64: string | null | undefined): boolean {
  if (typeof base64 !== 'string' || base64.length === 0) return true;
  return approximateBase64ByteLength(base64) < SUPPLEMENT_VISION_MIN_PAYLOAD_BYTES;
}

interface LegacyIdentifiedProduct {
  brand: string | null;
  productName: string | null;
  servingSize: string | null;
  totalCount: number | null;
  ingredients: Array<{
    name: string;
    form: string | null;
    amount: number | null;
    unit: string | null;
    isPartOfBlend: boolean;
  }>;
  overallConfidence: 'high' | 'medium' | 'low';
}

export async function POST(request: Request) {
  try {
    const body = await safeJson(request);
    const images = normalizeImagesInput(body);

    // Prompt 175h Section 2.2: per-image byte-floor accounting. Log
    // before any provider call so runtime logs prove every image
    // reached the server. PHI-free: bytes + role only.
    const totalReceivedBytes = images.reduce(
      (sum, img) => sum + approximateBase64ByteLength(img.imageBase64),
      0,
    );
    safeLog.info('api.ai.supplement-vision', 'received', {
      imageCount: images.length,
      totalReceivedBytes,
      roles: images.map((i) => i.role ?? 'unspecified'),
    });

    if (images.length === 0) {
      safeLog.warn('api.ai.supplement-vision', 'no_image_received', {
        totalReceivedBytes,
        floorBytes: SUPPLEMENT_VISION_MIN_PAYLOAD_BYTES,
      });
      return degraded200('unsupported_image', USER_MESSAGE_FOR_NO_IMAGE, {
        status: 'degraded',
        reason: 'no_image_received',
        receivedBytes: totalReceivedBytes,
      });
    }

    // Prompt 175h Section 2.2 (per-image 175f integrity): every image
    // must individually clear the byte floor. Any image below the floor
    // is rejected outright with no_image_received; do not silently
    // continue with a half-empty pair.
    for (const img of images) {
      if (isPayloadBelowFloor(img.imageBase64)) {
        safeLog.warn('api.ai.supplement-vision', 'no_image_received_per_image', {
          role: img.role ?? 'unspecified',
          receivedBytes: approximateBase64ByteLength(img.imageBase64),
          floorBytes: SUPPLEMENT_VISION_MIN_PAYLOAD_BYTES,
        });
        return degraded200('unsupported_image', USER_MESSAGE_FOR_NO_IMAGE, {
          status: 'degraded',
          reason: 'no_image_received',
          receivedBytes: totalReceivedBytes,
          failedRole: img.role ?? 'unspecified',
        });
      }
    }

    const geminiApiKey = getPhotoAiGeminiApiKey();
    const anthropicApiKey = getPhotoAiAnthropicApiKey();
    if (!geminiApiKey && !anthropicApiKey) {
      safeLog.warn(
        'api.ai.supplement-vision',
        'extraction unavailable: no provider keys configured',
        { hasGemini: false, hasAnthropic: false },
      );
      return jsonError('config_missing', USER_MESSAGE_FOR_MANUAL_FALLBACK, 503);
    }

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId: string | null = userData?.user?.id ?? null;

    // Prompt 175h hotfix (2026-06-05): per-image normalize + provider
    // routing in PARALLEL. The earlier sequential loop compounded two
    // 30-second Claude calls into a 60-second function which tripped
    // the Vercel timeout, returning an HTML error page that the client
    // could not parse. With Promise.all the wall-clock stays bounded
    // by the slower image, not by the sum.
    type PerImageEntry = {
      input: NormalizedImageInput;
      result: ExtractionResult | null;
      attempts: ReadonlyArray<TierAttempt>;
      normalizeError: ExtractionOutcomeCode | null;
      validationCode: ExtractionOutcomeCode | null;
    };

    const perImage: PerImageEntry[] = await Promise.all(
      images.map(async (img): Promise<PerImageEntry> => {
        let normalized;
        try {
          normalized = await validateAndNormalize(img.imageBase64, img.mimeType);
        } catch (err) {
          if (isValidationError(err)) {
            safeLog.warn('api.ai.supplement-vision', 'per-image validation failed', {
              role: img.role ?? 'unspecified',
              code: err.code,
            });
            return {
              input: img,
              result: null,
              attempts: [],
              normalizeError: err.code,
              validationCode: err.code,
            };
          }
          safeLog.error('api.ai.supplement-vision', 'normalize failed', {
            role: img.role ?? 'unspecified',
            error: err,
          });
          return {
            input: img,
            result: null,
            attempts: [],
            normalizeError: 'image_normalize_failed',
            validationCode: null,
          };
        }
        const { result, attempts } = await runProviderRouter({
          geminiApiKey,
          anthropicApiKey,
          imageBase64: normalized.base64,
          mimeType: normalized.mimeType,
        });
        return {
          input: img,
          result,
          attempts,
          normalizeError: null,
          validationCode: null,
        };
      }),
    );

    // Single-image legacy: a normalize failure on the sole image still
    // surfaces the 4xx / degraded the existing CAQ flow expects. With
    // multiple images we keep degraded 200 and let mergeByRole fall
    // through.
    if (images.length === 1 && perImage[0].validationCode !== null) {
      const code = perImage[0].validationCode;
      const status = code === 'unsupported_image' ? 400 : 422;
      return jsonError(code, USER_MESSAGE_FOR_UNSUPPORTED, status);
    }
    if (images.length === 1 && perImage[0].normalizeError === 'image_normalize_failed') {
      return degraded200('image_normalize_failed', USER_MESSAGE_FOR_MANUAL_FALLBACK);
    }

    // Merge results by role (front + ingredients). When only one image
    // was provided, this reduces to the single-image legacy behavior.
    const merged = mergeByRole(perImage);
    const escalatedAny = perImage.some((p) => p.attempts.length > 1);
    const allAttempts: TierAttempt[] = perImage.flatMap((p) => [...p.attempts]);
    const finalAttempt = allAttempts[allAttempts.length - 1];
    const imagesReport: PerImageReport[] = perImage.map((p) => ({
      role: p.input.role,
      receivedBytes: approximateBase64ByteLength(p.input.imageBase64),
      outcomeCode: p.normalizeError ?? p.result?.outcomeCode ?? 'unknown',
      itemCount: p.result?.items.length ?? 0,
      escalated: p.attempts.length > 1,
      modelTier: p.result?.modelTier ?? 'sonnet',
    }));

    if (merged === null || merged.items.length === 0) {
      await fireAndForgetLog(userId, finalAttempt, escalatedAny, 0);
      const code: ExtractionOutcomeCode =
        merged?.outcomeCode === 'success' ? 'no_items' : (merged?.outcomeCode ?? 'no_items');
      return degraded200(code, mapOutcomeToUserMessage(code), {
        attempts: attemptsSummary(allAttempts),
        imagesProcessed: imagesReport,
        receivedBytes: totalReceivedBytes,
      });
    }

    // Canonical-match runs against the existing search_supplements_v2 RPC.
    // Defensive: a match failure must not drop the extraction response.
    let matchedCount = 0;
    try {
      const matched = await matchAllExtracted(merged.items, supabase);
      for (const m of matched) {
        if (m.match.status === 'matched') matchedCount += 1;
      }
    } catch (matchErr) {
      safeLog.warn('api.ai.supplement-vision', 'canonical match failed', { error: matchErr });
    }

    await fireAndForgetLog(userId, finalAttempt, escalatedAny, matchedCount);

    const legacy = toLegacyShape(merged);
    return NextResponse.json({
      status: 'ok',
      success: true,
      outcomeCode: 'success' satisfies ExtractionOutcomeCode,
      data: legacy,
      modelTier: merged.modelTier,
      escalated: escalatedAny,
      attempts: attemptsSummary(allAttempts),
      receivedBytes: totalReceivedBytes,
      imagesProcessed: imagesReport,
    });
  } catch (err: unknown) {
    safeLog.error('api.ai.supplement-vision', 'unexpected error', { error: err });
    return degraded200('unknown', USER_MESSAGE_FOR_MANUAL_FALLBACK);
  }
}

/**
 * Prompt 175h Section 2.1: accept either {imageBase64, mimeType} OR
 * {images: [{imageBase64, mimeType, role}]}. Returns the normalized
 * image list; an empty array means "no usable image arrived".
 */
export function normalizeImagesInput(
  body: unknown,
): ReadonlyArray<NormalizedImageInput> {
  if (!body || typeof body !== 'object') return [];
  const obj = body as Record<string, unknown>;

  // New multi-image shape wins when present and non-empty.
  if (Array.isArray(obj.images) && obj.images.length > 0) {
    const out: NormalizedImageInput[] = [];
    for (const raw of obj.images) {
      if (!raw || typeof raw !== 'object') continue;
      const r = raw as Record<string, unknown>;
      const imageBase64 = typeof r.imageBase64 === 'string' ? r.imageBase64 : null;
      if (!imageBase64 || imageBase64.length === 0) continue;
      const mimeType = typeof r.mimeType === 'string' ? r.mimeType : null;
      const role: ImageRole | null =
        typeof r.role === 'string' && (VALID_ROLES as ReadonlyArray<string>).includes(r.role)
          ? (r.role as ImageRole)
          : null;
      out.push({ imageBase64, mimeType, role });
    }
    return out;
  }

  // Legacy single-image shape.
  const imageBase64 = typeof obj.imageBase64 === 'string' ? obj.imageBase64 : null;
  if (!imageBase64 || imageBase64.length === 0) return [];
  const mimeType = typeof obj.mimeType === 'string' ? obj.mimeType : null;
  return [{ imageBase64, mimeType, role: null }];
}

/**
 * Prompt 175h Section 2.1: merge per-image extraction results by role.
 * Front image wins for brand + product name; ingredients image wins
 * for the ingredient list. When only one image succeeded, that image
 * supplies everything.
 *
 * Returns null when no image produced a usable result; otherwise an
 * ExtractionResult shaped for the route's downstream code path.
 */
export function mergeByRole(
  perImage: ReadonlyArray<{
    input: NormalizedImageInput;
    result: ExtractionResult | null;
  }>,
): ExtractionResult | null {
  const usable = perImage.filter(
    (p): p is { input: NormalizedImageInput; result: ExtractionResult } =>
      p.result !== null && p.result.outcomeCode === 'success' && p.result.items.length > 0,
  );
  if (usable.length === 0) {
    // None succeeded. Surface the first non-null result so the route
    // can choose a degraded reason.
    const first = perImage.find((p) => p.result !== null);
    return first?.result ?? null;
  }
  if (usable.length === 1) {
    return usable[0].result;
  }

  const front = usable.find((p) => p.input.role === 'front');
  const ingredients = usable.find((p) => p.input.role === 'ingredients');

  // If neither image was tagged with a role (e.g. a multi-image call
  // without role hints), the first usable one is treated as the
  // ingredient source and the second as the front. Order matters here
  // because the UI lists front first.
  const ingredientsSource = ingredients ?? usable[0];
  const frontSource = front ?? usable[1] ?? usable[0];

  // Carry the ingredients-source items as the canonical ingredient
  // list. Front-source items are merged in only when they bring a
  // brand or product name that the ingredients source lacks.
  const mergedItems: ExtractedSupplement[] = [...ingredientsSource.result.items];
  const ingredientHasBrand = mergedItems.some((i) => i.brand !== null && i.brand !== '');
  if (!ingredientHasBrand && frontSource !== ingredientsSource) {
    const frontBrand = frontSource.result.items.find((i) => i.brand !== null && i.brand !== '');
    if (frontBrand) {
      for (let i = 0; i < mergedItems.length; i += 1) {
        if (mergedItems[i].brand === null || mergedItems[i].brand === '') {
          mergedItems[i] = { ...mergedItems[i], brand: frontBrand.brand };
        }
      }
    }
  }

  // Prefer whichever source's items had higher mean confidence to set
  // the reported modelTier (audit hint: which provider Hannah trusted).
  const ingAvg = meanConfidence(ingredientsSource.result.items);
  const frontAvg = meanConfidence(frontSource.result.items);
  const winnerTier = ingAvg >= frontAvg
    ? ingredientsSource.result.modelTier
    : frontSource.result.modelTier;
  const latency = Math.max(
    ingredientsSource.result.latencyMs,
    frontSource.result.latencyMs,
  );

  return {
    items: mergedItems,
    modelTier: winnerTier,
    escalated: ingredientsSource.result.escalated || frontSource.result.escalated,
    latencyMs: latency,
    outcomeCode: 'success',
  };
}

function meanConfidence(items: ReadonlyArray<ExtractedSupplement>): number {
  if (items.length === 0) return 0;
  let sum = 0;
  for (const it of items) sum += Number.isFinite(it.confidence) ? it.confidence : 0;
  return sum / items.length;
}

function jsonError(code: ExtractionOutcomeCode, message: string, status: number) {
  return NextResponse.json(
    { success: false, outcomeCode: code, error: message },
    { status },
  );
}

/**
 * Graceful failure response per 175b Section 9.1. Always HTTP 200 with
 * the degraded contract so the client never sees a 5xx and can render
 * the manual-search fallback without parsing prose.
 */
function degraded200(
  code: ExtractionOutcomeCode,
  userMessage: string,
  extras: Record<string, unknown> = {},
) {
  // Prompt 175f Section 2.5 + 9.1: status field is always 'degraded'
  // here. Callers can override `reason` via extras when they need to
  // pin a specific value (e.g. 'no_image_received') that does not flow
  // from the outcomeCode enum.
  return NextResponse.json(
    {
      status: 'degraded',
      success: false,
      degraded: true,
      reason: degradedReasonFor(code),
      fallback: 'manual_search',
      outcomeCode: code,
      error: userMessage,
      ...extras,
    },
    { status: 200 },
  );
}

/**
 * Map an internal outcomeCode to the 175b Section 9.1 'reason' enum so
 * the client can branch on a stable token regardless of which tier
 * actually failed.
 */
function degradedReasonFor(code: ExtractionOutcomeCode): string {
  switch (code) {
    case 'config_missing': return 'vision_unavailable';
    case 'circuit_open': return 'vision_unavailable';
    case 'timeout': return 'vision_timeout';
    case 'upstream_error': return 'vision_unavailable';
    case 'parse_failed': return 'vision_parse_failed';
    case 'no_items': return 'no_extraction';
    case 'image_normalize_failed': return 'image_unreadable';
    default: return 'vision_unavailable';
  }
}

function attemptsSummary(attempts: ReadonlyArray<TierAttempt>): ReadonlyArray<{
  tier: string;
  outcomeCode: string;
  itemCount: number;
  latencyMs: number;
}> {
  return attempts.map((a) => ({
    tier: a.tier,
    outcomeCode: a.outcomeCode,
    itemCount: a.itemCount,
    latencyMs: a.latencyMs,
  }));
}

function mapOutcomeToUserMessage(code: ExtractionOutcomeCode): string {
  // All server-failure paths converge on MANUAL_FALLBACK because the
  // user's next step is identical in every case: drop to the manual
  // search. The outcomeCode still varies for telemetry + log queries.
  // Only the 4xx client-validation paths get a distinct message.
  if (code === 'unsupported_image' || code === 'image_normalize_failed') {
    return USER_MESSAGE_FOR_UNSUPPORTED;
  }
  return USER_MESSAGE_FOR_MANUAL_FALLBACK;
}

// mapOutcomeToStatus removed by 175b hotfix. The route now returns either
// 4xx (client validation error via jsonError) or 200 (success OR degraded
// via degraded200); there is no 5xx surface for server-side failures any
// more. Acceptance Criteria 1: never 502.

/**
 * Translate the ExtractionResult into the legacy IdentifiedProduct shape
 * the existing CAQ Phase 3 UI already consumes. Picks the most common
 * brand among items and uses the first item's name as the displayed
 * product name; ingredients are the full item list.
 *
 * overallConfidence is derived from the average per-item confidence:
 *   >= 0.7 -> 'high', >= 0.5 -> 'medium', else 'low'.
 * The 'low' value triggers the UI's existing manual-entry CTA via the
 * onLowConfidence prop.
 */
function toLegacyShape(result: ExtractionResult): LegacyIdentifiedProduct {
  const items = result.items;
  const brand = pickMostCommon(items.map((it) => it.brand).filter((b): b is string => !!b));
  const productName = items[0]?.name?.trim() || null;
  const avg = items.length === 0
    ? 0
    : items.reduce((acc, it) => acc + (Number.isFinite(it.confidence) ? it.confidence : 0), 0) / items.length;
  const overallConfidence: 'high' | 'medium' | 'low' =
    avg >= 0.7 ? 'high' : avg >= 0.5 ? 'medium' : 'low';

  return {
    brand,
    productName,
    servingSize: null,
    totalCount: null,
    ingredients: items.map((it) => ({
      name: it.name || it.rawText || 'Ingredient',
      form: it.form,
      amount: it.dose,
      unit: it.unit,
      isPartOfBlend: false,
    })),
    overallConfidence,
  };
}

function pickMostCommon(values: ReadonlyArray<string>): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) { best = v; bestCount = c; }
  }
  return best;
}

async function fireAndForgetLog(
  userId: string | null,
  finalAttempt: TierAttempt | undefined,
  escalated: boolean,
  matchedCount: number,
): Promise<void> {
  if (!userId || !finalAttempt) return;
  try {
    await logExtractionAttempt(
      { userId, finalAttempt, escalated, matchedCount },
      createAdminClient(),
    );
  } catch (err) {
    safeLog.warn('api.ai.supplement-vision', 'observability log failed', { error: err });
  }
}

async function safeJson(request: Request): Promise<unknown> {
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === 'object') return parsed;
    return null;
  } catch {
    return null;
  }
}

// Re-export the unused contract types for any future TS importer; kept here
// rather than at the top so the route stays focused on POST.
export type { ExtractedSupplement };
