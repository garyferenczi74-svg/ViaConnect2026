-- Prompt 170 NutriVision: photo blob tracking with default 24 hour TTL.
-- Photos are ephemeral by default; the cleanup Edge Function deletes
-- expired rows hourly. Per 170a section 4.3 + ultrathink residual #8 the
-- cleanup SQL uses a 60 second grace and excludes blobs that were just
-- linked to a meals row whose insert is in flight.

CREATE TABLE IF NOT EXISTS public.photo_meal_blobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  meal_id UUID REFERENCES public.meals(meal_id) ON DELETE SET NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'nutrivision-meals',
  storage_path TEXT NOT NULL,
  image_hash_sha256 TEXT,
  retention_policy TEXT NOT NULL DEFAULT 'ephemeral_24h'
    CHECK (retention_policy IN ('ephemeral_24h','opt_in_retain','corpus_contribution')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_deletion_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_photo_meal_blobs_scheduled_deletion
  ON public.photo_meal_blobs(scheduled_deletion_at);
CREATE INDEX IF NOT EXISTS idx_photo_meal_blobs_user_id
  ON public.photo_meal_blobs(user_id);

ALTER TABLE public.photo_meal_blobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY photo_meal_blobs_select_own ON public.photo_meal_blobs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY photo_meal_blobs_insert_own ON public.photo_meal_blobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY photo_meal_blobs_delete_own ON public.photo_meal_blobs
  FOR DELETE USING (auth.uid() = user_id);
