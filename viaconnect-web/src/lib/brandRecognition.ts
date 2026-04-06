import { createClient } from '@/lib/supabase/client';

interface BrandMatch {
  brand_id: string;
  brand_name: string;
  normalized_name: string;
  tier: number;
  match_type: 'exact' | 'alias' | 'fuzzy';
  confidence: number;
}

interface ProductMatch {
  product_id: string;
  product_name: string;
  brand_name: string;
  ingredient_breakdown: any;
  is_enriched: boolean;
  delivery_method: string | null;
  bioavailability_estimate: number | null;
}

/**
 * Three-tier brand matching cascade for Photo OCR.
 * Tier 1: Exact match on normalized brand name (~1ms)
 * Tier 2: Alias match on normalized alias (~2ms)
 * Tier 3: Fuzzy match with Levenshtein distance ≤ 2 (~5ms)
 * Total cascade: < 10ms vs ~3-5s for web search
 */
export async function matchBrand(extractedBrandName: string): Promise<BrandMatch | null> {
  const supabase = createClient();
  const normalized = normalizeBrandName(extractedBrandName);

  // TIER 1: Exact match on normalized brand name
  const { data: exactMatch } = await supabase
    .from('supplement_brand_registry')
    .select('id, brand_name, normalized_name, tier')
    .eq('normalized_name', normalized)
    .single();

  if (exactMatch) {
    return {
      brand_id: exactMatch.id,
      brand_name: exactMatch.brand_name,
      normalized_name: exactMatch.normalized_name,
      tier: exactMatch.tier,
      match_type: 'exact',
      confidence: 1.0,
    };
  }

  // TIER 2: Alias match
  const { data: aliasMatch } = await supabase
    .from('supplement_brand_aliases')
    .select('brand_registry_id, alias, supplement_brand_registry!inner(id, brand_name, normalized_name, tier)')
    .eq('normalized_alias', normalized)
    .limit(1)
    .single();

  if (aliasMatch) {
    const brand = aliasMatch.supplement_brand_registry as any;
    return {
      brand_id: brand.id,
      brand_name: brand.brand_name,
      normalized_name: brand.normalized_name,
      tier: brand.tier,
      match_type: 'alias',
      confidence: 0.95,
    };
  }

  // TIER 3: Fuzzy match with Levenshtein ≤ 2
  const { data: fuzzyResults } = await supabase
    .rpc('fuzzy_brand_match', { search_term: normalized, max_distance: 2 });

  if (fuzzyResults && fuzzyResults.length > 0) {
    const best = fuzzyResults[0];
    return {
      brand_id: best.id,
      brand_name: best.brand_name,
      normalized_name: best.normalized_name,
      tier: best.tier,
      match_type: 'fuzzy',
      confidence: Math.max(0.7, 1.0 - best.distance * 0.15),
    };
  }

  return null;
}

/**
 * After brand is matched, find the specific product.
 */
export async function matchProduct(brandId: string, extractedProductName: string): Promise<ProductMatch | null> {
  const supabase = createClient();
  const normalized = normalizeProductName(extractedProductName);

  // Exact product match
  const { data: exactProduct } = await supabase
    .from('supplement_brand_top_products')
    .select('id, product_name, ingredient_breakdown, is_enriched, delivery_method, bioavailability_estimate, scan_count')
    .eq('brand_registry_id', brandId)
    .eq('normalized_product_name', normalized)
    .single();

  if (exactProduct) {
    await supabase
      .from('supplement_brand_top_products')
      .update({ scan_count: ((exactProduct as any).scan_count || 0) + 1, last_scanned_at: new Date().toISOString() })
      .eq('id', exactProduct.id);

    return {
      product_id: exactProduct.id,
      product_name: exactProduct.product_name,
      brand_name: '',
      ingredient_breakdown: exactProduct.ingredient_breakdown,
      is_enriched: exactProduct.is_enriched,
      delivery_method: exactProduct.delivery_method,
      bioavailability_estimate: exactProduct.bioavailability_estimate ? parseFloat(String(exactProduct.bioavailability_estimate)) : null,
    };
  }

  // Fuzzy product match via trigram similarity
  const { data: fuzzyResults } = await supabase
    .rpc('fuzzy_product_match', { brand_id: brandId, search_term: normalized });

  if (fuzzyResults && fuzzyResults.length > 0) {
    const best = fuzzyResults[0];
    return {
      product_id: best.id,
      product_name: best.product_name,
      brand_name: '',
      ingredient_breakdown: best.ingredient_breakdown,
      is_enriched: best.is_enriched,
      delivery_method: best.delivery_method,
      bioavailability_estimate: best.bioavailability_estimate ? parseFloat(String(best.bioavailability_estimate)) : null,
    };
  }

  return null;
}

function normalizeBrandName(name: string): string {
  return name.toLowerCase().replace(/['''"""\-+&,.()\/®™©]/g, '').replace(/\s+/g, '').trim();
}

function normalizeProductName(name: string): string {
  return name.toLowerCase().replace(/['''"""\-+&,.()\/®™©]/g, '').replace(/\s+/g, '').trim();
}
