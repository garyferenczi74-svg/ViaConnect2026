// Prompt 186 Phase 2: the single portion-to-grams resolver. Every channel
// (photo, voice, text, manual assist) resolves a parsed (quantity, unit,
// food) to grams through this module, in strict precedence order:
//
//   1. Direct mass/volume units (g, oz, ml).
//   2. USDA FDC foodPortions for the matched food (household measures with
//      measured gramWeight, e.g. "medium (3 inch dia)" = 182 g for apples).
//   3. The curated unit-weight table (typical-weights.ts).
//   4. Default 100 g per count WITH a confidence downgrade flag. Never a
//      silent default (E4 in the 186 work log).
//
// Water-density conversions for cup/tbsp/tsp are only trusted for liquid
// foods; on solids they carry the downgrade flag (a cup of cereal is not
// 240 g).

import { unitToGrams } from './typical-weights';
import { tokenizeFoodText } from './fdc-ranking';

export interface FdcFoodPortion {
  amount?: number;
  gramWeight?: number;
  modifier?: string;
  portionDescription?: string;
  measureUnit?: { name?: string };
}

export type PortionMethod = 'direct_unit' | 'fdc_portion' | 'curated_table' | 'default_100g';

export interface PortionResolution {
  grams: number;
  method: PortionMethod;
  downgraded: boolean;
  portionLabel: string | null;
}

const GRAMS_PER_OZ = 28.3495;

const LIQUID_HINTS = [
  'milk', 'juice', 'water', 'coffee', 'tea', 'soda', 'cola', 'broth',
  'soup', 'smoothie', 'oil', 'wine', 'beer', 'latte', 'espresso',
  'lemonade', 'yogurt', 'kefir', 'cream', 'shake',
];

const SIZE_MULTIPLIERS: Record<string, number> = { small: 0.7, medium: 1.0, large: 1.4 };

// Token preferences per parsed unit when scanning FDC foodPortions. Earlier
// token lists are preferred; within a list the first matching portion wins.
const PORTION_TOKEN_PREFS: Record<string, string[][]> = {
  whole: [['medium'], ['whole', 'fruit', 'unit', 'each']],
  medium: [['medium'], ['whole', 'fruit', 'unit', 'each']],
  small: [['small'], ['whole', 'fruit', 'unit', 'each']],
  large: [['large'], ['whole', 'fruit', 'unit', 'each']],
  slice: [['slice']],
  cup: [['cup']],
  tbsp: [['tbsp', 'tablespoon']],
  tsp: [['tsp', 'teaspoon']],
  serving: [['serving', 'nlea']],
};

function portionText(p: FdcFoodPortion): string {
  return [p.modifier, p.portionDescription, p.measureUnit?.name]
    .filter((s): s is string => typeof s === 'string')
    .join(' ')
    .toLowerCase();
}

function validPortion(p: FdcFoodPortion): boolean {
  return typeof p.gramWeight === 'number' && Number.isFinite(p.gramWeight) && p.gramWeight > 0;
}

function gramsFromPortion(p: FdcFoodPortion, quantity: number): number {
  const per = (p.gramWeight as number) / (typeof p.amount === 'number' && p.amount > 0 ? p.amount : 1);
  return per * quantity;
}

function findPortion(
  portions: FdcFoodPortion[],
  unit: string,
  foodHint: string,
): FdcFoodPortion | null {
  const prefs = PORTION_TOKEN_PREFS[unit];
  const candidates = portions.filter(validPortion);
  if (candidates.length === 0) return null;

  if (prefs) {
    for (const tokenList of prefs) {
      for (const p of candidates) {
        const text = portionText(p);
        if (tokenList.some((t) => text.includes(t))) return p;
      }
    }
  }

  // Count-style units can also match a portion named after the food itself
  // (Foundation eggs expose measureUnit "egg"). Never applied to volume or
  // slice units, where a food-named portion would be a different measure.
  // Tokens are singularized so "Eggs" still matches the "egg" portion.
  if (unit === 'whole' || unit === 'medium' || unit === 'small' || unit === 'large' || unit === 'serving') {
    const hintTokens = tokenizeFoodText(foodHint).filter((t) => t.length > 2);
    for (const p of candidates) {
      const text = portionText(p);
      if (hintTokens.some((t) => text.includes(t))) return p;
    }
  }

  return null;
}

export interface PortionInput {
  unit: string;
  quantity: number;
  foodHint: string;
  foodPortions?: FdcFoodPortion[] | null;
  // Branded foods: serving size already expressed in grams (servingSize when
  // servingSizeUnit is grams). Used for the serving unit before defaults.
  brandedServingGrams?: number | null;
}

export function portionToGrams(input: PortionInput): PortionResolution {
  const { unit, quantity, foodHint } = input;

  if (unit === 'g') {
    return { grams: quantity, method: 'direct_unit', downgraded: false, portionLabel: null };
  }
  if (unit === 'oz') {
    return { grams: quantity * GRAMS_PER_OZ, method: 'direct_unit', downgraded: false, portionLabel: null };
  }
  if (unit === 'ml') {
    return { grams: quantity, method: 'direct_unit', downgraded: false, portionLabel: null };
  }

  const portions = input.foodPortions ?? [];
  const matched = findPortion(portions, unit, foodHint);
  if (matched) {
    let grams = gramsFromPortion(matched, quantity);
    // A size unit matched against a generic whole/fruit portion still applies
    // the size multiplier; a direct size-named portion does not need it.
    const text = portionText(matched);
    const mult = SIZE_MULTIPLIERS[unit];
    if (mult !== undefined && mult !== 1.0 && !text.includes(unit)) grams *= mult;
    return {
      grams,
      method: 'fdc_portion',
      downgraded: false,
      portionLabel: text.slice(0, 80) || null,
    };
  }

  if (
    (unit === 'serving' || unit === 'whole') &&
    typeof input.brandedServingGrams === 'number' &&
    input.brandedServingGrams > 0
  ) {
    return {
      grams: input.brandedServingGrams * quantity,
      method: 'fdc_portion',
      downgraded: false,
      portionLabel: 'branded serving size',
    };
  }

  const curated = unitToGrams(unit, quantity, foodHint);
  if (curated !== null) {
    const hint = foodHint.toLowerCase();
    const waterDensityUnit = unit === 'cup' || unit === 'tbsp' || unit === 'tsp';
    const liquid = LIQUID_HINTS.some((l) => hint.includes(l));
    return {
      grams: curated,
      method: 'curated_table',
      downgraded: waterDensityUnit && !liquid,
      portionLabel: null,
    };
  }

  return {
    grams: 100 * quantity,
    method: 'default_100g',
    downgraded: true,
    portionLabel: null,
  };
}
