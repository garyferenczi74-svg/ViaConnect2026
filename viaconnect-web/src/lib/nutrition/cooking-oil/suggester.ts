// Prompt #170 Phase 1g: cooking-oil smart-default suggester.
//
// Per spec §2.3.5 + §5.5 NutriVision NEVER auto-applies an oil to a meal item.
// The picker surfaces the smart default (type + amount + reasoning) and the
// user always confirms or changes before macros are applied. This module is
// pure-logic, no IO. Macro delta math uses authoritative densities (g/ml) and
// per-100g composition from USDA references rounded for consumer display.
//
// Hard rules honored: no em or en dashes anywhere, no emojis, no any.

import type { CookingMethod, CuisineTag } from '../vision/types';

export type CookingOilType =
  | 'none'
  | 'olive_oil'
  | 'evoo'
  | 'avocado_oil'
  | 'coconut_oil'
  | 'butter'
  | 'ghee'
  | 'vegetable_canola_oil'
  | 'sesame_oil'
  | 'other';

export interface CookingOilSelection {
  type: CookingOilType;
  amount_ml: number;
  was_suggested_default: boolean;
  suggested_default_type: CookingOilType;
  suggested_default_amount_ml: number;
}

export interface OilSuggestionInput {
  cookingMethod: CookingMethod;
  cuisineTag?: CuisineTag;
}

export interface OilSuggestion {
  type: CookingOilType;
  amount_ml: number;
  reasoning: string;
}

export interface OilMacroDelta {
  calories_kcal: number;
  fat_g: number;
  saturated_fat_g: number;
}

// Per-100g composition + density for each oil. Sources: USDA FDC rounded for
// consumer display. "other" aliases to vegetable_canola_oil (default neutral).
interface OilProfile {
  density_g_per_ml: number;
  per_100g_kcal: number;
  per_100g_fat_g: number;
  per_100g_sat_fat_g: number;
}

const PROFILES: Record<CookingOilType, OilProfile> = {
  none:                  { density_g_per_ml: 0,     per_100g_kcal: 0,   per_100g_fat_g: 0,   per_100g_sat_fat_g: 0 },
  olive_oil:             { density_g_per_ml: 0.915, per_100g_kcal: 884, per_100g_fat_g: 100, per_100g_sat_fat_g: 14 },
  evoo:                  { density_g_per_ml: 0.915, per_100g_kcal: 884, per_100g_fat_g: 100, per_100g_sat_fat_g: 14 },
  avocado_oil:           { density_g_per_ml: 0.913, per_100g_kcal: 884, per_100g_fat_g: 100, per_100g_sat_fat_g: 12 },
  coconut_oil:           { density_g_per_ml: 0.924, per_100g_kcal: 892, per_100g_fat_g: 100, per_100g_sat_fat_g: 87 },
  butter:                { density_g_per_ml: 0.911, per_100g_kcal: 717, per_100g_fat_g: 81,  per_100g_sat_fat_g: 51 },
  ghee:                  { density_g_per_ml: 0.911, per_100g_kcal: 900, per_100g_fat_g: 100, per_100g_sat_fat_g: 62 },
  vegetable_canola_oil:  { density_g_per_ml: 0.920, per_100g_kcal: 884, per_100g_fat_g: 100, per_100g_sat_fat_g: 7 },
  sesame_oil:            { density_g_per_ml: 0.920, per_100g_kcal: 884, per_100g_fat_g: 100, per_100g_sat_fat_g: 14 },
  other:                 { density_g_per_ml: 0.920, per_100g_kcal: 884, per_100g_fat_g: 100, per_100g_sat_fat_g: 7 },
};

function describeCuisine(cuisine: CuisineTag | undefined): string {
  if (cuisine === undefined || cuisine === 'unknown') return '';
  return ` ${cuisine.replace(/_/g, ' ')}`;
}

function describeMethod(method: CookingMethod): string {
  if (method === 'unknown') return 'this preparation';
  return method.replace(/_/g, ' ');
}

function buildReasoning(method: CookingMethod, cuisine: CuisineTag | undefined): string {
  const m = describeMethod(method);
  const c = describeCuisine(cuisine);
  return `Suggested for ${m}${c} based on common preparation. You can confirm or change.`;
}

function suggestSauteed(cuisine: CuisineTag | undefined): { type: CookingOilType; amount_ml: number } {
  switch (cuisine) {
    case 'east_asian':       return { type: 'sesame_oil', amount_ml: 5 };
    case 'mediterranean':    return { type: 'olive_oil', amount_ml: 5 };
    case 'north_american':   return { type: 'olive_oil', amount_ml: 5 };
    case 'south_asian':      return { type: 'ghee', amount_ml: 5 };
    case 'latin_american':   return { type: 'vegetable_canola_oil', amount_ml: 5 };
    case 'middle_eastern':   return { type: 'olive_oil', amount_ml: 5 };
    case 'african':          return { type: 'olive_oil', amount_ml: 5 };
    case 'southeast_asian':  return { type: 'vegetable_canola_oil', amount_ml: 5 };
    case 'unknown':
    case undefined:
    default:                 return { type: 'olive_oil', amount_ml: 5 };
  }
}

function suggestFried(cuisine: CuisineTag | undefined): { type: CookingOilType; amount_ml: number } {
  switch (cuisine) {
    case 'mediterranean':    return { type: 'olive_oil', amount_ml: 5 };
    case 'north_american':   return { type: 'vegetable_canola_oil', amount_ml: 10 };
    case 'latin_american':   return { type: 'vegetable_canola_oil', amount_ml: 10 };
    case 'southeast_asian':  return { type: 'vegetable_canola_oil', amount_ml: 10 };
    case 'east_asian':       return { type: 'vegetable_canola_oil', amount_ml: 10 };
    case 'south_asian':      return { type: 'ghee', amount_ml: 10 };
    case 'middle_eastern':   return { type: 'olive_oil', amount_ml: 10 };
    case 'african':          return { type: 'olive_oil', amount_ml: 10 };
    case 'unknown':
    case undefined:
    default:                 return { type: 'vegetable_canola_oil', amount_ml: 10 };
  }
}

/**
 * Return the smart-default oil for the given preparation. NEVER auto-applied.
 * Caller surfaces this in the picker UI and the user always confirms.
 */
export function suggestCookingOil(input: OilSuggestionInput): OilSuggestion {
  const { cookingMethod, cuisineTag } = input;
  const reasoning = buildReasoning(cookingMethod, cuisineTag);

  if (
    cookingMethod === 'raw' ||
    cookingMethod === 'steamed' ||
    cookingMethod === 'boiled' ||
    cookingMethod === 'grilled' ||
    cookingMethod === 'baked'
  ) {
    return { type: 'none', amount_ml: 0, reasoning };
  }

  if (cookingMethod === 'sauteed') {
    const picked = suggestSauteed(cuisineTag);
    return { ...picked, reasoning };
  }

  if (cookingMethod === 'fried') {
    const picked = suggestFried(cuisineTag);
    return { ...picked, reasoning };
  }

  if (cookingMethod === 'deep_fried') {
    return { type: 'vegetable_canola_oil', amount_ml: 15, reasoning };
  }

  // Unknown method: safest default is no added oil.
  return { type: 'none', amount_ml: 0, reasoning };
}

/**
 * Compute the macro delta for an oil selection. Mass via amount_ml x density,
 * macros via per-100g x (mass/100). Calories rounded to integer, fat and
 * saturated fat to 1 decimal.
 */
export function oilMacroDelta(selection: { type: CookingOilType; amount_ml: number }): OilMacroDelta {
  const profile = PROFILES[selection.type];
  if (selection.amount_ml <= 0 || profile.density_g_per_ml === 0) {
    return { calories_kcal: 0, fat_g: 0, saturated_fat_g: 0 };
  }
  const massG = selection.amount_ml * profile.density_g_per_ml;
  const factor = massG / 100;
  return {
    calories_kcal: Math.round(profile.per_100g_kcal * factor),
    fat_g: round1(profile.per_100g_fat_g * factor),
    saturated_fat_g: round1(profile.per_100g_sat_fat_g * factor),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
