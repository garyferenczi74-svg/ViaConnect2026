-- =============================================================================
-- Prompt #169b: Body Scan mechanism foundation (Task 13)
-- Migration: 20260516000070_body_scan_169b_mechanisms.sql
--
-- RECONCILED to the real codebase schema. The #169b spec was authored against an
-- idealized schema that does NOT exist here:
--   * There is NO body_scans table. The real per-scan table is body_photo_sessions
--     (created 20260416000090, extended 20260416000100 + 20260516000010 +
--     20260516000050). All #169b "alter table body_scans" snippets retarget to
--     body_photo_sessions.
--   * There is NO user_profiles table. The real profile table is profiles (PK id).
--   * body_photo_sessions has NO timestamptz scan-moment column. Its scan date is
--     session_date DATE NOT NULL DEFAULT CURRENT_DATE (confirmed in
--     20260416000090 and src/lib/supabase/types.ts). Because session_date carries
--     no time component, a generated scan_time_of_day column derived from
--     session_date::time would always be 00:00:00 and is therefore unsafe /
--     meaningless. It is SKIPPED here; time-of-day is computed in the app layer
--     (see Task 18 time-of-day trend annotation).
--
-- Sorts AFTER the latest migration 20260516000060 and BELOW the live #170 range
-- (20260516120010+).
--
-- Append-only: no DROP, no ALTER on existing columns, no editing of prior files.
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS,
-- guarded DO $$ IF NOT EXISTS (pg_policies) $$ blocks, CREATE INDEX IF NOT EXISTS,
-- CREATE OR REPLACE FUNCTION (consistent with 20260516000010 + 20260516000050).
--
-- NOTE on policies: every real body-scan table already uses FOR ALL ... WITH CHECK
-- (body_photo_sessions, body_scan_measurements, scan_calibration_nudges,
-- body_scan_composition, body_scan_quality, body_scan_personal_baselines,
-- body_scan_tier_log). Section 16.2 is therefore already satisfied; this migration
-- does NOT add WITH CHECK to, or otherwise touch, any existing policy.
-- =============================================================================


-- =============================================================================
-- 1. body_photo_sessions: #169b mechanism columns (retargeted from body_scans)
--    Attestation + consent timestamps, practitioner clinical override, the
--    weight/height/cycle-phase context captured at scan time with provenance,
--    and camera + model-version metadata.
-- =============================================================================

ALTER TABLE body_photo_sessions
  ADD COLUMN IF NOT EXISTS self_attestation_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS patient_consent_confirmed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS practitioner_id               UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS clinical_override_reason      TEXT,
  ADD COLUMN IF NOT EXISTS weight_kg_at_scan             NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS weight_kg_source              TEXT
    CHECK (weight_kg_source IS NULL OR weight_kg_source IN (
      'caq_phase_1', 'pre_scan_update', 'wearable_sync', 'manual'
    )),
  ADD COLUMN IF NOT EXISTS height_cm_at_scan             NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS height_cm_source              TEXT
    CHECK (height_cm_source IS NULL OR height_cm_source IN (
      'caq_phase_1', 'pre_scan_update', 'manual'
    )),
  ADD COLUMN IF NOT EXISTS cycle_phase_at_scan           TEXT
    CHECK (cycle_phase_at_scan IS NULL OR cycle_phase_at_scan IN (
      'menstrual', 'follicular', 'ovulation', 'luteal', 'unknown', 'not_applicable'
    )),
  ADD COLUMN IF NOT EXISTS camera_intrinsics             JSONB,
  ADD COLUMN IF NOT EXISTS model_versions                JSONB NOT NULL DEFAULT '{}'::jsonb;

-- scan_time_of_day generated column: INTENTIONALLY SKIPPED.
-- body_photo_sessions.session_date is a DATE (no time-of-day component), so a
-- "GENERATED ALWAYS AS (session_date::time) STORED" column would always evaluate
-- to 00:00:00 and convey no information. Time-of-day for trend annotation is
-- computed in the app layer from the scan's true client timestamp.

-- FK covering index for practitioner_id: practitioner-managed scans are looked up
-- by practitioner in the T11 practitioner body-scan view, so the FK lookup is
-- plausible. Partial index keeps it small (most rows have no practitioner).
CREATE INDEX IF NOT EXISTS idx_body_photo_sessions_practitioner
  ON body_photo_sessions(practitioner_id)
  WHERE practitioner_id IS NOT NULL;


-- =============================================================================
-- 2. body_scan_inclusivity_waitlist
--    Section 7.3 / 7.4: a user opts into the waitlist for a body-scan capability
--    that is not yet supported for their body/context. One active request per
--    user (UNIQUE user_id); upsert target.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.body_scan_inclusivity_waitlist (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL UNIQUE
                        REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_capability TEXT,
  notes               TEXT,
  notify_email        BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.body_scan_inclusivity_waitlist ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'body_scan_inclusivity_waitlist'
      AND policyname = 'Users manage own inclusivity waitlist'
  ) THEN
    CREATE POLICY "Users manage own inclusivity waitlist"
      ON public.body_scan_inclusivity_waitlist FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- user_id is the leading column of the UNIQUE constraint index; FK lookups covered.


-- =============================================================================
-- 3. caq_demographics_updates
--    Section 3.2.x: audit trail of pre-scan stat (weight / height) updates. Each
--    row records the field changed, prior + new value, the source of the new
--    value, and whether the change was also written back to the CAQ master record.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.caq_demographics_updates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL
                         REFERENCES auth.users(id) ON DELETE CASCADE,
  field                TEXT CHECK (field IS NULL OR field IN ('weight_kg', 'height_cm')),
  old_value            NUMERIC(7,2),
  new_value            NUMERIC(7,2),
  source               TEXT,
  updated_caq_master   BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.caq_demographics_updates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'caq_demographics_updates'
      AND policyname = 'Users manage own caq demographics updates'
  ) THEN
    CREATE POLICY "Users manage own caq demographics updates"
      ON public.caq_demographics_updates FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_caq_demographics_updates_user_created
  ON public.caq_demographics_updates(user_id, created_at DESC);


-- =============================================================================
-- 4. biometric_consents (SCHEMA ONLY)
--    Section 2: append-only ledger of biometric-data consent. The consent COPY
--    itself is authored and gated elsewhere; this table stores only the record of
--    a given consent_version having been accepted, plus retention + model-
--    improvement preferences.
--
--    APPEND-ONLY intent: RLS grants the owner SELECT + INSERT only. There is no
--    UPDATE and no DELETE policy, so once written a consent row cannot be mutated
--    or removed through the API (consents are a permanent audit record).
--
--    ip_address stores a HASH, not the raw address: the app hashes the client IP
--    before insert. user_agent is stored verbatim for the same accept event.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.biometric_consents (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL
                             REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_version          TEXT NOT NULL,
  consented_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address               TEXT,  -- stored hashed; the app hashes the client IP before insert
  user_agent               TEXT,
  retention_preference_days INTEGER,
  model_improvement_opt_in BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.biometric_consents ENABLE ROW LEVEL SECURITY;

-- Owner may read their own consent records.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'biometric_consents'
      AND policyname = 'Users read own biometric consents'
  ) THEN
    CREATE POLICY "Users read own biometric consents"
      ON public.biometric_consents FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Owner may insert their own consent records (append-only; no UPDATE/DELETE policy).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'biometric_consents'
      AND policyname = 'Users insert own biometric consents'
  ) THEN
    CREATE POLICY "Users insert own biometric consents"
      ON public.biometric_consents FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_biometric_consents_user_consented
  ON public.biometric_consents(user_id, consented_at DESC);


-- =============================================================================
-- 5. Section 16.1 search_path alignment
--    Re-create the two existing body-scan SECURITY DEFINER functions with the
--    codebase convention SET search_path = public, pg_temp (as seen in
--    20260402_brand_seed_architecture.sql). The function bodies are reproduced
--    EXACTLY as defined in their original migrations; only the search_path line
--    changes from "= public" to "= public, pg_temp". No logic is altered.
-- =============================================================================

-- 5a. fn_claim_free_body_scan_teaser
--     Original: 20260516000050_prompt_169a_body_scan_premium_gating.sql
--     Targets profiles (kept). Body unchanged; search_path now public, pg_temp.
CREATE OR REPLACE FUNCTION fn_claim_free_body_scan_teaser(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_claimed boolean;
BEGIN
  UPDATE profiles
     SET free_body_scan_used    = true,
         free_body_scan_used_at = now()
   WHERE id = p_user_id
     AND free_body_scan_used = false
  RETURNING true INTO v_claimed;

  RETURN coalesce(v_claimed, false);
END;
$$;

-- Preserve the original grants (idempotent).
REVOKE ALL ON FUNCTION fn_claim_free_body_scan_teaser(uuid) FROM public;
GRANT EXECUTE ON FUNCTION fn_claim_free_body_scan_teaser(uuid) TO authenticated;


-- 5b. fn_emit_helix_body_scan_event
--     Original: 20260516000010_prompt_169_body_scan_phase1.sql
--     Trigger function body unchanged; search_path now public, pg_temp.
CREATE OR REPLACE FUNCTION fn_emit_helix_body_scan_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.helix_transactions (
    user_id,
    type,
    amount,
    description,
    metadata,
    source,
    related_entity_id,
    created_at
  ) VALUES (
    NEW.user_id,
    'earn_supplement',
    0,
    'body_scan_completed',
    jsonb_build_object(
      'event_type',          'body_scan_completed',
      'session_id',          NEW.id,
      'tier',                COALESCE(
                               (SELECT tier FROM body_scan_tier_log WHERE session_id = NEW.id),
                               1
                             ),
      'scan_quality_score',  NEW.scan_quality_score
    ),
    'body_scan',
    NEW.id,
    now()
  );
  RETURN NEW;
END;
$$;
