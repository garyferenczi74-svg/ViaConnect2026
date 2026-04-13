-- Prompt #62e — lightweight in-app meal log entries.
-- Supports quick-log, photo AI, manual entry, and API sync methods.

CREATE TABLE IF NOT EXISTS meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  log_method TEXT NOT NULL CHECK (log_method IN ('quick', 'photo_ai', 'manual', 'api_sync')),
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 4),
  description TEXT,
  photo_url TEXT,
  ai_analysis JSONB,
  calories INTEGER,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  source_app TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date
  ON meal_logs (user_id, meal_date);

ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own meal logs" ON meal_logs;
CREATE POLICY "Users can manage own meal logs"
  ON meal_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
