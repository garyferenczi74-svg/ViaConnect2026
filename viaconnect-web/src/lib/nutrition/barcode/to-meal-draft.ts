import type { MealDraft, MealItemDraft } from "@/app/(app)/(consumer)/nutrition/components/NutriVisionTab/types";

export interface BarcodeMealProduct {
  code: string;
  product_name: string;
  brands: string | null;
  nutriments: Record<string, number> | null;
  serving_size: string | null;
  nova_group: number | null;
  nutriscore_grade: string | null;
  completeness: number | null;
  caffeine_per_100g_mg: number | null;
}

const GRADE = new Set(["a", "b", "c", "d", "e"]);

function nutrient(nutriments: Record<string, number> | null, key: string): number | null {
  if (!nutriments) return null;
  const value = nutriments[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function portionGramsFromServing(serving: string | null): number {
  if (!serving) return 100;
  const match = serving.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  if (!match) return 100;
  const grams = Number(match[1]);
  if (!Number.isFinite(grams) || grams <= 0 || grams > 5000) return 100;
  return grams;
}

function scale(per100: number | null, grams: number): number | null {
  if (per100 === null) return null;
  return (per100 * grams) / 100;
}

export function readMealLookupProduct(json: unknown): BarcodeMealProduct | null {
  if (typeof json !== "object" || json === null) return null;
  const product = (json as Record<string, unknown>).product;
  if (typeof product !== "object" || product === null) return null;
  const record = product as Record<string, unknown>;
  const name = typeof record.product_name === "string" ? record.product_name.trim() : "";
  const code = typeof record.code === "string" ? record.code.trim() : "";
  if (!name || !code) return null;
  const nutrimentsRaw = record.nutriments;
  let nutriments: Record<string, number> | null = null;
  if (typeof nutrimentsRaw === "object" && nutrimentsRaw !== null && !Array.isArray(nutrimentsRaw)) {
    nutriments = {};
    for (const [key, value] of Object.entries(nutrimentsRaw as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value)) nutriments[key] = value;
    }
  }
  const grade = typeof record.nutriscore_grade === "string" ? record.nutriscore_grade.toLowerCase() : null;
  return {
    code,
    product_name: name,
    brands: typeof record.brands === "string" ? record.brands : null,
    nutriments,
    serving_size: typeof record.serving_size === "string" ? record.serving_size : null,
    nova_group: typeof record.nova_group === "number" ? record.nova_group : null,
    nutriscore_grade: grade,
    completeness: typeof record.completeness === "number" ? record.completeness : null,
    caffeine_per_100g_mg: typeof record.caffeine_per_100g_mg === "number" ? record.caffeine_per_100g_mg : null,
  };
}

export function barcodeProductToMealDraft(product: BarcodeMealProduct, barcode: string): MealDraft {
  const grams = portionGramsFromServing(product.serving_size);
  const kcalPer = nutrient(product.nutriments, "energy-kcal_100g");
  const proteinPer = nutrient(product.nutriments, "proteins_100g");
  const carbsPer = nutrient(product.nutriments, "carbohydrates_100g");
  const fatPer = nutrient(product.nutriments, "fat_100g");
  const fiberPer = nutrient(product.nutriments, "fiber_100g");
  const sugarPer = nutrient(product.nutriments, "sugars_100g");
  const sodiumPerG = nutrient(product.nutriments, "sodium_100g");
  const missing = [kcalPer, proteinPer, carbsPer, fatPer].some((value) => value === null);
  const calories = scale(kcalPer, grams) ?? 0;
  const protein = scale(proteinPer, grams) ?? 0;
  const carbs = scale(carbsPer, grams) ?? 0;
  const fat = scale(fatPer, grams) ?? 0;
  const fiber = scale(fiberPer, grams);
  const sugar = scale(sugarPer, grams);
  const sodiumMg = sodiumPerG === null ? null : scale(sodiumPerG * 1000, grams);
  const grade = product.nutriscore_grade && GRADE.has(product.nutriscore_grade)
    ? (product.nutriscore_grade as "a" | "b" | "c" | "d" | "e")
    : undefined;

  const item: MealItemDraft = {
    id: `barcode-item-${barcode}`,
    food_name: product.product_name,
    portion_grams: grams,
    nutrient_source: "open_food_facts",
    per_100g: {
      calories_kcal: kcalPer ?? 0,
      protein_g: proteinPer ?? 0,
      carbs_g: carbsPer ?? 0,
      fat_g: fatPer ?? 0,
      ...(fiberPer !== null ? { fiber_g: fiberPer } : {}),
      ...(sugarPer !== null ? { sugar_g: sugarPer } : {}),
      ...(sodiumPerG !== null ? { sodium_mg: sodiumPerG * 1000 } : {}),
    },
    calories_kcal: calories,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    ...(fiber !== null ? { fiber_g: fiber } : {}),
    ...(sugar !== null ? { sugar_g: sugar } : {}),
    ...(sodiumMg !== null ? { sodium_mg: sodiumMg } : {}),
    user_modified: false,
    confidence_band: missing ? "low" : "high",
    from_barcode_scan: true,
    off_barcode: barcode,
    off_product_name: product.product_name,
    ...(product.brands ? { off_brand: product.brands } : {}),
    off_serving_size_g: grams,
    ...(product.completeness !== null ? { off_completeness_score: product.completeness } : {}),
    ...(product.nova_group !== null ? { off_nova_group: product.nova_group } : {}),
    ...(grade ? { off_nutrition_grade_fr: grade } : {}),
    ...(product.caffeine_per_100g_mg !== null
      ? { caffeine_mg: (product.caffeine_per_100g_mg * grams) / 100 }
      : {}),
  };

  return {
    id: `barcode-meal-${barcode}`,
    items: [item],
    totals: {
      calories_kcal: calories,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      fiber_g: fiber ?? 0,
      sugar_g: sugar ?? 0,
      sodium_mg: sodiumMg ?? 0,
      cholesterol_mg: 0,
    },
    meal_confidence: missing ? 0.4 : 0.9,
    warnings: missing
      ? ["Some nutrients were not on the package record. Confirm the amounts before you save."]
      : [],
    credit_card_detected: true,
  };
}
