-- =============================================================================
-- Prompt #91, Phase 1: Practitioner mailer cron + registry registration
-- =============================================================================
-- Append-only. Schedules the practitioner-waitlist-mailer Edge Function to
-- drain the practitioner_email_queue every 5 minutes, and registers it in
-- ultrathink_agent_registry so Jeffery can monitor heartbeats.
--
-- Mirrors the patterns from:
--   supabase/migrations/20260409000021_sherlock_cron.sql        (cron schedule)
--   supabase/migrations/20260416000100_arnold_supervisor_wiring.sql  (registry + cron pair)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Register the mailer in the agent registry so Jeffery can monitor it
-- ---------------------------------------------------------------------------

INSERT INTO public.ultrathink_agent_registry
  (agent_name, display_name, origin_prompt, agent_type, tier, description,
   reports, runtime_kind, runtime_handle, expected_period_minutes,
   health_check_query, is_critical, is_active)
VALUES
  ('practitioner-waitlist-mailer',
   'Practitioner Waitlist Mailer',
   'Prompt #91',
   'engagement',
   2,
   'Drains practitioner_email_queue every 5 minutes and sends nurture emails through the project SMTP server. Supabase-only transport; no third-party providers.',
   'jeffery',
   'edge_function',
   'practitioner-waitlist-mailer',
   5,
   'SELECT 1 FROM public.ultrathink_agent_events WHERE agent_name = ''practitioner-waitlist-mailer'' AND event_type IN (''heartbeat'',''complete'') AND created_at > now() - interval ''20 minutes''',
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

-- ---------------------------------------------------------------------------
-- 2) Schedule the mailer every 5 minutes at off-zero minute :03,:08,...
--    (avoids collision with sherlock at :07, brand-enricher pattern, and
--    arnold-tick at :17,:47)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  PERFORM cron.unschedule('practitioner_waitlist_mailer_cron');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'practitioner_waitlist_mailer_cron',
  '3,8,13,18,23,28,33,38,43,48,53,58 * * * *',
  $sql$
  SELECT extensions.http_post(
    url := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/practitioner-waitlist-mailer',
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
