// Canonical JSONB assembler for supplement ingredient breakdowns

import type { IngredientBreakdownEntry, OCRIngredient, DeliveryMethod } from "@/types/supplements";
import { BIOAVAILABILITY_MAP } from "@/types/supplements";

export function assembleIngredientBreakdown(
  ingredients: OCRIngredient[],
  deliveryMethod: DeliveryMethod,
  proprietaryBlendDetails?: {
    blendName: string;
    totalAmount: number | null;
    unit: string;
    individualAmountsDisclosed: boolean;
  } | null
): IngredientBreakdownEntry[] {
  const bioavailability = BIOAVAILABILITY_MAP[deliveryMethod] || 0.20;

  return ingredients.map((ing) => {
    const effectiveDose = ing.amount != null ? Math.round(ing.amount * bioavailability * 100) / 100 : null;

    return {
      ingredientId: crypto.randomUUID(),
      name: ing.name,
      form: ing.form || null,
      forms: null,
      amount: ing.amount,
      unit: ing.unit || null,
      dailyValuePercent: ing.dailyValuePercent || null,
      isProprietaryBlend: ing.isPartOfBlend || false,
      proprietaryBlendName: ing.blendName || proprietaryBlendDetails?.blendName || null,
      proprietaryBlendTotal: proprietaryBlendDetails?.totalAmount || null,
      proprietaryBlendUnit: proprietaryBlendDetails?.unit || null,
      perFormBreakdown: ing.isPartOfBlend && !proprietaryBlendDetails?.individualAmountsDisclosed ? "undisclosed" : null,
      effectiveDose,
      effectiveDoseUnit: ing.unit || null,
      interactionCheckRequired: true,
      interactionSeverity: null,
      interactionDetails: null,
    };
  });
}
