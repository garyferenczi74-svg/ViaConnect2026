-- =============================================================================
-- Arnold supervisor wiring (Punch list items 3 + 4)
-- =============================================================================
-- Append-only. Registers the Arnold ecosystem in the Ultrathink agent registry
-- so Jeffery can monitor heartbeats, and schedules the arnold-tick edge
-- function via pg_cron every 30 minutes for autonomous reconciliation sweeps,
-- stale-score requeue, and stuck-vision-session cleanup.
--
-- Mirrors the sherlock_research_hub_cron pattern at
-- supabase/migrations/20260409000021_sherlock_cron.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Register Arnold + Arnold's two existing edge functions in the registry
-- ---------------------------------------------------------------------------

INSERT INTO public.ultrathink_agent_registry
  (agent_name, display_name, origin_prompt, agent_type, tier, description,
   reports, runtime_kind, runtime_handle, expected_period_minutes,
   health_check_query, is_critical, is_active)
VALUES
  ('arnold',
   'Arnold (Body Tracker)',
   'Prompt #85',
   'analytics',
   2,
   'Body Tracker AI agent. Reconciles incoming body metrics (manual, wearable, plugin), generates daily recommendations, and runs vision analysis on photo sessions.',
   'jeffery',
   'edge_function',
   'arnold-tick',
   30,
   'SELECT 1 FROM public.ultrathink_agent_events WHERE agent_name = ''arnold'' AND event_type IN (''heartbeat'',''complete'') AND created_at > now() - interval ''90 minutes''',
   true,
   true),

  ('arnold-vision-analyze',
   'Arnold Vision Analyzer',
   'Prompt #86B',
   'analytics',
   2,
   'Per-session vision analysis edge function. Pulls photos from the private bucket, calls Claude Vision, cross-validates against manual metrics, and writes calibrated analysis back to body_photo_sessions.',
   'arnold',
   'edge_function',
   'arnold-vision-analyze',
   NULL,
   NULL,
   false,
   true),

  ('arnold-progress-report',
   'Arnold Progress Report',
   'Prompt #86B',
   'analytics',
   2,
   'Generates side-by-side progress reports comparing two analyzed photo sessions plus body_tracker metric deltas between session dates.',
   'arnold',
   'edge_function',
   'arnold-progress-report',
   NULL,
   NULL,
   false,
   true)
ON CONFLICT (agent_name) DO UPDATE SET
  display_name           = EXCLUDED.display_name,
  description            = EXCLUDED.description,
  reports                = EXCLUDED.reports,
  runtime_kind           = EXCLUDED.runtime_kind,
  runtime_handle         = EXCLUDED.runtime_handle,
  expected_period_minutes= EXCLUDED.expected_period_minutes,
  health_check_query     = EXCLUDED.health_check_query,
  is_critical            = EXCLUDED.is_critical,
  is_active              = EXCLUDED.is_active,
  updated_at             = now();

-- ---------------------------------------------------------------------------
-- 2) Schedule arnold-tick every 30 minutes (off-zero minute :17 to avoid
--    collision with brand_enricher / sherlock / jeffery_master).
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  PERFORM cron.unschedule('arnold_tick_cron');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'arnold_tick_cron',
  '17,47 * * * *',  -- every 30 minutes at :17 and :47 UTC
  $sql$
  SELECT extensions.http_post(
    url := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/arnold-tick',
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
