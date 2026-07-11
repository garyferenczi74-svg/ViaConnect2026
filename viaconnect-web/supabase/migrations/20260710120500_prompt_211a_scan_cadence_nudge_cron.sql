-- =============================================================================
-- Prompt 211a Workstream 4 (Part 2): scan cadence nudge cron + registry
-- Migration: 20260710120500_prompt_211a_scan_cadence_nudge_cron.sql
-- =============================================================================
-- Append-only. Registers and schedules scan-cadence-nudge-tick to run once per
-- day. The function sweeps scan_cadence_reminders WHERE opt_in = true (OPT-IN
-- ONLY, never nags), computes each opted-in user's next-due date from their own
-- recent scan history, and, when a scan is overdue relative to the injected
-- clock, writes ONE gentle user_notifications row. Idempotent per
-- (user_id, trigger_key) via scan_calibration_nudges so a user is never double
-- nudged in a UTC day. Heartbeats to ultrathink_agent_registry.
--
-- Mirrors cert-reminder-tick registration (20260418000140). Additive: no
-- existing registry row, cron job, table, or migration is touched. The cron
-- fires at an off-zero minute distinct from the existing jobs (cert :23, arnold
-- :17/:47, sherlock :07, practitioner mailer :03/:08...) to avoid collision.
--
-- DO NOT APPLY MANUALLY: the controller applies this migration after review.
-- =============================================================================

INSERT INTO public.ultrathink_agent_registry
  (agent_name, display_name, origin_prompt, agent_type, tier, description,
   reports, runtime_kind, runtime_handle, expected_period_minutes,
   health_check_query, is_critical, is_active)
VALUES
  ('scan-cadence-nudge-tick',
   'Scan Cadence Nudge Tick',
   'Prompt 211a',
   'engagement',
   2,
   'Daily sweep over scan_cadence_reminders (opt_in = true only). For each opted-in consumer, computes the next-due scan date from their own recent scan history and, when overdue, writes one gentle user_notifications reminder. Idempotent per (user_id, trigger_key) via scan_calibration_nudges. Never nags: opt-in only, fail-open, gentle Hannah-toned copy.',
   'jeffery',
   'edge_function',
   'scan-cadence-nudge-tick',
   1440,
   'SELECT 1 FROM public.ultrathink_agent_events WHERE agent_name = ''scan-cadence-nudge-tick'' AND event_type IN (''heartbeat'',''complete'') AND created_at > now() - interval ''2 days''',
   false,
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
  PERFORM cron.unschedule('scan_cadence_nudge_tick_cron');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 10:41 UTC daily. Off-zero minute distinct from cert-reminder (:23) and the
-- other engagement crons to avoid a scheduler collision.
SELECT cron.schedule(
  'scan_cadence_nudge_tick_cron',
  '41 10 * * *',
  $sql$
  SELECT extensions.http_post(
    url := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/scan-cadence-nudge-tick',
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
