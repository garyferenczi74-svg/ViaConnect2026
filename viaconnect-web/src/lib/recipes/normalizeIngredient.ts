/**
 * Prompt 170f Phase B: ingredient normalization.
 *
 * Deterministic unit + quantity parse → lowercase canonical_name → match
 * cascade fallthrough order per spec §6.2:
 *   1. cascade (Prompt 170 nutrient cascade)
 *   2. curated (Prompt 170b farmceutica_curated_foods)
 *   3. off_cache (Prompt 170l Open Food Facts)
 *   4. unmatched (contributes zero nutrition; surfaces Info chip)
 *   5. (Phase 1.1) Haiku model fallback last
 *
 * For Phase 1 fasttrack: skip cascade/curated/off_cache tiers and use
 * the manual-entry per-ingredient nutrition fields the editor exposes.
 * Cascade auto-population is filed as Phase 1.1 supplement when ingredient
 * matching can be empirically validated against the curated test set.
 *
 * Per Blueprint Issue #6: canonical_name is ALWAYS lowercase + trimmed.
 * Per Blueprint Issue #7: match confidence floor 0.85 (Phase 1.1 cascade).
 */

import type { RecipeMatchSource } from './types';

const FRACTION_MAP: Record<string, number> = {
  '1/2': 0.5, '1/3': 0.333, '2/3': 0.667, '1/4': 0.25, '3/4': 0.75,
  '1/8': 0.125, '3/8': 0.375, '5/8': 0.625, '7/8': 0.875, '1/16': 0.0625,
  '½': 0.5, '⅓': 0.333, '⅔': 0.667, '¼': 0.25, '¾': 0.75, '⅛': 0.125,
};

const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml',
  l: 'l', liter: 'l', liters: 'l',
  cup: 'cup', cups: 'cup', c: 'cup',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', tbs: 'tbsp', tb: 'tbsp',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp', ts: 'tsp',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  'fl-oz': 'fl_oz', 'fl_oz': 'fl_oz', 'fluidounce': 'fl_oz', 'fluidounces': 'fl_oz',
  lb: 'lb', pound: 'lb', pounds: 'lb', lbs: 'lb',
  item: 'item', items: 'item', piece: 'item', pieces: 'item', each: 'item', whole: 'item',
  slice: 'slice', slices: 'slice',
  clove: 'clove', cloves: 'clove',
  pinch: 'pinch', pinches: 'pinch',
  dash: 'dash', dashes: 'dash',
};

const GRAMS_PER_UNIT: Record<string, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  cup: 236.6,
  tbsp: 14.8,
  tsp: 4.9,
  oz: 28.35,
  fl_oz: 29.6,
  lb: 453.6,
};

export interface NormalizedIngredient {
  raw_name: string;
  canonical_name: string;
  quantity: number | null;
  unit: string | null;
  grams_equivalent: number | null;
  match_source: RecipeMatchSource;
}

function parseQuantityToken(token: string): number | null {
  const trimmed = token.trim();
  if (trimmed.length === 0) return null;
  if (FRACTION_MAP[trimmed] !== undefined) return FRACTION_MAP[trimmed];
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const num = Number(mixedMatch[2]);
    const den = Number(mixedMatch[3]);
    if (den > 0) return whole + num / den;
  }
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const num = Number(fractionMatch[1]);
    const den = Number(fractionMatch[2]);
    if (den > 0) return num / den;
  }
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  return null;
}

export function normalizeIngredient(raw: string): NormalizedIngredient {
  const trimmedRaw = raw.trim();
  if (trimmedRaw.length === 0) {
    return {
      raw_name: raw,
      canonical_name: '',
      quantity: null,
      unit: null,
      grams_equivalent: null,
      match_source: 'unmatched',
    };
  }

  const tokens = trimmedRaw.split(/\s+/);
  let quantity: number | null = null;
  let unit: string | null = null;
  let consumed = 0;

  if (tokens.length >= 2) {
    const qty1 = parseQuantityToken(tokens[0]);
    if (qty1 !== null) {
      const maybeFraction = parseQuantityToken(`${tokens[0]} ${tokens[1]}`);
      if (maybeFraction !== null && maybeFraction !== qty1 && tokens.length >= 3) {
        quantity = maybeFraction;
        consumed = 2;
      } else {
        quantity = qty1;
        consumed = 1;
      }
    }
  }

  if (quantity !== null && tokens.length > consumed) {
    const candidateUnit = tokens[consumed].toLowerCase().replace(/[.,]/g, '');
    if (UNIT_ALIASES[candidateUnit]) {
      unit = UNIT_ALIASES[candidateUnit];
      consumed += 1;
    }
  }

  const nameTokens = tokens.slice(consumed);
  const canonicalName = nameTokens.join(' ').toLowerCase().trim();

  let gramsEquivalent: number | null = null;
  if (quantity !== null && unit !== null && GRAMS_PER_UNIT[unit] !== undefined) {
    gramsEquivalent = Math.round(quantity * GRAMS_PER_UNIT[unit] * 100) / 100;
  }

  return {
    raw_name: raw,
    canonical_name: canonicalName,
    quantity,
    unit,
    grams_equivalent: gramsEquivalent,
    match_source: 'unmatched',
  };
}

export function canonicalizeName(raw: string): string {
  return raw.toLowerCase().trim();
}
