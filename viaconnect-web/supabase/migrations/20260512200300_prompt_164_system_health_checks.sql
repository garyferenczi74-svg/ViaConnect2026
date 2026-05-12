-- Prompt #164 (#163 fold-in): rolling log of provider ping results.
-- /api/admin/health/ai-stack writes one row per checked provider per ping.
-- The most recent row per check_name is the current status.

CREATE TABLE IF NOT EXISTS public.system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  latency_ms INTEGER,
  error_code TEXT,
  error_message TEXT,
  metadata JSONB,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS system_health_checks_name_checked_idx
  ON public.system_health_checks (check_name, checked_at DESC);

ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;
