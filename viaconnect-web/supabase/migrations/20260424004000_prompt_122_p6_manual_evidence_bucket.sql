-- =============================================================================
-- Prompt #122 P6: soc2-manual-evidence storage bucket + RLS
-- =============================================================================
-- Steve Rica and compliance admins upload manual evidence (signed policies,
-- vendor BAAs, training certificates, onboarding screenshots, etc.) that
-- supplements the automated collector output. Files land in this private
-- bucket; the orchestrator loader downloads approved non-archived rows at
-- packet-generation time and feeds them to generateSoc2Packet() as
-- ManualEvidenceFile[].
--
-- Access: compliance_reader SELECT. No direct authenticated INSERT/UPDATE;
-- writes go through the API route (service-role client with caller auth
-- already validated upstream).
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'soc2-manual-evidence',
  'soc2-manual-evidence',
  false,
  104857600, -- 100 MB per object (long-form PDFs, screenshots, signed-PDF packets)
  ARRAY[
    'application/pdf',
    'image/jpeg','image/png','image/webp',
    'text/csv','text/plain','text/markdown',
    'application/json',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS soc2_manual_evidence_bucket_read ON storage.objects;
CREATE POLICY soc2_manual_evidence_bucket_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'soc2-manual-evidence'
    AND public.is_compliance_reader()
  );

COMMENT ON POLICY soc2_manual_evidence_bucket_read ON storage.objects IS
  'Prompt #122 P6: compliance-reader-only read. Writes go through the API route using service role.';
