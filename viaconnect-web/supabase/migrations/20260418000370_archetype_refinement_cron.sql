-- =============================================================================
-- Prompt #94 Phase 5: Archetype refinement cron + agent registry
-- =============================================================================
-- Append-only. Schedules archetype-refinement-tick once per day to:
--   1. Pick rows assigned at least 7 days ago whose assigned_from is NOT
--      'manual_admin_override'.
--   2. Re-classify with CAQ + behavioral signals.
--   3. Swap the user's primary only when the refined gap exceeds
--      REFINEMENT_CONFIDENCE_GAP (0.15) and the refined primary differs.
--      Otherwise touch-update confidence + signal_payload on the existing row.
-- Mirrors cert-reminder-tick registration pattern.
-- =============================================================================

INSERT INTO public.ultrathink_agent_registry
  (agent_name, display_name, origin_prompt, agent_type, tier, description,
   reports, runtime_kind, runtime_handle, expected_period_minutes,
   health_check_query, is_critical, is_active)
VALUES
  ('archetype-refinement-tick',
   'Archetype Refinement Tick',
   'Prompt #94',
   'analytics',
   3,
   'Daily refinement of customer_archetypes primary assignments. Re-classifies users on a 7+ day cadence using CAQ + behavioral signals; only swaps primary when the refined run beats the runner-up by >0.15 confidence. Manual admin overrides are sticky and skipped.',
   'jeffery',
   'edge_function',
   'archetype-refinement-tick',
   1440,
   'SELECT 1 FROM public.ultrathink_agent_events WHERE agent_name = ''archetype-refinement-tick'' AND event_type IN (''heartbeat'',''complete'') AND created_at > now() - interval ''2 days''',
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
  PERFORM cron.unschedule('archetype_refinement_tick_cron');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 04:31 UTC daily — staggered off the cohort MV refresh (02:14) and well clear
-- of cert-reminder-tick (09:23), arnold-tick (:17,:47), sherlock (:07).
SELECT cron.schedule(
  'archetype_refinement_tick_cron',
  '31 4 * * *',
  $sql$
  SELECT extensions.http_post(
    url := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/archetype-refinement-tick',
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
