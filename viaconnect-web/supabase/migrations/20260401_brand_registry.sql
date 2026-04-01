-- Supplement Brand Registry (110 brands, 5 tiers)
CREATE TABLE IF NOT EXISTS supplement_brand_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 5),
  tier_label TEXT NOT NULL,
  hq_country TEXT,
  key_categories TEXT[],
  certifications TEXT[],
  estimated_sku_count INTEGER,
  website_url TEXT,
  is_practitioner_only BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_sbr_normalized ON supplement_brand_registry (normalized_name);
CREATE INDEX IF NOT EXISTS idx_sbr_tier ON supplement_brand_registry (tier);

ALTER TABLE supplement_brand_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read brands" ON supplement_brand_registry FOR SELECT USING (true);

-- Brand Aliases for fuzzy matching
CREATE TABLE IF NOT EXISTS supplement_brand_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_registry_id UUID NOT NULL REFERENCES supplement_brand_registry(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  alias_type TEXT DEFAULT 'common' CHECK (alias_type IN ('common','abbreviation','former_name','parent_company','misspelling')),
  UNIQUE(normalized_alias)
);

CREATE INDEX IF NOT EXISTS idx_sba_normalized ON supplement_brand_aliases (normalized_alias);

ALTER TABLE supplement_brand_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read aliases" ON supplement_brand_aliases FOR SELECT USING (true);

-- Top Products per Brand
CREATE TABLE IF NOT EXISTS supplement_brand_top_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_registry_id UUID NOT NULL REFERENCES supplement_brand_registry(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  normalized_product_name TEXT NOT NULL,
  product_category TEXT,
  serving_size TEXT,
  servings_per_container INTEGER,
  total_count INTEGER,
  delivery_method TEXT,
  default_bioavailability NUMERIC(3,2),
  ingredient_breakdown JSONB,
  non_medicinal_ingredients JSONB,
  allergen_warnings TEXT[],
  is_proprietary_blend BOOLEAN DEFAULT false,
  is_enriched BOOLEAN DEFAULT false,
  enrichment_status TEXT DEFAULT 'pending' CHECK (enrichment_status IN ('pending','enriching','completed','failed')),
  enrichment_source_urls TEXT[],
  enrichment_confidence NUMERIC(3,2),
  cache_expiry TIMESTAMPTZ DEFAULT (now() + INTERVAL '90 days'),
  product_cache_id UUID REFERENCES supplement_product_cache(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brand_registry_id, normalized_product_name)
);

CREATE INDEX IF NOT EXISTS idx_sbtp_brand ON supplement_brand_top_products (brand_registry_id);
CREATE INDEX IF NOT EXISTS idx_sbtp_category ON supplement_brand_top_products (product_category);

ALTER TABLE supplement_brand_top_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read products" ON supplement_brand_top_products FOR SELECT USING (true);
