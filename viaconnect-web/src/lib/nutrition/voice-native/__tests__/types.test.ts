/**
 * Prompt 170n Phase D: unit tests for Voice-Native Zod schemas + helpers.
 *
 * Gates that the parse + clarify endpoints reject malformed Haiku output
 * before it reaches the UI. Schema reflects Gordon Blueprint draft Section
 * 2 with three NEW per-item fields (stt_confidence_for_span,
 * combined_voice_confidence, source_transcript_span) and three NEW
 * top-level fields (normalized_transcript, fillers_removed, restarts_resolved).
 */

import { describe, it, expect } from 'vitest';
import {
  voiceNativeParseResultSchema,
  STT_PROVIDERS,
  combinedConfidence,
} from '../types';

function validMealItem() {
  return {
    food_name: 'scrambled eggs',
    portion_grams: 100,
    portion_label_user: 'two',
    cooking_method: 'scrambled',
    modifiers: [],
    source_transcript_span: 'two scrambled eggs',
    caffeine_mg: null,
    confidence: 0.92,
    stt_confidence_for_span: 0.93,
    combined_voice_confidence: 0.92,
  };
}

function validParseResult(overrides: Record<string, unknown> = {}) {
  return {
    meal_items: [validMealItem()],
    normalized_transcript: 'I had two scrambled eggs and some toast',
    fillers_removed: ['um', 'like'],
    restarts_resolved: [],
    restaurant_context_detected: null,
    recipe_match_hint: null,
    branded_product_hints: [],
    dietary_restriction_flags: ['eggs', 'wheat', 'gluten'],
    needs_clarification: false,
    clarification_questions: [],
    split_into_multiple_meals_suggestion: null,
    nlu_latency_ms: 420,
    ...overrides,
  };
}

describe('voiceNativeParseResultSchema', () => {
  it('accepts a minimal valid single-item parse', () => {
    expect(voiceNativeParseResultSchema.safeParse(validParseResult()).success).toBe(true);
  });

  it('accepts a parse with restarts_resolved (false_start)', () => {
    const payload = validParseResult({
      restarts_resolved: [{
        raw_phrase: 'I had eggs, scratch that, I had pancakes',
        resolved_phrase: 'I had pancakes',
        restart_kind: 'false_start',
      }],
    });
    expect(voiceNativeParseResultSchema.safeParse(payload).success).toBe(true);
  });

  it('accepts a parse with restarts_resolved (correction)', () => {
    const payload = validParseResult({
      restarts_resolved: [{
        raw_phrase: 'a coffee, wait, make it two coffees',
        resolved_phrase: 'two coffees',
        restart_kind: 'correction',
      }],
    });
    expect(voiceNativeParseResultSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects an invalid restart_kind', () => {
    const payload = validParseResult({
      restarts_resolved: [{
        raw_phrase: 'test',
        resolved_phrase: 'test',
        restart_kind: 'unknown_kind',
      }],
    });
    expect(voiceNativeParseResultSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects stt_confidence_for_span outside [0, 1]', () => {
    const payload = validParseResult({
      meal_items: [{ ...validMealItem(), stt_confidence_for_span: 1.1 }],
    });
    expect(voiceNativeParseResultSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects combined_voice_confidence outside [0, 1]', () => {
    const payload = validParseResult({
      meal_items: [{ ...validMealItem(), combined_voice_confidence: -0.1 }],
    });
    expect(voiceNativeParseResultSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects portion_grams above 5000', () => {
    const payload = validParseResult({
      meal_items: [{ ...validMealItem(), portion_grams: 5001 }],
    });
    expect(voiceNativeParseResultSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects more than 50 meal_items', () => {
    const payload = validParseResult({
      meal_items: Array.from({ length: 51 }, () => validMealItem()),
    });
    expect(voiceNativeParseResultSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects more than 5 restarts_resolved', () => {
    const payload = validParseResult({
      restarts_resolved: Array.from({ length: 6 }, () => ({
        raw_phrase: 'test',
        resolved_phrase: 'test',
        restart_kind: 'correction',
      })),
    });
    expect(voiceNativeParseResultSchema.safeParse(payload).success).toBe(false);
  });

  it('accepts caffeine_mg in [0, 1000] inclusive', () => {
    const lo = validParseResult({ meal_items: [{ ...validMealItem(), food_name: 'water', caffeine_mg: 0 }] });
    const hi = validParseResult({ meal_items: [{ ...validMealItem(), food_name: 'cold brew', caffeine_mg: 400 }] });
    expect(voiceNativeParseResultSchema.safeParse(lo).success).toBe(true);
    expect(voiceNativeParseResultSchema.safeParse(hi).success).toBe(true);
  });

  it('rejects caffeine_mg above 1000', () => {
    const payload = validParseResult({
      meal_items: [{ ...validMealItem(), caffeine_mg: 1001 }],
    });
    expect(voiceNativeParseResultSchema.safeParse(payload).success).toBe(false);
  });

  it('accepts a multi-meal split suggestion', () => {
    const payload = validParseResult({
      meal_items: [
        validMealItem(),
        { ...validMealItem(), food_name: 'salad', portion_grams: 150, source_transcript_span: 'salad' },
      ],
      split_into_multiple_meals_suggestion: {
        suggested_splits: [
          { meal_name: 'Breakfast', meal_item_indices: [0] },
          { meal_name: 'Lunch', meal_item_indices: [1] },
        ],
        confidence: 0.92,
      },
    });
    expect(voiceNativeParseResultSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects missing required top-level keys (normalized_transcript)', () => {
    expect(
      voiceNativeParseResultSchema.safeParse({
        ...validParseResult(),
        normalized_transcript: undefined,
      }).success,
    ).toBe(false);
  });

  it('rejects missing per-item stt_confidence_for_span', () => {
    const itemMissingStt = { ...validMealItem() } as Record<string, unknown>;
    delete itemMissingStt.stt_confidence_for_span;
    const payload = validParseResult({ meal_items: [itemMissingStt] });
    expect(voiceNativeParseResultSchema.safeParse(payload).success).toBe(false);
  });
});

describe('STT_PROVIDERS', () => {
  it('includes the 4 canonical providers', () => {
    expect(STT_PROVIDERS).toContain('web_speech_api');
    expect(STT_PROVIDERS).toContain('capacitor_native');
    expect(STT_PROVIDERS).toContain('gemini_audio');
    expect(STT_PROVIDERS).toContain('claude_audio');
  });
});

describe('combinedConfidence', () => {
  it('returns the geometric mean rounded to 2dp', () => {
    expect(combinedConfidence(0.95, 0.95)).toBe(0.95);
    expect(combinedConfidence(0.90, 0.85)).toBe(0.87);
    expect(combinedConfidence(0.85, 0.70)).toBe(0.77);
    expect(combinedConfidence(0.80, 0.50)).toBe(0.63);
    expect(combinedConfidence(0.70, 0.35)).toBe(0.49);
    expect(combinedConfidence(0.65, 0.30)).toBe(0.44);
  });

  it('handles 0 on either dimension', () => {
    expect(combinedConfidence(0, 0.95)).toBe(0);
    expect(combinedConfidence(0.95, 0)).toBe(0);
    expect(combinedConfidence(0, 0)).toBe(0);
  });

  it('handles 1.0 on both dimensions', () => {
    expect(combinedConfidence(1.0, 1.0)).toBe(1.0);
  });

  it('clamps negative inputs to zero before computing', () => {
    expect(combinedConfidence(-0.1, 0.5)).toBe(0);
    expect(combinedConfidence(0.5, -0.1)).toBe(0);
  });
});
