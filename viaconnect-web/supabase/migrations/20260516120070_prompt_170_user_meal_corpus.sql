-- Prompt 170 NutriVision: proprietary user meal corpus for accuracy research.
-- Every NutriVision save, every Quick Logs save, and every user edit writes
-- one row. Over time this becomes ViaConnect's training dataset for vision
-- model fine tuning, cooking oil default tuning, and region or cuisine
-- specific portion calibration.
--
-- Privacy posture per 170 section 2.5 + 170a section 4.4:
--   user_hash is digest(user_id || app.corpus_salt, 'sha256'). The salt
--     lives as a Postgres setting; app code never reads it. The hash is
--     computed inside a SECURITY DEFINER function.
--   contributed_photo_path is NULL unless the user has opted in via
--     user_nutrivision_settings.corpus_opt_in = TRUE.
--   salt_version supports annual salt rotation. New rows take the current
--     version; historical rows remain queryable under their original
--     version.
--   Service role only. No client policies.

CREATE TABLE IF NOT EXISTS public.user_meal_corpus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL,
  salt_version INT NOT NULL DEFAULT 1,
  meal_id UUID,
  source TEXT NOT NULL
    CHECK (source IN ('nutrivision','quick_log','manual')),
  cuisine_tag TEXT,
  recognition_payload_json JSONB,
  final_state_json JSONB NOT NULL,
  edit_diff_json JSONB,
  cooking_oil_json JSONB,
  meal_confidence NUMERIC(5,4),
  user_modified BOOLEAN NOT NULL DEFAULT FALSE,
  contributed_photo_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_meal_corpus_cuisine
  ON public.user_meal_corpus(cuisine_tag);
CREATE INDEX IF NOT EXISTS idx_user_meal_corpus_created_at
  ON public.user_meal_corpus(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_meal_corpus_salt_version
  ON public.user_meal_corpus(salt_version);

ALTER TABLE public.user_meal_corpus ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: service role only.
