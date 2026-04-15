-- Split meal fat into regular fat and healthy fat.
-- Adds a dedicated 1 to 10 slider column for each of the four meal slots.

ALTER TABLE daily_checkins
  ADD COLUMN IF NOT EXISTS breakfast_healthy_fat SMALLINT CHECK (breakfast_healthy_fat BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS lunch_healthy_fat     SMALLINT CHECK (lunch_healthy_fat     BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS dinner_healthy_fat    SMALLINT CHECK (dinner_healthy_fat    BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS snacks_healthy_fat    SMALLINT CHECK (snacks_healthy_fat    BETWEEN 1 AND 10);
