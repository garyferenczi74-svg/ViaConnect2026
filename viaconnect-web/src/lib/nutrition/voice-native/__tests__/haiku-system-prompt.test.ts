/**
 * Prompt 170n Phase D: unit tests for Voice-Native Haiku system prompt
 * construction. Verifies Gordon Blueprint draft sections present, Hannah
 * OQ3 quantifier revisions integrated, safetyMode swap works.
 */

import { describe, it, expect } from 'vitest';
import {
  buildVoiceNativeSystemPrompt,
  buildVoiceNativeUserMessage,
} from '../haiku-system-prompt';
import { VOICE_NATIVE_PARSER_VERSION } from '../types';

describe('buildVoiceNativeSystemPrompt (base)', () => {
  const prompt = buildVoiceNativeSystemPrompt();

  it('stamps parser version + default locale + safety mode off', () => {
    expect(prompt.startsWith(`Parser version: ${VOICE_NATIVE_PARSER_VERSION}. Locale: en-US. Safety mode: off.`)).toBe(true);
  });

  it('contains strict JSON output mandate', () => {
    expect(prompt).toContain('You output JSON only');
    expect(prompt).toContain('No preamble');
    expect(prompt).toContain('no markdown code fences');
  });

  it('contains Section 2 schema with new voice-native fields', () => {
    expect(prompt).toContain('stt_confidence_for_span');
    expect(prompt).toContain('combined_voice_confidence');
    expect(prompt).toContain('source_transcript_span');
    expect(prompt).toContain('normalized_transcript');
    expect(prompt).toContain('fillers_removed');
    expect(prompt).toContain('restarts_resolved');
  });

  it('contains Section 4 spoken-language normalization rules 4.1 through 4.9', () => {
    expect(prompt).toContain('4.1 Filler removal');
    expect(prompt).toContain('4.2 False start detection');
    expect(prompt).toContain('4.3 Correction detection');
    expect(prompt).toContain('4.4 Hedging recognition');
    expect(prompt).toContain('4.5 Approximation handling for collective quantifiers');
    expect(prompt).toContain('4.6 Spoken numeral normalization');
    expect(prompt).toContain('4.7 Spoken unit normalization');
    expect(prompt).toContain('4.8 Conversational time markers');
    expect(prompt).toContain('4.9 Clarification triggers');
  });

  it('contains Hannah-revised §4.5 quantifier table (not Gordon original)', () => {
    expect(prompt).toContain('"a few" -> 3 at confidence 0.78');
    expect(prompt).toContain('"several" -> 5 at confidence 0.60');
    expect(prompt).toContain('"a bunch of" -> clarify; no default');
    expect(prompt).toContain('nuts 28g, trail mix 30g, grapes 80g, berries 70g, popcorn 14g');
    expect(prompt).toContain('chips 14g, pretzels 14g, crackers 14g');
  });

  it('contains §4.5.1 additional voice-specific quantifiers', () => {
    expect(prompt).toContain('"a smidge of"');
    expect(prompt).toContain('"a touch of"');
    expect(prompt).toContain('"a splash of"');
    expect(prompt).toContain('"a tiny bit of"');
    expect(prompt).toContain('"a big plate of"');
    expect(prompt).toContain('"the whole thing"');
    expect(prompt).toContain('"a portion of"');
    expect(prompt).toContain('"a slice of"');
  });

  it('contains §9 combined_voice_confidence calibration framework', () => {
    expect(prompt).toContain('combined_voice_confidence = sqrt(confidence * stt_confidence_for_span)');
    expect(prompt).toContain('Quick Apply Mode');
    expect(prompt).toContain('Floor protection');
  });

  it('contains Section 5 multi-meal split reference', () => {
    expect(prompt).toContain('MULTI-MEAL SPLIT DETECTION');
    expect(prompt).toContain('Apply Section 5 of the canonical 170m');
  });

  it('contains Section 6 restaurant chain detection with edit-distance-2 tolerance', () => {
    expect(prompt).toContain('Chipotle');
    expect(prompt).toContain('edit-distance-2');
  });

  it('contains Section 7 branded product detection with edit-distance-2 tolerance', () => {
    expect(prompt).toContain('Chobani');
    expect(prompt).toContain('edit-distance-2');
  });

  it('contains Section 12 hard constraints with error skeleton', () => {
    expect(prompt).toContain('Strict JSON only');
    expect(prompt).toContain('I had trouble understanding that. Could you say it again?');
    expect(prompt).toContain('No em dashes');
  });

  it('contains 12 voice-native specific few-shot examples', () => {
    expect(prompt).toContain('Example 1, filler removal');
    expect(prompt).toContain('Example 2, false start');
    expect(prompt).toContain('Example 3, correction');
    expect(prompt).toContain('Example 6, low STT confidence');
    expect(prompt).toContain('Example 10, chain + STT homophone');
    expect(prompt).toContain('Example 12, hedging');
  });

  it('locale override surfaces in the preamble', () => {
    const cad = buildVoiceNativeSystemPrompt({ locale: 'en-CA' });
    expect(cad.startsWith(`Parser version: ${VOICE_NATIVE_PARSER_VERSION}. Locale: en-CA. Safety mode: off.`)).toBe(true);
  });
});

describe('buildVoiceNativeSystemPrompt (safetyMode)', () => {
  it('marks safety mode on in the preamble', () => {
    const sm = buildVoiceNativeSystemPrompt({ safetyMode: true });
    expect(sm).toContain('Safety mode: on');
  });

  it('swaps in §4.5 SAFETY MODE quantifier table with downshifts', () => {
    const sm = buildVoiceNativeSystemPrompt({ safetyMode: true });
    expect(sm).toContain('SAFETY MODE');
    expect(sm).toContain('"a few" -> 2 at confidence 0.78 (DOWNSHIFT from 3');
    expect(sm).toContain('"several" -> 3 at confidence 0.60 (DOWNSHIFT from 5');
    expect(sm).toContain('"a handful of" nuts -> 20g');
    expect(sm).toContain('"a handful of" chips/crackers/pretzels -> 10g');
    expect(sm).toContain('"a big plate of"/"a big bowl of"/"a big serving of" -> 1.0x');
    expect(sm).toContain('"the whole thing" -> clarify');
  });

  it('safety mode does NOT contain the base §4.5.1 voice-specific quantifiers', () => {
    const sm = buildVoiceNativeSystemPrompt({ safetyMode: true });
    expect(sm).not.toContain('"a smidge of"');
    expect(sm).not.toContain('"a touch of"');
  });

  it('safety mode does NOT contain the base §4.5 quantifier table', () => {
    const sm = buildVoiceNativeSystemPrompt({ safetyMode: true });
    expect(sm).not.toContain('"a few" -> 3 at confidence 0.78');
    expect(sm).not.toContain('"several" -> 5 at confidence 0.60');
  });
});

describe('buildVoiceNativeUserMessage', () => {
  it('wraps the transcript in triple-quoted block with STT context header', () => {
    const msg = buildVoiceNativeUserMessage(
      'two scrambled eggs and toast',
      'web_speech_api',
      0.93,
    );
    expect(msg).toContain('STT provider: web_speech_api. STT confidence average: 0.93.');
    expect(msg).toContain('Raw STT transcript:');
    expect(msg).toContain('"""\ntwo scrambled eggs and toast\n"""');
    expect(msg).toContain('Return the strict JSON output now.');
  });

  it('trims whitespace from transcript', () => {
    const msg = buildVoiceNativeUserMessage('  a small coffee   ', 'web_speech_api', 0.90);
    expect(msg).toContain('"""\na small coffee\n"""');
  });

  it('omits applied clarifications block when none provided', () => {
    const msg = buildVoiceNativeUserMessage('a small coffee', 'web_speech_api', 0.90);
    expect(msg).not.toContain('already resolved');
  });

  it('appends applied clarifications and instructs re-evaluation', () => {
    const msg = buildVoiceNativeUserMessage(
      'some chicken for dinner',
      'capacitor_native',
      0.85,
      [
        { question_text: 'How much chicken, roughly?', answer: '4 oz, half breast', linked_meal_item_index: 0 },
        { question_text: 'How was the chicken cooked?', answer: 'Grilled', linked_meal_item_index: 0 },
      ],
    );
    expect(msg).toContain('already resolved these clarifications');
    expect(msg).toContain('1. Question: "How much chicken, roughly?" (item index 0). Answer: "4 oz, half breast".');
    expect(msg).toContain('2. Question: "How was the chicken cooked?" (item index 0). Answer: "Grilled".');
  });

  it('formats STT provider and confidence with appropriate precision', () => {
    const msg = buildVoiceNativeUserMessage('test', 'gemini_audio', 0.876);
    expect(msg).toContain('STT provider: gemini_audio. STT confidence average: 0.88.');
  });
});
