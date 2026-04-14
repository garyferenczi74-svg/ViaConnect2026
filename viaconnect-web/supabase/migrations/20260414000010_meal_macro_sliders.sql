-- Prompt #79 — per-meal macro sliders on daily_checkins.
-- Protein, carbs, fat, sugar (1-10) + computed score (0-100) for each
-- of the 4 meal tabs (breakfast, lunch, dinner, snacks). Append only.

ALTER TABLE daily_checkins
  ADD COLUMN IF NOT EXISTS breakfast_protein SMALLINT CHECK (breakfast_protein BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS breakfast_carbs   SMALLINT CHECK (breakfast_carbs   BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS breakfast_fat     SMALLINT CHECK (breakfast_fat     BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS breakfast_sugar   SMALLINT CHECK (breakfast_sugar   BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS breakfast_score   SMALLINT CHECK (breakfast_score   BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS lunch_protein     SMALLINT CHECK (lunch_protein     BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS lunch_carbs       SMALLINT CHECK (lunch_carbs       BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS lunch_fat         SMALLINT CHECK (lunch_fat         BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS lunch_sugar       SMALLINT CHECK (lunch_sugar       BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS lunch_score       SMALLINT CHECK (lunch_score       BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS dinner_protein    SMALLINT CHECK (dinner_protein    BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS dinner_carbs      SMALLINT CHECK (dinner_carbs      BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS dinner_fat        SMALLINT CHECK (dinner_fat        BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS dinner_sugar      SMALLINT CHECK (dinner_sugar      BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS dinner_score      SMALLINT CHECK (dinner_score      BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS snacks_protein    SMALLINT CHECK (snacks_protein    BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS snacks_carbs      SMALLINT CHECK (snacks_carbs      BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS snacks_fat        SMALLINT CHECK (snacks_fat        BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS snacks_sugar      SMALLINT CHECK (snacks_sugar      BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS snacks_score      SMALLINT CHECK (snacks_score      BETWEEN 0 AND 100);
