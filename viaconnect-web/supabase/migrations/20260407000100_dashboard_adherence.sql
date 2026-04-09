-- =============================================================
-- Prompt #56: Dashboard — Today's Protocol adherence tracking
-- Stores per-supplement check-off events for the consumer dashboard.
-- daily_score_cache is intentionally NOT created — bio_optimization_history
-- already serves that role and is wired into useUserDashboardData.
-- =============================================================

CREATE TABLE IF NOT EXISTS protocol_adherence_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug TEXT NOT NULL,
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning','midday','afternoon','evening','bedtime','asNeeded')),
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_slug, scheduled_date, time_of_day)
);

ALTER TABLE protocol_adherence_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own adherence" ON protocol_adherence_log;
CREATE POLICY "Users manage own adherence"
  ON protocol_adherence_log
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_adherence_user_date
  ON protocol_adherence_log(user_id, scheduled_date DESC);

CREATE INDEX IF NOT EXISTS idx_adherence_user_completed
  ON protocol_adherence_log(user_id, completed)
  WHERE completed = true;

-- updated_at trigger
CREATE OR REPLACE FUNCTION protocol_adherence_log_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protocol_adherence_log_updated_at ON protocol_adherence_log;
CREATE TRIGGER trg_protocol_adherence_log_updated_at
  BEFORE UPDATE ON protocol_adherence_log
  FOR EACH ROW
  EXECUTE FUNCTION protocol_adherence_log_set_updated_at();
