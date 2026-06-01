/**
 * Prompt 170f Phase B: recipe nutrition rollup.
 *
 * Deterministic per spec §6.1. Sums per-ingredient nutrition into recipe
 * totals; per_serving = totals / servings. Runs synchronously on every
 * recipe create + ingredient edit. NO model call.
 *
 * Unmatched ingredients (Phase 1 fasttrack: most ingredients land here
 * until cascade tiers wire up in Phase 1.1) contribute zero nutrition
 * unless the user manually populated per-ingredient macro fields in the
 * editor. The recipe still saves + logs + scores; partial nutrition is
 * honest, not blocked.
 */

export interface IngredientNutritionInput {
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  sat_fat_g?: number | null;
  fiber_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
  is_optional?: boolean;
}

export interface RecipeNutritionTotals {
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_sat_fat_g: number;
  total_fiber_g: number;
  total_sugar_g: number;
  total_sodium_mg: number;
  has_unmatched_ingredients: boolean;
}

export interface PerServingNutrition {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  sat_fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
}

const NUTRITION_FIELDS = [
  'calories',
  'protein_g',
  'carbs_g',
  'fat_g',
  'sat_fat_g',
  'fiber_g',
  'sugar_g',
  'sodium_mg',
] as const;

function safeNum(v: number | null | undefined): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return 0;
  return v;
}

export function rollupRecipeNutrition(
  ingredients: IngredientNutritionInput[],
): RecipeNutritionTotals {
  const totals: Record<string, number> = {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    sat_fat_g: 0,
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
  };

  let hasUnmatched = false;

  for (const ing of ingredients) {
    const providedAny = NUTRITION_FIELDS.some((f) => typeof ing[f] === 'number' && (ing[f] as number) > 0);
    if (!providedAny) {
      hasUnmatched = true;
      continue;
    }
    for (const f of NUTRITION_FIELDS) {
      totals[f] += safeNum(ing[f]);
    }
  }

  return {
    total_calories: Math.round(totals.calories * 100) / 100,
    total_protein_g: Math.round(totals.protein_g * 100) / 100,
    total_carbs_g: Math.round(totals.carbs_g * 100) / 100,
    total_fat_g: Math.round(totals.fat_g * 100) / 100,
    total_sat_fat_g: Math.round(totals.sat_fat_g * 100) / 100,
    total_fiber_g: Math.round(totals.fiber_g * 100) / 100,
    total_sugar_g: Math.round(totals.sugar_g * 100) / 100,
    total_sodium_mg: Math.round(totals.sodium_mg * 100) / 100,
    has_unmatched_ingredients: hasUnmatched,
  };
}

export function perServingFromTotals(
  totals: RecipeNutritionTotals,
  servings: number,
): PerServingNutrition {
  if (servings <= 0) {
    return {
      calories: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
      sat_fat_g: null,
      fiber_g: null,
      sugar_g: null,
      sodium_mg: null,
    };
  }
  const div = (v: number): number | null => v > 0 ? Math.round((v / servings) * 100) / 100 : null;
  return {
    calories: div(totals.total_calories),
    protein_g: div(totals.total_protein_g),
    carbs_g: div(totals.total_carbs_g),
    fat_g: div(totals.total_fat_g),
    sat_fat_g: div(totals.total_sat_fat_g),
    fiber_g: div(totals.total_fiber_g),
    sugar_g: div(totals.total_sugar_g),
    sodium_mg: div(totals.total_sodium_mg),
  };
}
