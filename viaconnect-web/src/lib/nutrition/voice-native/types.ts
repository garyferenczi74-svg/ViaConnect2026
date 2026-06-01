/**
 * Prompt 170n Phase B: Voice-Native NLU types + Zod schemas.
 *
 * Output schema mirrors Gordon's Blueprint draft Section 2 verbatim with
 * three additions per meal_item (stt_confidence_for_span,
 * combined_voice_confidence, source_transcript_span) and three NEW top-level
 * fields (normalized_transcript, fillers_removed, restarts_resolved).
 *
 * Cold-start NLU (no meal_draft context). Same role as 170m Quick Log but
 * voice-modality input with STT confidence integration. Sibling of 170j
 * voice-edit on the result review screen.
 */

import { z } from 'zod';

export const VOICE_NATIVE_PARSER_VERSION = 'voice-native.haiku.v1.0.0';
export const VOICE_NATIVE_HAIKU_MODEL = 'claude-haiku-4-5-20251001';

export const STT_PROVIDERS = [
  'web_speech_api',
  'capacitor_native',
  'gemini_audio',
  'claude_audio',
] as const;

export type SttProvider = typeof STT_PROVIDERS[number];

const voiceNativeMealItemSchema = z.object({
  food_name: z.string().min(1).max(160),
  portion_grams: z.number().min(1).max(5000),
  portion_label_user: z.string().max(80).nullable(),
  cooking_method: z.string().max(40).nullable(),
  modifiers: z.array(z.string().max(40)).max(20),
  source_transcript_span: z.string().max(500),
  caffeine_mg: z.number().min(0).max(1000).nullable().optional(),
  confidence: z.number().min(0).max(1),
  stt_confidence_for_span: z.number().min(0).max(1),
  combined_voice_confidence: z.number().min(0).max(1),
});

const restaurantContextSchema = z.object({
  chain_slug: z.string().min(1).max(60),
  chain_name: z.string().min(1).max(80),
  confidence: z.number().min(0).max(1),
});

const recipeMatchHintSchema = z.object({
  hint_text: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1),
});

const brandedProductHintSchema = z.object({
  brand: z.string().min(1).max(80),
  product_name: z.string().min(1).max(120),
  linked_meal_item_index: z.number().int().min(0),
  confidence: z.number().min(0).max(1),
});

const clarificationQuestionSchema = z.object({
  question_text: z.string().min(1).max(200),
  linked_meal_item_index: z.number().int().min(0),
  option_chips: z.array(z.string().min(1).max(40)).min(2).max(6),
});

const splitSuggestionSchema = z.object({
  suggested_splits: z.array(z.object({
    meal_name: z.string().min(1).max(40),
    meal_item_indices: z.array(z.number().int().min(0)),
  })).min(2).max(5),
  confidence: z.number().min(0).max(1),
});

const restartResolvedSchema = z.object({
  raw_phrase: z.string().min(1).max(500),
  resolved_phrase: z.string().max(500),
  restart_kind: z.enum(['correction', 'false_start', 'hedge_collapse', 'approximation_held']),
});

export const voiceNativeParseResultSchema = z.object({
  meal_items: z.array(voiceNativeMealItemSchema).max(50),
  normalized_transcript: z.string().max(2000),
  fillers_removed: z.array(z.string().max(40)).max(50),
  restarts_resolved: z.array(restartResolvedSchema).max(5),
  restaurant_context_detected: restaurantContextSchema.nullable(),
  recipe_match_hint: recipeMatchHintSchema.nullable(),
  branded_product_hints: z.array(brandedProductHintSchema).max(20),
  dietary_restriction_flags: z.array(z.string()).max(20),
  needs_clarification: z.boolean(),
  clarification_questions: z.array(clarificationQuestionSchema).max(3),
  split_into_multiple_meals_suggestion: splitSuggestionSchema.nullable(),
  nlu_latency_ms: z.number().int().min(0),
  nlu_provider_used: z.string().optional(),
  parser_version: z.string().optional(),
});

export type VoiceNativeMealItem = z.infer<typeof voiceNativeMealItemSchema>;
export type VoiceNativeParseResult = z.infer<typeof voiceNativeParseResultSchema>;
export type RestartResolved = z.infer<typeof restartResolvedSchema>;
export type VoiceNativeClarificationQuestion = z.infer<typeof clarificationQuestionSchema>;

export function combinedConfidence(nluConfidence: number, sttConfidence: number): number {
  const product = Math.max(0, nluConfidence) * Math.max(0, sttConfidence);
  return Math.round(Math.sqrt(product) * 100) / 100;
}
