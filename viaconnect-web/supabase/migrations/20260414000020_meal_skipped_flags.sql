-- Meal skipped flags for daily_checkins.
-- Each boolean marks that the user explicitly opted out of a meal today,
-- so nutrition scoring and the 4/4 tracker can distinguish "skipped"
-- from "not yet logged".

ALTER TABLE daily_checkins
  ADD COLUMN IF NOT EXISTS breakfast_skipped BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lunch_skipped     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dinner_skipped    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS snacks_skipped    BOOLEAN NOT NULL DEFAULT FALSE;
