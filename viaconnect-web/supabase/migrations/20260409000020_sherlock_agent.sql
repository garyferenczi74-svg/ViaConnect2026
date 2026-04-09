-- =============================================================
-- Prompt #61b: Sherlock — Research Hub Intelligence Agent
-- 5 tables, RLS, indexes, agent registry entry, initial state.
-- Sherlock reports to Jeffery (jeffery_master) and runs every 6h.
-- =============================================================

-- ─── 1. Sherlock task queue (audit + workload) ─────────────
CREATE TABLE IF NOT EXISTS sherlock_task_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type     TEXT NOT NULL CHECK (task_type IN (
                  'fetch_sources','score_relevance','generate_alerts',
                  'trend_detect','deduplicate','curate_daily_feed','refresh_source_meta'
                )),
  category_id   UUID REFERENCES research_hub_categories(id),
  priority      INT NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                  'pending','in_progress','completed','failed','escalated_to_jeffery'
                )),
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  result        JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  assigned_at   TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. Activity log (audit trail) ──────────────────────────
CREATE TABLE IF NOT EXISTS sherlock_activity_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID REFERENCES sherlock_task_queue(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,
  details         JSONB NOT NULL DEFAULT '{}'::jsonb,
  items_processed INT NOT NULL DEFAULT 0,
  duration_ms     INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. Escalations (Sherlock → Jeffery) ───────────────────
CREATE TABLE IF NOT EXISTS sherlock_escalations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID REFERENCES sherlock_task_queue(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  escalation_type TEXT NOT NULL CHECK (escalation_type IN (
                    'protocol_suggestion','interaction_warning','cross_engine_update',
                    'data_conflict','safety_flag'
                  )),
  reason          TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  jeffery_response JSONB,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                    'pending','acknowledged','resolved','dismissed'
                  )),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);

-- ─── 4. Agent state (singleton) ─────────────────────────────
CREATE TABLE IF NOT EXISTS sherlock_agent_state (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active                BOOLEAN NOT NULL DEFAULT true,
  last_heartbeat           TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_task_id          UUID REFERENCES sherlock_task_queue(id),
  tasks_completed_today    INT NOT NULL DEFAULT 0,
  items_discovered_today   INT NOT NULL DEFAULT 0,
  alerts_generated_today   INT NOT NULL DEFAULT 0,
  escalations_today        INT NOT NULL DEFAULT 0,
  daily_reset_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  config                   JSONB NOT NULL DEFAULT '{
    "fetch_interval_minutes": 360,
    "max_items_per_fetch": 50,
    "relevance_alert_threshold": 90,
    "max_daily_alerts_per_user": 10,
    "dedup_similarity_threshold": 0.85,
    "trend_min_source_count": 3
  }'::jsonb
);

-- ─── 5. Detected trends ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS sherlock_trends (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic          TEXT NOT NULL,
  topic_keywords TEXT[] NOT NULL DEFAULT '{}',
  source_count   INT NOT NULL DEFAULT 0,
  item_ids       UUID[] NOT NULL DEFAULT '{}',
  first_seen     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen      TIMESTAMPTZ NOT NULL DEFAULT now(),
  trend_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (topic)
);

-- ─── RLS ────────────────────────────────────────────────────
ALTER TABLE sherlock_task_queue   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sherlock_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sherlock_escalations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sherlock_agent_state  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sherlock_trends       ENABLE ROW LEVEL SECURITY;

-- Public-readable singleton state + trends
DROP POLICY IF EXISTS "Sherlock state readable by all" ON sherlock_agent_state;
CREATE POLICY "Sherlock state readable by all" ON sherlock_agent_state FOR SELECT USING (true);

DROP POLICY IF EXISTS "Sherlock trends readable by all" ON sherlock_trends;
CREATE POLICY "Sherlock trends readable by all" ON sherlock_trends FOR SELECT USING (true);

-- Per-user scoped reads
DROP POLICY IF EXISTS "Users see own sherlock tasks" ON sherlock_task_queue;
CREATE POLICY "Users see own sherlock tasks" ON sherlock_task_queue FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own sherlock activity" ON sherlock_activity_log;
CREATE POLICY "Users see own sherlock activity" ON sherlock_activity_log FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own sherlock escalations" ON sherlock_escalations;
CREATE POLICY "Users see own sherlock escalations" ON sherlock_escalations FOR SELECT
  USING (auth.uid() = user_id);

-- Service role manages everything (edge function uses service key)
DROP POLICY IF EXISTS "Service manages sherlock tasks" ON sherlock_task_queue;
CREATE POLICY "Service manages sherlock tasks" ON sherlock_task_queue FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service manages sherlock activity" ON sherlock_activity_log;
CREATE POLICY "Service manages sherlock activity" ON sherlock_activity_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service manages sherlock escalations" ON sherlock_escalations;
CREATE POLICY "Service manages sherlock escalations" ON sherlock_escalations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service manages sherlock state" ON sherlock_agent_state;
CREATE POLICY "Service manages sherlock state" ON sherlock_agent_state FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service manages sherlock trends" ON sherlock_trends;
CREATE POLICY "Service manages sherlock trends" ON sherlock_trends FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sherlock_task_status     ON sherlock_task_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_sherlock_task_user       ON sherlock_task_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sherlock_activity_user   ON sherlock_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sherlock_escal_status    ON sherlock_escalations(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_sherlock_trends_active   ON sherlock_trends(is_active, trend_score DESC);

-- ─── Initial agent state (singleton) ────────────────────────
INSERT INTO sherlock_agent_state (is_active)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM sherlock_agent_state);

-- ─── Register Sherlock with Jeffery's agent registry ───────
INSERT INTO ultrathink_agent_registry (
  agent_name, display_name, origin_prompt, agent_type, tier, description, reports,
  runtime_kind, runtime_handle, expected_period_minutes, is_active, is_critical
) VALUES (
  'sherlock_research_hub',
  'Sherlock Research Hub Agent',
  'Prompt #61b',
  'research',
  2,
  'Discovers and scores research content per user wellness profile. Reports to Jeffery via sherlock_escalations + jeffery_log_decision.',
  'jeffery_master',
  'edge_function',
  'sherlock-research-hub',
  360,
  true,
  false
)
ON CONFLICT (agent_name) DO UPDATE SET
  description = EXCLUDED.description,
  reports = EXCLUDED.reports,
  expected_period_minutes = EXCLUDED.expected_period_minutes,
  is_active = EXCLUDED.is_active,
  updated_at = now();
