-- Prompt #62g — saved meals library for one-tap re-logging.
-- Additive only; no existing tables touched.

CREATE TABLE IF NOT EXISTS saved_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  photo_url TEXT,
  items JSONB NOT NULL,
  totals JSONB NOT NULL,
  micronutrients JSONB,
  meal_quality_score INTEGER,
  times_logged INTEGER DEFAULT 1,
  last_logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_saved_meals_user
  ON saved_meals (user_id, times_logged DESC);

ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own saved meals" ON saved_meals;
CREATE POLICY "Users can manage own saved meals"
  ON saved_meals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
