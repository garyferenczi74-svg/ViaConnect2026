/**
 * Prompt 170m Phase D: unit tests for Quick Log Zod schemas.
 *
 * Gates that the API parse + clarify endpoints reject malformed Haiku output
 * before it reaches the UI. Schema reflects Gordon Blueprint draft Section 2
 * verbatim.
 */

import { describe, it, expect } from 'vitest';
import {
  quickLogParseResultSchema,
  COOKING_METHODS,
  ALLERGEN_VOCAB,
} from '../types';

function validMealItem() {
  return {
    food_name: 'scrambled eggs',
    portion_grams: 100,
    portion_label_user: 'two',
    cooking_method: 'scrambled',
    modifiers: [],
    source_text_span: 'two scrambled eggs',
    caffeine_mg: null,
    confidence: 0.94,
  };
}

function validParseResult(overrides: Record<string, unknown> = {}) {
  return {
    meal_items: [validMealItem()],
    restaurant_context_detected: null,
    recipe_match_hint: null,
    branded_product_hints: [],
    dietary_restriction_flags: ['eggs', 'wheat', 'gluten'],
    needs_clarification: false,
    clarification_questions: [],
    split_into_multiple_meals_suggestion: null,
    nlu_latency_ms: 320,
    ...overrides,
  };
}

describe('quickLogParseResultSchema', () => {
  it('accepts a minimal valid single-item parse', () => {
    const result = quickLogParseResultSchema.safeParse(validParseResult());
    expect(result.success).toBe(true);
  });

  it('accepts a parse with restaurant context + branded hint', () => {
    const payload = validParseResult({
      meal_items: [
        validMealItem(),
        { ...validMealItem(), food_name: 'Chipotle chicken', portion_grams: 113, source_text_span: 'chicken' },
      ],
      restaurant_context_detected: {
        chain_slug: 'chipotle',
        chain_name: 'Chipotle',
        confidence: 0.98,
      },
      branded_product_hints: [
        { brand: 'Chobani', product_name: 'Greek yogurt', linked_meal_item_index: 0, confidence: 0.95 },
      ],
    });
    const result = quickLogParseResultSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('accepts a parse needing clarification with question chips', () => {
    const payload = validParseResult({
      needs_clarification: true,
      clarification_questions: [
        {
          question_text: 'How were the eggs?',
          linked_meal_item_index: 0,
          option_chips: ['Scrambled', 'Fried', 'Boiled', 'Poached'],
        },
      ],
    });
    const result = quickLogParseResultSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects portion_grams above 5000', () => {
    const payload = validParseResult({
      meal_items: [{ ...validMealItem(), portion_grams: 5001 }],
    });
    expect(quickLogParseResultSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects portion_grams below 1', () => {
    const payload = validParseResult({
      meal_items: [{ ...validMealItem(), portion_grams: 0 }],
    });
    expect(quickLogParseResultSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects confidence above 1.0', () => {
    const payload = validParseResult({
      meal_items: [{ ...validMealItem(), confidence: 1.1 }],
    });
    expect(quickLogParseResultSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects more than 50 meal_items', () => {
    const payload = validParseResult({
      meal_items: Array.from({ length: 51 }, () => validMealItem()),
    });
    expect(quickLogParseResultSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects more than 3 clarification_questions', () => {
    const payload = validParseResult({
      needs_clarification: true,
      clarification_questions: Array.from({ length: 4 }, () => ({
        question_text: 'How were the eggs?',
        linked_meal_item_index: 0,
        option_chips: ['Scrambled', 'Fried'],
      })),
    });
    expect(quickLogParseResultSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects fewer than 2 option_chips on a clarification', () => {
    const payload = validParseResult({
      needs_clarification: true,
      clarification_questions: [
        {
          question_text: 'How were the eggs?',
          linked_meal_item_index: 0,
          option_chips: ['Scrambled'],
        },
      ],
    });
    expect(quickLogParseResultSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects more than 6 option_chips on a clarification', () => {
    const payload = validParseResult({
      needs_clarification: true,
      clarification_questions: [
        {
          question_text: 'How was it cooked?',
          linked_meal_item_index: 0,
          option_chips: ['1', '2', '3', '4', '5', '6', '7'],
        },
      ],
    });
    expect(quickLogParseResultSchema.safeParse(payload).success).toBe(false);
  });

  it('accepts caffeine_mg in [0, 1000] inclusive', () => {
    const payloadLow = validParseResult({
      meal_items: [{ ...validMealItem(), food_name: 'water', caffeine_mg: 0 }],
    });
    const payloadHigh = validParseResult({
      meal_items: [{ ...validMealItem(), food_name: 'cold brew', caffeine_mg: 400 }],
    });
    expect(quickLogParseResultSchema.safeParse(payloadLow).success).toBe(true);
    expect(quickLogParseResultSchema.safeParse(payloadHigh).success).toBe(true);
  });

  it('rejects caffeine_mg above 1000', () => {
    const payload = validParseResult({
      meal_items: [{ ...validMealItem(), caffeine_mg: 1001 }],
    });
    expect(quickLogParseResultSchema.safeParse(payload).success).toBe(false);
  });

  it('accepts caffeine_mg null for non-caffeinated items', () => {
    const payload = validParseResult({
      meal_items: [{ ...validMealItem(), food_name: 'apple', caffeine_mg: null }],
    });
    expect(quickLogParseResultSchema.safeParse(payload).success).toBe(true);
  });

  it('accepts a multi-meal split suggestion with 2 splits', () => {
    const payload = validParseResult({
      meal_items: [
        validMealItem(),
        { ...validMealItem(), food_name: 'salad', portion_grams: 150, source_text_span: 'salad' },
      ],
      split_into_multiple_meals_suggestion: {
        suggested_splits: [
          { meal_name: 'Breakfast', meal_item_indices: [0] },
          { meal_name: 'Lunch', meal_item_indices: [1] },
        ],
        confidence: 0.94,
      },
    });
    expect(quickLogParseResultSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects a split suggestion with fewer than 2 splits', () => {
    const payload = validParseResult({
      split_into_multiple_meals_suggestion: {
        suggested_splits: [{ meal_name: 'Breakfast', meal_item_indices: [0] }],
        confidence: 0.94,
      },
    });
    expect(quickLogParseResultSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects missing required top-level keys', () => {
    // missing meal_items
    expect(
      quickLogParseResultSchema.safeParse({
        ...validParseResult(),
        meal_items: undefined,
      }).success,
    ).toBe(false);
    // missing needs_clarification
    expect(
      quickLogParseResultSchema.safeParse({
        ...validParseResult(),
        needs_clarification: undefined,
      }).success,
    ).toBe(false);
  });
});

describe('vocabularies', () => {
  it('cooking method vocabulary includes all of Gordon Section 2 plus toasted/cooked', () => {
    expect(COOKING_METHODS).toContain('raw');
    expect(COOKING_METHODS).toContain('scrambled');
    expect(COOKING_METHODS).toContain('grilled');
    expect(COOKING_METHODS).toContain('toasted');
    expect(COOKING_METHODS).toContain('cooked');
    expect(COOKING_METHODS).toContain('air_fried');
    expect(COOKING_METHODS).toContain('unspecified');
  });

  it('allergen vocabulary matches Gordon Section 8 verbatim', () => {
    const expected = ['peanuts','tree_nuts','milk','eggs','soy','wheat','fish','shellfish','sesame','gluten'];
    expect([...ALLERGEN_VOCAB]).toEqual(expected);
  });
});
