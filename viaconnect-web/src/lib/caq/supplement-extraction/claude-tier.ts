// =============================================================================
// Prompt 175 Part H (2026-06-04): Anthropic per-tier adapter.
//
// Wraps the upstream Claude HTTP call so the router can stay
// provider-agnostic. The image is validated + normalized ONCE before the
// adapter is constructed; each tier call reuses that payload. The adapter
// honors per-tier deadlines, the project-wide circuit breaker, and maps
// every failure mode to a typed ExtractionOutcomeCode so the route never
// invents prose.
//
// The route layer reads ANTHROPIC_API_KEY from process.env and passes it in;
// this module never reads env vars itself so unit tests can construct an
// adapter without environment plumbing.
// =============================================================================

import { withAbortTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getCircuitBreaker, isCircuitBreakerError } from '@/lib/utils/circuit-breaker';
import { CLAUDE_MODEL_IDS, TIER_TIMEOUT_MS } from './config';
import { parseClaudeExtraction } from './parse';
import type {
  ExtractionOutcomeCode,
  ExtractionResult,
  ModelTier,
} from './types';
import type { TierAdapter } from './router';

const VISION_BREAKER_SCOPE = 'claude-vision';

// Single source of truth for the system prompt sent to every tier. The
// model is asked for the 175 canonical items[] shape; the parser tolerates
// the legacy ingredients[] shape too, so a model that drifts back to the
// old format still works.
export const SUPPLEMENT_EXTRACTION_PROMPT = [
  'You are a supplement label extraction engine. Read the supplement product photo and extract each active ingredient and the product name.',
  '',
  'Return ONLY valid JSON (no markdown, no backticks) of the form:',
  '{"items":[{"rawText":"string","name":"string","brand":"string or null","dose":number or null,"unit":"mg" or "mcg" or "IU" or "g" or "ml" or null,"form":"capsule" or "tablet" or "softgel" or "powder" or "liquid" or "gummy" or null,"confidence":0.0}]}',
  '',
  'Rules:',
  '- One item per active ingredient line, or one item for the full product if the label only lists a proprietary blend.',
  '- rawText is what you read on the label, verbatim.',
  '- name is the canonical ingredient or product name.',
  '- confidence is your own self rating in [0, 1] for that specific item.',
  '- Do not invent ingredients or doses not shown on the label.',
  '- If you cannot read the label at all, return {"items":[]}.',
].join('\n');

export interface ClaudeTierAdapterInput {
  apiKey: string;
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  /**
   * Per-call override of the system prompt. Defaults to
   * SUPPLEMENT_EXTRACTION_PROMPT. Exposed so callers can A/B the wording
   * without re-importing the module.
   */
  prompt?: string;
}

/**
 * Build a TierAdapter closure for the given image + key. The same image is
 * sent at every tier the router visits; each tier still gets its own
 * timeout, model id, and outcome code mapping.
 */
export function createClaudeTierAdapter(input: ClaudeTierAdapterInput): TierAdapter {
  const breaker = getCircuitBreaker(VISION_BREAKER_SCOPE);
  const prompt = input.prompt ?? SUPPLEMENT_EXTRACTION_PROMPT;

  return async (tier: ModelTier): Promise<ExtractionResult> => {
    const model = CLAUDE_MODEL_IDS[tier];
    const timeoutMs = TIER_TIMEOUT_MS[tier];
    const startedAt = Date.now();

    let res: Response;
    try {
      res = await breaker.execute(() =>
        withAbortTimeout(
          (signal) => fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': input.apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model,
              max_tokens: 4096,
              messages: [{
                role: 'user',
                content: [
                  { type: 'image', source: { type: 'base64', media_type: input.mimeType, data: input.imageBase64 } },
                  { type: 'text', text: prompt },
                ],
              }],
            }),
            signal,
          }),
          timeoutMs,
          `api.ai.supplement-vision.${tier}`,
        ),
      );
    } catch (apiErr) {
      const latencyMs = Date.now() - startedAt;
      if (isCircuitBreakerError(apiErr)) {
        safeLog.warn('caq.supplement-extraction.claude-tier', 'circuit open', { tier, error: apiErr });
        return emptyResult(tier, 'circuit_open', latencyMs);
      }
      if (isTimeoutError(apiErr)) {
        safeLog.warn('caq.supplement-extraction.claude-tier', 'tier timeout', { tier, timeoutMs });
        return emptyResult(tier, 'timeout', latencyMs);
      }
      safeLog.error('caq.supplement-extraction.claude-tier', 'tier fetch failed', { tier, error: apiErr });
      return emptyResult(tier, 'upstream_error', latencyMs);
    }

    if (!res.ok) {
      const upstreamBody = await safeReadText(res);
      const is429 = res.status === 429 || res.status === 529;
      const is5xx = res.status >= 500 && res.status < 600;
      safeLog.error('caq.supplement-extraction.claude-tier', 'tier non-2xx', {
        tier,
        status: res.status,
        is429,
        is5xx,
        errBody: upstreamBody.slice(0, 200),
      });
      return emptyResult(tier, 'upstream_error', Date.now() - startedAt);
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch (jsonErr) {
      safeLog.warn('caq.supplement-extraction.claude-tier', 'tier body not json', { tier, error: jsonErr });
      return emptyResult(tier, 'parse_failed', Date.now() - startedAt);
    }

    const text = extractTextBlock(body);
    if (!text) {
      safeLog.warn('caq.supplement-extraction.claude-tier', 'tier returned no text block', { tier });
      return emptyResult(tier, 'parse_failed', Date.now() - startedAt);
    }

    const parsed = parseClaudeExtraction(text);
    const latencyMs = Date.now() - startedAt;
    if (!parsed) {
      safeLog.warn('caq.supplement-extraction.claude-tier', 'tier parse failed', { tier });
      return emptyResult(tier, 'parse_failed', latencyMs);
    }

    return {
      items: parsed.items,
      modelTier: tier,
      escalated: false,
      latencyMs,
      outcomeCode: parsed.items.length === 0 ? 'no_items' : 'success',
    };
  };
}

function emptyResult(
  tier: ModelTier,
  outcomeCode: ExtractionOutcomeCode,
  latencyMs: number,
): ExtractionResult {
  return {
    items: [],
    modelTier: tier,
    escalated: false,
    latencyMs: Math.max(0, latencyMs),
    outcomeCode,
  };
}

/**
 * Pull the first text block out of the Anthropic /v1/messages response.
 * Returns empty string when the shape is missing or unexpected; the caller
 * maps that to 'parse_failed'.
 */
export function extractTextBlock(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content = (body as any).content;
  if (!Array.isArray(content)) return '';
  for (const block of content) {
    if (block && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string') {
      return block.text;
    }
  }
  return '';
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
