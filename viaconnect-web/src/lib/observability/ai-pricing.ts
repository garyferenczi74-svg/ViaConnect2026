// Prompt #164 (#163 fold-in): per-model pricing per million tokens.
// Gemini 2.5 Flash free-tier rows record $0 so dashboards track usage without
// inflating cost figures. The 'gemini-2.5-flash-paid' row is for the day we
// outgrow the free quota; switch is one constant change in gemini-client.ts.
//
// Current Claude keys follow src/lib/ai/claude-models.ts (LM-00, merged).
// Rates are Anthropic base input/output USD per million tokens (fetched 2026-10-05):
// https://docs.anthropic.com/en/docs/about-claude/pricing
// Retired and alias keys stay so historical usage rows still price.
//
// xAI rows are the published under-200k-token rates (OBSERVE 7.2, docs.x.ai
// models page, fetched 2026-10-04), USD per 1M tokens. At 200k tokens or
// more the whole request is billed at 2x; this table does not apply that
// multiplier. The US endpoint adds 10% and is not applied here. When a
// response includes usage.cost_in_usd_ticks, prefer usdFromXaiTicks.

import { CLAUDE_HAIKU, CLAUDE_OPUS, CLAUDE_SONNET } from '@/lib/ai/claude-models';

export const PROVIDER_IDS = ['anthropic', 'google', 'xai'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface ModelPrice {
  input: number;
  output: number;
  /** USD per 1M cached input tokens, when the provider publishes a cache rate. */
  cachedInput?: number;
}

/** 10_000_000_000 ticks = 1 USD. xAI usage.cost_in_usd_ticks. */
export const XAI_USD_TICKS_PER_DOLLAR = 10_000_000_000;

export function usdFromXaiTicks(ticks: number): number | null {
  if (!Number.isFinite(ticks) || ticks < 0) return null;
  return ticks / XAI_USD_TICKS_PER_DOLLAR;
}

export const PRICING: Record<string, ModelPrice> = {
  [CLAUDE_HAIKU]: { input: 1.0, output: 5.0 },
  // Documented alias of CLAUDE_HAIKU. New calls use the dated ID. Kept so
  // historical rows that logged the alias still price.
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
  [CLAUDE_SONNET]: { input: 3.0, output: 15.0 },
  [CLAUDE_OPUS]: { input: 5.0, output: 25.0 },
  // Retired 2026-06-15. No new call site sends this ID.
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'claude-sonnet-4-5': { input: 3.0, output: 15.0 },
  'gemini-2.5-flash': { input: 0, output: 0 },
  'gemini-2.5-flash-paid': { input: 0.30, output: 2.50 },
  // xAI Grok. Under-200k rates. cachedInput is the cached-input rate.
  'grok-4.7': { input: 2.0, output: 6.0, cachedInput: 0.5 },
  'grok-4.6': { input: 2.0, output: 6.0, cachedInput: 0.5 },
  'grok-4.5': { input: 2.0, output: 6.0, cachedInput: 0.3 },
  'grok-4.3': { input: 1.25, output: 2.5, cachedInput: 0.2 },
  'grok-4.20-0309': { input: 1.25, output: 2.5, cachedInput: 0.2 },
  'grok-build-0.1': { input: 1.0, output: 2.0, cachedInput: 0.2 },
};

/**
 * `inputTokens` is the total input. `cachedInputTokens` is the subset of
 * that total billed at the cached rate. Omit it and the whole input uses
 * the base rate, which is what existing callers do.
 */
export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens = 0,
): number | null {
  const price = PRICING[model];
  if (!price) return null;
  const cached = Math.max(0, Math.min(cachedInputTokens, inputTokens));
  const uncached = Math.max(0, inputTokens - cached);
  const cachedRate = price.cachedInput ?? price.input;
  return (
    (uncached / 1_000_000) * price.input +
    (cached / 1_000_000) * cachedRate +
    (outputTokens / 1_000_000) * price.output
  );
}
