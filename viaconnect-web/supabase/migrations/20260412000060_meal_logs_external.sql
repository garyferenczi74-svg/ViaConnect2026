-- Prompt #62j — add external tracking fields to meal_logs.
-- Enables dedup and source attribution for API-synced meals.

ALTER TABLE meal_logs
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS sync_connection_id UUID REFERENCES data_source_connections(id),
  ADD COLUMN IF NOT EXISTS genetics_guide_flags JSONB;

CREATE INDEX IF NOT EXISTS idx_meal_logs_external
  ON meal_logs (user_id, source_app, external_id);
