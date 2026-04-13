-- Prompt #62e — CAQ-derived baseline scores per gauge.
-- Used as fallback (Tier 5) when no live data exists.
-- Populated during onboarding from Phase 7 Lifestyle responses.

CREATE TABLE IF NOT EXISTS caq_gauge_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gauge_id TEXT NOT NULL CHECK (
    gauge_id IN ('sleep', 'exercise', 'steps', 'stress', 'recovery', 'streak', 'supplements', 'nutrition')
  ),
  baseline_score INTEGER NOT NULL DEFAULT 50 CHECK (baseline_score BETWEEN 0 AND 100),
  derived_from JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, gauge_id)
);

ALTER TABLE caq_gauge_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own baselines" ON caq_gauge_baselines;
CREATE POLICY "Users can view own baselines"
  ON caq_gauge_baselines FOR SELECT
  USING (auth.uid() = user_id);
