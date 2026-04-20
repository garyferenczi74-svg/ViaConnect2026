-- =============================================================================
-- Prompt #98 Phase 4: Vesting tick cron + agent registry
-- =============================================================================
-- Append-only. Schedules vest-referral-rewards once daily to:
--   1. Scan source tables (subscriptions, certifications, white-label
--      production orders, custom formulations) for new milestone events
--      across all active referred practitioners.
--   2. Process pending_hold milestone events whose 30-day hold has
--      expired: vest, extend hold (when fraud flag pending), or void
--      (when attribution no longer eligible).
-- Mirrors the cert-reminder + cohort-MV cron registration pattern.
-- =============================================================================

INSERT INTO public.ultrathink_agent_registry
  (agent_name, display_name, origin_prompt, agent_type, tier, description,
   reports, runtime_kind, runtime_handle, expected_period_minutes,
   health_check_query, is_critical, is_active)
VALUES
  ('vest-referral-rewards',
   'Vest Referral Rewards Tick',
   'Prompt #98',
   'engagement',
   2,
   'Daily tick over the practitioner referral program. Pass 1 scans subscriptions / certifications / white-label / custom-formulations for new milestone events on referred practitioners. Pass 2 vests pending_hold events whose 30-day hold has expired (skipping when a pending fraud flag exists; voiding when attribution status is no longer eligible). On vest: ledger entry, tax aggregate update ($600 1099 threshold), tier recompute, notification routing.',
   'jeffery',
   'edge_function',
   'vest-referral-rewards',
   1440,
   'SELECT 1 FROM public.ultrathink_agent_events WHERE agent_name = ''vest-referral-rewards'' AND event_type IN (''heartbeat'',''complete'') AND created_at > now() - interval ''2 days''',
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
  PERFORM cron.unschedule('vest_referral_rewards_cron');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 03:43 UTC daily; off-zero minute to avoid colliding with the
-- Phase 7 snapshot tick (06:00), archetype refinement (04:31),
-- cohort MV refresh (02:14), cert-reminder (09:23), or sherlock (:07).
SELECT cron.schedule(
  'vest_referral_rewards_cron',
  '43 3 * * *',
  $sql$
  SELECT extensions.http_post(
    url := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/vest-referral-rewards',
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
