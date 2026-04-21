-- =============================================================================
-- Prompt #104 Phase 2: legal-evidence storage bucket
-- =============================================================================
-- Private bucket for evidence artifacts (screenshots, HTML snapshots,
-- pricing captures, test-purchase receipts, lab reports, etc.).
-- Admin + legal-ops + compliance access only; no public read paths.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'legal-evidence',
  'legal-evidence',
  false,
  104857600,    -- 100 MB per file (HTML snapshots + multi-page PDFs can be large)
  ARRAY[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf',
    'text/html', 'text/plain', 'application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS legal_evidence_admin_legal_ops_all ON storage.objects;
CREATE POLICY legal_evidence_admin_legal_ops_all
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'legal-evidence'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'compliance_officer', 'legal_ops')
    )
  )
  WITH CHECK (
    bucket_id = 'legal-evidence'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'compliance_officer', 'legal_ops')
    )
  );
