-- Prompt #160 section 6.3: nutrition-photos private storage bucket for the
-- Photo AI meal entry route. Path convention: {user_id}/{yyyy-mm}/{uuid}.{ext}.
-- RLS restricts CRUD to objects under the authenticated user's own folder.

INSERT INTO storage.buckets (id, name, public)
VALUES ('nutrition-photos', 'nutrition-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users access own nutrition photos" ON storage.objects;
CREATE POLICY "Users access own nutrition photos"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'nutrition-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'nutrition-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
