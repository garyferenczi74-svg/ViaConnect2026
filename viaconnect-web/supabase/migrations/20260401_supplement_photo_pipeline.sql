-- Supplement Product Cache (90-day TTL, keyed on normalized brand+product)
CREATE TABLE IF NOT EXISTS supplement_product_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  product_name TEXT NOT NULL,
  normalized_brand TEXT NOT NULL,
  normalized_product TEXT NOT NULL,
  product_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ingredient_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  non_medicinal_ingredients JSONB DEFAULT '[]'::jsonb,
  allergen_warnings TEXT[] DEFAULT '{}',
  is_proprietary_blend BOOLEAN DEFAULT false,
  proprietary_blend_total_mg NUMERIC(10,2),
  source_urls JSONB DEFAULT '[]'::jsonb,
  ocr_confidence NUMERIC(3,2) DEFAULT 0.00,
  photo_storage_path TEXT,
  cache_expiry TIMESTAMPTZ DEFAULT (now() + interval '90 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(normalized_brand, normalized_product)
);

CREATE INDEX IF NOT EXISTS idx_spc_normalized ON supplement_product_cache (normalized_brand, normalized_product);
CREATE INDEX IF NOT EXISTS idx_spc_cache_expiry ON supplement_product_cache (cache_expiry);

ALTER TABLE supplement_product_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read product cache" ON supplement_product_cache FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert cache" ON supplement_product_cache FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update cache" ON supplement_product_cache FOR UPDATE USING (auth.uid() IS NOT NULL);

-- User Supplement Photos
CREATE TABLE IF NOT EXISTS user_supplement_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_filename TEXT,
  file_size_bytes INTEGER,
  mime_type TEXT DEFAULT 'image/jpeg',
  ocr_raw_response JSONB,
  ocr_extracted_data JSONB,
  ocr_confidence NUMERIC(3,2),
  product_cache_id UUID REFERENCES supplement_product_cache(id) ON DELETE SET NULL,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending','processing','completed','failed','manual_review')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_supplement_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own photos" ON user_supplement_photos FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_usp_user ON user_supplement_photos (user_id);
