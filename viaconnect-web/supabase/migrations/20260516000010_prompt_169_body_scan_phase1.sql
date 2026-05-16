-- =============================================================================
-- Prompt #169: Body Scan Phase 1 -- Supplementary tables + Helix trigger
-- Migration: 20260516000010_prompt_169_body_scan_phase1.sql
-- Parent table: body_photo_sessions (20260416000090)
-- RLS pattern: idempotent DO $$ IF NOT EXISTS (pg_policies) $$ form
-- Append-only: no DROP TABLE, no ALTER TABLE on pre-existing tables.
-- =============================================================================

-- NOTE: helix_events does not exist in this codebase. The canonical helix
-- event recording table is helix_transactions (20260327_helix_rewards_schema.sql).
-- The trigger below inserts into helix_transactions accordingly.
-- NOTE: practitioner_patient_access does not exist. The actual access-control
-- table is patient_practitioner_relationships (20260418000050_helix_phase1_integration.sql).
-- The practitioner notes policy uses that table's columns:
--   patient_user_id, practitioner_id, status ('active').
-- =============================================================================


-- =============================================================================
-- 1. body_scan_composition
--    Per-session body composition with confidence intervals (1:1 with session)
-- =============================================================================

CREATE TABLE IF NOT EXISTS body_scan_composition (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           UUID NOT NULL UNIQUE
                         REFERENCES body_photo_sessions(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL
                         REFERENCES auth.users(id) ON DELETE CASCADE,
  body_fat_pct         NUMERIC(5,2) CHECK (body_fat_pct BETWEEN 2 AND 75),
  ci_low_body_fat_pct  NUMERIC(5,2),
  ci_high_body_fat_pct NUMERIC(5,2),
  lean_mass_kg         NUMERIC(6,2) CHECK (lean_mass_kg BETWEEN 10 AND 200),
  fat_mass_kg          NUMERIC(6,2) CHECK (fat_mass_kg BETWEEN 1 AND 200),
  visceral_fat_index   NUMERIC(5,2),
  ag_ratio             NUMERIC(5,3),
  vs_ratio             NUMERIC(5,3),
  fmi                  NUMERIC(5,2),
  ffmi                 NUMERIC(5,2),
  bmi                  NUMERIC(5,2),
  bmr_kcal             INTEGER,
  computed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE body_scan_composition ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'body_scan_composition'
      AND policyname = 'Users manage own scan composition'
  ) THEN
    CREATE POLICY "Users manage own scan composition"
      ON body_scan_composition FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- FK covering index for session_id (UNIQUE constraint creates btree, covers FK lookup)
-- FK covering index for user_id + trend queries
CREATE INDEX IF NOT EXISTS idx_scan_composition_user_computed
  ON body_scan_composition(user_id, computed_at DESC);

-- session_id is covered by the UNIQUE constraint index; no separate index needed.


-- =============================================================================
-- 2. body_scan_quality
--    Per-session 6 quality scores plus blocking issues array
-- =============================================================================

CREATE TABLE IF NOT EXISTS body_scan_quality (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                   UUID NOT NULL UNIQUE
                                 REFERENCES body_photo_sessions(id) ON DELETE CASCADE,
  user_id                      UUID NOT NULL
                                 REFERENCES auth.users(id) ON DELETE CASCADE,
  lighting_score               NUMERIC(5,2) CHECK (lighting_score BETWEEN 0 AND 100),
  pose_score                   NUMERIC(5,2) CHECK (pose_score BETWEEN 0 AND 100),
  clothing_tightness_score     NUMERIC(5,2) CHECK (clothing_tightness_score BETWEEN 0 AND 100),
  background_clutter_score     NUMERIC(5,2) CHECK (background_clutter_score BETWEEN 0 AND 100),
  camera_level_score           NUMERIC(5,2) CHECK (camera_level_score BETWEEN 0 AND 100),
  frame_coverage_score         NUMERIC(5,2) CHECK (frame_coverage_score BETWEEN 0 AND 100),
  pose_landmark_avg_confidence NUMERIC(5,2),
  blocking_issues              JSONB NOT NULL DEFAULT '[]'::jsonb,
  computed_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE body_scan_quality ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'body_scan_quality'
      AND policyname = 'Users manage own scan quality'
  ) THEN
    CREATE POLICY "Users manage own scan quality"
      ON body_scan_quality FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- session_id is covered by the UNIQUE constraint index.
-- FK covering index for user_id
CREATE INDEX IF NOT EXISTS idx_scan_quality_user_computed
  ON body_scan_quality(user_id, computed_at DESC);


-- =============================================================================
-- 3. body_scan_personal_baselines
--    Per-user rolling standard deviation for drift correction (section 9.6)
-- =============================================================================

CREATE TABLE IF NOT EXISTS body_scan_personal_baselines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL
                     REFERENCES auth.users(id) ON DELETE CASCADE,
  measurement_type TEXT NOT NULL,
  std_dev          NUMERIC(8,4) NOT NULL,
  sample_size      INTEGER NOT NULL CHECK (sample_size >= 3),
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE body_scan_personal_baselines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'body_scan_personal_baselines'
      AND policyname = 'Users manage own personal baselines'
  ) THEN
    CREATE POLICY "Users manage own personal baselines"
      ON body_scan_personal_baselines FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- One current baseline per user per measurement type (upsert target)
CREATE UNIQUE INDEX IF NOT EXISTS uq_scan_baselines_user_measurement
  ON body_scan_personal_baselines(user_id, measurement_type);

-- user_id is already the leading column of the unique index; covered for FK scans.


-- =============================================================================
-- 4. body_scan_tier_log
--    Tier resolved per scan (Tier 1 / 2 / 3 based on device capability)
-- =============================================================================

CREATE TABLE IF NOT EXISTS body_scan_tier_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL UNIQUE
                      REFERENCES body_photo_sessions(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL
                      REFERENCES auth.users(id) ON DELETE CASCADE,
  tier              INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  confidence_score  NUMERIC(5,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  device_model      TEXT,
  device_os         TEXT,
  depth_sensor_type TEXT CHECK (depth_sensor_type IN (
                      'none', 'lidar', 'arcore_depth', 'truedepth'
                    )),
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE body_scan_tier_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'body_scan_tier_log'
      AND policyname = 'Users manage own tier log'
  ) THEN
    CREATE POLICY "Users manage own tier log"
      ON body_scan_tier_log FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- session_id is covered by the UNIQUE constraint index.
-- FK covering index for user_id
CREATE INDEX IF NOT EXISTS idx_scan_tier_log_user_recorded
  ON body_scan_tier_log(user_id, recorded_at DESC);


-- =============================================================================
-- 5. body_scan_practitioner_notes
--    Practitioner-authored notes on a patient body scan session.
--    Preallocated for T11 Practitioner Body Scan tab.
-- =============================================================================

CREATE TABLE IF NOT EXISTS body_scan_practitioner_notes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID NOT NULL
                          REFERENCES body_photo_sessions(id) ON DELETE CASCADE,
  practitioner_user_id  UUID NOT NULL
                          REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_user_id       UUID NOT NULL
                          REFERENCES auth.users(id) ON DELETE CASCADE,
  notes                 TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE body_scan_practitioner_notes ENABLE ROW LEVEL SECURITY;

-- Patient (consumer) reads their own notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'body_scan_practitioner_notes'
      AND policyname = 'Patient reads own practitioner notes'
  ) THEN
    CREATE POLICY "Patient reads own practitioner notes"
      ON body_scan_practitioner_notes FOR SELECT
      USING (auth.uid() = patient_user_id);
  END IF;
END $$;

-- Practitioner full access scoped by active patient relationship.
-- Uses patient_practitioner_relationships (20260418000050_helix_phase1_integration.sql):
--   columns: patient_user_id, practitioner_id (refs practitioners.id), status
-- Requires active relationship between the practitioner and the patient.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'body_scan_practitioner_notes'
      AND policyname = 'Practitioner manages notes for active patients'
  ) THEN
    CREATE POLICY "Practitioner manages notes for active patients"
      ON body_scan_practitioner_notes FOR ALL
      USING (
        auth.uid() = practitioner_user_id
        AND EXISTS (
          SELECT 1
          FROM patient_practitioner_relationships ppr
          JOIN practitioners p ON p.id = ppr.practitioner_id
          WHERE ppr.patient_user_id = body_scan_practitioner_notes.patient_user_id
            AND p.user_id = auth.uid()
            AND ppr.status = 'active'
        )
      )
      WITH CHECK (
        auth.uid() = practitioner_user_id
        AND EXISTS (
          SELECT 1
          FROM patient_practitioner_relationships ppr
          JOIN practitioners p ON p.id = ppr.practitioner_id
          WHERE ppr.patient_user_id = body_scan_practitioner_notes.patient_user_id
            AND p.user_id = auth.uid()
            AND ppr.status = 'active'
        )
      );
  END IF;
END $$;

-- FK covering indexes (session_id, practitioner_user_id, patient_user_id)
CREATE INDEX IF NOT EXISTS idx_scan_practitioner_notes_session
  ON body_scan_practitioner_notes(session_id);

CREATE INDEX IF NOT EXISTS idx_scan_practitioner_notes_practitioner
  ON body_scan_practitioner_notes(practitioner_user_id);

-- patient_user_id + created_at for practitioner timeline view
CREATE INDEX IF NOT EXISTS idx_scan_practitioner_notes_patient_created
  ON body_scan_practitioner_notes(patient_user_id, created_at DESC);

-- updated_at auto-set trigger for practitioner notes
CREATE OR REPLACE FUNCTION body_scan_practitioner_notes_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_body_scan_practitioner_notes_updated_at'
  ) THEN
    CREATE TRIGGER trg_body_scan_practitioner_notes_updated_at
    BEFORE UPDATE ON body_scan_practitioner_notes
    FOR EACH ROW EXECUTE FUNCTION body_scan_practitioner_notes_set_updated_at();
  END IF;
END $$;


-- =============================================================================
-- 6. Helix event trigger: emit on body_photo_sessions scan_status -> 'complete'
--
-- IMPORTANT: This codebase does not have a helix_events table. The canonical
-- helix event recording table is helix_transactions (20260327_helix_rewards_schema.sql
-- + phase2 additions in 20260418000060). The trigger inserts a zero-amount
-- informational transaction of type 'earn_supplement' (closest available type
-- in the CHECK constraint) with the body scan payload in the metadata JSONB.
-- A dedicated 'body_scan_completed' type does not exist in helix_earning_event_types
-- at migration time; the event_type_id is left NULL and description carries the
-- event label. This approach avoids altering existing tables.
--
-- Trigger is IDEMPOTENT: the WHEN clause fires only when scan_status changes
-- TO 'complete' from a different value. A no-op update that keeps scan_status
-- = 'complete' does NOT re-emit (OLD IS DISTINCT FROM NEW guard).
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_emit_helix_body_scan_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_emit_helix_body_scan_event'
  ) THEN
    CREATE TRIGGER trg_emit_helix_body_scan_event
    AFTER UPDATE ON body_photo_sessions
    FOR EACH ROW
    WHEN (
      OLD.scan_status IS DISTINCT FROM NEW.scan_status
      AND NEW.scan_status = 'complete'
    )
    EXECUTE FUNCTION fn_emit_helix_body_scan_event();
  END IF;
END $$;
