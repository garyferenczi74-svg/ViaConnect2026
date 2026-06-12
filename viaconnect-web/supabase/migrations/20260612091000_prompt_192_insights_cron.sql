-- =============================================================================
-- Nutrition Insights Cron (Prompt 192 Task 3)
-- =============================================================================
-- Schedules the nutrition-insights-daily and nutrition-insights-weekly Edge
-- Function relays via pg_cron + pg_net, mirroring the brand-enricher cron
-- header/auth approach exactly (Content-Type only; the relays are deployed
-- verify_jwt=false and forward the shared INSIGHTS_CRON_SECRET as the Bearer
-- token to the Next.js cron route, which performs the timing safe check).
-- Blast radius is contained: the relays only POST to our own API route.
--
-- FILE ONLY: the controller applies this migration to live. Append only per
-- permanent migration discipline.
-- =============================================================================

-- pg_net should already be installed (brand_enricher_cron migration). No-op
-- safety check.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 1. Daily generation at 04:30 UTC every day
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM cron.unschedule('nutrition_insights_daily_cron');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule(
  'nutrition_insights_daily_cron',
  '30 4 * * *',
  $$
  SELECT extensions.http_post(
    url     := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/nutrition-insights-daily',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- ---------------------------------------------------------------------------
-- 2. Weekly generation at 04:30 UTC on Mondays
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM cron.unschedule('nutrition_insights_weekly_cron');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule(
  'nutrition_insights_weekly_cron',
  '30 4 * * 1',
  $$
  SELECT extensions.http_post(
    url     := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/nutrition-insights-weekly',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
