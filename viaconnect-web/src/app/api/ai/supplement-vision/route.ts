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
  TierAttempt,
} from '@/lib/caq/supplement-extraction/types';

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
    const imageBase64 = body?.imageBase64;
    const mimeType = body?.mimeType;

    if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
      return jsonError('unsupported_image', USER_MESSAGE_FOR_UNSUPPORTED, 400);
    }

    const geminiApiKey = getPhotoAiGeminiApiKey();
    const anthropicApiKey = getPhotoAiAnthropicApiKey();
    if (!geminiApiKey && !anthropicApiKey) {
      // Both providers absent. Server log retains the actionable detail;
      // client gets neutral copy mapped to the manual-fallback branch by
      // outcomeCode.
      safeLog.warn(
        'api.ai.supplement-vision',
        'extraction unavailable: no provider keys configured',
        { hasGemini: false, hasAnthropic: false },
      );
      return jsonError('config_missing', USER_MESSAGE_FOR_MANUAL_FALLBACK, 503);
    }

    // Session client for canonical-match RLS + user id; admin client for
    // the observability insert (service-role bypass).
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId: string | null = userData?.user?.id ?? null;

    const mimeTypeString = typeof mimeType === 'string' ? mimeType : null;
    let normalized;
    try {
      normalized = await validateAndNormalize(imageBase64, mimeTypeString);
    } catch (err) {
      if (isValidationError(err)) {
        // Client-side validation failure (unsupported mime type, too large,
        // could not decode). 4xx is appropriate here because the client
        // sent something the server cannot use, and the client should fix
        // its input rather than retry. This is the ONLY non-2xx path that
        // remains after the 175b hotfix.
        const status = err.code === 'unsupported_image' ? 400 : 422;
        return jsonError(err.code, USER_MESSAGE_FOR_UNSUPPORTED, status);
      }
      safeLog.error('api.ai.supplement-vision', 'normalize failed', { error: err });
      return degraded200('image_normalize_failed', USER_MESSAGE_FOR_MANUAL_FALLBACK);
    }

    const { result, attempts } = await runProviderRouter({
      geminiApiKey,
      anthropicApiKey,
      imageBase64: normalized.base64,
      mimeType: normalized.mimeType,
    });
    const finalAttempt = attempts[attempts.length - 1];
    const escalated = attempts.length > 1;

    // Per 175b master spec Section 9.1 + 13: the route NEVER returns 502.
    // Every server-side failure resolves to HTTP 200 with a degraded
    // payload so the client can drop the user into the manual-search
    // fallback with no dead-end red error.
    if (result.outcomeCode !== 'success' || result.items.length === 0) {
      await fireAndForgetLog(userId, finalAttempt, escalated, 0);
      const code = result.items.length === 0 && result.outcomeCode === 'success'
        ? 'no_items'
        : result.outcomeCode;
      return degraded200(code, mapOutcomeToUserMessage(code), { attempts: attemptsSummary(attempts) });
    }

    // Canonical-match runs against the existing search_supplements_v2 RPC.
    // Defensive: a match failure must not drop the extraction response.
    let matchedCount = 0;
    try {
      const matched = await matchAllExtracted(result.items, supabase);
      for (const m of matched) {
        if (m.match.status === 'matched') matchedCount += 1;
      }
    } catch (matchErr) {
      safeLog.warn('api.ai.supplement-vision', 'canonical match failed', { error: matchErr });
    }

    await fireAndForgetLog(userId, finalAttempt, escalated, matchedCount);

    const legacy = toLegacyShape(result);
    return NextResponse.json({
      success: true,
      outcomeCode: 'success' satisfies ExtractionOutcomeCode,
      data: legacy,
      modelTier: result.modelTier,
      escalated,
      attempts: attemptsSummary(attempts),
    });
  } catch (err: unknown) {
    safeLog.error('api.ai.supplement-vision', 'unexpected error', { error: err });
    // Per spec Section 13 + Acceptance Criteria 1: the route must never
    // return 5xx for an unhandled error. Surface a graceful 200 so the
    // client routes to manual search.
    return degraded200('unknown', USER_MESSAGE_FOR_MANUAL_FALLBACK);
  }
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
  return NextResponse.json(
    {
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

async function safeJson(request: Request): Promise<{ imageBase64?: unknown; mimeType?: unknown } | null> {
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === 'object') return parsed as { imageBase64?: unknown; mimeType?: unknown };
    return null;
  } catch {
    return null;
  }
}

// Re-export the unused contract types for any future TS importer; kept here
// rather than at the top so the route stays focused on POST.
export type { ExtractedSupplement };
