-- =============================================================================
-- Prompt #114 P1: Customs — RLS policies
-- =============================================================================
-- Clones the #104 inline-EXISTS pattern from 20260423000060_legal_rls.sql.
--
-- Role mapping (Q1 locked 2026-04-23 — use 'compliance_officer', NOT 'compliance'):
--   - admin + compliance_officer + legal_ops = broad legal-ops read/write
--   - cfo + ceo = read on engagements/settlements/fees + moiety
--   - medical_director = NO customs access (medical claims only)
--   - practitioner/patient = NO customs access
--   - external counsel = case-scoped read + write ONLY on customs_counsel_reviews,
--     gated by legal_privilege_grants (same pattern as #104 privileged comms)
--
-- Q6 locked: customs_moiety_claims access narrowed to admin + ceo + cfo only.
--   Legal_ops and compliance_officer do NOT have read access (§ 1619 reward intel).
--
-- Avoid mixed-cmd policy pairs per performance-advisor. Where role
-- differentiation is needed between read and write, split into
-- FOR SELECT / FOR INSERT / FOR UPDATE rather than FOR ALL + sibling.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS on all 14 customs_* tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.customs_recordations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_recordation_classes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_fee_ledger              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_detentions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_detention_images        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_seizures                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_fines_imposed           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_e_allegations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_moiety_claims           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_authentication_guides   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_guide_sections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_trainings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_iprs_scan_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_counsel_reviews         ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- customs_recordations (split: legal_ops full + cfo/ceo read)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customs_recordations_legal_ops_all ON public.customs_recordations;
CREATE POLICY customs_recordations_legal_ops_all ON public.customs_recordations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops','ceo')));

DROP POLICY IF EXISTS customs_recordations_cfo_ceo_read ON public.customs_recordations;
CREATE POLICY customs_recordations_cfo_ceo_read ON public.customs_recordations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('cfo','ceo')));

-- ---------------------------------------------------------------------------
-- customs_recordation_classes
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customs_recordation_classes_legal_ops_all ON public.customs_recordation_classes;
CREATE POLICY customs_recordation_classes_legal_ops_all ON public.customs_recordation_classes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

DROP POLICY IF EXISTS customs_recordation_classes_cfo_ceo_read ON public.customs_recordation_classes;
CREATE POLICY customs_recordation_classes_cfo_ceo_read ON public.customs_recordation_classes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('cfo','ceo')));

-- ---------------------------------------------------------------------------
-- customs_fee_ledger (cfo can write; legal_ops can read)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customs_fee_ledger_read_authorised ON public.customs_fee_ledger;
CREATE POLICY customs_fee_ledger_read_authorised ON public.customs_fee_ledger FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops','cfo','ceo')));

DROP POLICY IF EXISTS customs_fee_ledger_insert_cfo ON public.customs_fee_ledger;
CREATE POLICY customs_fee_ledger_insert_cfo ON public.customs_fee_ledger FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','cfo')));

DROP POLICY IF EXISTS customs_fee_ledger_update_cfo ON public.customs_fee_ledger;
CREATE POLICY customs_fee_ledger_update_cfo ON public.customs_fee_ledger FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','cfo')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','cfo')));

-- ---------------------------------------------------------------------------
-- customs_detentions (statute-critical; legal_ops full)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customs_detentions_legal_ops_all ON public.customs_detentions;
CREATE POLICY customs_detentions_legal_ops_all ON public.customs_detentions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

-- ---------------------------------------------------------------------------
-- customs_detention_images (SHA-256 chain of custody — legal_ops full)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customs_detention_images_legal_ops_all ON public.customs_detention_images;
CREATE POLICY customs_detention_images_legal_ops_all ON public.customs_detention_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

-- ---------------------------------------------------------------------------
-- customs_seizures
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customs_seizures_legal_ops_all ON public.customs_seizures;
CREATE POLICY customs_seizures_legal_ops_all ON public.customs_seizures FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

DROP POLICY IF EXISTS customs_seizures_cfo_ceo_read ON public.customs_seizures;
CREATE POLICY customs_seizures_cfo_ceo_read ON public.customs_seizures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('cfo','ceo')));

-- ---------------------------------------------------------------------------
-- customs_fines_imposed (cfo writes; legal_ops + ceo read)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customs_fines_read_authorised ON public.customs_fines_imposed;
CREATE POLICY customs_fines_read_authorised ON public.customs_fines_imposed FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops','cfo','ceo')));

DROP POLICY IF EXISTS customs_fines_insert_cfo ON public.customs_fines_imposed;
CREATE POLICY customs_fines_insert_cfo ON public.customs_fines_imposed FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','cfo')));

DROP POLICY IF EXISTS customs_fines_update_cfo ON public.customs_fines_imposed;
CREATE POLICY customs_fines_update_cfo ON public.customs_fines_imposed FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','cfo')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','cfo')));

-- ---------------------------------------------------------------------------
-- customs_e_allegations
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customs_e_allegations_legal_ops_all ON public.customs_e_allegations;
CREATE POLICY customs_e_allegations_legal_ops_all ON public.customs_e_allegations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

-- ---------------------------------------------------------------------------
-- customs_moiety_claims (Q6 locked: admin + ceo + cfo ONLY)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customs_moiety_exec_only ON public.customs_moiety_claims;
CREATE POLICY customs_moiety_exec_only ON public.customs_moiety_claims FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','ceo','cfo')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','ceo','cfo')));

-- ---------------------------------------------------------------------------
-- customs_authentication_guides
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customs_guides_legal_ops_all ON public.customs_authentication_guides;
CREATE POLICY customs_guides_legal_ops_all ON public.customs_authentication_guides FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

-- ---------------------------------------------------------------------------
-- customs_guide_sections
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customs_guide_sections_legal_ops_all ON public.customs_guide_sections;
CREATE POLICY customs_guide_sections_legal_ops_all ON public.customs_guide_sections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

-- ---------------------------------------------------------------------------
-- customs_trainings
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customs_trainings_legal_ops_all ON public.customs_trainings;
CREATE POLICY customs_trainings_legal_ops_all ON public.customs_trainings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

-- ---------------------------------------------------------------------------
-- customs_iprs_scan_results (service_role INSERTs from edge function;
-- legal_ops full read/write through SECURITY INVOKER)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customs_iprs_legal_ops_all ON public.customs_iprs_scan_results;
CREATE POLICY customs_iprs_legal_ops_all ON public.customs_iprs_scan_results FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

-- Note: service_role bypasses RLS; iprs_daily_scan edge function uses
-- the service_role key so its INSERTs are not blocked by these policies.
-- See 20260424000240 for edge function credential notes.

-- ---------------------------------------------------------------------------
-- customs_counsel_reviews
-- Reads: legal_ops + counsel (case-scoped via legal_privilege_grants) + admin
-- Writes: legal_ops open requests; counsel (grant-scoped) decide
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customs_counsel_reviews_read_scoped ON public.customs_counsel_reviews;
CREATE POLICY customs_counsel_reviews_read_scoped ON public.customs_counsel_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
             AND role IN ('admin','compliance_officer','legal_ops'))
    OR (
      customs_counsel_reviews.case_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.legal_privilege_grants g
        WHERE g.user_id = auth.uid()
          AND g.case_id = customs_counsel_reviews.case_id
          AND g.active = TRUE
      )
    )
  );

DROP POLICY IF EXISTS customs_counsel_reviews_insert_legal_ops ON public.customs_counsel_reviews;
CREATE POLICY customs_counsel_reviews_insert_legal_ops ON public.customs_counsel_reviews FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

DROP POLICY IF EXISTS customs_counsel_reviews_update_decide ON public.customs_counsel_reviews;
CREATE POLICY customs_counsel_reviews_update_decide ON public.customs_counsel_reviews FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (
      customs_counsel_reviews.case_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.legal_privilege_grants g
        WHERE g.user_id = auth.uid()
          AND g.case_id = customs_counsel_reviews.case_id
          AND g.active = TRUE
      )
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (
      customs_counsel_reviews.case_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.legal_privilege_grants g
        WHERE g.user_id = auth.uid()
          AND g.case_id = customs_counsel_reviews.case_id
          AND g.active = TRUE
      )
    )
  );

-- =============================================================================
-- End of 20260424000220_prompt_114_customs_rls.sql
-- =============================================================================
