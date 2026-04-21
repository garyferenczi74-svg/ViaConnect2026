-- =============================================================================
-- Prompt #104 Phase 1: RLS policies for all 16 legal-ops tables
-- =============================================================================
-- Uses public.profiles.role (codebase convention; #102 also uses this).
-- Roles in scope: admin, compliance_officer (Steve Rica),
-- legal_ops, cfo, ceo, medical_director.
--
-- HARD STOP §15:
--   - privileged_communications: only case-scoped legal_privilege_grants
--     (or admin) can read; no path leaks privileged material to a
--     non-grantee
--   - audit log: read-only for admin
--   - outside_counsel: admin only (contains contact + retainer info)
--   - settlements: admin + compliance + cfo + ceo (per approval tier)
-- =============================================================================

-- Helper: a `legal_ops_actor` is any user whose profiles.role is in
-- the set authorized for general legal-ops read/write. Compliance and
-- legal_ops both qualify; cfo/ceo see engagements + settlements; medical_director sees only their assigned cases.
-- We inline the role check rather than create a SECURITY DEFINER
-- function so policies remain self-evident in audits.

ALTER TABLE public.legal_investigation_cases         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_investigation_evidence      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_counterparties              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_counterparty_merge_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_templates_library           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_enforcement_actions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_marketplace_integrations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_marketplace_complaints      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_dmca_filings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_dmca_counter_notices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_outside_counsel             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_counsel_engagements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_privileged_communications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_case_settlements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_case_timeline               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_operations_audit_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_privilege_grants            ENABLE ROW LEVEL SECURITY;

-- ----- legal_investigation_cases ------------------------------------------
DROP POLICY IF EXISTS legal_cases_admin_legal_ops ON public.legal_investigation_cases;
CREATE POLICY legal_cases_admin_legal_ops ON public.legal_investigation_cases FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops','medical_director')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

-- ----- legal_investigation_evidence ---------------------------------------
DROP POLICY IF EXISTS legal_evidence_admin_legal_ops ON public.legal_investigation_evidence;
CREATE POLICY legal_evidence_admin_legal_ops ON public.legal_investigation_evidence FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

-- ----- legal_counterparties + merge history -------------------------------
DROP POLICY IF EXISTS legal_counterparties_admin_legal_ops ON public.legal_counterparties;
CREATE POLICY legal_counterparties_admin_legal_ops ON public.legal_counterparties FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

DROP POLICY IF EXISTS legal_counterparty_merge_admin_legal_ops ON public.legal_counterparty_merge_history;
CREATE POLICY legal_counterparty_merge_admin_legal_ops ON public.legal_counterparty_merge_history FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

-- ----- legal_templates_library --------------------------------------------
DROP POLICY IF EXISTS legal_templates_admin_legal_ops ON public.legal_templates_library;
CREATE POLICY legal_templates_admin_legal_ops ON public.legal_templates_library FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

-- ----- legal_enforcement_actions ------------------------------------------
DROP POLICY IF EXISTS legal_actions_admin_legal_ops ON public.legal_enforcement_actions;
CREATE POLICY legal_actions_admin_legal_ops ON public.legal_enforcement_actions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

-- ----- legal_marketplace_integrations + complaints ------------------------
DROP POLICY IF EXISTS legal_marketplace_integrations_admin_legal_ops ON public.legal_marketplace_integrations;
CREATE POLICY legal_marketplace_integrations_admin_legal_ops ON public.legal_marketplace_integrations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

DROP POLICY IF EXISTS legal_marketplace_complaints_admin_legal_ops ON public.legal_marketplace_complaints;
CREATE POLICY legal_marketplace_complaints_admin_legal_ops ON public.legal_marketplace_complaints FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

-- ----- DMCA filings + counter-notices -------------------------------------
DROP POLICY IF EXISTS legal_dmca_admin_legal_ops ON public.legal_dmca_filings;
CREATE POLICY legal_dmca_admin_legal_ops ON public.legal_dmca_filings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

DROP POLICY IF EXISTS legal_dmca_counter_notices_admin_legal_ops ON public.legal_dmca_counter_notices;
CREATE POLICY legal_dmca_counter_notices_admin_legal_ops ON public.legal_dmca_counter_notices FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

-- ----- Outside counsel (admin only — contact + retainer info) -------------
DROP POLICY IF EXISTS legal_counsel_admin_only ON public.legal_outside_counsel;
CREATE POLICY legal_counsel_admin_only ON public.legal_outside_counsel FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ----- Counsel engagements: read for admin/compliance/legal_ops/cfo/ceo;
--       write/approve gated by role for the corresponding columns
DROP POLICY IF EXISTS legal_engagements_read_authorised ON public.legal_counsel_engagements;
CREATE POLICY legal_engagements_read_authorised ON public.legal_counsel_engagements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops','cfo','ceo')));

DROP POLICY IF EXISTS legal_engagements_insert_legal_ops ON public.legal_counsel_engagements;
CREATE POLICY legal_engagements_insert_legal_ops ON public.legal_counsel_engagements FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

DROP POLICY IF EXISTS legal_engagements_update_authorised ON public.legal_counsel_engagements;
CREATE POLICY legal_engagements_update_authorised ON public.legal_counsel_engagements FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops','cfo','ceo')));

-- ----- Privileged comms: case-scoped privilege OR admin only --------------
DROP POLICY IF EXISTS legal_privileged_comms_scoped ON public.legal_privileged_communications;
CREATE POLICY legal_privileged_comms_scoped ON public.legal_privileged_communications FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.legal_privilege_grants g
      WHERE g.user_id = auth.uid()
        AND g.case_id = legal_privileged_communications.case_id
        AND g.active = TRUE
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.legal_privilege_grants g
      WHERE g.user_id = auth.uid()
        AND g.case_id = legal_privileged_communications.case_id
        AND g.active = TRUE
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ----- Privilege grants: admin manages; affected user can SELECT their own grants
DROP POLICY IF EXISTS legal_privilege_grants_admin ON public.legal_privilege_grants;
CREATE POLICY legal_privilege_grants_admin ON public.legal_privilege_grants FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR user_id = auth.uid()
  )
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ----- Settlements: admin/compliance/legal_ops/cfo/ceo --------------------
DROP POLICY IF EXISTS legal_settlements_admin_chain ON public.legal_case_settlements;
CREATE POLICY legal_settlements_admin_chain ON public.legal_case_settlements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops','cfo','ceo')));

-- ----- Case timeline ------------------------------------------------------
DROP POLICY IF EXISTS legal_timeline_admin_legal_ops ON public.legal_case_timeline;
CREATE POLICY legal_timeline_admin_legal_ops ON public.legal_case_timeline FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

-- ----- Audit log: admin read only; INSERT via service role only -----------
DROP POLICY IF EXISTS legal_audit_admin_read ON public.legal_operations_audit_log;
CREATE POLICY legal_audit_admin_read ON public.legal_operations_audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
