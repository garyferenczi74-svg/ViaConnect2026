-- ViaConnect Search Engine v2 — Applied 2026-04-04
-- Full-text + trigram search on supplement_brand_registry + supplement_brand_top_products + ingredients
-- See migration applied via Supabase MCP: search_engine_v2

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE supplement_brand_top_products ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE supplement_brand_registry ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_sbtp_search_vector ON supplement_brand_top_products USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_sbtp_name_trgm ON supplement_brand_top_products USING gin (product_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sbr_search_vector ON supplement_brand_registry USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_sbr_name_trgm ON supplement_brand_registry USING gin (brand_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ingredients_name_trgm ON ingredients USING gin (name gin_trgm_ops);
