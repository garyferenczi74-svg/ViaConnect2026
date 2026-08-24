// Canonical JSONB assembler for supplement ingredient breakdowns.
// effectiveDose is null unless a confirmed this_sku source exists.
// Delivery-form percent maps are not a confirmed source.

import type { IngredientBreakdownEntry, OCRIngredient, DeliveryMethod } from "@/types/supplements";

export function assembleIngredientBreakdown(
  ingredients: OCRIngredient[],
  _deliveryMethod: DeliveryMethod,
  proprietaryBlendDetails?: {
    blendName: string;
    totalAmount: number | null;
    unit: string;
    individualAmountsDisclosed: boolean;
  } | null
): IngredientBreakdownEntry[] {
  return ingredients.map((ing) => {
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
      effectiveDose: null,
      effectiveDoseUnit: null,
      bioavailability_note: null,
      evidence_type: "not_stated",
      pmid: null,
      interactionCheckRequired: true,
      interactionSeverity: null,
      interactionDetails: null,
    };
  });
}
