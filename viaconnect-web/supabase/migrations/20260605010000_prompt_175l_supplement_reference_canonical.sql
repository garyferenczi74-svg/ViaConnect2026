-- =============================================================================
-- Prompt 175l (2026-06-05): canonical product reference.
--
-- Per 175a Section 6.3 + 175f Section 2.7. Deduplicated product catalog
-- keyed by normalized identity (UPC, NPN, or brand+name+strength).
-- Every successful supplement-scan resolve upserts here so Hannah and
-- downstream consumers can read product facts without a fresh external
-- lookup.
--
-- APPEND-ONLY: this is a NEW migration. No existing column or row is
-- touched.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.supplement_reference_canonical (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_key           text NOT NULL UNIQUE,
  brand                  text,
  product_name           text,
  primary_strength       text,
  form                   text,
  npn                    text,
  upc                    text,
  dsld_id                text,
  structured_ingredients jsonb,
  source_of_record       text NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_supplement_reference_source CHECK (
    source_of_record IN ('lnhpd','dsld','curated','user_scan')
  )
);

COMMENT ON TABLE public.supplement_reference_canonical IS
  'Canonical product catalog (Prompt 175a Section 6.3 + 175l). One deduplicated row per identified product. Source of truth for Hannah and the resolver chain. PHI-free.';

CREATE INDEX IF NOT EXISTS idx_supplement_reference_upc
  ON public.supplement_reference_canonical (upc) WHERE upc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplement_reference_npn
  ON public.supplement_reference_canonical (npn) WHERE npn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplement_reference_brand_lower
  ON public.supplement_reference_canonical (lower(brand)) WHERE brand IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplement_reference_updated_at
  ON public.supplement_reference_canonical (updated_at DESC);

ALTER TABLE public.supplement_reference_canonical ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supplement_reference_authenticated_read
  ON public.supplement_reference_canonical;
CREATE POLICY supplement_reference_authenticated_read
  ON public.supplement_reference_canonical
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.supplement_reference_canonical TO authenticated;
