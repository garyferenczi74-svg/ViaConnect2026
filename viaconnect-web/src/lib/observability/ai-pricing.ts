// Prompt #164 (#163 fold-in): per-model pricing per million tokens.
// Gemini 2.5 Flash free-tier rows record $0 so dashboards track usage without
// inflating cost figures. The 'gemini-2.5-flash-paid' row is for the day we
// outgrow the free quota; switch is one constant change in gemini-client.ts.

export type ProviderId = 'anthropic' | 'google';

export interface ModelPrice {
  input: number;
  output: number;
}

export const PRICING: Record<string, ModelPrice> = {
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
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
