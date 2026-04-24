-- =============================================================================
-- Prompt #127 P7: framework_registry_flags
-- =============================================================================
-- Registry-level cross-framework inconsistency flags. Distinct from
-- framework_consistency_flags (which is packet-centric): this table records
-- issues found by inspecting the in-code registry + DB configuration
-- regardless of whether any framework packet has been generated.
--
-- Kinds of issues detected by the P7 checker:
--   - registry_broken_reference: A crossFrameworkReference points at a
--     non-existent control in the target framework.
--   - soa_excludes_mandated_control: ISO SoA excludes an Annex A control
--     that equivalent-maps to a HIPAA Required safeguard; Required cannot
--     be excluded.
--   - evidence_source_missing_collector: A control.evidenceSources entry
--     references a collector id not registered in DB_COLLECTORS,
--     HIPAA_COLLECTORS, or ISO_COLLECTORS.
--   - addressable_vs_implemented_drift: HIPAA Addressable safeguard has
--     equivalent ISO control marked 'implemented' in SoA (review recommended).
--   - cross_framework_coverage_gap: A control in framework X declares no
--     evidenceSources AND has no crossFrameworkReference to a framework with
--     automated evidence.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.framework_registry_flags (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id            text NOT NULL REFERENCES public.compliance_frameworks(id),
  control_ref             text NOT NULL,
  related_framework_id    text REFERENCES public.compliance_frameworks(id),
  related_control_ref     text,
  flag_kind               text NOT NULL CHECK (flag_kind IN (
                            'registry_broken_reference',
                            'soa_excludes_mandated_control',
                            'evidence_source_missing_collector',
                            'addressable_vs_implemented_drift',
                            'cross_framework_coverage_gap'
                          )),
  severity                text NOT NULL CHECK (severity IN ('info','warning','critical')),
  description             text NOT NULL,
  registry_version        text NOT NULL,
  first_seen_at           timestamptz NOT NULL DEFAULT now(),
  last_seen_at            timestamptz NOT NULL DEFAULT now(),
  resolved_by             uuid REFERENCES auth.users(id),
  resolved_at             timestamptz,
  resolution_note         text,
  UNIQUE (framework_id, control_ref, flag_kind, related_framework_id, related_control_ref)
);

CREATE INDEX IF NOT EXISTS idx_registry_flags_open
  ON public.framework_registry_flags (severity, last_seen_at DESC)
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_registry_flags_framework
  ON public.framework_registry_flags (framework_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_registry_flags_kind
  ON public.framework_registry_flags (flag_kind, severity);
CREATE INDEX IF NOT EXISTS idx_registry_flags_resolved_by
  ON public.framework_registry_flags (resolved_by)
  WHERE resolved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registry_flags_related
  ON public.framework_registry_flags (related_framework_id, related_control_ref)
  WHERE related_framework_id IS NOT NULL;

COMMENT ON TABLE public.framework_registry_flags IS
  'Prompt #127 P7: registry-level cross-framework inconsistency flags. The P7 checker writes here on every scan; UI at /admin/frameworks/consistency.';

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE public.framework_registry_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS frf_read ON public.framework_registry_flags;
CREATE POLICY frf_read ON public.framework_registry_flags
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());

DROP POLICY IF EXISTS frf_admin_update ON public.framework_registry_flags;
CREATE POLICY frf_admin_update ON public.framework_registry_flags
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','superadmin','compliance_admin','compliance_officer')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                       AND role IN ('admin','superadmin','compliance_admin','compliance_officer')));

COMMENT ON POLICY frf_admin_update ON public.framework_registry_flags IS
  'Compliance admins resolve registry flags; service-role checker writes inserts/upserts.';
