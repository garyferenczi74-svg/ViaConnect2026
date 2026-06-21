-- Prompt 208 v2, Phase 6: per-agent heartbeat so a stalled loop is visible in the
-- internal health panel rather than silently dead. One row per agent, upserted on
-- each beat. Service-role only (the health panel reads it server-side). Append-only.
CREATE TABLE IF NOT EXISTS public.agent_heartbeats (
  agent text PRIMARY KEY,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','degraded','error')),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_beat_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_heartbeats ENABLE ROW LEVEL SECURITY;
-- No authenticated policy: reads/writes are service-role only.
