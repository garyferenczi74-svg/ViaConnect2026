-- Prompt 172 Phase 0 (170c primitive): safety mode preferences table +
-- nutrition_photo_jobs degraded service column.
--
-- Append only. Two structural changes:
--   1. New public.user_safety_preferences table (170c §16.2 endpoint storage).
--      Per user row, RLS scoped to the calling user, default enabled false.
--      The dedicated POST opt-in / opt-out endpoints land in 170c §4 build.
--   2. Defensive nutrition_photo_jobs.degraded_service_kind column. The 170m
--      Phase A migration comment says nutrition_photo_jobs is a phantom
--      table per spec §11.1; we use the IF EXISTS guard that the 171b sleep
--      window migration established as the house pattern for this exact
--      situation. When the table actually lands the column will be in place;
--      when it never lands the migration is a no-op.
--
-- Canonical degraded_service_kind values per 170c §10.3:
--   'none'                     no degraded service for this job
--   'logmeal_hard_stop'        primary LogMeal returned error or extreme
--                              low confidence; fallback path served result
--   'gemini_low_confidence'    Gemini fallback returned result below 0.5
--                              confidence or above latency budget
--   'claude_tertiary_used'     both LogMeal and Gemini failed; Claude
--                              tertiary fallback served the result
-- The check constraint is named so a future ALTER can drop and replace it
-- via append only migration without orphaning a system generated name.

-- 1. user_safety_preferences ------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_safety_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ed_safety_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  enabled_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_safety_preferences IS
  'Prompt 170c section 8 eating disorder safety mode opt in state. One row per user, written via /api/safety-mode/opt-in and /api/safety-mode/opt-out (POST endpoints land with full 170c section 4 build).';
COMMENT ON COLUMN public.user_safety_preferences.ed_safety_mode_enabled IS
  '170c section 8.2 silent ratio mode master flag for this user. Default false; never indicates the mode is active in UI per 170c section 8.4.';

ALTER TABLE public.user_safety_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_safety_preferences'
      AND policyname = 'user_safety_preferences_select_own'
  ) THEN
    CREATE POLICY user_safety_preferences_select_own
      ON public.user_safety_preferences
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_safety_preferences'
      AND policyname = 'user_safety_preferences_insert_own'
  ) THEN
    CREATE POLICY user_safety_preferences_insert_own
      ON public.user_safety_preferences
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_safety_preferences'
      AND policyname = 'user_safety_preferences_update_own'
  ) THEN
    CREATE POLICY user_safety_preferences_update_own
      ON public.user_safety_preferences
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2. nutrition_photo_jobs.degraded_service_kind ---------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'nutrition_photo_jobs'
  ) THEN
    ALTER TABLE public.nutrition_photo_jobs
      ADD COLUMN IF NOT EXISTS degraded_service_kind TEXT NOT NULL DEFAULT 'none';

    -- Check constraint guarded by NOT EXISTS so re-runs are idempotent.
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'nutrition_photo_jobs_degraded_service_kind_chk'
    ) THEN
      ALTER TABLE public.nutrition_photo_jobs
        ADD CONSTRAINT nutrition_photo_jobs_degraded_service_kind_chk
        CHECK (degraded_service_kind IN (
          'none',
          'logmeal_hard_stop',
          'gemini_low_confidence',
          'claude_tertiary_used'
        ));
    END IF;
  END IF;
END $$;
