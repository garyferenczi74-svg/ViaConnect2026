-- Prompt #62d — wearable / app data source connections + raw score inputs.
-- Additive only; no existing tables touched.

CREATE TABLE IF NOT EXISTS data_source_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (
    source_type IN ('wearable', 'nutrition_app', 'fitness_app', 'mindfulness_app')
  ),
  source_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, source_id)
);

CREATE TABLE IF NOT EXISTS daily_score_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gauge_id TEXT NOT NULL CHECK (
    gauge_id IN ('sleep', 'exercise', 'steps', 'stress', 'recovery', 'streak', 'supplements', 'nutrition')
  ),
  source_id TEXT NOT NULL,
  tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 5),
  raw_value NUMERIC NOT NULL,
  normalized_score INTEGER NOT NULL CHECK (normalized_score BETWEEN 0 AND 100),
  confidence NUMERIC NOT NULL DEFAULT 1.0 CHECK (confidence BETWEEN 0 AND 1),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (user_id, gauge_id, source_id, score_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_score_inputs_user_date
  ON daily_score_inputs (user_id, score_date);

CREATE INDEX IF NOT EXISTS idx_data_source_connections_user
  ON data_source_connections (user_id, is_active);

ALTER TABLE data_source_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_score_inputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own connections" ON data_source_connections;
CREATE POLICY "Users can manage own connections"
  ON data_source_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own score inputs" ON daily_score_inputs;
CREATE POLICY "Users can manage own score inputs"
  ON daily_score_inputs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
