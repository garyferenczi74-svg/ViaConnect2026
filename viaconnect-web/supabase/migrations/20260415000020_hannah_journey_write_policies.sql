-- Phase C: enable authenticated users to write their own insights + recs.
-- Read/update policies already exist from 20260415000010.

DROP POLICY IF EXISTS "Users insert own insights" ON hannah_trend_insights;
CREATE POLICY "Users insert own insights" ON hannah_trend_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own insights" ON hannah_trend_insights;
CREATE POLICY "Users update own insights" ON hannah_trend_insights
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own recs" ON journey_recommendations;
CREATE POLICY "Users insert own recs" ON journey_recommendations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own recs" ON journey_recommendations;
CREATE POLICY "Users delete own recs" ON journey_recommendations
  FOR DELETE USING (auth.uid() = user_id);
