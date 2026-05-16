-- Prompt #169 T6: Create body-scan-pdfs storage bucket for exported PDF reports.
-- Private bucket; service role writes, users read their own user_id prefix only.

INSERT INTO storage.buckets (id, name, public)
VALUES ('body-scan-pdfs', 'body-scan-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: users may SELECT objects only from the prefix matching their own user_id.
CREATE POLICY "Users read own body scan pdfs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'body-scan-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS: service role may INSERT objects into this bucket.
CREATE POLICY "Service role writes body scan pdfs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'body-scan-pdfs'
    AND auth.role() = 'service_role'
  );
