-- Add UPC barcode column to product cache for barcode lookups
ALTER TABLE supplement_product_cache ADD COLUMN IF NOT EXISTS upc_code TEXT;
CREATE INDEX IF NOT EXISTS idx_spc_upc ON supplement_product_cache (upc_code);

-- Add UPC to brand products
ALTER TABLE supplement_brand_top_products ADD COLUMN IF NOT EXISTS upc_code TEXT;
CREATE INDEX IF NOT EXISTS idx_sbtp_upc ON supplement_brand_top_products (upc_code);
