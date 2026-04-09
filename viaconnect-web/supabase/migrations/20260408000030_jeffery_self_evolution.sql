-- =============================================================================
-- Jeffery™ Self-Evolution (Prompt #60 v3 — Layer 9)
-- =============================================================================
-- Two new tables that turn the Ultrathink orchestrator into Jeffery™:
--   1. ultrathink_jeffery_decisions  — every decision Jeffery makes, logged
--      for self-review (audit trail of his reasoning + auto-tuning)
--   2. ultrathink_jeffery_evolution  — weekly performance snapshots, scaling
--      milestone events, and versioned self-modifications with outcomes
--
-- Plus 2 helper RPCs:
--   jeffery_log_decision  — uniform decision-logging from anywhere
--   jeffery_log_evolution — weekly snapshots with auto-computed delta_pct
--
-- The Prompt #61 admin dashboard reads from these tables.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ultrathink_jeffery_decisions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          uuid NOT NULL,
  decision_type   text NOT NULL CHECK (decision_type IN (
                    'dispatch_feed','dispatch_internal_agent','skip_feed',
                    'auto_tune','scaling_review','flag_agent',
                    'self_modification','feedback_loop','health_action','custom')),
  target_agent    text,
  rationale       text NOT NULL,
  inputs          jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome         jsonb,
  reviewed_at     timestamptz,
  was_correct     boolean,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_utjd_run        ON public.ultrathink_jeffery_decisions (run_id);
CREATE INDEX IF NOT EXISTS idx_utjd_type_time  ON public.ultrathink_jeffery_decisions (decision_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_utjd_unreviewed ON public.ultrathink_jeffery_decisions (created_at DESC) WHERE reviewed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.ultrathink_jeffery_evolution (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type          text NOT NULL CHECK (entry_type IN (
                        'weekly_summary','agent_snapshot','scaling_milestone',
                        'self_modification','flagged_agent','feedback_emitted','config_tune')),
  agent_name          text,
  week_starting       date,
  metric_name         text,
  metric_value        numeric,
  rolling_30d_avg     numeric,
  delta_pct           numeric,
  population_size     integer,
  payload             jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_utje_type_time  ON public.ultrathink_jeffery_evolution (entry_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_utje_agent_week ON public.ultrathink_jeffery_evolution (agent_name, week_starting DESC);

ALTER TABLE public.ultrathink_jeffery_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ultrathink_jeffery_evolution ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ut_read_authenticated ON public.ultrathink_jeffery_decisions;
DROP POLICY IF EXISTS ut_read_authenticated ON public.ultrathink_jeffery_evolution;
CREATE POLICY ut_read_authenticated ON public.ultrathink_jeffery_decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY ut_read_authenticated ON public.ultrathink_jeffery_evolution FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.jeffery_log_decision(
  p_run_id        uuid,
  p_decision_type text,
  p_target_agent  text,
  p_rationale     text,
  p_inputs        jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.ultrathink_jeffery_decisions
    (run_id, decision_type, target_agent, rationale, inputs)
  VALUES
    (p_run_id, p_decision_type, p_target_agent, p_rationale, COALESCE(p_inputs, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.jeffery_log_evolution(
  p_entry_type      text,
  p_agent_name      text,
  p_metric_name     text,
  p_metric_value    numeric,
  p_rolling_30d_avg numeric,
  p_population_size integer,
  p_payload         jsonb,
  p_notes           text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id    uuid;
  v_delta numeric;
BEGIN
  v_delta := CASE
    WHEN p_rolling_30d_avg IS NULL OR p_rolling_30d_avg = 0 THEN NULL
    ELSE ((p_metric_value - p_rolling_30d_avg) / p_rolling_30d_avg) * 100
  END;

  INSERT INTO public.ultrathink_jeffery_evolution
    (entry_type, agent_name, week_starting, metric_name, metric_value,
     rolling_30d_avg, delta_pct, population_size, payload, notes)
  VALUES
    (p_entry_type, p_agent_name, date_trunc('week', now())::date,
     p_metric_name, p_metric_value, p_rolling_30d_avg, v_delta,
     p_population_size, COALESCE(p_payload, '{}'::jsonb), p_notes)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
