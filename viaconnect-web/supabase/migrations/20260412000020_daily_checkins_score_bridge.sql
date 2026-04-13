-- =============================================================
-- Prompt #66: Check-in Score Bridge columns on daily_checkins
-- Stores the merged day score + per-dimension source attribution.
-- =============================================================

ALTER TABLE daily_checkins
  ADD COLUMN IF NOT EXISTS day_score            SMALLINT CHECK (day_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS sleep_source         TEXT CHECK (sleep_source IN ('wearable','checkin')),
  ADD COLUMN IF NOT EXISTS activity_source      TEXT CHECK (activity_source IN ('wearable','checkin')),
  ADD COLUMN IF NOT EXISTS stress_source        TEXT CHECK (stress_source IN ('wearable','checkin')),
  ADD COLUMN IF NOT EXISTS recovery_source      TEXT CHECK (recovery_source IN ('wearable','checkin')),
  ADD COLUMN IF NOT EXISTS score_calculated_at  TIMESTAMPTZ;

COMMENT ON COLUMN daily_checkins.day_score IS
  'Merged Bio Optimization day score (0-100); recalculated after each check-in save or wearable sync';
COMMENT ON COLUMN daily_checkins.sleep_source IS
  'Which data source provided the sleep dimension: wearable or checkin';
