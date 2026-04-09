-- =============================================================================
-- Ultrathink Agent Registry + Event Bus (Prompt #60 v2 — Layer 1 additive)
-- =============================================================================
-- Adds 2 tables to the SuperDatabase:
--   ultrathink_agent_registry — master list of all 17+ platform agents
--   ultrathink_agent_events   — event bus backbone (heartbeat/complete/error)
--
-- Plus 2 RPCs:
--   ultrathink_agent_heartbeat   — agents call this to update last_heartbeat_at
--   ultrathink_agent_health_sweep — orchestrator calls this to run all
--                                   health_check_query SQL fragments and update
--                                   health_status across the fleet
--
-- Realtime: ultrathink_agent_events is added to the supabase_realtime
-- publication so the future admin dashboard can subscribe to live events.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ultrathink_agent_registry (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name               text NOT NULL UNIQUE,
  display_name             text NOT NULL,
  origin_prompt            text,
  agent_type               text NOT NULL CHECK (agent_type IN (
                             'data','safety','scoring','analytics','infra',
                             'engagement','protocol','research','ai','learning',
                             'perf','control')),
  tier                     integer NOT NULL CHECK (tier BETWEEN 1 AND 4),
  description              text NOT NULL,
  reports                  text,
  runtime_kind             text NOT NULL CHECK (runtime_kind IN ('edge_function','pg_cron','request_time','table','external')),
  runtime_handle           text,
  expected_period_minutes  integer,
  health_check_query       text,
  health_status            text NOT NULL DEFAULT 'unknown' CHECK (health_status IN ('healthy','degraded','unhealthy','unknown','disabled')),
  last_heartbeat_at        timestamptz,
  last_health_check_at     timestamptz,
  consecutive_misses       integer NOT NULL DEFAULT 0,
  is_critical              boolean NOT NULL DEFAULT false,
  is_active                boolean NOT NULL DEFAULT true,
  registered_at            timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_utar_health   ON public.ultrathink_agent_registry (health_status, tier);
CREATE INDEX IF NOT EXISTS idx_utar_critical ON public.ultrathink_agent_registry (is_critical) WHERE is_critical = true;

CREATE TABLE IF NOT EXISTS public.ultrathink_agent_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name      text NOT NULL,
  event_type      text NOT NULL CHECK (event_type IN ('heartbeat','start','complete','error','data_available','health_check')),
  run_id          uuid,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity        text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','error','critical')),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_utae_agent_time ON public.ultrathink_agent_events (agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_utae_type_time  ON public.ultrathink_agent_events (event_type, created_at DESC);

ALTER TABLE public.ultrathink_agent_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ultrathink_agent_events   ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ut_read_authenticated ON public.ultrathink_agent_registry;
DROP POLICY IF EXISTS ut_read_authenticated ON public.ultrathink_agent_events;
CREATE POLICY ut_read_authenticated ON public.ultrathink_agent_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY ut_read_authenticated ON public.ultrathink_agent_events   FOR SELECT TO authenticated USING (true);

DO $pub$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.ultrathink_agent_events;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $pub$;

CREATE OR REPLACE FUNCTION public.ultrathink_agent_heartbeat(
  p_agent_name text,
  p_run_id     uuid,
  p_event_type text,
  p_payload    jsonb,
  p_severity   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.ultrathink_agent_events
    (agent_name, event_type, run_id, payload, severity)
  VALUES
    (p_agent_name, p_event_type, p_run_id, COALESCE(p_payload, '{}'::jsonb), COALESCE(p_severity, 'info'));

  UPDATE public.ultrathink_agent_registry
     SET last_heartbeat_at  = now(),
         updated_at         = now(),
         consecutive_misses = CASE WHEN p_event_type = 'error' THEN consecutive_misses + 1 ELSE 0 END,
         health_status      = CASE
                                WHEN p_event_type = 'error' THEN 'degraded'
                                WHEN p_event_type IN ('heartbeat','complete') THEN 'healthy'
                                ELSE health_status
                              END
   WHERE agent_name = p_agent_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.ultrathink_agent_health_sweep()
RETURNS TABLE(agent_name text, new_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r            record;
  is_healthy   boolean;
  result_count integer;
BEGIN
  FOR r IN
    SELECT id, agent_name, health_check_query, expected_period_minutes, last_heartbeat_at
    FROM public.ultrathink_agent_registry
    WHERE is_active = true AND health_check_query IS NOT NULL
  LOOP
    BEGIN
      EXECUTE 'SELECT count(*) FROM (' || r.health_check_query || ') AS hc' INTO result_count;
      is_healthy := result_count > 0;
    EXCEPTION WHEN OTHERS THEN
      is_healthy := false;
    END;

    UPDATE public.ultrathink_agent_registry
       SET health_status        = CASE
                                    WHEN is_healthy THEN 'healthy'
                                    WHEN r.expected_period_minutes IS NULL THEN 'unknown'
                                    WHEN r.last_heartbeat_at IS NULL THEN 'unknown'
                                    WHEN r.last_heartbeat_at < now() - (r.expected_period_minutes * 3 || ' minutes')::interval THEN 'unhealthy'
                                    ELSE 'degraded'
                                  END,
           last_health_check_at = now(),
           updated_at            = now()
     WHERE id = r.id;

    agent_name := r.agent_name;
    new_status := (SELECT health_status FROM public.ultrathink_agent_registry WHERE id = r.id);
    RETURN NEXT;
  END LOOP;
END;
$$;
