// =============================================================================
// Prompt 175b (2026-06-04): Gemini 2.5 Pro Vision adapter.
//
// Primary OCR tier per master spec 5.3. Posts the validated + EXIF-
// stripped JPEG to the Gemini generateContent REST endpoint (no SDK,
// matching the existing src/lib/nutrition/gemini-client.ts pattern), then
// runs the same JSON parser as the Claude tiers so a single contract
// flows downstream.
//
// The route layer reads the Photo AI Gemini key from env (Gary set it on
// Vercel as PHOTO_AI_GEMINI_API_KEY, with GEMINI_API_KEY as the legacy
// fallback per config.ts:getPhotoAiGeminiApiKey) and passes it in. The
// adapter never reads env vars itself so unit tests can construct one
// without env plumbing.
// =============================================================================

import { withAbortTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getCircuitBreaker, isCircuitBreakerError } from '@/lib/utils/circuit-breaker';
import {
  TIER_TIMEOUT_MS,
  getGeminiModelId,
  PROVIDER_RETRY_BASE_MS,
  PROVIDER_RETRY_JITTER_MS,
  PROVIDER_RETRY_MAX_ATTEMPTS,
} from './config';
import { parseClaudeExtraction } from './parse';
import { SUPPLEMENT_EXTRACTION_PROMPT } from './claude-tier';
import type {
  ExtractionOutcomeCode,
  ExtractionResult,
} from './types';

const GEMINI_BREAKER_SCOPE = 'gemini-supplement-vision';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiTierAdapterInput {
  apiKey: string;
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  /**
   * Per-call override of the system prompt. Defaults to the shared
   * SUPPLEMENT_EXTRACTION_PROMPT so the JSON contract stays identical
   * across providers.
   */
  prompt?: string;
  /**
   * Override the Gemini model id. Defaults to env CAQ_SUPPLEMENT_GEMINI_MODEL
   * via getGeminiModelId, otherwise GEMINI_MODEL_ID_DEFAULT.
   */
  modelId?: string;
}

/**
 * Run a single Gemini call. Returns an ExtractionResult with a typed
 * outcomeCode so the provider-router can decide whether to escalate to
 * Claude Sonnet.
 */
export async function callGeminiTier(input: GeminiTierAdapterInput): Promise<ExtractionResult> {
  const breaker = getCircuitBreaker(GEMINI_BREAKER_SCOPE);
  const prompt = input.prompt ?? SUPPLEMENT_EXTRACTION_PROMPT;
  const modelId = input.modelId ?? getGeminiModelId();
  const timeoutMs = TIER_TIMEOUT_MS.gemini;
  const startedAt = Date.now();

  let res: Response;
  try {
    res = await breaker.execute(() =>
      withAbortTimeout(
        (signal) => fetch(`${GEMINI_API_BASE}/${modelId}:generateContent?key=${encodeURIComponent(input.apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
                { text: prompt },
              ],
            }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 4096,
              responseMimeType: 'application/json',
            },
          }),
          signal,
        }),
        timeoutMs,
        'api.ai.supplement-vision.gemini',
      ),
    );
  } catch (apiErr) {
    const latencyMs = Date.now() - startedAt;
    if (isCircuitBreakerError(apiErr)) {
      safeLog.warn('caq.supplement-extraction.gemini-tier', 'circuit open', { error: apiErr });
      return emptyResult('circuit_open', latencyMs);
    }
    if (isTimeoutError(apiErr)) {
      safeLog.warn('caq.supplement-extraction.gemini-tier', 'tier timeout', { timeoutMs });
      return emptyResult('timeout', latencyMs);
    }
    safeLog.error('caq.supplement-extraction.gemini-tier', 'fetch failed', { error: apiErr });
    return emptyResult('upstream_error', latencyMs);
  }

  if (!res.ok) {
    const upstreamBody = await safeReadText(res);
    const is429 = res.status === 429;
    const is5xx = res.status >= 500 && res.status < 600;
    safeLog.error('caq.supplement-extraction.gemini-tier', 'tier non-2xx', {
      status: res.status,
      is429,
      is5xx,
      errBody: upstreamBody.slice(0, 200),
    });
    return emptyResult('upstream_error', Date.now() - startedAt);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch (jsonErr) {
    safeLog.warn('caq.supplement-extraction.gemini-tier', 'body not json', { error: jsonErr });
    return emptyResult('parse_failed', Date.now() - startedAt);
  }

  const text = extractGeminiTextBlock(body);
  if (!text) {
    safeLog.warn('caq.supplement-extraction.gemini-tier', 'no text candidate', {});
    return emptyResult('parse_failed', Date.now() - startedAt);
  }

  const parsed = parseClaudeExtraction(text);
  const latencyMs = Date.now() - startedAt;
  if (!parsed) {
    safeLog.warn('caq.supplement-extraction.gemini-tier', 'parse failed', {});
    return emptyResult('parse_failed', latencyMs);
  }

  return {
    items: parsed.items,
    modelTier: 'gemini',
    escalated: false,
    latencyMs,
    outcomeCode: parsed.items.length === 0 ? 'no_items' : 'success',
  };
}

/**
 * Pull the first text part out of the Gemini generateContent response.
 * Returns empty string when the shape is missing or unexpected; the
 * caller maps that to 'parse_failed'.
 */
export function extractGeminiTextBlock(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidates = (body as any).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts = (candidates[0] as any)?.content?.parts;
  if (!Array.isArray(parts)) return '';
  for (const part of parts) {
    if (part && typeof part === 'object' && typeof part.text === 'string' && part.text.length > 0) {
      return part.text;
    }
  }
  return '';
}

function emptyResult(outcomeCode: ExtractionOutcomeCode, latencyMs: number): ExtractionResult {
  return {
    items: [],
    modelTier: 'gemini',
    escalated: false,
    latencyMs: Math.max(0, latencyMs),
    outcomeCode,
  };
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

/**
 * Prompt 175b hotfix Section 2.2: call the Gemini tier with one retry +
 * exponential backoff + jitter when the first attempt returns a
 * transient-retryable outcome (timeout, upstream_error, parse_failed).
 * circuit_open does NOT retry because the breaker is already protecting
 * the upstream. config_missing and no_items also do not retry.
 *
 * Returns the final ExtractionResult. The latencyMs of the returned
 * result reflects the SERVED attempt only; the route layer is free to
 * sum latencyMs across attempts via its own attempt log.
 */
export async function callGeminiTierWithRetry(input: GeminiTierAdapterInput): Promise<ExtractionResult> {
  let last: ExtractionResult | null = null;
  for (let attempt = 1; attempt <= PROVIDER_RETRY_MAX_ATTEMPTS; attempt += 1) {
    const r = await callGeminiTier(input);
    last = r;
    if (!isRetryableOutcome(r.outcomeCode)) return r;
    if (attempt < PROVIDER_RETRY_MAX_ATTEMPTS) {
      const delay = backoffMs(attempt);
      safeLog.warn('caq.supplement-extraction.gemini-tier', 'retrying after retryable outcome', {
        attempt,
        outcomeCode: r.outcomeCode,
        delayMs: delay,
      });
      await sleep(delay);
    }
  }
  return last!;
}

function isRetryableOutcome(code: ExtractionOutcomeCode): boolean {
  return code === 'timeout' || code === 'upstream_error' || code === 'parse_failed';
}

function backoffMs(attempt: number): number {
  // attempt is 1-indexed; first retry uses base * 2^0 + jitter, etc.
  const base = PROVIDER_RETRY_BASE_MS * Math.pow(2, attempt - 1);
  const jitter = Math.floor(Math.random() * PROVIDER_RETRY_JITTER_MS);
  return base + jitter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
