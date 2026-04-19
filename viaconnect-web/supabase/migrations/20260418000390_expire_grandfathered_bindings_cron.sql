-- =============================================================================
-- Prompt #95 Phase 5: daily cron for expire-grandfathered-bindings.
-- =============================================================================
-- Schedule: 01:00 UTC every day. Flips expired bindings from active to
-- expired. Notification emails are deferred to Phase 7.
-- =============================================================================

INSERT INTO public.ultrathink_agent_registry
  (agent_name, display_name, origin_prompt, agent_type, tier, description,
   reports, runtime_kind, runtime_handle, expected_period_minutes,
   health_check_query, is_critical, is_active)
VALUES
  ('expire-grandfathered-bindings',
   'Grandfathered Binding Expirer',
   'Prompt #95',
   'infra',
   2,
   'Daily sweep: flip customer_price_bindings rows where binding_expires_at <= now() from active to expired. Required for post-grandfathering-window billing correctness.',
   'jeffery',
   'edge_function',
   'expire-grandfathered-bindings',
   1440,
   'SELECT 1 FROM public.ultrathink_agent_events WHERE agent_name = ''expire-grandfathered-bindings'' AND event_type IN (''heartbeat'',''complete'') AND created_at > now() - interval ''2 days''',
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
  PERFORM cron.unschedule('expire_grandfathered_bindings_cron');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'expire_grandfathered_bindings_cron',
  '0 1 * * *',
  $sql$
  SELECT extensions.http_post(
    url := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/expire-grandfathered-bindings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key', true))
    ),
    body := jsonb_build_object('trigger','cron','scheduled_at', now())::text
  );
  $sql$
);
