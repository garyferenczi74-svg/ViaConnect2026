-- =============================================================
-- Prompt #85: Arnold Ecosystem
-- body_tracker_connections, arnold_recommendations,
-- arnold_user_profiles, arnold_cohort_patterns,
-- agent_messages, body_tracker_reconciliation_log,
-- + columns on body_tracker_entries.
-- =============================================================

-- 1. body_tracker_connections
CREATE TABLE IF NOT EXISTS body_tracker_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('plugin','wearable')),
  source_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  connection_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, source_id)
);

ALTER TABLE body_tracker_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own connections"
  ON body_tracker_connections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. arnold_recommendations
CREATE TABLE IF NOT EXISTS arnold_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  acted_on_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'milestone','pattern','cohort','supplement','streak','recovery','genetics'
  )),
  priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 3),
  related_milestone_id UUID REFERENCES body_tracker_milestones(id) ON DELETE SET NULL,
  suggested_action TEXT,
  supporting_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcome TEXT CHECK (outcome IN ('positive','neutral','negative','unknown')),
  outcome_notes TEXT,
  ai_generated BOOLEAN NOT NULL DEFAULT true,
  ai_model TEXT,
  ai_prompt_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arnold_recs_user_scheduled
  ON arnold_recommendations(user_id, scheduled_for DESC);

CREATE INDEX IF NOT EXISTS idx_arnold_recs_outcome
  ON arnold_recommendations(outcome)
  WHERE outcome IS NOT NULL;

ALTER TABLE arnold_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own recommendations"
  ON arnold_recommendations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own recommendations"
  ON arnold_recommendations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. arnold_user_profiles
CREATE TABLE IF NOT EXISTS arnold_user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coaching_tone TEXT NOT NULL DEFAULT 'balanced' CHECK (coaching_tone IN (
    'gentle','balanced','direct','intense'
  )),
  hit_rate NUMERIC(3,2),
  effectiveness_rate NUMERIC(3,2),
  preferred_categories TEXT[],
  preferred_delivery_hour INTEGER,
  notification_opt_in BOOLEAN NOT NULL DEFAULT false,
  max_recs_per_day INTEGER NOT NULL DEFAULT 3,
  trust_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  outlier_z_threshold NUMERIC(3,2) NOT NULL DEFAULT 3.00,
  active_experiments JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE arnold_user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own arnold profile"
  ON arnold_user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. arnold_cohort_patterns
CREATE TABLE IF NOT EXISTS arnold_cohort_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL,
  pattern_description TEXT NOT NULL,
  cohort_criteria JSONB,
  sample_size INTEGER,
  confidence_score NUMERIC(3,2),
  effect_size NUMERIC(5,2),
  observation_data JSONB,
  derived_recommendation TEXT,
  first_observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validation_count INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cohort_active_confidence
  ON arnold_cohort_patterns(is_active, confidence_score DESC);

ALTER TABLE arnold_cohort_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read cohort patterns"
  ON arnold_cohort_patterns
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. agent_messages
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent TEXT NOT NULL CHECK (from_agent IN (
    'arnold','hannah','jeffery','michelangelo','sherlock'
  )),
  to_agent TEXT NOT NULL CHECK (to_agent IN (
    'arnold','hannah','jeffery','michelangelo','sherlock','all'
  )),
  message_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','acknowledged','in_progress','resolved','rejected'
  )),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_msgs_to_status
  ON agent_messages(to_agent, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_agent_msgs_user
  ON agent_messages(user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own agent messages"
  ON agent_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- 6. body_tracker_reconciliation_log
CREATE TABLE IF NOT EXISTS body_tracker_reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'stored','duplicate_skipped','conflict_resolved','outlier_flagged','averaged'
  )),
  primary_entry_id UUID REFERENCES body_tracker_entries(id) ON DELETE SET NULL,
  conflicting_entry_id UUID REFERENCES body_tracker_entries(id) ON DELETE SET NULL,
  source TEXT,
  source_id TEXT,
  reconciliation_decision JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE body_tracker_reconciliation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own reconciliation log"
  ON body_tracker_reconciliation_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- 7. ALTER body_tracker_entries: new columns
ALTER TABLE body_tracker_entries ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE body_tracker_entries ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE body_tracker_entries ADD COLUMN IF NOT EXISTS is_outlier BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE body_tracker_entries ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_bt_entries_active
  ON body_tracker_entries(user_id, is_active, entry_date DESC);
