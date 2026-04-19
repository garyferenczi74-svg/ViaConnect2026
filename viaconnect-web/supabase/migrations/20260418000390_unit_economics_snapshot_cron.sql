-- =============================================================================
-- Prompt #94 Phase 7.3: Unit economics snapshot cron + agent registry
-- =============================================================================
-- Append-only. Schedules unit-economics-snapshot-tick on the 1st of each
-- month at 06:00 UTC. The function aggregates the previous month into
-- unit_economics_snapshots (overall segment) and evaluates threshold
-- alerts into unit_economics_alerts. Both writes are idempotent so a
-- manual re-run never duplicates rows.
-- =============================================================================

INSERT INTO public.ultrathink_agent_registry
  (agent_name, display_name, origin_prompt, agent_type, tier, description,
   reports, runtime_kind, runtime_handle, expected_period_minutes,
   health_check_query, is_critical, is_active)
VALUES
  ('unit-economics-snapshot-tick',
   'Unit Economics Snapshot Tick',
   'Prompt #94',
   'analytics',
   2,
   'Monthly tick that rolls up previous-month unit economics into unit_economics_snapshots (overall segment) and evaluates threshold breaches into unit_economics_alerts. Idempotent on the natural keys of both tables.',
   'jeffery',
   'edge_function',
   'unit-economics-snapshot-tick',
   43200,
   'SELECT 1 FROM public.ultrathink_agent_events WHERE agent_name = ''unit-economics-snapshot-tick'' AND event_type IN (''heartbeat'',''complete'') AND created_at > now() - interval ''35 days''',
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

DO $$
BEGIN
  PERFORM cron.unschedule('unit_economics_snapshot_tick_cron');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 06:00 UTC on the 1st of each month. Off-zero hour avoids competing
-- with the 02:14 cohort MV refresh and the 04:31 archetype refinement.
SELECT cron.schedule(
  'unit_economics_snapshot_tick_cron',
  '0 6 1 * *',
  $sql$
  SELECT extensions.http_post(
    url := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/unit-economics-snapshot-tick',
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
