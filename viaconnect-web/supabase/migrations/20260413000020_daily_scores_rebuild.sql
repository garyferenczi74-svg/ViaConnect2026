-- Prompt #68 — Daily Score Gauges Rebuild.
-- wearable_data + daily_scores tables. daily_checkins and meal_logs
-- already exist from earlier migrations; not recreated here.

CREATE TABLE IF NOT EXISTS wearable_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL,
  sleep_duration_minutes INTEGER,
  deep_sleep_minutes INTEGER,
  rem_sleep_minutes INTEGER,
  light_sleep_minutes INTEGER,
  sleep_score INTEGER,
  resting_heart_rate INTEGER,
  hrv_ms NUMERIC(5,1),
  spo2_percent NUMERIC(4,1),
  readiness_score INTEGER,
  steps INTEGER,
  active_minutes INTEGER,
  calories_burned INTEGER,
  hr_zone_minutes JSONB,
  stress_score INTEGER,
  raw_data JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, data_date, source)
);

CREATE TABLE IF NOT EXISTS daily_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sleep_score INTEGER CHECK (sleep_score BETWEEN 0 AND 100),
  energy_score INTEGER CHECK (energy_score BETWEEN 0 AND 100),
  mood_stress_score INTEGER CHECK (mood_stress_score BETWEEN 0 AND 100),
  nutrition_score INTEGER CHECK (nutrition_score BETWEEN 0 AND 100),
  activity_score INTEGER CHECK (activity_score BETWEEN 0 AND 100),
  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  data_mode TEXT NOT NULL CHECK (data_mode IN ('manual', 'wearable', 'combined')),
  manual_completeness NUMERIC(3,2) DEFAULT 0,
  wearable_completeness NUMERIC(3,2) DEFAULT 0,
  source_breakdown JSONB,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, score_date)
);

ALTER TABLE wearable_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own wearable data" ON wearable_data;
CREATE POLICY "Users can manage own wearable data" ON wearable_data
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own daily scores" ON daily_scores;
CREATE POLICY "Users can manage own daily scores" ON daily_scores
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wearable_data_user_date ON wearable_data(user_id, data_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_scores_user_date ON daily_scores(user_id, score_date DESC);
