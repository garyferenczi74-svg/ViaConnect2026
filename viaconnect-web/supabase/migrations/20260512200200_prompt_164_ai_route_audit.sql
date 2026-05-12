-- Prompt #164 (#163 fold-in): per-request audit of every AI route hit so we
-- can see latency, error code, cost, and outcome on an admin dashboard.
--
-- The recorder (lib/observability/audit-recorder.ts) writes ONE row per
-- request, success or failure, with the request_id the route surfaced to the
-- client. Insert is infallible: failures are swallowed and logged.

CREATE TABLE IF NOT EXISTS public.ai_route_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  route TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure')),
  error_code TEXT,
  http_status INTEGER,
  input_chars INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  cost_usd NUMERIC(10,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_route_audit_user_created_idx
  ON public.ai_route_audit (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_route_audit_route_outcome_idx
  ON public.ai_route_audit (route, outcome, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_route_audit_request_id_idx
  ON public.ai_route_audit (request_id);

ALTER TABLE public.ai_route_audit ENABLE ROW LEVEL SECURITY;

-- Service-role writes only; no user policies. Admin reads from a separate
-- admin endpoint (not in scope for #164 fold-in).
