-- Add hydration tracking to daily_checkins for the Meal Log water section.
-- The scoring engine (dailyScoreEngineV2) already reads hydration_glasses
-- into the Nutrition gauge computation.

ALTER TABLE daily_checkins
  ADD COLUMN IF NOT EXISTS hydration_glasses SMALLINT CHECK (hydration_glasses BETWEEN 0 AND 20);
