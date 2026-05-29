-- Prompt 170 NutriVision: per user settings for photo retention and
-- accuracy research opt in. Surfaced in the Settings page Privacy section.
--
-- Review Red R5 supersession: this table did not exist in the original
-- 170 spec. Added in Review to back the Settings controls that 170 section
-- 2.5 references but does not specify storage for.
--
-- Defaults match the locked policy from Blueprint Decision 5.4 and 170a
-- section 4.4:
--   photo_retention_policy = 'ephemeral_24h'
--   corpus_opt_in = FALSE
--
-- Revocation: when corpus_opt_in flips from TRUE to FALSE, opt_in_revoked_at
-- is set. The daily cleanup job hard deletes contributed_photo_path blobs
-- for that user 7 days after opt_in_revoked_at.

CREATE TABLE IF NOT EXISTS public.user_nutrivision_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_retention_policy TEXT NOT NULL DEFAULT 'ephemeral_24h'
    CHECK (photo_retention_policy IN ('ephemeral_24h','opt_in_retain')),
  corpus_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  opt_in_revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_nutrivision_settings_revoked
  ON public.user_nutrivision_settings(opt_in_revoked_at)
  WHERE opt_in_revoked_at IS NOT NULL;

ALTER TABLE public.user_nutrivision_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_nutrivision_settings_select_own
  ON public.user_nutrivision_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_nutrivision_settings_insert_own
  ON public.user_nutrivision_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_nutrivision_settings_update_own
  ON public.user_nutrivision_settings
  FOR UPDATE USING (auth.uid() = user_id);
