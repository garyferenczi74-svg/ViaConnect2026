// Brand recognition index for fast-path photo OCR matching

import { createClient } from "@/lib/supabase/client";
import { normalizeBrandName, normalizeProductName } from "./fuzzyBrandMatch";

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

interface BrandMatch {
  brandId: string;
  brandName: string;
  tier: number;
  matchType: "exact" | "alias" | "fuzzy";
  confidence: number;
}

interface ProductMatch {
  productId: string;
  productName: string;
  category: string | null;
  isEnriched: boolean;
  ingredientBreakdown: unknown[] | null;
  matchType: "exact" | "fuzzy";
  confidence: number;
}

export async function recognizeBrand(ocrBrand: string): Promise<BrandMatch | null> {
  const supabase = createClient();
  const normalized = normalizeBrandName(ocrBrand);

  // 1. Exact match
  const { data: exact } = await supabase
    .from("supplement_brand_registry")
    .select("id, brand_name, tier")
    .eq("normalized_name", normalized)
    .single();
  if (exact) return { brandId: exact.id, brandName: exact.brand_name, tier: exact.tier, matchType: "exact", confidence: 1.0 };

  // 2. Alias match
  const { data: alias } = await supabase
    .from("supplement_brand_aliases")
    .select("brand_registry_id, supplement_brand_registry:brand_registry_id(id, brand_name, tier)")
    .eq("normalized_alias", normalized)
    .single();
  if (alias) {
    const brand = alias.supplement_brand_registry as unknown as { id: string; brand_name: string; tier: number };
    return { brandId: brand.id, brandName: brand.brand_name, tier: brand.tier, matchType: "alias", confidence: 0.95 };
  }

  // 3. Fuzzy match (Levenshtein <= 2)
  const { data: all } = await supabase.from("supplement_brand_registry").select("id, brand_name, normalized_name, tier");
  for (const b of all || []) {
    if (levenshtein(normalized, b.normalized_name) <= 2) {
      return { brandId: b.id, brandName: b.brand_name, tier: b.tier, matchType: "fuzzy", confidence: 0.80 };
    }
  }

  return null;
}

export async function recognizeProduct(brandId: string, ocrProductName: string): Promise<ProductMatch | null> {
  const supabase = createClient();
  const normalized = normalizeProductName(ocrProductName);

  const { data: products } = await supabase
    .from("supplement_brand_top_products")
    .select("id, product_name, normalized_product_name, product_category, is_enriched, ingredient_breakdown")
    .eq("brand_registry_id", brandId);

  for (const p of products || []) {
    if (p.normalized_product_name === normalized) {
      return { productId: p.id, productName: p.product_name, category: p.product_category, isEnriched: p.is_enriched ?? false, ingredientBreakdown: p.ingredient_breakdown as unknown[] | null, matchType: "exact", confidence: 1.0 };
    }
    if (levenshtein(p.normalized_product_name, normalized) <= 3) {
      return { productId: p.id, productName: p.product_name, category: p.product_category, isEnriched: p.is_enriched ?? false, ingredientBreakdown: p.ingredient_breakdown as unknown[] | null, matchType: "fuzzy", confidence: 0.85 };
    }
  }

  return null;
}
