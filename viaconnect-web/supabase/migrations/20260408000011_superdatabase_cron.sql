-- =============================================================================
-- Ultrathink SuperDatabase Cron (Prompt #60 — Layer 7)
-- =============================================================================
-- Schedules ultrathink-orchestrator to run every 10 minutes via pg_cron + pg_net.
-- The orchestrator handles all sub-agent dispatch internally — no need for
-- per-source cron jobs.
--
-- The orchestrator function is deployed verify_jwt=false so the cron can call
-- it without an auth header. Blast radius is contained: it only writes to its
-- own ultrathink_* tables.
-- =============================================================================

-- pg_net should already be installed (from brand_enricher_cron migration).
-- This is a no-op safety check.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('ultrathink_orchestrator_cron');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule(
  'ultrathink_orchestrator_cron',
  '6,16,26,36,46,56 * * * *',  -- every 10 min, off-zero to avoid fleet sync
  $sql$
  SELECT extensions.http_post(
    url     := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/ultrathink-orchestrator',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $sql$
);
