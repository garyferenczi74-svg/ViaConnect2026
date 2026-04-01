// 90-day supplement product cache manager

import { createClient } from "@/lib/supabase/client";
import { normalizeBrandName, normalizeProductName } from "./fuzzyBrandMatch";

export async function checkCache(brand: string, productName: string) {
  const supabase = createClient();
  const nb = normalizeBrandName(brand);
  const np = normalizeProductName(productName);

  const { data } = await supabase
    .from("supplement_product_cache")
    .select("*")
    .eq("normalized_brand", nb)
    .eq("normalized_product", np)
    .gt("cache_expiry", new Date().toISOString())
    .single();

  return data || null;
}

export async function saveToCache(
  brand: string,
  productName: string,
  productData: Record<string, unknown>,
  ingredientBreakdown: unknown[],
  options: {
    nonMedicinalIngredients?: unknown[];
    allergenWarnings?: string[];
    isProprietaryBlend?: boolean;
    proprietaryBlendTotalMg?: number;
    sourceUrls?: string[];
    ocrConfidence?: number;
    photoStoragePath?: string;
  } = {}
) {
  const supabase = createClient();
  const nb = normalizeBrandName(brand);
  const np = normalizeProductName(productName);

  const { data, error } = await supabase
    .from("supplement_product_cache")
    .upsert({
      brand,
      product_name: productName,
      normalized_brand: nb,
      normalized_product: np,
      product_data: productData,
      ingredient_breakdown: ingredientBreakdown,
      non_medicinal_ingredients: options.nonMedicinalIngredients || [],
      allergen_warnings: options.allergenWarnings || [],
      is_proprietary_blend: options.isProprietaryBlend || false,
      proprietary_blend_total_mg: options.proprietaryBlendTotalMg || null,
      source_urls: options.sourceUrls || [],
      ocr_confidence: options.ocrConfidence || 0,
      photo_storage_path: options.photoStoragePath || null,
      cache_expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "normalized_brand,normalized_product" });

  if (error) console.error("Cache save error:", error);
  return data;
}
