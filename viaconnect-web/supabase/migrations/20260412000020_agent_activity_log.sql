-- Prompt #62h — agent activity tracking for Gordan (and future agents).
-- Logs every AI agent call with token usage, latency, and success.

CREATE TABLE IF NOT EXISTS agent_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL DEFAULT 'gordan',
  task TEXT NOT NULL,
  input_summary TEXT,
  output_summary TEXT,
  tokens_used INTEGER,
  latency_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_activity_user
  ON agent_activity_log (user_id, agent_id, created_at DESC);

ALTER TABLE agent_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own agent activity" ON agent_activity_log;
CREATE POLICY "Users can view own agent activity"
  ON agent_activity_log FOR SELECT
  USING (auth.uid() = user_id);

-- Allow service role and server-side inserts (agent routes run server-side)
DROP POLICY IF EXISTS "Service insert agent activity" ON agent_activity_log;
CREATE POLICY "Service insert agent activity"
  ON agent_activity_log FOR INSERT
  WITH CHECK (TRUE);
