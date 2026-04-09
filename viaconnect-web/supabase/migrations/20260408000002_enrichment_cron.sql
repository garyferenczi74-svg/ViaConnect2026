-- =============================================================================
-- Brand Enrichment Cron (Prompt #59)
-- =============================================================================
-- Schedules the brand-enricher Edge Function to run every 10 minutes via
-- pg_cron + pg_net. The Edge Function is deployed with verify_jwt=false (see
-- mcp deploy_edge_function call) so the cron can invoke it without an auth
-- header. Blast radius is contained: the function only writes to its own
-- enrichment tables.
--
-- Also creates the increment_brand_retry RPC the Edge Function uses to bump
-- retry_count atomically when a source returns no results.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Ensure pg_net is installed (in extensions schema, NOT public)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 2. Helper RPC: atomically increment retry_count for a brand
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_brand_retry(p_brand_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.brand_enrichment_state
     SET retry_count = COALESCE(retry_count, 0) + 1,
         updated_at  = now()
   WHERE brand_id = p_brand_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Cron job: invoke brand-enricher Edge Function every 10 minutes
-- ---------------------------------------------------------------------------
-- Unschedule any prior version (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('brand_enricher_cron');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- The function URL is constructed from the well-known project ref. We hardcode
-- it because the project_ref is not a secret (it's already public in any URL
-- the frontend uses).
SELECT cron.schedule(
  'brand_enricher_cron',
  '3,13,23,33,43,53 * * * *',  -- every 10 min, off-zero minute to avoid fleet sync
  $$
  SELECT extensions.http_post(
    url     := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/brand-enricher',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
