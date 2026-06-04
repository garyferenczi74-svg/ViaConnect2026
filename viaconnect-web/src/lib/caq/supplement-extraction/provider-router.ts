// =============================================================================
// Prompt 175b (2026-06-04): provider router for supplement label OCR.
//
// Per master spec 5.3: Gemini 2.5 Pro Vision primary, Claude Sonnet
// tertiary capped at 3 percent. This batch ships the on/off flag
// (isClaudeFallbackEnabled) and routes to Sonnet on Gemini failure or
// low confidence; the strict 3 percent monthly counter lands in a later
// batch once the observability counter table is available.
//
// Failure mode mapping:
//   Gemini success above HAIKU_MIN_CONFIDENCE (0.7) -> return Gemini.
//   Gemini circuit_open / timeout / upstream_error / parse_failed
//     -> try Sonnet if its key is present AND fallback is enabled.
//   Gemini success below 0.7 OR no_items
//     -> try Sonnet, then reconcile (current rule: prefer Sonnet
//        when Sonnet returns more items OR higher mean confidence,
//        else stick with Gemini).
//   Both fail -> return the better of the two empty results so the
//     route can still log the attempt trail.
// =============================================================================

import { safeLog } from '@/lib/utils/safe-log';
import {
  GEMINI_MIN_CONFIDENCE,
  isClaudeFallbackEnabled,
} from './config';
import { callGeminiTier } from './gemini-tier';
import { createClaudeTierAdapter } from './claude-tier';
import type {
  ExtractedSupplement,
  ExtractionResult,
  TierAttempt,
} from './types';

export interface ProviderRouterInput {
  geminiApiKey: string | null;
  anthropicApiKey: string | null;
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface ProviderRouterResult {
  result: ExtractionResult;
  attempts: ReadonlyArray<TierAttempt>;
}

/**
 * Run the supplement label extraction provider chain. Returns the final
 * served result + a full audit trail of every tier the router tried so
 * observability persists one row that captures the entire run.
 */
export async function runProviderRouter(input: ProviderRouterInput): Promise<ProviderRouterResult> {
  const attempts: TierAttempt[] = [];

  // Without a Gemini key we cannot run the primary tier. Try Claude
  // directly if its key is configured AND the fallback is enabled.
  if (!input.geminiApiKey) {
    if (!input.anthropicApiKey || !isClaudeFallbackEnabled()) {
      return {
        result: emptyResult('config_missing'),
        attempts: [{ tier: 'gemini', outcomeCode: 'config_missing', itemCount: 0, avgConfidence: 0, latencyMs: 0 }],
      };
    }
    const sonnet = await callClaudeSonnet(input.anthropicApiKey, input.imageBase64, input.mimeType);
    attempts.push(toAttempt(sonnet));
    return { result: { ...sonnet, escalated: true }, attempts };
  }

  // ---- Primary: Gemini --------------------------------------------------
  const gemini = await callGeminiTier({
    apiKey: input.geminiApiKey,
    imageBase64: input.imageBase64,
    mimeType: input.mimeType,
  });
  attempts.push(toAttempt(gemini));

  const geminiAcceptable = isResultAcceptable(gemini, GEMINI_MIN_CONFIDENCE);
  if (geminiAcceptable) {
    return { result: { ...gemini, escalated: false }, attempts };
  }

  // ---- Fallback: Claude Sonnet (gated) ---------------------------------
  if (!input.anthropicApiKey || !isClaudeFallbackEnabled()) {
    // No fallback available. Surface whatever Gemini produced (could be
    // an empty success, a low-conf success, or a typed error). escalated
    // stays false because we never escalated.
    return { result: gemini, attempts };
  }

  const sonnet = await callClaudeSonnet(input.anthropicApiKey, input.imageBase64, input.mimeType);
  attempts.push(toAttempt(sonnet));

  // Reconciliation: prefer whichever produced more items, breaking ties
  // by mean confidence. A clean success from either side wins over an
  // outcome-coded failure on the other.
  const winner = pickWinner(gemini, sonnet);
  return { result: { ...winner, escalated: true }, attempts };
}

async function callClaudeSonnet(
  apiKey: string,
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<ExtractionResult> {
  try {
    const adapter = createClaudeTierAdapter({ apiKey, imageBase64, mimeType });
    return await adapter('sonnet');
  } catch (err) {
    safeLog.error('caq.supplement-extraction.provider-router', 'sonnet adapter threw', { error: err });
    return {
      items: [],
      modelTier: 'sonnet',
      escalated: false,
      latencyMs: 0,
      outcomeCode: 'upstream_error',
    };
  }
}

function isResultAcceptable(r: ExtractionResult, minConfidence: number): boolean {
  if (r.outcomeCode !== 'success') return false;
  if (r.items.length === 0) return false;
  return !anyItemBelow(r.items, minConfidence);
}

function anyItemBelow(items: ReadonlyArray<ExtractedSupplement>, threshold: number): boolean {
  for (const it of items) {
    if (!Number.isFinite(it.confidence)) return true;
    if (it.confidence < threshold) return true;
  }
  return false;
}

function pickWinner(a: ExtractionResult, b: ExtractionResult): ExtractionResult {
  // Success outcomes always beat error outcomes.
  const aOk = a.outcomeCode === 'success' && a.items.length > 0;
  const bOk = b.outcomeCode === 'success' && b.items.length > 0;
  if (aOk && !bOk) return a;
  if (bOk && !aOk) return b;
  if (!aOk && !bOk) return a; // both failed; keep the primary's outcome so the route maps it

  // Both produced items. Prefer more items, then higher mean confidence.
  if (a.items.length !== b.items.length) {
    return a.items.length > b.items.length ? a : b;
  }
  const avgA = meanConfidence(a.items);
  const avgB = meanConfidence(b.items);
  return avgA >= avgB ? a : b;
}

function meanConfidence(items: ReadonlyArray<ExtractedSupplement>): number {
  if (items.length === 0) return 0;
  let sum = 0;
  for (const it of items) sum += Number.isFinite(it.confidence) ? it.confidence : 0;
  return sum / items.length;
}

function toAttempt(r: ExtractionResult): TierAttempt {
  return {
    tier: r.modelTier,
    outcomeCode: r.outcomeCode,
    itemCount: r.items.length,
    avgConfidence: meanConfidence(r.items),
    latencyMs: r.latencyMs,
  };
}

function emptyResult(outcomeCode: ExtractionResult['outcomeCode']): ExtractionResult {
  return {
    items: [],
    modelTier: 'gemini',
    escalated: false,
    latencyMs: 0,
    outcomeCode,
  };
}
