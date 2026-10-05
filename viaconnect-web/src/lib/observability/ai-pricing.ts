// Prompt #164 (#163 fold-in): per-model pricing per million tokens.
// Gemini 2.5 Flash free-tier rows record $0 so dashboards track usage without
// inflating cost figures. The 'gemini-2.5-flash-paid' row is for the day we
// outgrow the free quota; switch is one constant change in gemini-client.ts.
//
// Current Claude keys follow src/lib/ai/claude-models.ts. Rates are Anthropic
// base input/output USD per million tokens (fetched 2026-10-05):
// https://docs.anthropic.com/en/docs/about-claude/pricing
// Retired and alias keys stay so historical usage rows still price.

import { CLAUDE_HAIKU, CLAUDE_OPUS, CLAUDE_SONNET } from '@/lib/ai/claude-models';

export type ProviderId = 'anthropic' | 'google';

export interface ModelPrice {
  input: number;
  output: number;
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
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const price = PRICING[model];
  if (!price) return null;
  return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
}
