import { NextResponse } from 'next/server';
import { safeLog } from '@/lib/utils/safe-log';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClaudeTierAdapter } from '@/lib/caq/supplement-extraction/claude-tier';
import { runExtraction } from '@/lib/caq/supplement-extraction/router';
import { matchAllExtracted } from '@/lib/caq/supplement-extraction/canonical-match';
import { logExtractionAttempt } from '@/lib/caq/supplement-extraction/observability';
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

// Prompt 175 Parts A + H + I (2026-06-04): tiered Claude extraction route.
//
// Pipeline per request:
//   1. validateAndNormalize (sharp strips EXIF, caps dimensions, HEIC convert)
//   2. createClaudeTierAdapter -> runExtraction (Haiku -> Sonnet -> opt Opus)
//   3. matchAllExtracted against the canonical supplement database
//   4. logExtractionAttempt to caq_supplement_extraction_log via admin client
//   5. Translate ExtractionResult -> legacy IdentifiedProduct so the
//      existing CAQ Phase 3 UI keeps working without a UI rewrite.
//
// Every user-facing error string is neutral and routes through one of the
// USER_MESSAGE_FOR_* constants. The string "ANTHROPIC_API_KEY not set in
// .env.local" must NEVER reach the browser; server-side safeLog retains
// the actual condition.

export const maxDuration = 90;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const USER_MESSAGE_FOR_MANUAL_FALLBACK =
  'We could not read your label automatically. Please add it using the search below.';
const USER_MESSAGE_FOR_RETRY =
  'Photo analysis hit a snag. Please try again, or add it using the search below.';
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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      safeLog.warn(
        'api.ai.supplement-vision',
        'extraction unavailable: ANTHROPIC_API_KEY missing on server',
        {},
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
        const status = err.code === 'unsupported_image' ? 400 : 422;
        return jsonError(err.code, USER_MESSAGE_FOR_UNSUPPORTED, status);
      }
      safeLog.error('api.ai.supplement-vision', 'normalize failed', { error: err });
      return jsonError('image_normalize_failed', USER_MESSAGE_FOR_RETRY, 500);
    }

    const adapter = createClaudeTierAdapter({
      apiKey,
      imageBase64: normalized.base64,
      mimeType: normalized.mimeType,
    });

    const { result, attempts } = await runExtraction(adapter);
    const finalAttempt = attempts[attempts.length - 1];
    const escalated = attempts.length > 1;

    // Failure path: every tier struck out, or the model returned zero items.
    if (result.outcomeCode !== 'success' || result.items.length === 0) {
      await fireAndForgetLog(userId, finalAttempt, escalated, 0);
      const code = result.items.length === 0 && result.outcomeCode === 'success'
        ? 'no_items'
        : result.outcomeCode;
      return jsonError(
        code,
        mapOutcomeToUserMessage(code),
        mapOutcomeToStatus(code),
      );
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
    });
  } catch (err: unknown) {
    safeLog.error('api.ai.supplement-vision', 'unexpected error', { error: err });
    return jsonError('unknown', USER_MESSAGE_FOR_RETRY, 500);
  }
}

function jsonError(code: ExtractionOutcomeCode, message: string, status: number) {
  return NextResponse.json(
    { success: false, outcomeCode: code, error: message },
    { status },
  );
}

function mapOutcomeToUserMessage(code: ExtractionOutcomeCode): string {
  switch (code) {
    case 'config_missing':
    case 'parse_failed':
    case 'no_items':
      return USER_MESSAGE_FOR_MANUAL_FALLBACK;
    case 'circuit_open':
    case 'timeout':
    case 'upstream_error':
      return USER_MESSAGE_FOR_RETRY;
    case 'unsupported_image':
    case 'image_normalize_failed':
      return USER_MESSAGE_FOR_UNSUPPORTED;
    default:
      return USER_MESSAGE_FOR_RETRY;
  }
}

function mapOutcomeToStatus(code: ExtractionOutcomeCode): number {
  switch (code) {
    case 'config_missing':
    case 'circuit_open':
      return 503;
    case 'timeout':
      return 504;
    case 'upstream_error':
    case 'parse_failed':
      return 502;
    case 'unsupported_image':
    case 'image_normalize_failed':
      return 400;
    case 'no_items':
      return 200; // graceful fallback, UI surfaces neutral copy
    default:
      return 500;
  }
}

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
