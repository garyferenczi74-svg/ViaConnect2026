-- Prompt 170j §9.2: per-operation voice edit telemetry (10% sampled in prod).
-- Append-only. No operation arguments (food names, portions) stored.
-- Service-role inserts only.

CREATE TABLE IF NOT EXISTS public.voice_edit_operations_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.voice_edit_sessions(id) ON DELETE CASCADE,
  op_kind TEXT NOT NULL,
  confidence NUMERIC(5, 4),
  outcome TEXT NOT NULL
    CHECK (outcome IN ('applied', 'rejected', 'clarification_needed', 'disambiguation_resolved', 'failed')),
  parse_success BOOLEAN NOT NULL,
  apply_latency_ms INT,
  was_undone BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_operations_session
  ON public.voice_edit_operations_log(session_id);

CREATE INDEX IF NOT EXISTS idx_voice_operations_kind
  ON public.voice_edit_operations_log(op_kind, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_operations_outcome
  ON public.voice_edit_operations_log(outcome, created_at DESC);

ALTER TABLE public.voice_edit_operations_log ENABLE ROW LEVEL SECURITY;
-- No client-visible policies. Service-role only.
