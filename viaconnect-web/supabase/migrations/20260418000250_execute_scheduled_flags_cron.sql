-- =============================================================================
-- Prompt #93 Phase 5: schedule + register the execute-scheduled-flags job.
-- =============================================================================
-- Runs every 5 minutes. Finds scheduled_flag_activations rows where
-- scheduled_for <= NOW() and executed_at IS NULL and canceled_at IS NULL,
-- applies the change to features or launch_phases, records the
-- feature_flag_audit row (where applicable), and marks the scheduled row
-- executed_at with success or failed.
--
-- Registration in ultrathink_agent_registry lets Jeffery track liveness
-- through the usual heartbeat check.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Register execute-scheduled-flags with Jeffery
-- ---------------------------------------------------------------------------
INSERT INTO public.ultrathink_agent_registry
  (agent_name, display_name, origin_prompt, agent_type, tier, description,
   reports, runtime_kind, runtime_handle, expected_period_minutes,
   health_check_query, is_critical, is_active)
VALUES
  ('execute-scheduled-flags',
   'Scheduled Flag Executor',
   'Prompt #93',
   'infra',
   2,
   'Every 5 minutes: scans scheduled_flag_activations for rows whose scheduled_for has passed, applies them to features or launch_phases, records audit rows, and marks execution_result success or failed. Separation of commercial launch timing from code deploy timing.',
   'jeffery',
   'edge_function',
   'execute-scheduled-flags',
   5,
   'SELECT 1 FROM public.ultrathink_agent_events WHERE agent_name = ''execute-scheduled-flags'' AND event_type IN (''heartbeat'',''complete'') AND created_at > now() - interval ''30 minutes''',
   true,
   true)
ON CONFLICT (agent_name) DO UPDATE SET
  display_name            = EXCLUDED.display_name,
  description             = EXCLUDED.description,
  reports                 = EXCLUDED.reports,
  runtime_kind            = EXCLUDED.runtime_kind,
  runtime_handle          = EXCLUDED.runtime_handle,
  expected_period_minutes = EXCLUDED.expected_period_minutes,
  health_check_query      = EXCLUDED.health_check_query,
  is_critical             = EXCLUDED.is_critical,
  is_active               = EXCLUDED.is_active,
  updated_at              = now();

-- ---------------------------------------------------------------------------
-- 2. pg_cron schedule (every 5 minutes)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  PERFORM cron.unschedule('execute_scheduled_flags_cron');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'execute_scheduled_flags_cron',
  '*/5 * * * *',
  $sql$
  SELECT extensions.http_post(
    url := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/execute-scheduled-flags',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key', true))
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'scheduled_at', now()
    )::text
  );
  $sql$
);
