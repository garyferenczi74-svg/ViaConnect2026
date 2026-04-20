-- =============================================================================
-- Prompt #103 Phase 1: Brand Identity Compliance review audit log
-- =============================================================================
-- Every invocation of brand_compliance_validator writes a row here.
-- Append-only from the runtime path: corrections happen via a new row,
-- not by editing prior analyses. Admin-only RLS.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.brand_compliance_reviews (
  review_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                UUID NOT NULL REFERENCES public.products(id),
  packaging_proof_path      TEXT NOT NULL,
  vision_analysis_json      JSONB NOT NULL DEFAULT '{}'::JSONB,
  detected_issues_json      JSONB NOT NULL DEFAULT '[]'::JSONB,
  severity                  TEXT NOT NULL CHECK (severity IN ('clean', 'minor', 'major', 'critical')),
  status                    TEXT NOT NULL DEFAULT 'pending_human_review' CHECK (status IN (
    'pending_human_review', 'approved', 'rejected', 'remediation_required'
  )),
  reviewer_id               UUID REFERENCES auth.users(id),
  reviewer_notes            TEXT,
  reviewed_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_compliance_reviews_product
  ON public.brand_compliance_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_brand_compliance_reviews_pending
  ON public.brand_compliance_reviews(created_at DESC)
  WHERE status = 'pending_human_review';

ALTER TABLE public.brand_compliance_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brand_compliance_reviews_admin_all ON public.brand_compliance_reviews;
CREATE POLICY brand_compliance_reviews_admin_all ON public.brand_compliance_reviews
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE public.brand_compliance_reviews IS
  'Prompt #103: audit log of every Claude Vision brand-compliance run. Admin-only RLS. Append-only from runtime; new analyses write new rows.';
