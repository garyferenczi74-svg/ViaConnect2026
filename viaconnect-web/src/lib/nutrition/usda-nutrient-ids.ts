// Prompt #164 Layer 2: USDA returns nutrients keyed by integer nutrient.id.
// These constants come from the FDC nutrient table at
// https://fdc.nal.usda.gov/api-guide.html and are stable across data types.

export const USDA_NUTRIENT_IDS = {
  ENERGY_KCAL: 1008,
  PROTEIN_G: 1003,
  CARBS_G: 1005,
  TOTAL_FAT_G: 1004,
  SATURATED_FAT_G: 1258,
  TRANS_FAT_G: 1257,
  SUGAR_G: 2000,
  FIBER_G: 1079,
  OMEGA3_ALA_G: 1404,
  OMEGA3_EPA_G: 1278,
  OMEGA3_DHA_G: 1272,
  OMEGA3_DPA_G: 1280,
} as const;

export interface NutrientsPer100g {
  calories: number;
  protein_g: number;
  carbs_g: number;
  total_fat_g: number;
  saturated_fat_g: number;
  trans_fat_g: number;
  omega3_g: number;
  sugar_g: number;
  fiber_g: number;
}

interface FoodNutrient {
  nutrient?: { id?: number };
  amount?: number;
}

interface USDAPayload {
  foodNutrients?: FoodNutrient[];
}

export function extractNutrientsPer100g(payload: USDAPayload): NutrientsPer100g {
  const map = new Map<number, number>();
  for (const fn of payload.foodNutrients ?? []) {
    const id = fn.nutrient?.id;
    if (typeof id === 'number' && typeof fn.amount === 'number') {
      map.set(id, fn.amount);
    }
  }
  const get = (id: number) => map.get(id) ?? 0;
  const omega3 =
    get(USDA_NUTRIENT_IDS.OMEGA3_ALA_G) +
    get(USDA_NUTRIENT_IDS.OMEGA3_EPA_G) +
    get(USDA_NUTRIENT_IDS.OMEGA3_DHA_G) +
    get(USDA_NUTRIENT_IDS.OMEGA3_DPA_G);
  return {
    calories: get(USDA_NUTRIENT_IDS.ENERGY_KCAL),
    protein_g: get(USDA_NUTRIENT_IDS.PROTEIN_G),
    carbs_g: get(USDA_NUTRIENT_IDS.CARBS_G),
    total_fat_g: get(USDA_NUTRIENT_IDS.TOTAL_FAT_G),
    saturated_fat_g: get(USDA_NUTRIENT_IDS.SATURATED_FAT_G),
    trans_fat_g: get(USDA_NUTRIENT_IDS.TRANS_FAT_G),
    omega3_g: omega3,
    sugar_g: get(USDA_NUTRIENT_IDS.SUGAR_G),
    fiber_g: get(USDA_NUTRIENT_IDS.FIBER_G),
  };
}
