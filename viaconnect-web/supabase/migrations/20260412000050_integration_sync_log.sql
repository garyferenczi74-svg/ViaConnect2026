-- Prompt #62j — integration sync tracking per connection.

CREATE TABLE IF NOT EXISTS integration_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES data_source_connections(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('webhook', 'poll', 'healthkit', 'manual')),
  items_received INTEGER NOT NULL DEFAULT 0,
  items_new INTEGER NOT NULL DEFAULT 0,
  items_updated INTEGER NOT NULL DEFAULT 0,
  items_duplicate INTEGER NOT NULL DEFAULT 0,
  conflicts_resolved INTEGER NOT NULL DEFAULT 0,
  gauges_affected TEXT[],
  gordan_insights_generated BOOLEAN DEFAULT FALSE,
  helix_points_awarded INTEGER DEFAULT 0,
  latency_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_connection
  ON integration_sync_log (connection_id, synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_log_user
  ON integration_sync_log (user_id, synced_at DESC);

ALTER TABLE integration_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sync logs" ON integration_sync_log;
CREATE POLICY "Users can view own sync logs"
  ON integration_sync_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service insert sync logs" ON integration_sync_log;
CREATE POLICY "Service insert sync logs"
  ON integration_sync_log FOR INSERT
  WITH CHECK (TRUE);
