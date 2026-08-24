// Upgrade recommendations must not invent absorption percents or fold multipliers.
// this_sku human PK is 0. Confirmed class literature is shop Ingredient Breakdown only.

import type { IngredientBreakdownEntry, DeliveryMethod } from "@/types/supplements";

export interface UpgradeInsight {
  type: "bioavailability_upgrade";
  ingredientName: string;
  currentProduct: string;
  currentBioavail: string;
  currentEffective: string | null;
  recommendedProduct: string;
  recommendedBioavail: string;
  recommendedEffective: string | null;
  multiplier: string;
  message: string;
}

export function generateUpgradeInsights(
  _brand: string,
  _productName: string,
  _ingredients: IngredientBreakdownEntry[],
  _deliveryMethod: DeliveryMethod
): UpgradeInsight[] {
  return [];
}
