// =============================================================================
// Prompt 175b hotfix (2026-06-04): provider router for supplement label OCR.
//
// Per 175b master spec Blueprint 5.1 Option A as resolved by Gary on
// 2026-06-04: Claude Sonnet primary, Gemini 2.5 Pro secondary. The
// previous order (Gemini primary, Claude tertiary) is reversed because
// the Gemini Google project tied to PHOTO_AI_GEMINI_API_KEY is hitting a
// 429 quota cap; flipping the order unblocks the photo path without
// waiting on Google billing.
//
// Resilience contract (175b Section 2.2 + 3):
//   * Primary tier (Claude) runs with one retry + backoff on transient
//     outcomes (timeout, upstream_error, parse_failed). Circuit-open and
//     config-missing do NOT retry.
//   * On primary failure or low-confidence, fail over to secondary
//     (Gemini) with the same retry pattern.
//   * The router NEVER throws. Every tier call is wrapped in try/catch;
//     unexpected exceptions degrade to ExtractionResult with
//     outcomeCode 'upstream_error' so the route can still emit a
//     graceful 200 payload.
//   * Both attempts are explicitly logged via safeLog before they fire
//     so production runtime logs always show which providers were
//     consulted on a given request, regardless of outcome.
//
// Reconciliation: prefer whichever attempt produced more items; ties
// broken by mean confidence. A clean success always wins over an
// outcome-coded failure on the other side.
// =============================================================================

import { safeLog } from '@/lib/utils/safe-log';
import {
  GEMINI_MIN_CONFIDENCE,
  PROVIDER_RETRY_BASE_MS,
  PROVIDER_RETRY_JITTER_MS,
  PROVIDER_RETRY_MAX_ATTEMPTS,
  isClaudeFallbackEnabled,
} from './config';
import { callGeminiTier, callGeminiTierWithRetry } from './gemini-tier';
import { createClaudeTierAdapter } from './claude-tier';
import type {
  ExtractedSupplement,
  ExtractionOutcomeCode,
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

const CLAUDE_PRIMARY_MIN_CONFIDENCE = 0.7;

/**
 * Run the supplement label extraction provider chain.
 *
 * Order (175b Blueprint 5.1 Option A):
 *   1. Claude Sonnet (primary) with one retry + backoff on transient.
 *   2. Gemini 2.5 Pro (secondary) with one retry + backoff on transient.
 *   3. Reconcile and return the better of the two.
 *
 * The route layer maps a returned outcomeCode of 'success' with items.length > 0
 * to a 200 with the legacy IdentifiedProduct draft; any other outcome
 * triggers the degraded 200 payload (NEVER 502).
 */
export async function runProviderRouter(input: ProviderRouterInput): Promise<ProviderRouterResult> {
  const attempts: TierAttempt[] = [];

  // No primary key. Try the secondary directly if it is configured.
  if (!input.anthropicApiKey) {
    safeLog.info('caq.supplement-extraction.provider-router', 'no primary key, attempting secondary', {
      hasGemini: !!input.geminiApiKey,
    });
    if (!input.geminiApiKey) {
      const result: ExtractionResult = {
        items: [], modelTier: 'sonnet', escalated: false, latencyMs: 0, outcomeCode: 'config_missing',
      };
      attempts.push(toAttempt(result));
      return { result, attempts };
    }
    const gemini = await safeCallGemini(input.geminiApiKey, input.imageBase64, input.mimeType);
    attempts.push(toAttempt(gemini));
    return { result: { ...gemini, escalated: true }, attempts };
  }

  // ---- Primary: Claude Sonnet (with retry) -----------------------------
  safeLog.info('caq.supplement-extraction.provider-router', 'attempting primary', {
    provider: 'claude-sonnet',
  });
  const claude = await safeCallClaudeWithRetry(input.anthropicApiKey, input.imageBase64, input.mimeType);
  attempts.push(toAttempt(claude));
  if (isResultAcceptable(claude, CLAUDE_PRIMARY_MIN_CONFIDENCE)) {
    return { result: { ...claude, escalated: false }, attempts };
  }

  // ---- Secondary: Gemini (gated) ---------------------------------------
  if (!input.geminiApiKey || !isClaudeFallbackEnabled()) {
    // Claude was the only provider configured (or the cross-check flag is
    // off). Surface Claude's outcome so the route can decide.
    return { result: claude, attempts };
  }
  safeLog.info('caq.supplement-extraction.provider-router', 'attempting secondary', {
    provider: 'gemini',
    primaryOutcome: claude.outcomeCode,
  });
  const gemini = await safeCallGemini(input.geminiApiKey, input.imageBase64, input.mimeType);
  attempts.push(toAttempt(gemini));

  const winner = pickWinner(claude, gemini);
  return { result: { ...winner, escalated: true }, attempts };
}

// ---------------------------------------------------------------------------
// Safe tier callers
//
// Every external call is wrapped in try/catch so the router NEVER throws.
// Each call also runs its own retry with backoff for transient outcomes.
// ---------------------------------------------------------------------------

async function safeCallClaudeWithRetry(
  apiKey: string,
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<ExtractionResult> {
  const adapter = createClaudeTierAdapter({ apiKey, imageBase64, mimeType });
  let last: ExtractionResult | null = null;
  for (let attempt = 1; attempt <= PROVIDER_RETRY_MAX_ATTEMPTS; attempt += 1) {
    let r: ExtractionResult;
    try {
      r = await adapter('sonnet');
    } catch (err) {
      safeLog.error('caq.supplement-extraction.provider-router', 'claude adapter threw', { attempt, error: err });
      r = { items: [], modelTier: 'sonnet', escalated: false, latencyMs: 0, outcomeCode: 'upstream_error' };
    }
    last = r;
    if (!isRetryableOutcome(r.outcomeCode)) return r;
    if (attempt < PROVIDER_RETRY_MAX_ATTEMPTS) {
      const delay = backoffMs(attempt);
      safeLog.warn('caq.supplement-extraction.provider-router', 'claude retry after transient', {
        attempt, outcomeCode: r.outcomeCode, delayMs: delay,
      });
      await sleep(delay);
    }
  }
  return last!;
}

async function safeCallGemini(
  apiKey: string,
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<ExtractionResult> {
  try {
    return await callGeminiTierWithRetry({ apiKey, imageBase64, mimeType });
  } catch (err) {
    safeLog.error('caq.supplement-extraction.provider-router', 'gemini adapter threw', { error: err });
    return { items: [], modelTier: 'gemini', escalated: false, latencyMs: 0, outcomeCode: 'upstream_error' };
  }
}

// callGeminiTier is re-exported via this module for direct single-shot
// callers that do not need the retry wrapper. The router itself uses the
// retry variant exclusively.
export { callGeminiTier };

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

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
  const aOk = a.outcomeCode === 'success' && a.items.length > 0;
  const bOk = b.outcomeCode === 'success' && b.items.length > 0;
  if (aOk && !bOk) return a;
  if (bOk && !aOk) return b;
  if (!aOk && !bOk) return a; // both failed; keep the primary's outcome for the route mapper

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

/**
 * Outcomes worth a single retry. circuit_open is excluded because the
 * breaker is already protecting the upstream and retrying would just
 * hit the breaker again. config_missing and no_items are non-retryable
 * by definition (they are not transient).
 */
export function isRetryableOutcome(code: ExtractionOutcomeCode): boolean {
  return code === 'timeout' || code === 'upstream_error' || code === 'parse_failed';
}

function backoffMs(attempt: number): number {
  const base = PROVIDER_RETRY_BASE_MS * Math.pow(2, attempt - 1);
  const jitter = Math.floor(Math.random() * PROVIDER_RETRY_JITTER_MS);
  return base + jitter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Exported for tests so the failover classifier can be exercised
// independently of network calls.
export { isResultAcceptable, anyItemBelow, pickWinner };
