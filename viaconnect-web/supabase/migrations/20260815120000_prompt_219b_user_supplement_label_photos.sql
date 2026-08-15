-- Prompt 219b: private per-user storage for supplement label photos +
-- optional path columns on user_current_supplements for retention/delete.
-- Path convention: {user_id}/{yyyy-mm}/{uuid}.{ext}
-- Bucket is private (public = false). Clients use signed URLs only.

INSERT INTO storage.buckets (id, name, public)
VALUES ('user-supplement-label-photos', 'user-supplement-label-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Owner-only object access under their own first path segment.
DROP POLICY IF EXISTS "Users access own supplement label photos" ON storage.objects;
CREATE POLICY "Users access own supplement label photos"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'user-supplement-label-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'user-supplement-label-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Persist photo pointer on the regimen row so delete can remove the object.
ALTER TABLE public.user_current_supplements
  ADD COLUMN IF NOT EXISTS label_photo_bucket text NULL,
  ADD COLUMN IF NOT EXISTS label_photo_path text NULL;

COMMENT ON COLUMN public.user_current_supplements.label_photo_bucket IS
  'Prompt 219b: storage bucket id for the label photo (private).';
COMMENT ON COLUMN public.user_current_supplements.label_photo_path IS
  'Prompt 219b: object path within the private label-photo bucket; never a public URL.';
