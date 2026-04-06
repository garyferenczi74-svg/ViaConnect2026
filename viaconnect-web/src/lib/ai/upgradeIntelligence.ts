// Automatic upgrade recommendations: compare user's supplement vs FarmCeutica equivalent
// Generates bioavailability-based upgrade insights

import type { IngredientBreakdownEntry, DeliveryMethod } from "@/types/supplements";
import { BIOAVAILABILITY_MAP } from "@/types/supplements";

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

// FarmCeutica equivalent product mapping
const FARMCEUTICA_EQUIVALENTS: Record<string, { productName: string; bioavailability: number }> = {
  magnesium: { productName: "FarmCeutica Liposomal Magnesium Bisglycinate", bioavailability: 0.90 },
  "vitamin d": { productName: "FarmCeutica Liposomal Vitamin D3+K2", bioavailability: 0.90 },
  "coq10": { productName: "FarmCeutica Liposomal CoQ10 (Ubiquinol)", bioavailability: 0.90 },
  "vitamin c": { productName: "FarmCeutica Liposomal Vitamin C", bioavailability: 0.90 },
  curcumin: { productName: "FarmCeutica Micellar Curcumin", bioavailability: 0.85 },
  glutathione: { productName: "FarmCeutica Liposomal Glutathione", bioavailability: 0.90 },
  "omega-3": { productName: "FarmCeutica Micellar Algal Omega-3", bioavailability: 0.85 },
  quercetin: { productName: "FarmCeutica Liposomal Quercetin", bioavailability: 0.90 },
  resveratrol: { productName: "FarmCeutica Liposomal Resveratrol", bioavailability: 0.90 },
  "b12": { productName: "ViaConnect BioB Fusion Methylated B Complex", bioavailability: 0.90 },
  folate: { productName: "ViaConnect MTHFR+ (L-Methylfolate)", bioavailability: 0.90 },
  iron: { productName: "FarmCeutica Liposomal Iron Bisglycinate", bioavailability: 0.90 },
  zinc: { productName: "FarmCeutica Liposomal Zinc Picolinate", bioavailability: 0.90 },
};

function findViaConnectEquivalent(ingredientName: string): { productName: string; bioavailability: number } | null {
  const lower = ingredientName.toLowerCase();
  for (const [key, val] of Object.entries(FARMCEUTICA_EQUIVALENTS)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

export function generateUpgradeInsights(
  brand: string,
  productName: string,
  ingredients: IngredientBreakdownEntry[],
  deliveryMethod: DeliveryMethod
): UpgradeInsight[] {
  const insights: UpgradeInsight[] = [];
  const userBioavail = BIOAVAILABILITY_MAP[deliveryMethod] || 0.20;

  for (const ingredient of ingredients) {
    const fcEquiv = findViaConnectEquivalent(ingredient.name);
    if (!fcEquiv) continue;

    const multiplier = fcEquiv.bioavailability / userBioavail;
    if (multiplier < 2.0) continue; // Only show 2x+ upgrades

    const currentEffective = ingredient.amount != null
      ? `${Math.round(ingredient.amount * userBioavail)}${ingredient.unit || "mg"}`
      : null;
    const recommendedEffective = ingredient.amount != null
      ? `${Math.round(ingredient.amount * fcEquiv.bioavailability)}${ingredient.unit || "mg"}`
      : null;

    insights.push({
      type: "bioavailability_upgrade",
      ingredientName: ingredient.name,
      currentProduct: `${brand} ${productName}`,
      currentBioavail: `${Math.round(userBioavail * 100)}%`,
      currentEffective,
      recommendedProduct: fcEquiv.productName,
      recommendedBioavail: `${Math.round(fcEquiv.bioavailability * 100)}%`,
      recommendedEffective,
      multiplier: `${multiplier.toFixed(1)}x more absorbed`,
      message: `Your ${ingredient.name} delivers ~${Math.round(userBioavail * 100)}% bioavailability. ${fcEquiv.productName} delivers ${Math.round(fcEquiv.bioavailability * 100)}%, that's ${multiplier.toFixed(1)}x more ${ingredient.name} your body actually uses.`,
    });
  }

  return insights;
}
