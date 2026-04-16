-- =============================================================
-- Prompt #86A: Body Tracker Manual Input System
-- Extends existing body_tracker_* tables so manual entries are
-- first-class (identical treatment to API/device data).
-- Append-only; no existing columns, constraints, or policies touched.
-- =============================================================

-- 1. body_tracker_entries: manual source tracking, scan photo, context
ALTER TABLE body_tracker_entries
  ADD COLUMN IF NOT EXISTS manual_source_id   TEXT,
  ADD COLUMN IF NOT EXISTS manual_source_tier TEXT,
  ADD COLUMN IF NOT EXISTS confidence         NUMERIC(3,2) DEFAULT 0.70
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  ADD COLUMN IF NOT EXISTS scan_photo_url     TEXT,
  ADD COLUMN IF NOT EXISTS condition_context  TEXT DEFAULT 'resting',
  ADD COLUMN IF NOT EXISTS time_of_day        TEXT;

-- 2. body_tracker_weight: add calves, generated waist-to-hip ratio,
--    composition summary fields, time_of_day carried on entry header
ALTER TABLE body_tracker_weight
  ADD COLUMN IF NOT EXISTS right_calf_in            NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS left_calf_in             NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS lean_body_mass_lbs       NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS bone_mass_lbs            NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS basal_metabolic_rate     INTEGER,
  ADD COLUMN IF NOT EXISTS total_body_water_liters  NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS protein_lbs              NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS mineral_lbs              NUMERIC(4,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'body_tracker_weight'
      AND column_name  = 'waist_to_hip_ratio'
  ) THEN
    ALTER TABLE body_tracker_weight
      ADD COLUMN waist_to_hip_ratio NUMERIC(4,2)
      GENERATED ALWAYS AS (
        CASE
          WHEN hips_in IS NULL OR hips_in = 0 THEN NULL
          WHEN waist_in IS NULL THEN NULL
          ELSE ROUND(waist_in / hips_in, 2)
        END
      ) STORED;
  END IF;
END $$;

-- 3. body_tracker_segmental_fat: additional scan-derived fields
ALTER TABLE body_tracker_segmental_fat
  ADD COLUMN IF NOT EXISTS visceral_fat_rating   INTEGER,
  ADD COLUMN IF NOT EXISTS body_water_pct        NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS subcutaneous_fat_pct  NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS fat_mass_lbs          NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS bone_mineral_density  NUMERIC(5,3);

-- 4. body_tracker_segmental_muscle: SMM %, grip strength, muscle quality
ALTER TABLE body_tracker_segmental_muscle
  ADD COLUMN IF NOT EXISTS smm_pct                    NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS grip_strength_right_lbs    NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS grip_strength_left_lbs     NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS muscle_quality_score       NUMERIC(4,1);

-- 5. body_tracker_metabolic: BP, temp, SpO2, respiratory, VO2, HR context
ALTER TABLE body_tracker_metabolic
  ADD COLUMN IF NOT EXISTS systolic_bp         INTEGER,
  ADD COLUMN IF NOT EXISTS diastolic_bp        INTEGER,
  ADD COLUMN IF NOT EXISTS body_temperature_f  NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS blood_oxygen_pct    NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS respiratory_rate    INTEGER,
  ADD COLUMN IF NOT EXISTS vo2_max             NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS max_hr_measured     INTEGER,
  ADD COLUMN IF NOT EXISTS recovery_hr         INTEGER,
  ADD COLUMN IF NOT EXISTS basal_metabolic_rate_kcal INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'body_tracker_metabolic'
      AND column_name  = 'bp_classification'
  ) THEN
    ALTER TABLE body_tracker_metabolic
      ADD COLUMN bp_classification TEXT
      GENERATED ALWAYS AS (
        CASE
          WHEN systolic_bp IS NULL OR diastolic_bp IS NULL THEN NULL
          WHEN systolic_bp > 180 OR diastolic_bp > 120      THEN 'Hypertensive Crisis'
          WHEN systolic_bp >= 140 OR diastolic_bp >= 90     THEN 'High BP Stage 2'
          WHEN systolic_bp >= 130 OR diastolic_bp >= 80     THEN 'High BP Stage 1'
          WHEN systolic_bp >= 120                            THEN 'Elevated'
          ELSE 'Normal'
        END
      ) STORED;
  END IF;
END $$;

-- 6. body_tracker_milestones: rate preference + status timestamps
--    (reusing existing table instead of creating body_tracker_goals)
ALTER TABLE body_tracker_milestones
  ADD COLUMN IF NOT EXISTS rate_preference   TEXT,
  ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS achieved_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS maintained_since  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bt_milestones_user_status
  ON body_tracker_milestones(user_id, status);

-- 7. profiles: user unit-system preference
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS unit_system TEXT DEFAULT 'imperial'
    CHECK (unit_system IN ('imperial','metric'));

-- 8. Storage bucket for scan photos + RLS policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'body-tracker-scans',
  'body-tracker-scans',
  false,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users upload own body tracker scans'
  ) THEN
    CREATE POLICY "Users upload own body tracker scans"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'body-tracker-scans'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users view own body tracker scans'
  ) THEN
    CREATE POLICY "Users view own body tracker scans"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'body-tracker-scans'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users update own body tracker scans'
  ) THEN
    CREATE POLICY "Users update own body tracker scans"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'body-tracker-scans'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users delete own body tracker scans'
  ) THEN
    CREATE POLICY "Users delete own body tracker scans"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'body-tracker-scans'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- 9. Supporting indexes for manual-source querying
CREATE INDEX IF NOT EXISTS idx_bt_entries_manual_source
  ON body_tracker_entries(user_id, manual_source_id)
  WHERE manual_source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bt_entries_scan_photo
  ON body_tracker_entries(user_id, created_at DESC)
  WHERE scan_photo_url IS NOT NULL;
