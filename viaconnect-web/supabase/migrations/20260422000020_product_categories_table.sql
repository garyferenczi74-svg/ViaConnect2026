-- =============================================================================
-- Prompt #103 Phase 1: Authoritative 7-category product taxonomy
-- =============================================================================
-- The seven categories (Base Formulas, Advanced Formulas, Women's Health,
-- Children's Methylated Formulas, SNP Support Formulations, Functional
-- Mushrooms, GeneX360 Testing) crystallized April 20, 2026. Every new
-- SKU references exactly one product_category_id; the category record
-- determines identity-mark rule, palette rule, tagline, and commission
-- default.
-- =============================================================================

-- Enum types
DO $$ BEGIN
  CREATE TYPE identity_mark_type AS ENUM (
    'methylated_formula',
    'dual_delivery_technology',
    'none'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE palette_rule_type AS ENUM (
    'single_palette_category_wide',
    'per_sku_palette',
    'not_applicable'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.product_categories (
  product_category_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug             TEXT NOT NULL UNIQUE,
  display_name              TEXT NOT NULL,
  brand_id                  UUID NOT NULL REFERENCES public.brands(brand_id),
  identity_mark_type        identity_mark_type NOT NULL,
  palette_rule              palette_rule_type NOT NULL,

  bottle_color_primary_hex  TEXT CHECK (bottle_color_primary_hex IS NULL OR bottle_color_primary_hex ~ '^#[0-9A-Fa-f]{6}$'),
  typography_primary_hex    TEXT CHECK (typography_primary_hex IS NULL OR typography_primary_hex ~ '^#[0-9A-Fa-f]{6}$'),
  typography_secondary_hex  TEXT CHECK (typography_secondary_hex IS NULL OR typography_secondary_hex ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color_hex          TEXT CHECK (accent_color_hex IS NULL OR accent_color_hex ~ '^#[0-9A-Fa-f]{6}$'),

  dual_delivery_mark_primary_hex  TEXT CHECK (dual_delivery_mark_primary_hex IS NULL OR dual_delivery_mark_primary_hex ~ '^#[0-9A-Fa-f]{6}$'),
  dual_delivery_mark_outline_hex  TEXT CHECK (dual_delivery_mark_outline_hex IS NULL OR dual_delivery_mark_outline_hex ~ '^#[0-9A-Fa-f]{6}$'),

  tagline_primary           TEXT NOT NULL,
  tagline_subtitle          TEXT,
  display_order             INTEGER NOT NULL DEFAULT 100,
  default_commission_rate_pct NUMERIC(5,2) CHECK (default_commission_rate_pct IS NULL OR (default_commission_rate_pct >= 0 AND default_commission_rate_pct <= 100)),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT product_categories_palette_consistency
    CHECK (
      (palette_rule = 'single_palette_category_wide'
         AND bottle_color_primary_hex IS NOT NULL
         AND typography_primary_hex   IS NOT NULL
         AND accent_color_hex         IS NOT NULL)
      OR palette_rule IN ('per_sku_palette', 'not_applicable')
    ),
  CONSTRAINT product_categories_dd_mark_consistency
    CHECK (
      (identity_mark_type = 'dual_delivery_technology'
         AND palette_rule = 'single_palette_category_wide'
         AND dual_delivery_mark_primary_hex IS NOT NULL
         AND dual_delivery_mark_outline_hex IS NOT NULL)
      OR identity_mark_type != 'dual_delivery_technology'
      OR palette_rule = 'per_sku_palette'
    )
);

CREATE INDEX IF NOT EXISTS idx_product_categories_brand
  ON public.product_categories(brand_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_display_order
  ON public.product_categories(display_order);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_categories_public_read ON public.product_categories;
CREATE POLICY product_categories_public_read ON public.product_categories
  FOR SELECT TO anon, authenticated USING (TRUE);

DROP POLICY IF EXISTS product_categories_admin_write ON public.product_categories;
CREATE POLICY product_categories_admin_write ON public.product_categories
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE public.product_categories IS
  'Prompt #103: the authoritative seven-category taxonomy. Drives identity-mark selection, palette rule, tagline, and default commission rate.';
