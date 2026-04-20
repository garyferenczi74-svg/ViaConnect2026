-- =============================================================================
-- Prompt #103 Phase 1: Product certification registry + assignments
-- =============================================================================
-- General-purpose certifications (GMP, Third-Party Lab Tested, Non-GMO).
-- The Methylated Formula identity mark is NOT a certification — it is
-- determined by the product's category (product_categories.identity_mark_type).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.product_certifications (
  certification_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_slug        TEXT NOT NULL UNIQUE,
  display_name              TEXT NOT NULL,
  badge_icon_storage_path   TEXT,
  requires_evidence         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_certification_assignments (
  assignment_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  certification_id          UUID NOT NULL REFERENCES public.product_certifications(certification_id),
  evidence_doc_path         TEXT,
  certified_on              DATE,
  expires_on                DATE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, certification_id)
);

CREATE INDEX IF NOT EXISTS idx_product_cert_assignments_product
  ON public.product_certification_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_cert_assignments_cert
  ON public.product_certification_assignments(certification_id);

ALTER TABLE public.product_certifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_certification_assignments  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_certifications_public_read ON public.product_certifications;
CREATE POLICY product_certifications_public_read ON public.product_certifications
  FOR SELECT TO anon, authenticated USING (TRUE);

DROP POLICY IF EXISTS product_certifications_admin_write ON public.product_certifications;
CREATE POLICY product_certifications_admin_write ON public.product_certifications
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS cert_assignments_public_read ON public.product_certification_assignments;
CREATE POLICY cert_assignments_public_read ON public.product_certification_assignments
  FOR SELECT TO anon, authenticated USING (TRUE);

DROP POLICY IF EXISTS cert_assignments_admin_write ON public.product_certification_assignments;
CREATE POLICY cert_assignments_admin_write ON public.product_certification_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
