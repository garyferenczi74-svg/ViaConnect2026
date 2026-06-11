// Prompt #164 Layer 2, superseded by Prompt 186: this module now DELEGATES to
// the canonical FDC nutrient map in fdc-nutrients.ts, which is the single
// source of truth for nutrient extraction. Do not add nutrient id or name
// lookups here; extend CANONICAL_NUTRIENT_MAP instead.

import {
  FDC_IDS,
  extractCanonicalNutrients,
  type FdcNutrientPayload,
} from './fdc-nutrients';

// Legacy constant names preserved for existing imports; values come from the
// canonical map's id table.
export const USDA_NUTRIENT_IDS = {
  ENERGY_KCAL: FDC_IDS.ENERGY_KCAL,
  PROTEIN_G: FDC_IDS.PROTEIN_G,
  CARBS_G: FDC_IDS.CARBS_BY_DIFFERENCE_G,
  TOTAL_FAT_G: FDC_IDS.TOTAL_FAT_G,
  SATURATED_FAT_G: FDC_IDS.SATURATED_FAT_G,
  TRANS_FAT_G: FDC_IDS.TRANS_FAT_G,
  SUGAR_G: FDC_IDS.TOTAL_SUGARS_G,
  FIBER_G: FDC_IDS.FIBER_G,
  OMEGA3_ALA_G: FDC_IDS.OMEGA3_ALA_G,
  OMEGA3_EPA_G: FDC_IDS.OMEGA3_EPA_G,
  OMEGA3_DHA_G: FDC_IDS.OMEGA3_DHA_G,
  OMEGA3_DPA_G: FDC_IDS.OMEGA3_DPA_G,
} as const;

// Prompt 186: nullable per the unknown-vs-zero contract. A nutrient the
// payload does not carry is null, never 0.
export interface NutrientsPer100g {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  total_fat_g: number | null;
  saturated_fat_g: number | null;
  trans_fat_g: number | null;
  omega3_g: number | null;
  sugar_g: number | null;
  fiber_g: number | null;
}

export function extractNutrientsPer100g(payload: FdcNutrientPayload): NutrientsPer100g {
  const { values } = extractCanonicalNutrients(payload);
  return {
    calories: values.calories,
    protein_g: values.protein_g,
    carbs_g: values.carbs_g,
    total_fat_g: values.total_fat_g,
    saturated_fat_g: values.saturated_fat_g,
    trans_fat_g: values.trans_fat_g,
    omega3_g: values.omega3_g,
    sugar_g: values.sugar_g,
    fiber_g: values.fiber_g,
  };
}
