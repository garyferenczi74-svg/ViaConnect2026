-- =============================================================================
-- Prompt #98 Phase 5: Credit expiration cron + agent registry
-- =============================================================================
-- Append-only. Schedules expire-referral-credits on the 1st of each
-- month at 05:17 UTC. Monthly cadence is sufficient: expiration is a
-- 24-month window and the warning windows are 90/60/30/7 day bands
-- which tolerate a single monthly sweep. Running more often would
-- generate duplicate warning notifications.
-- =============================================================================

INSERT INTO public.ultrathink_agent_registry
  (agent_name, display_name, origin_prompt, agent_type, tier, description,
   reports, runtime_kind, runtime_handle, expected_period_minutes,
   health_check_query, is_critical, is_active)
VALUES
  ('expire-referral-credits',
   'Expire Referral Credits Tick',
   'Prompt #98',
   'engagement',
   3,
   'Monthly sweep of the practitioner referral credit ledger. Pass 1 expires the unused residual of earned entries older than the 24-month window via FIFO matching against subsequent applications, voids, and prior expirations. Pass 2 dispatches 90/60/30/7-day expiration warning notifications. Idempotent: detects existing expired rows by source-entry note text.',
   'jeffery',
   'edge_function',
   'expire-referral-credits',
   44640,
   'SELECT 1 FROM public.ultrathink_agent_events WHERE agent_name = ''expire-referral-credits'' AND event_type IN (''heartbeat'',''complete'') AND created_at > now() - interval ''35 days''',
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
  PERFORM cron.unschedule('expire_referral_credits_cron');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 05:17 UTC on the 1st of each month. Off-zero minute staggered
-- between vest-referral-rewards (03:43 daily) and snapshot tick
-- (06:00 monthly 1st) so the stack does not collide.
SELECT cron.schedule(
  'expire_referral_credits_cron',
  '17 5 1 * *',
  $sql$
  SELECT extensions.http_post(
    url := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/expire-referral-credits',
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
