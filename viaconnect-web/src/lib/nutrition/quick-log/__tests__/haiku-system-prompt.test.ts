/**
 * Prompt 170m Phase D: unit tests for Quick Log Haiku system prompt
 * construction. Ensures Gordon Blueprint draft sections are present + the
 * caffeine table is embedded + clarifications threaded through the user
 * message correctly.
 */

import { describe, it, expect } from 'vitest';
import {
  buildQuickLogSystemPrompt,
  buildQuickLogUserMessage,
} from '../haiku-system-prompt';
import { QUICK_LOG_PARSER_VERSION } from '../types';

describe('buildQuickLogSystemPrompt', () => {
  const prompt = buildQuickLogSystemPrompt();

  it('stamps the parser version + default locale at the top', () => {
    expect(prompt.startsWith(`Parser version: ${QUICK_LOG_PARSER_VERSION}. Locale: en-US.`)).toBe(true);
  });

  it('contains the strict JSON output mandate', () => {
    expect(prompt).toContain('You output JSON only');
    expect(prompt).toContain('No preamble');
    expect(prompt).toContain('no markdown code fences');
  });

  it('contains Section 2 schema definitions for all 9 top-level keys', () => {
    expect(prompt).toContain('"meal_items"');
    expect(prompt).toContain('"restaurant_context_detected"');
    expect(prompt).toContain('"recipe_match_hint"');
    expect(prompt).toContain('"branded_product_hints"');
    expect(prompt).toContain('"dietary_restriction_flags"');
    expect(prompt).toContain('"needs_clarification"');
    expect(prompt).toContain('"clarification_questions"');
    expect(prompt).toContain('"split_into_multiple_meals_suggestion"');
    expect(prompt).toContain('"nlu_latency_ms"');
  });

  it('contains Section 3 portion inference rules 3.1 through 3.9', () => {
    expect(prompt).toContain('Rule 3.1: Explicit quantity');
    expect(prompt).toContain('Rule 3.2: Plural without explicit count defaults to 2');
    expect(prompt).toContain('Rule 3.3: Singular without count defaults to 1');
    expect(prompt).toContain('Rule 3.4: Common food standard serving sizes');
    expect(prompt).toContain('Rule 3.5: Restaurant chain defaults');
    expect(prompt).toContain('Rule 3.6: Branded product defaults');
    expect(prompt).toContain('Rule 3.7: Recipe match');
    expect(prompt).toContain('Rule 3.8: Cooking method affects portion');
    expect(prompt).toContain('Rule 3.9: Caffeine inference');
  });

  it('contains the Section 3.9 caffeine inference table verbatim anchors', () => {
    expect(prompt).toContain('Drip coffee 8 fl oz -> 95mg');
    expect(prompt).toContain('Espresso shot 1 fl oz -> 63mg');
    expect(prompt).toContain('Black tea 8 fl oz -> 47mg');
    expect(prompt).toContain('Red Bull 8.4 fl oz can -> 80mg');
    expect(prompt).toContain('Diet Coke 12 fl oz -> 46mg');
  });

  it('contains Section 4 clarification trigger rules', () => {
    expect(prompt).toContain('4.1 Portion undefined');
    expect(prompt).toContain('4.2 Food identity ambiguous');
    expect(prompt).toContain('4.3 Cooking method matters and is unstated');
    expect(prompt).toContain('4.4 Portion count ambiguous');
    expect(prompt).toContain('4.5 Beverage size unstated');
  });

  it('contains Section 5 multi-meal split detection', () => {
    expect(prompt).toContain('MULTI-MEAL SPLIT DETECTION');
    expect(prompt).toContain('Meal type words');
  });

  it('contains Section 6 restaurant chain detection with a representative set', () => {
    expect(prompt).toContain('Chipotle');
    expect(prompt).toContain('Starbucks');
    expect(prompt).toContain('Sweetgreen');
    expect(prompt).toContain('Cuisine is not a chain');
  });

  it('contains Section 7 branded product detection with a representative set', () => {
    expect(prompt).toContain('Chobani');
    expect(prompt).toContain('Quest');
    expect(prompt).toContain('Red Bull');
    expect(prompt).toContain('Coca-Cola');
  });

  it('contains Section 8 dietary restriction crossover with all 10 allergens', () => {
    expect(prompt).toContain('peanuts');
    expect(prompt).toContain('tree_nuts');
    expect(prompt).toContain('milk');
    expect(prompt).toContain('eggs');
    expect(prompt).toContain('soy');
    expect(prompt).toContain('wheat');
    expect(prompt).toContain('fish');
    expect(prompt).toContain('shellfish');
    expect(prompt).toContain('sesame');
    expect(prompt).toContain('gluten');
  });

  it('contains Section 9 confidence calibration tiers', () => {
    expect(prompt).toContain('0.95 to 1.0');
    expect(prompt).toContain('0.85 to 0.95');
    expect(prompt).toContain('0.65 to 0.85');
    expect(prompt).toContain('0.50 to 0.65');
    expect(prompt).toContain('Below 0.50');
  });

  it('contains Section 10 cuisine breadth across major clusters', () => {
    expect(prompt).toContain('biryani');
    expect(prompt).toContain('pad thai');
    expect(prompt).toContain('shawarma');
    expect(prompt).toContain('bibimbap');
    expect(prompt).toContain('tacos');
  });

  it('contains Section 11 few-shot examples', () => {
    expect(prompt).toContain('Example 1');
    expect(prompt).toContain('Example 8, South Asian cuisine');
    expect(prompt).toContain('Example 12, recipe match');
  });

  it('contains Section 12 hard constraints', () => {
    expect(prompt).toContain('No em dashes anywhere');
    expect(prompt).toContain('No en dashes');
    expect(prompt).toContain('No emoji');
    expect(prompt).toContain('portion_grams in [1, 5000]');
    expect(prompt).toContain('meal_items max 50');
  });

  it('contains the error skeleton (12.7) verbatim', () => {
    expect(prompt).toContain('"meal_items":[]');
    expect(prompt).toContain('I had trouble reading that. Could you rephrase?');
  });

  it('locale override surfaces in the preamble', () => {
    const cad = buildQuickLogSystemPrompt({ locale: 'en-CA' });
    expect(cad.startsWith(`Parser version: ${QUICK_LOG_PARSER_VERSION}. Locale: en-CA.`)).toBe(true);
  });
});

describe('buildQuickLogUserMessage', () => {
  it('wraps the user text in triple-quoted block + asks for strict JSON', () => {
    const msg = buildQuickLogUserMessage('two scrambled eggs and toast');
    expect(msg).toContain('User input:');
    expect(msg).toContain('"""\ntwo scrambled eggs and toast\n"""');
    expect(msg).toContain('Return the strict JSON output now.');
  });

  it('trims whitespace from the user text', () => {
    const msg = buildQuickLogUserMessage('  a small coffee   ');
    expect(msg).toContain('"""\na small coffee\n"""');
  });

  it('omits the applied-clarifications block when none provided', () => {
    const msg = buildQuickLogUserMessage('a small coffee');
    expect(msg).not.toContain('already resolved these clarifications');
  });

  it('appends applied clarifications and instructs re-evaluation', () => {
    const msg = buildQuickLogUserMessage('some chicken for dinner', [
      {
        question_text: 'How much chicken, roughly?',
        answer: '4 oz, half breast',
        linked_meal_item_index: 0,
      },
      {
        question_text: 'How was the chicken cooked?',
        answer: 'Grilled',
        linked_meal_item_index: 0,
      },
    ]);
    expect(msg).toContain('already resolved these clarifications');
    expect(msg).toContain('1. Question: "How much chicken, roughly?" (item index 0). Answer: "4 oz, half breast".');
    expect(msg).toContain('2. Question: "How was the chicken cooked?" (item index 0). Answer: "Grilled".');
    expect(msg).toContain('Update needs_clarification + clarification_questions based on what remains');
  });
});
