-- =============================================================================
-- Prompt #113 Phase 1.1: Regulatory jurisdictions + ingredient compliance
-- registry + S/F claim library + substantiation records.
-- Adapts spec FK names to actual project schema:
--   supplements_ingredients(id) -> public.ingredients(id) (UUID)
--   products_skus(id)           -> TEXT sku (no FK, logical reference)
--   user_profiles               -> public.profiles
-- =============================================================================

-- ---------------------------------------------------------------------------
-- regulatory_jurisdictions: US + CA live; EU/UK/AU reserved for future prompts.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regulatory_jurisdictions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  primary_agency  TEXT NOT NULL,
  statute_ref     TEXT NOT NULL,
  disclaimer_text TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.regulatory_jurisdictions IS
  'Prompt #113 regulatory jurisdictions. US DSHEA + CA NHPR live in this migration; EU/UK/AU reserved.';

ALTER TABLE public.regulatory_jurisdictions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_jurisdictions' AND policyname='regj_read_all') THEN
    CREATE POLICY "regj_read_all" ON public.regulatory_jurisdictions FOR SELECT TO authenticated, anon USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_jurisdictions' AND policyname='regj_write_admin') THEN
    CREATE POLICY "regj_write_admin" ON public.regulatory_jurisdictions FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
END $$;

INSERT INTO public.regulatory_jurisdictions (code, name, primary_agency, statute_ref, disclaimer_text) VALUES
  ('US','United States','FDA','DSHEA 1994 / 21 CFR 101.93',
   'This statement has not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.'),
  ('CA','Canada','Health Canada','Natural Health Products Regulations (SOR/2003-196)', NULL)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- current_user_jurisdiction(): returns the viewer's jurisdiction UUID.
-- Defaults to US when no billing country is set.
-- Note: profiles in this project does not have billing_country. We fall back
-- to US for all users; when a billing_country is added in a future prompt,
-- update this function. Adapted from spec §5.12.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_jurisdiction()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.regulatory_jurisdictions WHERE code = 'US' AND is_active LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_user_jurisdiction() IS
  'Prompt #113 viewer-jurisdiction resolver. Currently returns US; updated when profile.billing_country ships.';

-- ---------------------------------------------------------------------------
-- regulatory_ingredients: per-(ingredient, jurisdiction) compliance status.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regulatory_ingredients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id       UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  jurisdiction_id     UUID NOT NULL REFERENCES public.regulatory_jurisdictions(id),
  status              TEXT NOT NULL CHECK (status IN (
                        'approved','restricted','banned','requires_ndi',
                        'gras','pre_dshea','novel','under_review'
                      )),
  monograph_ref       TEXT,
  ndi_number          TEXT,
  ndi_submitted_at    DATE,
  ndi_response        TEXT CHECK (ndi_response IS NULL OR ndi_response IN ('no_objection','objection','pending')),
  dose_min_mg_day     NUMERIC(14,4),
  dose_max_mg_day     NUMERIC(14,4),
  dose_unit           TEXT DEFAULT 'mg',
  contraindications   JSONB DEFAULT '[]'::JSONB,
  notes               TEXT,
  last_verified_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by         UUID REFERENCES auth.users(id),
  UNIQUE (ingredient_id, jurisdiction_id)
);

CREATE INDEX IF NOT EXISTS idx_regingr_juris_status ON public.regulatory_ingredients (jurisdiction_id, status);
CREATE INDEX IF NOT EXISTS idx_regingr_ingredient ON public.regulatory_ingredients (ingredient_id);

ALTER TABLE public.regulatory_ingredients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_ingredients' AND policyname='regingr_read_admin') THEN
    CREATE POLICY "regingr_read_admin" ON public.regulatory_ingredients FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin','medical')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_ingredients' AND policyname='regingr_write_compliance') THEN
    CREATE POLICY "regingr_write_compliance" ON public.regulatory_ingredients FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- regulatory_claim_library: versioned structure/function claims.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regulatory_claim_library (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_text          TEXT NOT NULL CHECK (length(claim_text) <= 240),
  claim_hash          TEXT NOT NULL,
  claim_type          TEXT NOT NULL CHECK (claim_type IN (
                        'structure_function','health','dietary_guidance',
                        'nutrient_content','disease','superiority'
                      )),
  jurisdiction_id     UUID NOT NULL REFERENCES public.regulatory_jurisdictions(id),
  status              TEXT NOT NULL CHECK (status IN ('approved','pending','rejected','retired','conditional')),
  ingredient_id       UUID REFERENCES public.ingredients(id),
  sku_scope           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  dose_condition      TEXT,
  substantiation_tier TEXT CHECK (substantiation_tier IS NULL OR substantiation_tier IN (
                        'tier_1_monograph','tier_2_meta','tier_3_rct','tier_4_observational','tier_5_mechanistic'
                      )),
  kelsey_verdict      TEXT CHECK (kelsey_verdict IS NULL OR kelsey_verdict IN ('APPROVED','CONDITIONAL','BLOCKED','ESCALATE')),
  kelsey_rationale    TEXT,
  kelsey_reviewed_at  TIMESTAMPTZ,
  approved_by         UUID REFERENCES auth.users(id),
  approved_at         TIMESTAMPTZ,
  retired_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (claim_hash, jurisdiction_id)
);

CREATE INDEX IF NOT EXISTS idx_regclaim_juris_status ON public.regulatory_claim_library (jurisdiction_id, status);
CREATE INDEX IF NOT EXISTS idx_regclaim_ingredient  ON public.regulatory_claim_library (ingredient_id);
CREATE INDEX IF NOT EXISTS idx_regclaim_sku_scope   ON public.regulatory_claim_library USING GIN (sku_scope);

ALTER TABLE public.regulatory_claim_library ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_claim_library' AND policyname='regclaim_read_approved_scoped') THEN
    -- Practitioners/anon see ONLY approved claims in their jurisdiction.
    CREATE POLICY "regclaim_read_approved_scoped" ON public.regulatory_claim_library FOR SELECT TO authenticated, anon
      USING (status = 'approved' AND jurisdiction_id = public.current_user_jurisdiction());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_claim_library' AND policyname='regclaim_read_all_admin') THEN
    CREATE POLICY "regclaim_read_all_admin" ON public.regulatory_claim_library FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin','medical')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_claim_library' AND policyname='regclaim_write_compliance') THEN
    CREATE POLICY "regclaim_write_compliance" ON public.regulatory_claim_library FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- regulatory_substantiation: evidence records attached to claims.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regulatory_substantiation (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id       UUID NOT NULL REFERENCES public.regulatory_claim_library(id) ON DELETE CASCADE,
  evidence_type  TEXT NOT NULL CHECK (evidence_type IN (
                   'RCT','meta_analysis','systematic_review','monograph',
                   'fda_letter','hc_letter','observational','mechanistic','expert_panel'
                 )),
  citation       TEXT NOT NULL,
  doi            TEXT,
  url            TEXT,
  pdf_path       TEXT,
  loe_grade      TEXT CHECK (loe_grade IS NULL OR loe_grade IN ('A','B','C','D')),
  reviewed_by    UUID REFERENCES auth.users(id),
  reviewed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes          TEXT
);

CREATE INDEX IF NOT EXISTS idx_regsub_claim ON public.regulatory_substantiation (claim_id);

ALTER TABLE public.regulatory_substantiation ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_substantiation' AND policyname='regsub_read_admin') THEN
    CREATE POLICY "regsub_read_admin" ON public.regulatory_substantiation FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin','medical')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='regulatory_substantiation' AND policyname='regsub_write_compliance') THEN
    CREATE POLICY "regsub_write_compliance" ON public.regulatory_substantiation FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
END $$;
