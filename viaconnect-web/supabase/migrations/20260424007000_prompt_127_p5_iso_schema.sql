-- =============================================================================
-- Prompt #127 P5: ISO/IEC 27001:2022 schema
-- =============================================================================
-- Seven tables backing the ISO 27001 certification-audit evidence surface.
-- The Statement of Applicability drives every Annex A narrator decision;
-- the risk register drives Clauses 6.1 / 8.2 / 8.3; internal audits and
-- management reviews drive Clauses 9.2 / 9.3; nonconformities drive 10.2;
-- ISMS scope documents drive Clause 4.3.
--
-- All tables follow the #122 / #127 P3 RLS pattern:
--   - SELECT gated by is_compliance_reader()
--   - INSERT gated by is_iso_admin() AND self-attribution where a row has
--     an owner / recorded_by column
--   - UPDATE gated by is_iso_admin() for lifecycle operations (SoA
--     approval, risk closure, NC closure, management-review sign-off)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. iso_statements_of_applicability — Annex A SoA per-control determination
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.iso_statements_of_applicability (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_ref               text NOT NULL,
  version                   int NOT NULL,
  applicability             text NOT NULL CHECK (applicability IN ('applicable','excluded')),
  justification             text NOT NULL,
  implementation_status     text NOT NULL CHECK (implementation_status IN (
                              'implemented','in_progress','planned','not_applicable'
                            )),
  responsible_party         uuid REFERENCES auth.users(id),
  effective_from            date NOT NULL,
  effective_until           date,
  approved_by               uuid REFERENCES auth.users(id),
  approved_at               timestamptz,
  recorded_by               uuid NOT NULL REFERENCES auth.users(id),
  recorded_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (control_ref, version)
);

CREATE INDEX IF NOT EXISTS idx_iso_soa_control
  ON public.iso_statements_of_applicability (control_ref);
CREATE INDEX IF NOT EXISTS idx_iso_soa_effective
  ON public.iso_statements_of_applicability (effective_until) WHERE approved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_iso_soa_applicability
  ON public.iso_statements_of_applicability (applicability);
CREATE INDEX IF NOT EXISTS idx_iso_soa_recorded_by
  ON public.iso_statements_of_applicability (recorded_by);
CREATE INDEX IF NOT EXISTS idx_iso_soa_approved_by
  ON public.iso_statements_of_applicability (approved_by) WHERE approved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_iso_soa_responsible
  ON public.iso_statements_of_applicability (responsible_party) WHERE responsible_party IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. iso_risk_register — Clause 6.1 / 8.2 risk inventory
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.iso_risk_register (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_ref                text NOT NULL UNIQUE, -- human-readable id e.g. R-2026-001
  asset                   text,
  threat                  text NOT NULL,
  vulnerability           text NOT NULL,
  description             text NOT NULL,
  likelihood              int NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  impact                  int NOT NULL CHECK (impact BETWEEN 1 AND 5),
  inherent_risk           int GENERATED ALWAYS AS (likelihood * impact) STORED,
  treatment_option        text NOT NULL CHECK (treatment_option IN (
                            'modify','retain','avoid','share'
                          )),
  residual_likelihood     int CHECK (residual_likelihood BETWEEN 1 AND 5),
  residual_impact         int CHECK (residual_impact BETWEEN 1 AND 5),
  residual_risk           int GENERATED ALWAYS AS (residual_likelihood * residual_impact) STORED,
  owner                   uuid REFERENCES auth.users(id),
  status                  text NOT NULL CHECK (status IN (
                            'open','treated','accepted','closed','superseded'
                          )),
  identified_at           date NOT NULL,
  last_reviewed_at        date,
  next_review_date        date,
  recorded_by             uuid NOT NULL REFERENCES auth.users(id),
  recorded_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iso_risk_status
  ON public.iso_risk_register (status, identified_at DESC);
CREATE INDEX IF NOT EXISTS idx_iso_risk_owner
  ON public.iso_risk_register (owner) WHERE owner IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_iso_risk_review
  ON public.iso_risk_register (next_review_date) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_iso_risk_recorded_by
  ON public.iso_risk_register (recorded_by);

-- ---------------------------------------------------------------------------
-- 3. iso_risk_treatments — Clause 6.1.3 / 8.3 treatment actions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.iso_risk_treatments (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id                 uuid NOT NULL REFERENCES public.iso_risk_register(id) ON DELETE CASCADE,
  treatment_description   text NOT NULL,
  control_refs            jsonb NOT NULL DEFAULT '[]'::jsonb, -- array of Annex A refs, e.g., ["A.8.15","A.8.16"]
  planned_completion      date NOT NULL,
  actual_completion       date,
  status                  text NOT NULL CHECK (status IN (
                            'planned','in_progress','completed','deferred','cancelled'
                          )),
  responsible_party       uuid REFERENCES auth.users(id),
  recorded_by             uuid NOT NULL REFERENCES auth.users(id),
  recorded_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iso_risk_treat_risk
  ON public.iso_risk_treatments (risk_id);
CREATE INDEX IF NOT EXISTS idx_iso_risk_treat_status
  ON public.iso_risk_treatments (status, planned_completion);
CREATE INDEX IF NOT EXISTS idx_iso_risk_treat_party
  ON public.iso_risk_treatments (responsible_party) WHERE responsible_party IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_iso_risk_treat_recorded_by
  ON public.iso_risk_treatments (recorded_by);

-- ---------------------------------------------------------------------------
-- 4. iso_internal_audits — Clause 9.2 internal audit records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.iso_internal_audits (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_ref               text NOT NULL UNIQUE,
  audit_date              date NOT NULL,
  scope                   text NOT NULL,
  auditor                 text NOT NULL,
  auditor_is_independent  boolean NOT NULL DEFAULT true,
  major_findings_count    int NOT NULL DEFAULT 0 CHECK (major_findings_count >= 0),
  minor_findings_count    int NOT NULL DEFAULT 0 CHECK (minor_findings_count >= 0),
  observations_count      int NOT NULL DEFAULT 0 CHECK (observations_count >= 0),
  summary                 text NOT NULL,
  storage_key             text,
  recorded_by             uuid NOT NULL REFERENCES auth.users(id),
  recorded_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iso_internal_audits_date
  ON public.iso_internal_audits (audit_date DESC);
CREATE INDEX IF NOT EXISTS idx_iso_internal_audits_recorded_by
  ON public.iso_internal_audits (recorded_by);

-- ---------------------------------------------------------------------------
-- 5. iso_management_reviews — Clause 9.3 management review records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.iso_management_reviews (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_date             date NOT NULL,
  attendees               text NOT NULL,
  inputs_summary          text NOT NULL,
  decisions               jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_items            jsonb NOT NULL DEFAULT '[]'::jsonb,
  storage_key             text,
  signed_off_by           uuid REFERENCES auth.users(id),
  signed_off_at           timestamptz,
  recorded_by             uuid NOT NULL REFERENCES auth.users(id),
  recorded_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iso_mgmt_review_date
  ON public.iso_management_reviews (review_date DESC);
CREATE INDEX IF NOT EXISTS idx_iso_mgmt_review_signed
  ON public.iso_management_reviews (review_date DESC) WHERE signed_off_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_iso_mgmt_review_recorded_by
  ON public.iso_management_reviews (recorded_by);
CREATE INDEX IF NOT EXISTS idx_iso_mgmt_review_signed_by
  ON public.iso_management_reviews (signed_off_by) WHERE signed_off_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. iso_nonconformities — Clause 10.2 nonconformity and corrective action log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.iso_nonconformities (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_ref                  text NOT NULL UNIQUE,
  source                  text NOT NULL CHECK (source IN (
                            'internal_audit','external_audit','incident',
                            'management_review','risk_review','other'
                          )),
  source_ref              text,
  description             text NOT NULL,
  severity                text NOT NULL CHECK (severity IN ('major','minor','observation')),
  root_cause              text,
  corrective_action       text,
  target_date             date,
  actual_closure_date     date,
  status                  text NOT NULL CHECK (status IN (
                            'open','root_cause_analysis','action_planned','in_progress','closed','verified'
                          )),
  owner                   uuid REFERENCES auth.users(id),
  verified_by             uuid REFERENCES auth.users(id),
  verified_at             timestamptz,
  recorded_by             uuid NOT NULL REFERENCES auth.users(id),
  recorded_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iso_nc_status
  ON public.iso_nonconformities (status, severity, target_date);
CREATE INDEX IF NOT EXISTS idx_iso_nc_source
  ON public.iso_nonconformities (source, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_iso_nc_open
  ON public.iso_nonconformities (target_date) WHERE status NOT IN ('closed','verified');
CREATE INDEX IF NOT EXISTS idx_iso_nc_owner
  ON public.iso_nonconformities (owner) WHERE owner IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_iso_nc_recorded_by
  ON public.iso_nonconformities (recorded_by);
CREATE INDEX IF NOT EXISTS idx_iso_nc_verified_by
  ON public.iso_nonconformities (verified_by) WHERE verified_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 7. iso_isms_scope_documents — Clause 4.3 ISMS scope
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.iso_isms_scope_documents (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version                 int NOT NULL UNIQUE,
  scope_description       text NOT NULL,
  included_boundaries     jsonb NOT NULL DEFAULT '[]'::jsonb,
  exclusions              jsonb NOT NULL DEFAULT '[]'::jsonb,
  effective_from          date NOT NULL,
  effective_until         date,
  storage_key             text,
  approved_by             uuid REFERENCES auth.users(id),
  approved_at             timestamptz,
  recorded_by             uuid NOT NULL REFERENCES auth.users(id),
  recorded_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iso_scope_effective
  ON public.iso_isms_scope_documents (effective_until) WHERE approved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_iso_scope_approved_by
  ON public.iso_isms_scope_documents (approved_by) WHERE approved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_iso_scope_recorded_by
  ON public.iso_isms_scope_documents (recorded_by);

-- =============================================================================
-- is_iso_admin helper
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_iso_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','superadmin','compliance_admin','compliance_officer')
  );
$$;

COMMENT ON FUNCTION public.is_iso_admin() IS
  'Prompt #127 P5: gate for ISO 27001 evidence writes. Mirrors is_compliance_reader() and is_hipaa_admin() role set. The ISMS Manager role signs off on management reviews; broader admin set can record evidence.';

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE public.iso_statements_of_applicability  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iso_risk_register                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iso_risk_treatments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iso_internal_audits              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iso_management_reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iso_nonconformities              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iso_isms_scope_documents         ENABLE ROW LEVEL SECURITY;

-- Read policies
DROP POLICY IF EXISTS iso_soa_read ON public.iso_statements_of_applicability;
CREATE POLICY iso_soa_read ON public.iso_statements_of_applicability
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

DROP POLICY IF EXISTS iso_risk_read ON public.iso_risk_register;
CREATE POLICY iso_risk_read ON public.iso_risk_register
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

DROP POLICY IF EXISTS iso_risk_treat_read ON public.iso_risk_treatments;
CREATE POLICY iso_risk_treat_read ON public.iso_risk_treatments
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

DROP POLICY IF EXISTS iso_internal_audits_read ON public.iso_internal_audits;
CREATE POLICY iso_internal_audits_read ON public.iso_internal_audits
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

DROP POLICY IF EXISTS iso_mgmt_review_read ON public.iso_management_reviews;
CREATE POLICY iso_mgmt_review_read ON public.iso_management_reviews
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

DROP POLICY IF EXISTS iso_nc_read ON public.iso_nonconformities;
CREATE POLICY iso_nc_read ON public.iso_nonconformities
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

DROP POLICY IF EXISTS iso_scope_read ON public.iso_isms_scope_documents;
CREATE POLICY iso_scope_read ON public.iso_isms_scope_documents
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

-- Write policies (admin + self-attribution)
DROP POLICY IF EXISTS iso_soa_insert ON public.iso_statements_of_applicability;
CREATE POLICY iso_soa_insert ON public.iso_statements_of_applicability
  FOR INSERT TO authenticated
  WITH CHECK (public.is_iso_admin() AND recorded_by = auth.uid());

DROP POLICY IF EXISTS iso_soa_update ON public.iso_statements_of_applicability;
CREATE POLICY iso_soa_update ON public.iso_statements_of_applicability
  FOR UPDATE TO authenticated
  USING (public.is_iso_admin()) WITH CHECK (public.is_iso_admin());

DROP POLICY IF EXISTS iso_risk_insert ON public.iso_risk_register;
CREATE POLICY iso_risk_insert ON public.iso_risk_register
  FOR INSERT TO authenticated
  WITH CHECK (public.is_iso_admin() AND recorded_by = auth.uid());

DROP POLICY IF EXISTS iso_risk_update ON public.iso_risk_register;
CREATE POLICY iso_risk_update ON public.iso_risk_register
  FOR UPDATE TO authenticated
  USING (public.is_iso_admin()) WITH CHECK (public.is_iso_admin());

DROP POLICY IF EXISTS iso_risk_treat_insert ON public.iso_risk_treatments;
CREATE POLICY iso_risk_treat_insert ON public.iso_risk_treatments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_iso_admin() AND recorded_by = auth.uid());

DROP POLICY IF EXISTS iso_risk_treat_update ON public.iso_risk_treatments;
CREATE POLICY iso_risk_treat_update ON public.iso_risk_treatments
  FOR UPDATE TO authenticated
  USING (public.is_iso_admin()) WITH CHECK (public.is_iso_admin());

DROP POLICY IF EXISTS iso_internal_audits_insert ON public.iso_internal_audits;
CREATE POLICY iso_internal_audits_insert ON public.iso_internal_audits
  FOR INSERT TO authenticated
  WITH CHECK (public.is_iso_admin() AND recorded_by = auth.uid());

DROP POLICY IF EXISTS iso_mgmt_review_insert ON public.iso_management_reviews;
CREATE POLICY iso_mgmt_review_insert ON public.iso_management_reviews
  FOR INSERT TO authenticated
  WITH CHECK (public.is_iso_admin() AND recorded_by = auth.uid());

DROP POLICY IF EXISTS iso_mgmt_review_signoff ON public.iso_management_reviews;
CREATE POLICY iso_mgmt_review_signoff ON public.iso_management_reviews
  FOR UPDATE TO authenticated
  USING (public.is_iso_admin()) WITH CHECK (public.is_iso_admin());

DROP POLICY IF EXISTS iso_nc_insert ON public.iso_nonconformities;
CREATE POLICY iso_nc_insert ON public.iso_nonconformities
  FOR INSERT TO authenticated
  WITH CHECK (public.is_iso_admin() AND recorded_by = auth.uid());

DROP POLICY IF EXISTS iso_nc_update ON public.iso_nonconformities;
CREATE POLICY iso_nc_update ON public.iso_nonconformities
  FOR UPDATE TO authenticated
  USING (public.is_iso_admin()) WITH CHECK (public.is_iso_admin());

DROP POLICY IF EXISTS iso_scope_insert ON public.iso_isms_scope_documents;
CREATE POLICY iso_scope_insert ON public.iso_isms_scope_documents
  FOR INSERT TO authenticated
  WITH CHECK (public.is_iso_admin() AND recorded_by = auth.uid());

DROP POLICY IF EXISTS iso_scope_update ON public.iso_isms_scope_documents;
CREATE POLICY iso_scope_update ON public.iso_isms_scope_documents
  FOR UPDATE TO authenticated
  USING (public.is_iso_admin()) WITH CHECK (public.is_iso_admin());
