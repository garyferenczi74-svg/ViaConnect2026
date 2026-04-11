-- Prompt #62d — Helix Rewards score event log.
-- Additive only; no existing tables touched.

CREATE TABLE IF NOT EXISTS helix_score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'score_improvement',
    'score_milestone',
    'daily_achievement',
    'streak_bonus',
    'weekly_progress',
    'onboarding_bonus',
    'protocol_adherence'
  )),
  gauge_id TEXT,
  points_base INTEGER NOT NULL,
  tier_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  points_awarded INTEGER NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  event_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Frequency-cap unique indexes (one per (user, event, gauge, date) tuple)
CREATE UNIQUE INDEX IF NOT EXISTS idx_helix_score_events_daily
  ON helix_score_events (user_id, event_type, gauge_id, event_date)
  WHERE gauge_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_helix_score_events_daily_composite
  ON helix_score_events (user_id, event_type, event_date)
  WHERE gauge_id IS NULL;

ALTER TABLE helix_score_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own score events" ON helix_score_events;
CREATE POLICY "Users can view own score events"
  ON helix_score_events FOR SELECT
  USING (auth.uid() = user_id);
