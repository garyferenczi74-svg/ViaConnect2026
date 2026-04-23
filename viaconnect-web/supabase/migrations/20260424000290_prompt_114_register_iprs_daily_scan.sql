-- =============================================================================
-- Prompt #114 P4b: Register iprs_daily_scan + schedule its pg_cron job
-- =============================================================================
-- Mirrors the brand_compliance_validator registry pattern (safety tier,
-- reports to jeffery) and the brand_enricher cron pattern (extensions.http_post
-- via pg_cron at off-zero minute). The edge function is deployed separately
-- via mcp deploy_edge_function so this migration does not assume a particular
-- deployment state; it only registers the intent + schedule.
--
-- Runtime gating: the function itself checks iprs_scan_config.agent_enabled
-- (default FALSE) and early-returns with a heartbeat event until Gary toggles
-- it on. Cron fires daily regardless so we get heartbeat visibility.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Registry row
-- ---------------------------------------------------------------------------

INSERT INTO public.ultrathink_agent_registry
  (agent_name, display_name, origin_prompt, agent_type, tier, description,
   reports, runtime_kind, runtime_handle, expected_period_minutes,
   health_check_query, is_critical, is_active)
VALUES
  ('iprs_daily_scan',
   'CBP IPRS Daily Scan',
   'Prompt #114',
   'safety',
   2,
   'Daily sweep of CBP IPRS (iprs.cbp.gov) against active customs_recordations. Writes hits requiring human review into customs_iprs_scan_results. Gated by iprs_scan_config.agent_enabled; disabled by default until CBP scrape path is wired. Reports heartbeat to Jeffery on every run.',
   'jeffery',
   'edge_function',
   'iprs_daily_scan',
   1440,
   'SELECT 1 FROM public.ultrathink_agent_events WHERE agent_name = ''iprs_daily_scan'' AND event_type IN (''heartbeat'',''complete'') AND created_at > now() - interval ''48 hours''',
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
-- 2. pg_net for outbound cron invocation
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 3. pg_cron job (idempotent; off-zero minute)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'iprs_daily_scan_cron') THEN
      PERFORM cron.unschedule('iprs_daily_scan_cron');
    END IF;

    PERFORM cron.schedule(
      'iprs_daily_scan_cron',
      '6 6 * * *',  -- 06:06 UTC daily; off-zero per fleet-sync guidance
      $cron$
      SELECT extensions.http_post(
        url     := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/iprs_daily_scan',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body    := '{}'::jsonb,
        timeout_milliseconds := 60000
      );
      $cron$
    );
  END IF;
END $$;
