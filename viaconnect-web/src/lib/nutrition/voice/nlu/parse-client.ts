/**
 * NLU parse client wrapper per Prompt 170j §4.
 *
 * Posts to /api/nutrition/voice/parse which wraps Claude Haiku 4.5.
 * Validates the response via the Zod schema in operation-schema.ts so the
 * UI never sees malformed AI output.
 */

'use client';

import type { MealDraft } from '@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types';
import type { NLUParseResult } from '../types';
import { nluParseResultSchema } from './operation-schema';

export interface ParseTranscriptArgs {
  transcript: string;
  meal_draft: MealDraft;
  stt_confidence: number | null;
  transcript_locale?: string;
  signal?: AbortSignal;
}

export interface ParseTranscriptError {
  kind: 'network_error' | 'service_unavailable' | 'malformed_response' | 'aborted';
  message: string;
}

export async function parseTranscript(
  args: ParseTranscriptArgs
): Promise<NLUParseResult | ParseTranscriptError> {
  try {
    const resp = await fetch('/api/nutrition/voice/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: args.transcript,
        meal_draft: serializeMealDraftForParse(args.meal_draft),
        stt_confidence: args.stt_confidence,
        transcript_locale: args.transcript_locale ?? 'en-US',
      }),
      signal: args.signal,
    });

    if (!resp.ok) {
      return {
        kind: 'service_unavailable',
        message: `Parse endpoint returned ${resp.status}`,
      };
    }

    const json = (await resp.json()) as unknown;
    const parsed = nluParseResultSchema.safeParse(json);
    if (!parsed.success) {
      return {
        kind: 'malformed_response',
        message: parsed.error.errors.map((e) => e.message).join('; '),
      };
    }
    return parsed.data;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { kind: 'aborted', message: 'Parse aborted' };
    }
    return {
      kind: 'network_error',
      message: err instanceof Error ? err.message : 'Network error',
    };
  }
}

function serializeMealDraftForParse(draft: MealDraft): {
  items: Array<{
    food_name: string;
    portion_grams: number;
    cooking_method?: string;
    cooking_oil?: { oil_type: string; amount_ml: number } | null;
  }>;
  restaurant_context: { chain_slug: string; chain_name: string } | null;
  modifiers: string[];
  total_kcal: number;
} {
  return {
    items: draft.items.map((it) => ({
      food_name: it.food_name,
      portion_grams: it.portion_grams,
      cooking_method: it.cooking_method,
      cooking_oil: it.cooking_oil
        ? { oil_type: it.cooking_oil.type, amount_ml: it.cooking_oil.amount_ml }
        : null,
    })),
    restaurant_context: null,
    modifiers: [],
    total_kcal: draft.totals.calories_kcal,
  };
}
