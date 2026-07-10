-- =============================================================================
-- Prompt 211a Workstream 4 (Part 1): scan cadence + scan streak
-- Migration: 20260710120000_prompt_211a_scan_cadence.sql
-- =============================================================================
-- PURPOSE
-- -------
-- Adds a CONSUMER-ONLY scan_streak table so the Helix scan streak (the vision
-- scan analogue of the compliance streak) has an own-row persisted home. The
-- table mirrors public.compliance_streaks (20260326_gamification_engine.sql) in
-- shape and RLS posture: one row per user, own-row read/insert/update, no
-- practitioner policy of any kind.
--
-- FINGERPRINT SOURCE DECISION (documented, no new table added)
-- ------------------------------------------------------------
-- The condition fingerprint for a scan (time-of-day bucket, lighting grade,
-- pose/scan quality) is NOT given its own table. Every field it needs already
-- lives on tables created by earlier migrations:
--   * body_photo_sessions.scan_quality_score  NUMERIC(3,2)   (20260416000100)
--   * body_photo_sessions.quality_issues       TEXT[]         (20260416000100)
--   * body_photo_sessions.lighting_condition   TEXT (CHECK)   (20260416000090)
--   * body_photo_sessions.session_date DATE / created_at TIMESTAMPTZ
--   * body_scan_measurements.overall_confidence NUMERIC(3,2)  (20260416000100)
-- The Part 1 pure logic (src/lib/formavision/cadence/fingerprint.ts) reads
-- these existing columns via a plain-data ScanConditionFingerprint object the
-- caller populates. Adding a scan_condition_fingerprint table would duplicate
-- columns that already exist and carry their own RLS, so per the prompt's
-- "prefer reading existing over a new table if body_photo_sessions suffices"
-- instruction, NO fingerprint table is created here. body_photo_sessions
-- suffices.
--
-- IDEMPOTENCY / GUARD STYLE
-- -------------------------
-- Follows the F1/F3 210f convention (20260707150000_prompt_210f_practitioner_
-- core_additive.sql): CREATE TABLE IF NOT EXISTS, ENABLE RLS unconditionally
-- (idempotent), every policy created inside a pg_policies DO-block guard, and
-- every auth call wrapped in the initplan form (select auth.uid()) so the
-- Supabase performance advisor stays green.
--
-- APPEND-ONLY: no existing table, column, policy, or migration is touched.
-- DO NOT APPLY MANUALLY: the controller applies this migration and writes the
-- log row after review.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. scan_streak  (mirrors compliance_streaks; consumer-only own-row RLS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scan_streak (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_scan_date DATE,
  streak_started_at DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.scan_streak IS
  'Consumer-only vision scan streak (Prompt 211a W4). One row per user, own-row RLS, no practitioner policy. Mirrors compliance_streaks. Streak credit is written server-side in the award lane, never from the avatar surface.';

ALTER TABLE public.scan_streak ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scan_streak'
      AND policyname = 'Users can view own scan streak'
  ) THEN
    CREATE POLICY "Users can view own scan streak"
      ON public.scan_streak FOR SELECT
      USING ((select auth.uid()) = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scan_streak'
      AND policyname = 'Users can insert own scan streak'
  ) THEN
    CREATE POLICY "Users can insert own scan streak"
      ON public.scan_streak FOR INSERT
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scan_streak'
      AND policyname = 'Users can update own scan streak'
  ) THEN
    CREATE POLICY "Users can update own scan streak"
      ON public.scan_streak FOR UPDATE
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scan_streak_user
  ON public.scan_streak(user_id);

-- -----------------------------------------------------------------------------
-- 2. updated_at trigger (matches body_photo_sessions_set_updated_at pattern;
--    SET search_path per the repo function-security posture)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.scan_streak_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_scan_streak_updated_at') THEN
    CREATE TRIGGER trg_scan_streak_updated_at
      BEFORE UPDATE ON public.scan_streak
      FOR EACH ROW EXECUTE FUNCTION public.scan_streak_set_updated_at();
  END IF;
END $$;

-- =============================================================================
-- Done. scan_streak created (consumer-only own-row RLS). No fingerprint table:
-- body_photo_sessions + body_scan_measurements already hold the quality fields.
-- =============================================================================
