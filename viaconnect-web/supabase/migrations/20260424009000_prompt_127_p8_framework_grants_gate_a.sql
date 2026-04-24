-- =============================================================================
-- Prompt #127 P8: Framework-scoped auditor grants + Gate A sign-off
-- =============================================================================
-- Two additive changes:
--
--   1. ALTER soc2_auditor_grants ADD COLUMN framework_id. Defaults to 'soc2'
--      so every existing row remains valid; new grants can be scoped to
--      HIPAA (or ISO once P5 is re-applied).
--
--   2. CREATE TABLE compliance_gate_a_signoffs. The #127 initiative ships
--      once all populated framework role-holders sign off. Each sign-off
--      is one row; supersede via the supersede-then-insert pattern in
--      /api/compliance/gate-a/sign. The UNIQUE partial index below turns
--      a lost race into a 23505 that the client retries, rather than two
--      active rows for the same (framework, role).
-- =============================================================================

ALTER TABLE public.soc2_auditor_grants
  ADD COLUMN IF NOT EXISTS framework_id text NOT NULL DEFAULT 'soc2'
  REFERENCES public.compliance_frameworks(id);

CREATE INDEX IF NOT EXISTS idx_soc2_auditor_grants_framework
  ON public.soc2_auditor_grants (framework_id) WHERE revoked = false;

COMMENT ON COLUMN public.soc2_auditor_grants.framework_id IS
  'Prompt #127 P8: framework this grant scopes to. Defaults to soc2 for backward compat. Auditors can hold grants for multiple frameworks (one row per framework).';

CREATE TABLE IF NOT EXISTS public.compliance_gate_a_signoffs (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id               text NOT NULL REFERENCES public.compliance_frameworks(id),
  attestor_role              text NOT NULL
                              CHECK (attestor_role IN ('compliance_officer','security_officer','isms_manager')),
  signed_by                  uuid NOT NULL REFERENCES auth.users(id),
  signed_name                text NOT NULL,
  signed_at                  timestamptz NOT NULL DEFAULT now(),
  registry_version           text NOT NULL,
  scope_summary              text NOT NULL,
  outstanding_flags_critical int NOT NULL DEFAULT 0 CHECK (outstanding_flags_critical >= 0),
  outstanding_flags_warning  int NOT NULL DEFAULT 0 CHECK (outstanding_flags_warning >= 0),
  attestation_text           text NOT NULL,
  revoked                    boolean NOT NULL DEFAULT false,
  revoked_at                 timestamptz,
  revoked_by                 uuid REFERENCES auth.users(id),
  revocation_reason          text,
  created_at                 timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.compliance_gate_a_signoffs IS
  'Prompt #127 P8: Gate A ceremony record. One active row per (framework_id, attestor_role). #127 ships when every populated framework has a non-revoked row.';

-- Race-safe: at most one active sign-off per (framework, role).
-- The supersede-then-insert route relies on this so a lost race turns into
-- a 23505 the client retries instead of two active rows.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_gate_a_active
  ON public.compliance_gate_a_signoffs (framework_id, attestor_role)
  WHERE revoked = false;

CREATE INDEX IF NOT EXISTS idx_gate_a_signed_recent
  ON public.compliance_gate_a_signoffs (signed_at DESC) WHERE revoked = false;
CREATE INDEX IF NOT EXISTS idx_gate_a_signed_by
  ON public.compliance_gate_a_signoffs (signed_by);
CREATE INDEX IF NOT EXISTS idx_gate_a_revoked_by
  ON public.compliance_gate_a_signoffs (revoked_by) WHERE revoked_by IS NOT NULL;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.compliance_gate_a_signoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gate_a_read ON public.compliance_gate_a_signoffs;
CREATE POLICY gate_a_read ON public.compliance_gate_a_signoffs
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());

DROP POLICY IF EXISTS gate_a_insert ON public.compliance_gate_a_signoffs;
CREATE POLICY gate_a_insert ON public.compliance_gate_a_signoffs
  FOR INSERT TO authenticated
  WITH CHECK (
    signed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid()
        AND role IN ('admin','superadmin','compliance_admin','compliance_officer')
    )
  );

DROP POLICY IF EXISTS gate_a_revoke ON public.compliance_gate_a_signoffs;
CREATE POLICY gate_a_revoke ON public.compliance_gate_a_signoffs
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','superadmin','compliance_admin','compliance_officer')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                       AND role IN ('admin','superadmin','compliance_admin','compliance_officer')));

COMMENT ON POLICY gate_a_insert ON public.compliance_gate_a_signoffs IS
  'Compliance admins record their own sign-off (self-attribution via signed_by = auth.uid()). UNIQUE partial index uniq_gate_a_active guarantees at most one active row per (framework, role).';
