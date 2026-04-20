-- =============================================================================
-- Prompt #103 Phase 1: Brand hierarchy
-- =============================================================================
-- Three seeded brand records (Phase 2 migration):
--   viacura       — master ViaCura brand (bi-tonal VIA/CURA wordmark)
--   viacura-snp   — sub-line of ViaCura (monochrome wordmark, SNP tagline)
--   sproutables   — separate top-level sub-brand (no VIACURA wordmark)
--
-- Coexists with supplement_brand_registry (external brand discovery
-- catalog, 55+ brands). This table is the INTERNAL brand hierarchy
-- that drives storefront rendering + packaging compliance rules.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.brands (
  brand_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug                TEXT NOT NULL UNIQUE,
  display_name              TEXT NOT NULL,
  parent_brand_id           UUID REFERENCES public.brands(brand_id),
  is_sub_line               BOOLEAN NOT NULL DEFAULT FALSE,
  wordmark_style            TEXT NOT NULL CHECK (wordmark_style IN (
    'bi_tonal_via_cura',
    'monochrome_via_cura',
    'sproutables_leaf_figure'
  )),
  master_tagline            TEXT NOT NULL,
  logo_storage_path         TEXT,
  wordmark_vector_path      TEXT,
  storefront_slug           TEXT NOT NULL UNIQUE,
  storefront_theme_json     JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brands_parent     ON public.brands(parent_brand_id);
CREATE INDEX IF NOT EXISTS idx_brands_storefront ON public.brands(storefront_slug);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brands_public_read ON public.brands;
CREATE POLICY brands_public_read ON public.brands
  FOR SELECT TO anon, authenticated USING (TRUE);

DROP POLICY IF EXISTS brands_admin_write ON public.brands;
CREATE POLICY brands_admin_write ON public.brands
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE public.brands IS
  'Prompt #103: internal brand hierarchy (ViaCura master + ViaCura SNP sub-line + Sproutables sub-brand). Drives storefront rendering and packaging compliance rules. Distinct from supplement_brand_registry (external brand discovery catalog).';
