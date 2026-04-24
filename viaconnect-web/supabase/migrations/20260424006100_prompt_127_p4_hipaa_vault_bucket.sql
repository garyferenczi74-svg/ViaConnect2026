-- =============================================================================
-- Prompt #127 P4: HIPAA manual evidence vault storage bucket
-- =============================================================================
-- Holds:
--   - hipaa_risk_analyses.storage_key PDFs
--   - hipaa_sanction_policies.storage_key PDFs
--   - hipaa_contingency_plan_tests.storage_key PDFs
-- Private; compliance-reader SELECT; server-side service-role writes only.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hipaa-evidence',
  'hipaa-evidence',
  false,
  104857600, -- 100 MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS hipaa_evidence_bucket_read ON storage.objects;
CREATE POLICY hipaa_evidence_bucket_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'hipaa-evidence'
    AND public.is_compliance_reader()
  );
