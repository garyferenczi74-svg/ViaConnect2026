-- =============================================================================
-- Prompt #127 P6: ISO 27001 manual evidence vault storage bucket
-- =============================================================================
-- Holds:
--   - iso_isms_scope_documents.storage_key PDFs (Clause 4.3)
--   - iso_internal_audits.storage_key PDFs (Clause 9.2)
--   - iso_management_reviews.storage_key PDFs (Clause 9.3)
-- Private; compliance-reader SELECT; server-side service-role writes only.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'iso-evidence',
  'iso-evidence',
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

DROP POLICY IF EXISTS iso_evidence_bucket_read ON storage.objects;
CREATE POLICY iso_evidence_bucket_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'iso-evidence'
    AND public.is_compliance_reader()
  );
