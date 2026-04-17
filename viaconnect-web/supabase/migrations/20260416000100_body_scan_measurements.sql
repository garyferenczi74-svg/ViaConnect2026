-- =============================================================
-- Prompt #86C: AI Body Scanning Engine
-- Extends body_photo_sessions with scanning pipeline fields.
-- Creates body_scan_measurements for per-scan circumference history.
-- Append-only; no existing tables or columns touched.
-- =============================================================

-- 1. body_photo_sessions: scanning pipeline additions
ALTER TABLE body_photo_sessions
  ADD COLUMN IF NOT EXISTS silhouette_data         JSONB,
  ADD COLUMN IF NOT EXISTS extracted_measurements  JSONB,
  ADD COLUMN IF NOT EXISTS composition_estimate    JSONB,
  ADD COLUMN IF NOT EXISTS asymmetry_report        JSONB,
  ADD COLUMN IF NOT EXISTS avatar_parameters       JSONB,
  ADD COLUMN IF NOT EXISTS future_me_parameters    JSONB,
  ADD COLUMN IF NOT EXISTS calibrated_with_manual  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS calibration_source      TEXT,
  ADD COLUMN IF NOT EXISTS calibration_date        DATE,
  ADD COLUMN IF NOT EXISTS scan_quality_score      NUMERIC(3,2)
    CHECK (scan_quality_score IS NULL OR (scan_quality_score >= 0 AND scan_quality_score <= 1)),
  ADD COLUMN IF NOT EXISTS quality_issues          TEXT[],
  ADD COLUMN IF NOT EXISTS scan_status             TEXT NOT NULL DEFAULT 'not_started'
    CHECK (scan_status IN ('not_started','extracting','measuring','complete','failed'));

-- 2. Per-scan measurement history (18+ circumferences + composition)
CREATE TABLE IF NOT EXISTS body_scan_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES body_photo_sessions(id) ON DELETE CASCADE,
  scan_date DATE NOT NULL,

  -- Circumferences, stored in cm. Display unit derived from profiles.unit_system.
  neck_circ_cm              NUMERIC(5,1),
  shoulder_circ_cm          NUMERIC(5,1),
  chest_circ_cm             NUMERIC(5,1),
  under_bust_circ_cm        NUMERIC(5,1),
  waist_natural_circ_cm     NUMERIC(5,1),
  waist_navel_circ_cm       NUMERIC(5,1),
  hip_circ_cm               NUMERIC(5,1),
  right_bicep_circ_cm       NUMERIC(5,1),
  left_bicep_circ_cm        NUMERIC(5,1),
  right_forearm_circ_cm     NUMERIC(5,1),
  left_forearm_circ_cm      NUMERIC(5,1),
  right_thigh_circ_cm       NUMERIC(5,1),
  left_thigh_circ_cm        NUMERIC(5,1),
  right_calf_circ_cm        NUMERIC(5,1),
  left_calf_circ_cm         NUMERIC(5,1),

  -- Derived ratios
  waist_to_hip_ratio        NUMERIC(4,2),
  waist_to_height_ratio     NUMERIC(4,2),
  shoulder_to_waist_ratio   NUMERIC(4,2),

  -- Lengths
  inseam_cm                 NUMERIC(5,1),
  torso_length_cm           NUMERIC(5,1),

  -- Composition estimates
  body_fat_pct_low          NUMERIC(4,1),
  body_fat_pct_mid          NUMERIC(4,1),
  body_fat_pct_high         NUMERIC(4,1),
  lean_mass_kg              NUMERIC(5,1),
  fat_mass_kg               NUMERIC(5,1),
  ffmi                      NUMERIC(4,1),

  -- Method transparency
  estimation_method         TEXT CHECK (estimation_method IN ('navy_primary','visual_primary','calibrated','bmi_fallback')),
  overall_confidence        NUMERIC(3,2)
    CHECK (overall_confidence IS NULL OR (overall_confidence >= 0 AND overall_confidence <= 1)),
  calibrated                BOOLEAN NOT NULL DEFAULT false,

  -- Per-measurement confidence map for UI badges
  confidence_map            JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE body_scan_measurements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='body_scan_measurements' AND policyname='Users manage own scan measurements') THEN
    CREATE POLICY "Users manage own scan measurements"
      ON body_scan_measurements FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scan_measurements_user_date
  ON body_scan_measurements(user_id, scan_date DESC);

CREATE INDEX IF NOT EXISTS idx_scan_measurements_session
  ON body_scan_measurements(session_id);

-- 3. Calibration nudge events (dismissal state + history)
CREATE TABLE IF NOT EXISTS scan_calibration_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_key TEXT NOT NULL,
  first_shown_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_shown_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  shown_count INTEGER NOT NULL DEFAULT 1,
  dismissed_at TIMESTAMPTZ,
  acted_at TIMESTAMPTZ,
  UNIQUE (user_id, trigger_key)
);

ALTER TABLE scan_calibration_nudges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='scan_calibration_nudges' AND policyname='Users manage own calibration nudges') THEN
    CREATE POLICY "Users manage own calibration nudges"
      ON scan_calibration_nudges FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
