-- =============================================================================
-- Prompt 211b Workstream 4a: cycle-aware modeling, data layer
-- Migration: 20260713130000_prompt_211b_cycle_context.sql
-- =============================================================================
-- PURPOSE
-- -------
-- Adds a CONSUMER-ONLY, opt-in user_cycle_context table so phase-aware trend
-- copy and pregnancy-adjacent gating have a persisted, own-row home. Mirrors
-- the scan_cadence_reminders pattern (20260710120000_prompt_211a_scan_cadence.sql):
-- one row per user, opt_in BOOLEAN DEFAULT false (never assumed in), own-row
-- RLS only. Practitioner visibility is deliberately NOT granted via RLS here;
-- any future practitioner sharing goes through an explicit consent_ledger row
-- (consent_type 'cycle_data_practitioner_share'), never a blanket table grant.
--
-- current_phase is a coarse enum, never a precise date/cycle-day. cycle data
-- is consumer-private by default and must never enter identifiable telemetry.
--
-- Also reconciles the known cycle_phase_at_scan schema drift documented in
-- docs/formavision/211b-baseline.md Workstream 4: body_photo_sessions
-- .cycle_phase_at_scan exists live in prod but has no repo migration. This is
-- formalized additively below with ADD COLUMN IF NOT EXISTS; no existing
-- column on body_photo_sessions is altered.
--
-- IDEMPOTENCY / GUARD STYLE
-- -------------------------
-- Follows the 211a scan_cadence_reminders convention: CREATE TABLE IF NOT
-- EXISTS, ENABLE RLS unconditionally (idempotent), every policy created
-- inside a pg_policies DO-block guard, every auth call wrapped in the
-- initplan form (select auth.uid()), and every function pinned with
-- SET search_path = public, pg_temp.
--
-- APPEND-ONLY: no existing table, column, policy, or migration is touched.
-- DO NOT APPLY MANUALLY: merge-deferred; the controller applies this
-- migration and writes the log row after review.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. user_cycle_context (consumer-only, opt-in, own-row RLS, NO practitioner
--    policy of any kind)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_cycle_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  opt_in BOOLEAN NOT NULL DEFAULT false,
  opted_in_at TIMESTAMPTZ,
  current_phase TEXT
    CHECK (current_phase IS NULL OR current_phase IN
      ('menstrual', 'follicular', 'ovulatory', 'luteal', 'unknown')),
  cycle_length_days INTEGER
    CHECK (cycle_length_days IS NULL OR (cycle_length_days > 0 AND cycle_length_days <= 60)),
  last_period_start DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_cycle_context IS
  'Consumer-only, opt-in cycle context (Prompt 211b W4a). One row per user, opt_in defaults FALSE (never assumed in), own-row RLS only, NO practitioner policy. Practitioner visibility requires an explicit consent_ledger share row (consent_type cycle_data_practitioner_share), never an RLS grant. Never enters identifiable telemetry.';

COMMENT ON COLUMN public.user_cycle_context.current_phase IS
  'Coarse phase enum: menstrual, follicular, ovulatory, luteal, unknown. Never a precise cycle day or date.';

ALTER TABLE public.user_cycle_context ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_cycle_context'
      AND policyname = 'Users can view own cycle context'
  ) THEN
    CREATE POLICY "Users can view own cycle context"
      ON public.user_cycle_context FOR SELECT
      USING ((select auth.uid()) = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_cycle_context'
      AND policyname = 'Users can insert own cycle context'
  ) THEN
    CREATE POLICY "Users can insert own cycle context"
      ON public.user_cycle_context FOR INSERT
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_cycle_context'
      AND policyname = 'Users can update own cycle context'
  ) THEN
    CREATE POLICY "Users can update own cycle context"
      ON public.user_cycle_context FOR UPDATE
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_cycle_context'
      AND policyname = 'Users can delete own cycle context'
  ) THEN
    CREATE POLICY "Users can delete own cycle context"
      ON public.user_cycle_context FOR DELETE
      USING ((select auth.uid()) = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_cycle_context_optin
  ON public.user_cycle_context(user_id)
  WHERE opt_in = true;

-- -----------------------------------------------------------------------------
-- 2. updated_at trigger (matches scan_streak_set_updated_at pattern; search_path
--    pinned per the repo function-security posture)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_cycle_context_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_cycle_context_updated_at') THEN
    CREATE TRIGGER trg_user_cycle_context_updated_at
      BEFORE UPDATE ON public.user_cycle_context
      FOR EACH ROW EXECUTE FUNCTION public.user_cycle_context_set_updated_at();
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. body_photo_sessions.cycle_phase_at_scan drift reconciliation (additive
--    only; the column already exists live in prod per 211b-baseline.md, this
--    just formalizes it in the migration history for environments where it is
--    absent, e.g. fresh local/staging databases). No existing column altered.
-- -----------------------------------------------------------------------------
ALTER TABLE public.body_photo_sessions
  ADD COLUMN IF NOT EXISTS cycle_phase_at_scan TEXT
    CHECK (cycle_phase_at_scan IS NULL OR cycle_phase_at_scan IN
      ('menstrual', 'follicular', 'ovulatory', 'luteal', 'unknown'));

COMMENT ON COLUMN public.body_photo_sessions.cycle_phase_at_scan IS
  'Reconciles known prod schema drift (Prompt 211b W4a): this column already existed live with no repo migration. Formalized here additively, same coarse phase enum as user_cycle_context.current_phase. Not backfilled or altered.';

-- =============================================================================
-- Done. user_cycle_context created (consumer-only, opt-in, own-row RLS, no
-- practitioner policy). cycle_phase_at_scan formalized additively on
-- body_photo_sessions. No fabricated cohort data, no telemetry wiring here;
-- W4a is data + service layer only, W4b wires the consumer UI.
-- =============================================================================
