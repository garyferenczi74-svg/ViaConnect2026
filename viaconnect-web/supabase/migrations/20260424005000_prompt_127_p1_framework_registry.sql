-- =============================================================================
-- Prompt #127 P1: Framework registry foundation
-- =============================================================================
-- Adds three new tables that extend the #122 SOC 2 pipeline into a
-- multi-framework pipeline (SOC 2 + HIPAA + ISO 27001). Strictly additive:
--   - soc2_packets stays. RLS stays. Existing signed packets continue to
--     verify unchanged.
--   - framework_packets is a new table that will become the canonical place
--     to write packets in P2. Until P2, nothing writes here; the table
--     exists for the byte-diff test harness to read in parallel.
--   - compliance_frameworks is the seed list of framework IDs, populated
--     with the 3 definitions. Narrator / assembler code reads this at
--     runtime to resolve attestation language + role names.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. compliance_frameworks — seed table for the 3 framework IDs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.compliance_frameworks (
  id                    text PRIMARY KEY
                         CHECK (id IN ('soc2','hipaa_security','iso_27001_2022')),
  display_name          text NOT NULL,
  registry_version      text NOT NULL,
  attestation_language  text NOT NULL,
  attestor_role         text NOT NULL
                         CHECK (attestor_role IN ('compliance_officer','security_officer','isms_manager')),
  active                boolean NOT NULL DEFAULT true,
  first_introduced_at   timestamptz NOT NULL DEFAULT now(),
  notes                 text
);

COMMENT ON TABLE public.compliance_frameworks IS
  'Prompt #127 P1: registry of active compliance frameworks. Registry details live in code at lib/compliance/frameworks/definitions/*; this table holds attestation-facing strings.';

INSERT INTO public.compliance_frameworks (id, display_name, registry_version, attestation_language, attestor_role, notes) VALUES
  ('soc2',             'SOC 2 Type II',
   'v1.0.0',
   'I, the undersigned Compliance Officer of FarmCeutica Wellness LLC, attest that the foregoing descriptions accurately describe FarmCeutica''s design and operation of the identified controls during the period specified, and that the supporting evidence has been collected using the documented methodology.',
   'compliance_officer',
   'Active since #122. Packets at /admin/compliance/soc2.'),
  ('hipaa_security',   'HIPAA Security Rule (45 CFR 164.302-318)',
   'v1.0.0',
   'I, the undersigned Security Officer of FarmCeutica Wellness LLC as designated under 45 CFR 164.308(a)(2), attest that the foregoing safeguard descriptions accurately describe FarmCeutica''s implementation of the identified HIPAA Security Rule safeguards during the period specified.',
   'security_officer',
   'Activated in P3; stub definition present from P1.'),
  ('iso_27001_2022',   'ISO/IEC 27001:2022',
   'v1.0.0',
   'I, the undersigned ISMS Manager of FarmCeutica Wellness LLC, attest that the foregoing descriptions accurately describe FarmCeutica''s implementation and effectiveness of the identified ISO/IEC 27001:2022 controls during the period specified.',
   'isms_manager',
   'Activated in P5; stub definition present from P1.')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. framework_packets — canonical packet ledger (additive to soc2_packets)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.framework_packets (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id               text NOT NULL REFERENCES public.compliance_frameworks(id),
  packet_uuid                text NOT NULL UNIQUE,
  period_start               timestamptz NOT NULL,
  period_end                 timestamptz NOT NULL,
  scope_declaration          jsonb NOT NULL,
  generated_at               timestamptz NOT NULL DEFAULT now(),
  generated_by               text NOT NULL,
  framework_registry_version text NOT NULL,
  root_hash                  text NOT NULL,
  signing_key_id             text NOT NULL,
  signature_jwt              text NOT NULL,
  storage_key                text NOT NULL,
  storage_sha256             text NOT NULL,
  size_bytes                 bigint NOT NULL,
  legal_hold                 boolean NOT NULL DEFAULT false,
  retention_until            date NOT NULL,
  status                     text NOT NULL DEFAULT 'generating'
                              CHECK (status IN ('generating','generated','published','superseded','retired')),
  superseded_by              uuid REFERENCES public.framework_packets(id),
  legacy_soc2_packet_id      uuid REFERENCES public.soc2_packets(id),
  CONSTRAINT framework_packets_period_ordered CHECK (period_end > period_start)
);

CREATE INDEX IF NOT EXISTS idx_framework_packets_framework_period
  ON public.framework_packets (framework_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_framework_packets_status
  ON public.framework_packets (status, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_framework_packets_superseded_by
  ON public.framework_packets (superseded_by)
  WHERE superseded_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_framework_packets_legacy
  ON public.framework_packets (legacy_soc2_packet_id)
  WHERE legacy_soc2_packet_id IS NOT NULL;

COMMENT ON TABLE public.framework_packets IS
  'Prompt #127 P1: canonical multi-framework packet ledger. P2 routes writes here; soc2_packets stays for existing-packet lookup (backward compat).';

-- ---------------------------------------------------------------------------
-- 3. framework_consistency_flags — cross-framework inconsistency signals
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.framework_consistency_flags (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id             uuid NOT NULL REFERENCES public.framework_packets(id) ON DELETE CASCADE,
  other_packet_id       uuid REFERENCES public.framework_packets(id),
  shared_evidence_path  text NOT NULL,
  inconsistency_kind    text NOT NULL CHECK (inconsistency_kind IN (
                          'narrative_contradiction','count_mismatch','date_mismatch',
                          'outcome_characterization_mismatch','other'
                        )),
  description           text NOT NULL,
  severity              text NOT NULL CHECK (severity IN ('info','warning','critical')),
  resolved_by           uuid REFERENCES auth.users(id),
  resolved_at           timestamptz,
  resolution_note       text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consistency_packet_open
  ON public.framework_consistency_flags (packet_id)
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_consistency_other_packet
  ON public.framework_consistency_flags (other_packet_id)
  WHERE other_packet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consistency_resolved_by
  ON public.framework_consistency_flags (resolved_by)
  WHERE resolved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consistency_severity_open
  ON public.framework_consistency_flags (severity, created_at DESC)
  WHERE resolved_at IS NULL;

COMMENT ON TABLE public.framework_consistency_flags IS
  'Prompt #127 P1: cross-framework inconsistency flags raised at packet sign time. Critical unresolved flags block signing (P7 checker enforces).';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.compliance_frameworks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.framework_packets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.framework_consistency_flags     ENABLE ROW LEVEL SECURITY;

-- Frameworks table: compliance readers can SELECT; no INSERT/UPDATE/DELETE
-- policies = effectively read-only for authenticated. Seed rows stay locked.
DROP POLICY IF EXISTS cf_read ON public.compliance_frameworks;
CREATE POLICY cf_read ON public.compliance_frameworks
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());

-- Framework packets: compliance SELECT. No INSERT/UPDATE policies — writes
-- go through the service-role server path in the assembler refactor.
DROP POLICY IF EXISTS fp_compliance_read ON public.framework_packets;
CREATE POLICY fp_compliance_read ON public.framework_packets
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());

-- Consistency flags: compliance SELECT; UPDATE allowed for compliance
-- admins to record resolution.
DROP POLICY IF EXISTS fcf_compliance_read ON public.framework_consistency_flags;
CREATE POLICY fcf_compliance_read ON public.framework_consistency_flags
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());

DROP POLICY IF EXISTS fcf_admin_update ON public.framework_consistency_flags;
CREATE POLICY fcf_admin_update ON public.framework_consistency_flags
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','superadmin','compliance_admin','compliance_officer')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                       AND role IN ('admin','superadmin','compliance_admin','compliance_officer')));

COMMENT ON POLICY fcf_admin_update ON public.framework_consistency_flags IS
  'Compliance admins resolve consistency flags; service role writes the initial insert.';
