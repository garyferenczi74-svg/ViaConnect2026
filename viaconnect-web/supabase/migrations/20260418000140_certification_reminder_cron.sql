-- =============================================================================
-- Prompt #91, Phase 4.4: Certification reminder cron + registry
-- =============================================================================
-- Append-only. Schedules cert-reminder-tick once per day to:
--   1. Auto-expire certifications whose expires_at has passed.
--   2. Enqueue a reminder agent_message for any certified row sitting at
--      exactly 90, 60, 30, 14, 7, or 1 days from expiry (idempotent via
--      reminder_key in payload).
-- Mirrors arnold-tick + practitioner-waitlist-mailer registration patterns.
-- =============================================================================

INSERT INTO public.ultrathink_agent_registry
  (agent_name, display_name, origin_prompt, agent_type, tier, description,
   reports, runtime_kind, runtime_handle, expected_period_minutes,
   health_check_query, is_critical, is_active)
VALUES
  ('cert-reminder-tick',
   'Certification Reminder Tick',
   'Prompt #91',
   'engagement',
   2,
   'Daily sweep over practitioner_certifications. Auto-expires lapsed certifications and enqueues recertification reminders at the 90/60/30/14/7/1-day-out windows. Reminders are idempotent via the reminder_key payload field.',
   'jeffery',
   'edge_function',
   'cert-reminder-tick',
   1440,
   'SELECT 1 FROM public.ultrathink_agent_events WHERE agent_name = ''cert-reminder-tick'' AND event_type IN (''heartbeat'',''complete'') AND created_at > now() - interval ''2 days''',
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
  PERFORM cron.unschedule('cert_reminder_tick_cron');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 09:23 UTC daily — off-zero minute to avoid collision with arnold-tick
-- (:17,:47), sherlock (:07), and the practitioner mailer (:03,:08,...)
SELECT cron.schedule(
  'cert_reminder_tick_cron',
  '23 9 * * *',
  $sql$
  SELECT extensions.http_post(
    url := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/cert-reminder-tick',
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
