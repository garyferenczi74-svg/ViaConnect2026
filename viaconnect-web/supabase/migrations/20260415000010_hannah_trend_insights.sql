-- Hannah trend insights cache + journey recommendations
-- Bio Optimization Trend tab (analytics page)

CREATE TABLE IF NOT EXISTS hannah_trend_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  time_range TEXT NOT NULL CHECK (time_range IN ('7D','4W','3M','1Y')),
  greeting TEXT NOT NULL,
  analysis TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  focus_area TEXT NOT NULL,
  estimated_impact JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  model_version TEXT DEFAULT 'v1',
  UNIQUE(user_id, time_range)
);
ALTER TABLE hannah_trend_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own insights" ON hannah_trend_insights;
CREATE POLICY "Users read own insights" ON hannah_trend_insights
  FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_hannah_insights_user_range
  ON hannah_trend_insights(user_id, time_range);

CREATE TABLE IF NOT EXISTS journey_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  estimated_impact NUMERIC NOT NULL,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','dismissed','expired')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);
ALTER TABLE journey_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own recs" ON journey_recommendations;
CREATE POLICY "Users read own recs" ON journey_recommendations
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own recs" ON journey_recommendations;
CREATE POLICY "Users update own recs" ON journey_recommendations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_journey_recs_user_status
  ON journey_recommendations(user_id, status, priority DESC);
