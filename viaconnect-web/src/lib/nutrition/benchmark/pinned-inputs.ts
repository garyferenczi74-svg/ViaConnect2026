/**
 * Prompt 184 Phase 0: pinned engine inputs for the divergence harness.
 *
 * The two nondeterministic AI recognition steps (Gemini text parse, vision
 * detection) are PINNED here so the harness is repeatable, while the
 * deterministic downstream (unit to grams, USDA and OFF lookups, portion
 * estimation, aggregation) runs live. The leading-hypothesis errors
 * (raw vs cooked basis, quantity to grams) live in that downstream, so the
 * harness measures them faithfully even from these seeds.
 *
 * These are SEED pins: a literal, reasonable interpretation of each basket
 * text_input, plus plausible vision detections for the dual-logged items. They
 * are meant to be regenerated from a one-time live capture (real Gemini parse
 * and real vision detection) for the authoritative report. The parse name and
 * unit choices affect which USDA row is matched, so regenerate before trusting
 * absolute numbers; relative stage attribution holds regardless.
 *
 * Keyed by basket item id (see basket.fixture.ts).
 */

import type { ParsedItem } from '../parsed-meal-schema';
import type { VisionItem } from '../vision/types';

export interface PinnedInput {
  parsed: ParsedItem[];
  detection?: VisionItem[];
}

function box(x: number, y: number, w: number, h: number) {
  return { x, y, w, h };
}

export const PINNED_INPUTS: Record<string, PinnedInput> = {
  // raw_whole
  'banana-medium': {
    parsed: [{ name: 'banana', quantity: 1, unit: 'medium' }],
    detection: [
      { id: 'banana-1', foodName: 'banana', boundingBox: box(0.3, 0.3, 0.4, 0.4), confidence: 0.92, portionGramsHint: 120, cookingMethod: 'raw' },
    ],
  },
  'egg-large-raw': {
    parsed: [{ name: 'egg', quantity: 1, unit: 'large' }],
  },
  'chicken-breast-raw-100g': {
    parsed: [{ name: 'raw chicken breast', quantity: 100, unit: 'g' }],
  },
  'apple-medium': {
    parsed: [{ name: 'apple', quantity: 1, unit: 'medium' }],
  },
  'avocado-half': {
    parsed: [{ name: 'avocado', quantity: 0.5, unit: 'whole' }],
  },
  'almonds-1oz': {
    parsed: [{ name: 'almonds', quantity: 1, unit: 'oz' }],
  },
  // cooked_whole
  'white-rice-cooked-150g': {
    parsed: [{ name: 'cooked white rice', quantity: 150, unit: 'g' }],
    detection: [
      { id: 'rice-1', foodName: 'white rice', boundingBox: box(0.25, 0.4, 0.5, 0.4), confidence: 0.85, portionGramsHint: 160, cookingMethod: 'boiled' },
    ],
  },
  'chicken-breast-grilled-100g': {
    parsed: [{ name: 'grilled chicken breast', quantity: 100, unit: 'g' }],
  },
  'scrambled-eggs-2': {
    parsed: [{ name: 'scrambled eggs', quantity: 2, unit: 'whole' }],
  },
  'salmon-grilled-100g': {
    parsed: [{ name: 'grilled salmon', quantity: 100, unit: 'g' }],
  },
  'spaghetti-cooked-140g': {
    parsed: [{ name: 'cooked spaghetti', quantity: 1, unit: 'cup' }],
  },
  'broccoli-steamed-156g': {
    parsed: [{ name: 'steamed broccoli', quantity: 1, unit: 'cup' }],
  },
  'sweet-potato-baked-150g': {
    parsed: [{ name: 'baked sweet potato', quantity: 1, unit: 'whole' }],
  },
  // mixed_plate
  'chicken-rice-broccoli': {
    parsed: [
      { name: 'grilled chicken breast', quantity: 100, unit: 'g' },
      { name: 'white rice', quantity: 150, unit: 'g' },
      { name: 'broccoli', quantity: 100, unit: 'g' },
    ],
    detection: [
      { id: 'crb-chicken', foodName: 'grilled chicken breast', boundingBox: box(0.1, 0.3, 0.3, 0.4), confidence: 0.86, portionGramsHint: 110, cookingMethod: 'grilled' },
      { id: 'crb-rice', foodName: 'white rice', boundingBox: box(0.4, 0.3, 0.3, 0.4), confidence: 0.84, portionGramsHint: 150, cookingMethod: 'boiled' },
      { id: 'crb-broccoli', foodName: 'broccoli', boundingBox: box(0.7, 0.3, 0.25, 0.4), confidence: 0.8, portionGramsHint: 90, cookingMethod: 'steamed' },
    ],
  },
  'burrito-bowl': {
    parsed: [
      { name: 'chicken', quantity: 120, unit: 'g' },
      { name: 'white rice', quantity: 150, unit: 'g' },
      { name: 'black beans', quantity: 90, unit: 'g' },
      { name: 'salsa', quantity: 30, unit: 'g' },
      { name: 'cheddar cheese', quantity: 30, unit: 'g' },
    ],
  },
  'greek-yogurt-berries-granola': {
    parsed: [
      { name: 'nonfat greek yogurt', quantity: 170, unit: 'g' },
      { name: 'blueberries', quantity: 50, unit: 'g' },
      { name: 'granola', quantity: 30, unit: 'g' },
    ],
  },
  'turkey-cheese-sandwich': {
    parsed: [
      { name: 'whole wheat bread', quantity: 2, unit: 'slice' },
      { name: 'turkey breast', quantity: 85, unit: 'g' },
      { name: 'cheese', quantity: 1, unit: 'slice' },
    ],
  },
  'chicken-caesar-salad': {
    parsed: [{ name: 'chicken caesar salad', quantity: 1, unit: 'serving' }],
  },
  // packaged_barcoded
  'clif-bar-choc-chip': {
    parsed: [{ name: 'clif bar chocolate chip', quantity: 1, unit: 'serving' }],
  },
  'chobani-nonfat-plain': {
    parsed: [{ name: 'chobani nonfat plain greek yogurt', quantity: 1, unit: 'serving' }],
  },
  'quest-bar-cookies-cream': {
    parsed: [{ name: 'quest bar cookies and cream', quantity: 1, unit: 'serving' }],
  },
  'cheerios-1cup': {
    parsed: [{ name: 'cheerios', quantity: 1, unit: 'cup' }],
  },
  'peanut-butter-2tbsp': {
    parsed: [{ name: 'peanut butter', quantity: 2, unit: 'tbsp' }],
  },
  // restaurant_hidden_fat
  'chicken-pad-thai': {
    parsed: [{ name: 'chicken pad thai', quantity: 1, unit: 'serving' }],
    detection: [
      { id: 'padthai-1', foodName: 'pad thai', boundingBox: box(0.2, 0.2, 0.6, 0.6), confidence: 0.78, portionGramsHint: 350, cookingMethod: 'fried', cuisineTag: 'southeast_asian' },
    ],
  },
  'cheeseburger': {
    parsed: [{ name: 'cheeseburger', quantity: 1, unit: 'whole' }],
    detection: [
      { id: 'burger-1', foodName: 'cheeseburger', boundingBox: box(0.3, 0.3, 0.4, 0.4), confidence: 0.88, portionGramsHint: 120, cookingMethod: 'grilled' },
    ],
  },
  'vegetable-fried-rice': {
    parsed: [{ name: 'vegetable fried rice', quantity: 1, unit: 'cup' }],
  },
  'french-fries-medium': {
    parsed: [{ name: 'french fries', quantity: 1, unit: 'medium' }],
  },
  'pepperoni-pizza-slice': {
    parsed: [{ name: 'pepperoni pizza', quantity: 1, unit: 'slice' }],
  },
  // beverage
  'coca-cola-can': {
    parsed: [{ name: 'coca cola', quantity: 355, unit: 'ml' }],
  },
  'orange-juice-cup': {
    parsed: [{ name: 'orange juice', quantity: 1, unit: 'cup' }],
  },
  'black-coffee': {
    parsed: [{ name: 'black coffee', quantity: 1, unit: 'cup' }],
  },
  'whole-milk-cup': {
    parsed: [{ name: 'whole milk', quantity: 1, unit: 'cup' }],
  },
};
