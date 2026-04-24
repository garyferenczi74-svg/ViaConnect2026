-- =============================================================================
-- Prompt #124 P5: counterfeit-intake storage bucket + RLS
-- =============================================================================
-- Private bucket receiving:
--   - Consumer-submitted suspect photos (anonymous + authenticated)
--   - Admin-uploaded suspect photos
--   - Test-buy received-product photos
-- Max 20 MB per object; JPEG/PNG/WebP/HEIC accepted (normalizer converts
-- to JPEG before any object here).
--
-- Access: reads gated on is_compliance_reader(); no direct writes — server
-- path uses service role to upload normalized + PHI-redacted bytes only.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'counterfeit-intake',
  'counterfeit-intake',
  false,
  20971520, -- 20 MB per object
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif','image/avif']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS counterfeit_intake_bucket_read ON storage.objects;
CREATE POLICY counterfeit_intake_bucket_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'counterfeit-intake'
    AND public.is_compliance_reader()
  );

-- No authenticated INSERT/UPDATE/DELETE. Service-role server path handles writes.

COMMENT ON POLICY counterfeit_intake_bucket_read ON storage.objects IS
  'Prompt #124 P5: compliance-reader only; consumers never read their own uploads from the admin UI — they see status via report_id.';
