-- Prompt #84 — Nutrition Gauge Independence
-- Add scoring columns to meal_logs so meal data lives exclusively in
-- meal_logs and never collides with daily_checkins check-in fields.
-- Also enforce one entry per user + meal + date.

-- 1. New columns for macro-slider scores and data
ALTER TABLE meal_logs
  ADD COLUMN IF NOT EXISTS meal_score INTEGER CHECK (meal_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS macro_sliders JSONB;

-- 2. Deduplicate: keep the row with the latest created_at per
--    (user, meal, date) so the UNIQUE constraint can be applied.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, meal_type, meal_date
           ORDER BY created_at DESC
         ) AS rn
  FROM meal_logs
)
DELETE FROM meal_logs
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 3. One entry per meal per day per user — upsert replaces old entries
ALTER TABLE meal_logs
  ADD CONSTRAINT unique_meal_per_user_day
  UNIQUE (user_id, meal_type, meal_date);
