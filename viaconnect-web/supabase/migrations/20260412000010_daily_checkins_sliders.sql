-- =============================================================
-- Prompt #65: Quick Daily Check-In — Slider Overhaul
-- Creates daily_checkins table for raw slider values.
-- The existing daily_score_inputs table continues to hold
-- normalized 0-100 gauge scores; this table stores the detailed
-- human-readable slider positions alongside them.
-- =============================================================

CREATE TABLE IF NOT EXISTS daily_checkins (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Sleep
  sleep_hours              NUMERIC(4,1) CHECK (sleep_hours >= 0 AND sleep_hours <= 12),
  sleep_quality_score      SMALLINT CHECK (sleep_quality_score BETWEEN 1 AND 5),
  -- Exercise
  cardio_active            BOOLEAN DEFAULT false,
  cardio_duration_min      SMALLINT CHECK (cardio_duration_min BETWEEN 5 AND 120),
  resistance_active        BOOLEAN DEFAULT false,
  resistance_duration_min  SMALLINT CHECK (resistance_duration_min BETWEEN 5 AND 120),
  -- Activity
  activity_level_score     SMALLINT CHECK (activity_level_score BETWEEN 1 AND 5),
  -- Stress
  stress_level_score       SMALLINT CHECK (stress_level_score BETWEEN 1 AND 5),
  -- Energy
  energy_recovery_score    SMALLINT CHECK (energy_recovery_score BETWEEN 1 AND 5),
  -- Meta
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, check_in_date)
);

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own checkins" ON daily_checkins;
CREATE POLICY "Users manage own checkins"
  ON daily_checkins FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date
  ON daily_checkins (user_id, check_in_date DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION daily_checkins_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_daily_checkins_updated_at ON daily_checkins;
CREATE TRIGGER trg_daily_checkins_updated_at
  BEFORE UPDATE ON daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION daily_checkins_set_updated_at();
