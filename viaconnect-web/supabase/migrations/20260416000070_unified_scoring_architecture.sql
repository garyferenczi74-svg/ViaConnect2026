-- Prompt #86 — Unified Scoring Architecture database additions

-- 1. wellness_scoring_config: admin-adjustable weight definitions
CREATE TABLE IF NOT EXISTS wellness_scoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  layer TEXT NOT NULL,
  base_weight DECIMAL(4,2) NOT NULL,
  adjustment_rules JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category, layer)
);

ALTER TABLE wellness_scoring_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scoring_config_service_manage" ON wellness_scoring_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "scoring_config_read" ON wellness_scoring_config
  FOR SELECT TO authenticated USING (true);

-- 2. scoring_audit_log: immutable calculation history
CREATE TABLE IF NOT EXISTS scoring_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  trigger_event TEXT NOT NULL,
  active_layers TEXT[] NOT NULL,
  confidence_tier TEXT NOT NULL,
  confidence_pct INTEGER NOT NULL,
  scores JSONB NOT NULL,
  input_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scoring_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_user_read" ON scoring_audit_log
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "audit_log_service_manage" ON scoring_audit_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_scoring_audit_user_time
  ON scoring_audit_log(user_id, calculated_at DESC);

-- 3. Extend wellness_analytics with unified scoring columns
ALTER TABLE wellness_analytics
  ADD COLUMN IF NOT EXISTS unified_scores JSONB,
  ADD COLUMN IF NOT EXISTS confidence_tier TEXT,
  ADD COLUMN IF NOT EXISTS confidence_pct INTEGER,
  ADD COLUMN IF NOT EXISTS active_layers TEXT[],
  ADD COLUMN IF NOT EXISTS missing_layers TEXT[],
  ADD COLUMN IF NOT EXISTS top_category TEXT,
  ADD COLUMN IF NOT EXISTS low_category TEXT,
  ADD COLUMN IF NOT EXISTS scoring_version TEXT DEFAULT 'v1';
