-- ============================================================
-- Prompt #34: Brand Seed Architecture
-- Applied 2026-04-02 via Supabase migrations
-- Extensions, columns, indexes, RLS, RPC functions, aliases
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- Missing columns on supplement_brand_registry
ALTER TABLE public.supplement_brand_registry ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.supplement_brand_registry ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.supplement_brand_registry ADD COLUMN IF NOT EXISTS competitive_notes TEXT;

-- Missing columns on supplement_brand_top_products
ALTER TABLE public.supplement_brand_top_products ADD COLUMN IF NOT EXISTS enrichment_source TEXT;
ALTER TABLE public.supplement_brand_top_products ADD COLUMN IF NOT EXISTS enrichment_date TIMESTAMPTZ;
ALTER TABLE public.supplement_brand_top_products ADD COLUMN IF NOT EXISTS enrichment_cache_expires TIMESTAMPTZ;
ALTER TABLE public.supplement_brand_top_products ADD COLUMN IF NOT EXISTS barcode_upc TEXT;
ALTER TABLE public.supplement_brand_top_products ADD COLUMN IF NOT EXISTS barcode_ean TEXT;
ALTER TABLE public.supplement_brand_top_products ADD COLUMN IF NOT EXISTS bioavailability_estimate DECIMAL;
ALTER TABLE public.supplement_brand_top_products ADD COLUMN IF NOT EXISTS retail_price_usd DECIMAL;
ALTER TABLE public.supplement_brand_top_products ADD COLUMN IF NOT EXISTS retail_price_cad DECIMAL;
ALTER TABLE public.supplement_brand_top_products ADD COLUMN IF NOT EXISTS product_url TEXT;
ALTER TABLE public.supplement_brand_top_products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.supplement_brand_top_products ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 0;
ALTER TABLE public.supplement_brand_top_products ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_brand_registry_tier ON public.supplement_brand_registry (tier);
CREATE INDEX IF NOT EXISTS idx_brand_registry_categories ON public.supplement_brand_registry USING GIN (key_categories);
CREATE INDEX IF NOT EXISTS idx_brand_registry_search ON public.supplement_brand_registry USING GIN (to_tsvector('english', brand_name));
CREATE INDEX IF NOT EXISTS idx_brand_products_barcode ON public.supplement_brand_top_products (barcode_upc) WHERE barcode_upc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brand_products_ean ON public.supplement_brand_top_products (barcode_ean) WHERE barcode_ean IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brand_products_enriched ON public.supplement_brand_top_products (is_enriched) WHERE is_enriched = false;
CREATE INDEX IF NOT EXISTS idx_brand_products_scan_count ON public.supplement_brand_top_products (scan_count DESC);
CREATE INDEX IF NOT EXISTS idx_brand_products_search ON public.supplement_brand_top_products USING GIN (to_tsvector('english', product_name));
CREATE INDEX IF NOT EXISTS idx_brand_aliases_search ON public.supplement_brand_aliases USING GIN (to_tsvector('english', alias));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_brand_registry_timestamp()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public, pg_temp;

-- RLS
ALTER TABLE public.supplement_brand_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_brand_top_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_brand_aliases ENABLE ROW LEVEL SECURITY;

-- RPC Functions
CREATE OR REPLACE FUNCTION fuzzy_brand_match(search_term TEXT, max_distance INTEGER DEFAULT 2)
RETURNS TABLE (id UUID, brand_name TEXT, normalized_name TEXT, tier INTEGER, distance INTEGER) AS $$
BEGIN RETURN QUERY SELECT br.id, br.brand_name, br.normalized_name, br.tier, levenshtein(br.normalized_name, search_term) AS distance FROM public.supplement_brand_registry br WHERE levenshtein(br.normalized_name, search_term) <= max_distance ORDER BY levenshtein(br.normalized_name, search_term) ASC LIMIT 5; END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION fuzzy_product_match(brand_id UUID, search_term TEXT)
RETURNS TABLE (id UUID, product_name TEXT, normalized_product_name TEXT, ingredient_breakdown JSONB, is_enriched BOOLEAN, delivery_method TEXT, bioavailability_estimate DECIMAL, similarity REAL) AS $$
BEGIN RETURN QUERY SELECT p.id, p.product_name, p.normalized_product_name, p.ingredient_breakdown, p.is_enriched, p.delivery_method, p.bioavailability_estimate, similarity(p.normalized_product_name, search_term) AS similarity FROM public.supplement_brand_top_products p WHERE p.brand_registry_id = brand_id AND similarity(p.normalized_product_name, search_term) > 0.3 ORDER BY similarity(p.normalized_product_name, search_term) DESC LIMIT 5; END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION brand_autocomplete(search_query TEXT, result_limit INTEGER DEFAULT 10)
RETURNS TABLE (brand_id UUID, brand_name TEXT, tier INTEGER, tier_label TEXT, match_source TEXT, product_count INTEGER) AS $$
BEGIN RETURN QUERY SELECT DISTINCT ON (sub.brand_id) sub.* FROM (SELECT br.id AS brand_id, br.brand_name, br.tier, br.tier_label, 'brand_name'::TEXT AS match_source, br.estimated_sku_count AS product_count FROM public.supplement_brand_registry br WHERE br.brand_name ILIKE '%' || search_query || '%' OR br.normalized_name ILIKE '%' || search_query || '%' UNION ALL SELECT br.id, br.brand_name, br.tier, br.tier_label, 'alias'::TEXT, br.estimated_sku_count FROM public.supplement_brand_aliases ba JOIN public.supplement_brand_registry br ON br.id = ba.brand_registry_id WHERE ba.alias ILIKE '%' || search_query || '%' OR ba.normalized_alias ILIKE '%' || search_query || '%') sub ORDER BY sub.brand_id, sub.match_source ASC LIMIT result_limit; END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION product_autocomplete(selected_brand_id UUID, search_query TEXT DEFAULT '', result_limit INTEGER DEFAULT 20)
RETURNS TABLE (product_id UUID, product_name TEXT, product_category TEXT, is_enriched BOOLEAN, delivery_method TEXT) AS $$
BEGIN RETURN QUERY SELECT p.id, p.product_name, p.product_category, p.is_enriched, p.delivery_method FROM public.supplement_brand_top_products p WHERE p.brand_registry_id = selected_brand_id AND (search_query = '' OR p.product_name ILIKE '%' || search_query || '%' OR p.normalized_product_name ILIKE '%' || search_query || '%') ORDER BY p.scan_count DESC NULLS LAST, p.product_name ASC LIMIT result_limit; END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION enrichment_queue(batch_limit INTEGER DEFAULT 50)
RETURNS TABLE (product_id UUID, brand_name TEXT, product_name TEXT, scan_count INTEGER, tier INTEGER, priority_score INTEGER) AS $$
BEGIN RETURN QUERY SELECT bp.id, br.brand_name, bp.product_name, bp.scan_count, br.tier, (COALESCE(bp.scan_count, 0) * 10) + (CASE WHEN br.tier = 1 THEN 50 ELSE 0 END) + (CASE WHEN 'liposomal' = ANY(br.key_categories) THEN 100 ELSE 0 END) AS priority_score FROM public.supplement_brand_top_products bp JOIN public.supplement_brand_registry br ON br.id = bp.brand_registry_id WHERE bp.is_enriched = false AND bp.enrichment_status != 'failed' ORDER BY priority_score DESC LIMIT batch_limit; END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
