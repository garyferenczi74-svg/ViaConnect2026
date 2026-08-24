-- Prompt 214a: Jeffery synchronism pipeline_runs log (append-only).
-- One logical run per day (run_id = sync-YYYY-MM-DD). Stages stored as jsonb.

CREATE TABLE IF NOT EXISTS public.pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL,
  run_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('ok', 'partial', 'failed')),
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pipeline_runs_run_id
  ON public.pipeline_runs (run_id);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_run_date
  ON public.pipeline_runs (run_date DESC);

ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Service role / admin only (no consumer policies). Matches agent_heartbeats posture.
DROP POLICY IF EXISTS "pipeline_runs service read" ON public.pipeline_runs;
-- Intentionally no authenticated SELECT policy: ACC reads via service/admin client.

COMMENT ON TABLE public.pipeline_runs IS
  'Prompt 214a Jeffery daily synchronism chain logs. Idempotent on run_id.';
