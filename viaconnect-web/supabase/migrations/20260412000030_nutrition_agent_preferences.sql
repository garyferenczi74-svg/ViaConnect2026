-- Prompt #62h — per consumer Gordan (Nutrition Agent) preferences.

CREATE TABLE IF NOT EXISTS nutrition_agent_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  detail_level TEXT NOT NULL DEFAULT 'standard' CHECK (detail_level IN ('brief', 'standard', 'detailed')),
  show_macros BOOLEAN DEFAULT TRUE,
  show_micros BOOLEAN DEFAULT FALSE,
  show_interactions BOOLEAN DEFAULT TRUE,
  show_farmceutica_recs BOOLEAN DEFAULT TRUE,
  preferred_cuisine TEXT[],
  daily_summary_enabled BOOLEAN DEFAULT TRUE,
  daily_summary_time TIME DEFAULT '20:00',
  weekly_report_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nutrition_agent_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own nutrition preferences" ON nutrition_agent_preferences;
CREATE POLICY "Users can manage own nutrition preferences"
  ON nutrition_agent_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
