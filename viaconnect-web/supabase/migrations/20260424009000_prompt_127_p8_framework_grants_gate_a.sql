-- =============================================================================
-- Prompt #127 P8: Framework-scoped auditor grants + Gate A sign-off
-- =============================================================================
-- Two additive changes:
--
--   1. ALTER soc2_auditor_grants ADD COLUMN framework_id. Defaults to 'soc2'
--      so every existing row remains valid; new grants can be scoped to
--      HIPAA or ISO once those packet tables exist.
--
--   2. CREATE TABLE compliance_gate_a_signoffs with the polymorphic
--      gate_signoff shape (one row per subject, latest wins). For Gate A:
--        gate_key       = 'p127_gate_a'
--        subject_type   = 'framework'
--        subject_id     = framework_id
--        signoff_status = 'signed'
--        metadata       = { attestor_role, signed_name, registry_version,
--                           scope_summary, outstanding_flags_*,
--                           previous_signers[] }
--      Route /api/compliance/gate-a/sign upserts on
--      (framework_id, gate_key, subject_type, subject_id).
-- =============================================================================

ALTER TABLE public.soc2_auditor_grants
  ADD COLUMN IF NOT EXISTS framework_id text NOT NULL DEFAULT 'soc2'
  REFERENCES public.compliance_frameworks(id);

CREATE INDEX IF NOT EXISTS idx_soc2_auditor_grants_framework
  ON public.soc2_auditor_grants (framework_id) WHERE revoked = false;

COMMENT ON COLUMN public.soc2_auditor_grants.framework_id IS
  'Prompt #127 P8: framework this grant scopes to. Defaults to soc2 for backward compat. Auditors can hold grants for multiple frameworks (one row per framework).';

CREATE TABLE IF NOT EXISTS public.compliance_gate_a_signoffs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id      text NOT NULL REFERENCES public.compliance_frameworks(id),
  gate_key          text NOT NULL,
  subject_type      text NOT NULL,
  subject_id        text NOT NULL,
  signoff_status    text NOT NULL DEFAULT 'signed',
  signed_by         uuid NOT NULL REFERENCES auth.users(id),
  signed_at         timestamptz NOT NULL DEFAULT now(),
  note              text,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (framework_id, gate_key, subject_type, subject_id)
);

COMMENT ON TABLE public.compliance_gate_a_signoffs IS
  'Prompt #127 P8: polymorphic gate sign-off table. Gate A uses gate_key=p127_gate_a, subject_type=framework, subject_id=framework_id; attestor_role lives in metadata. Latest signer wins via UPSERT; prior signers preserved in metadata.previous_signers.';

CREATE INDEX IF NOT EXISTS idx_compliance_gate_a_signoffs_signed_by
  ON public.compliance_gate_a_signoffs (signed_by);
CREATE INDEX IF NOT EXISTS idx_gate_a_framework_subject
  ON public.compliance_gate_a_signoffs (framework_id, subject_type, subject_id);

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.compliance_gate_a_signoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gate_a_iso_admin_select ON public.compliance_gate_a_signoffs;
CREATE POLICY gate_a_iso_admin_select ON public.compliance_gate_a_signoffs
  FOR SELECT TO authenticated
  USING (public.is_iso_admin());

DROP POLICY IF EXISTS gate_a_iso_admin_insert ON public.compliance_gate_a_signoffs;
CREATE POLICY gate_a_iso_admin_insert ON public.compliance_gate_a_signoffs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_iso_admin() AND signed_by = auth.uid());

DROP POLICY IF EXISTS gate_a_iso_admin_update ON public.compliance_gate_a_signoffs;
CREATE POLICY gate_a_iso_admin_update ON public.compliance_gate_a_signoffs
  FOR UPDATE TO authenticated
  USING (public.is_iso_admin())
  WITH CHECK (public.is_iso_admin());

DROP POLICY IF EXISTS gate_a_iso_admin_delete ON public.compliance_gate_a_signoffs;
CREATE POLICY gate_a_iso_admin_delete ON public.compliance_gate_a_signoffs
  FOR DELETE TO authenticated
  USING (public.is_iso_admin());
