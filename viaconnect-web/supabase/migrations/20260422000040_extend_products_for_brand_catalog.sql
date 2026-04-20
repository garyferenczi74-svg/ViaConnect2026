-- =============================================================================
-- Prompt #103 Phase 1: Extend products with brand + category + compliance
-- =============================================================================
-- Reuses the pre-existing pricing_tier column (added by MAP #100 migration
-- 20260420000010) — no new `tier` column. Adds brand_id, product_category_id,
-- per-SKU palette overrides, serving metadata, packaging proof path, and
-- brand_compliance_status with a publish gate trigger.
-- =============================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand_id                      UUID REFERENCES public.brands(brand_id),
  ADD COLUMN IF NOT EXISTS product_category_id           UUID REFERENCES public.product_categories(product_category_id),

  ADD COLUMN IF NOT EXISTS sku_bottle_color_primary_hex  TEXT CHECK (sku_bottle_color_primary_hex IS NULL OR sku_bottle_color_primary_hex ~ '^#[0-9A-Fa-f]{6}$'),
  ADD COLUMN IF NOT EXISTS sku_typography_primary_hex    TEXT CHECK (sku_typography_primary_hex IS NULL OR sku_typography_primary_hex ~ '^#[0-9A-Fa-f]{6}$'),
  ADD COLUMN IF NOT EXISTS sku_typography_secondary_hex  TEXT CHECK (sku_typography_secondary_hex IS NULL OR sku_typography_secondary_hex ~ '^#[0-9A-Fa-f]{6}$'),
  ADD COLUMN IF NOT EXISTS sku_accent_color_hex          TEXT CHECK (sku_accent_color_hex IS NULL OR sku_accent_color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  ADD COLUMN IF NOT EXISTS sku_dd_mark_primary_hex       TEXT CHECK (sku_dd_mark_primary_hex IS NULL OR sku_dd_mark_primary_hex ~ '^#[0-9A-Fa-f]{6}$'),
  ADD COLUMN IF NOT EXISTS sku_dd_mark_outline_hex       TEXT CHECK (sku_dd_mark_outline_hex IS NULL OR sku_dd_mark_outline_hex ~ '^#[0-9A-Fa-f]{6}$'),

  ADD COLUMN IF NOT EXISTS serving_count                 INTEGER,
  ADD COLUMN IF NOT EXISTS serving_unit                  TEXT,
  ADD COLUMN IF NOT EXISTS dose_per_serving_text         TEXT,
  ADD COLUMN IF NOT EXISTS packaging_proof_path          TEXT,

  ADD COLUMN IF NOT EXISTS brand_compliance_status       TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (brand_compliance_status IN ('pending_review', 'approved', 'flagged', 'rejected', 'n_a')),
  ADD COLUMN IF NOT EXISTS brand_compliance_reviewed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS brand_compliance_reviewed_by  UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS can_publish_to_storefront     BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_products_brand    ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(product_category_id);
CREATE INDEX IF NOT EXISTS idx_products_publish_ready
  ON public.products(can_publish_to_storefront) WHERE can_publish_to_storefront = TRUE;

-- ---------------------------------------------------------------------------
-- Trigger: can_publish_to_storefront requires brand_compliance_status='approved'
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_brand_compliance_publish_gate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.can_publish_to_storefront = TRUE AND NEW.brand_compliance_status <> 'approved' THEN
    RAISE EXCEPTION
      'Cannot publish product % to storefront: brand_compliance_status=% (must be approved)',
      NEW.id, NEW.brand_compliance_status
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_brand_compliance_publish_gate ON public.products;
CREATE TRIGGER trg_enforce_brand_compliance_publish_gate
  BEFORE UPDATE OF can_publish_to_storefront, brand_compliance_status ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_brand_compliance_publish_gate();

-- ---------------------------------------------------------------------------
-- Trigger: palette-rule consistency
--   single_palette_category_wide  => SKU overrides MUST be NULL
--   per_sku_palette               => bottle + typography primary REQUIRED
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_palette_rule_consistency()
RETURNS TRIGGER AS $$
DECLARE
  category_palette_rule palette_rule_type;
BEGIN
  IF NEW.product_category_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT palette_rule INTO category_palette_rule
    FROM public.product_categories
    WHERE product_category_id = NEW.product_category_id;

  IF category_palette_rule = 'single_palette_category_wide' THEN
    IF NEW.sku_bottle_color_primary_hex IS NOT NULL
       OR NEW.sku_typography_primary_hex IS NOT NULL
       OR NEW.sku_typography_secondary_hex IS NOT NULL
       OR NEW.sku_accent_color_hex IS NOT NULL
       OR NEW.sku_dd_mark_primary_hex IS NOT NULL
       OR NEW.sku_dd_mark_outline_hex IS NOT NULL THEN
      RAISE EXCEPTION
        'Category % is single_palette_category_wide; per-SKU palette overrides not permitted', NEW.product_category_id
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF category_palette_rule = 'per_sku_palette' THEN
    IF NEW.sku_bottle_color_primary_hex IS NULL OR NEW.sku_typography_primary_hex IS NULL THEN
      RAISE EXCEPTION
        'Category % is per_sku_palette; sku_bottle_color_primary_hex and sku_typography_primary_hex required', NEW.product_category_id
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_palette_rule_consistency ON public.products;
CREATE TRIGGER trg_enforce_palette_rule_consistency
  BEFORE INSERT OR UPDATE OF product_category_id,
         sku_bottle_color_primary_hex, sku_typography_primary_hex,
         sku_typography_secondary_hex, sku_accent_color_hex,
         sku_dd_mark_primary_hex, sku_dd_mark_outline_hex ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_palette_rule_consistency();

COMMENT ON COLUMN public.products.brand_id IS
  'Prompt #103: FK to brands (ViaCura master, ViaCura SNP sub-line, or Sproutables). Drives storefront routing + wordmark rendering.';
COMMENT ON COLUMN public.products.product_category_id IS
  'Prompt #103: FK to one of seven canonical categories. Drives identity-mark, palette, tagline, and commission rate.';
COMMENT ON COLUMN public.products.can_publish_to_storefront IS
  'Prompt #103: Storefront publish gate. Flips TRUE only when brand_compliance_status=approved (enforced by trg_enforce_brand_compliance_publish_gate).';
