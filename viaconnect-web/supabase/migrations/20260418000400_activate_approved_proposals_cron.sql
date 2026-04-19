-- =============================================================================
-- Prompt #95 Phase 6: hourly scheduled-activation cron.
-- =============================================================================
-- Runs at :17 past every hour so it does not collide with other hourly
-- agents. Picks up approved_pending_activation proposals whose effective
-- date has arrived and runs activation against them.
-- =============================================================================

INSERT INTO public.ultrathink_agent_registry
  (agent_name, display_name, origin_prompt, agent_type, tier, description,
   reports, runtime_kind, runtime_handle, expected_period_minutes,
   health_check_query, is_critical, is_active)
VALUES
  ('activate-approved-proposals',
   'Scheduled Proposal Activator',
   'Prompt #95',
   'infra',
   2,
   'Hourly sweep that activates approved pricing proposals whose proposed_effective_date has arrived. Writes price_change_history + customer_price_bindings snapshots and transitions proposal status to activated.',
   'jeffery',
   'edge_function',
   'activate-approved-proposals',
   60,
   'SELECT 1 FROM public.ultrathink_agent_events WHERE agent_name = ''activate-approved-proposals'' AND event_type IN (''heartbeat'',''complete'') AND created_at > now() - interval ''4 hours''',
   true,
   true)
ON CONFLICT (agent_name) DO UPDATE SET
  display_name            = EXCLUDED.display_name,
  description             = EXCLUDED.description,
  expected_period_minutes = EXCLUDED.expected_period_minutes,
  health_check_query      = EXCLUDED.health_check_query,
  updated_at              = now();

DO $$
BEGIN
  PERFORM cron.unschedule('activate_approved_proposals_cron');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'activate_approved_proposals_cron',
  '17 * * * *',
  $sql$
  SELECT extensions.http_post(
    url := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/activate-approved-proposals',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key', true))
    ),
    body := jsonb_build_object('trigger','cron','scheduled_at', now())::text
  );
  $sql$
);
