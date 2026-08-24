-- OBRA Brief 21: restore Phase 1 ultrathink feed dispatch.
-- Observed 2026-08-24 on nnhkcufyqjojdbvdrpky:
--   cron.job has no ultrathink_orchestrator_cron and no jeffery_master_cron
--   vercel.json had no orchestrator path (hannah-research is a different job)
--   next_run_at stuck at 2026-04-08/09 UTC
-- This job calls the Vercel route via invoke_viaconnect_bearer_cron
-- (net.http_post + Bearer CRON_SECRET). Secrets are not embedded.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $u$
DECLARE
  j text;
BEGIN
  FOREACH j IN ARRAY ARRAY[
    'ultrathink_orchestrator_cron',
    'jeffery_master_cron',
    'ultrathink_phase1_feeds_cron'
  ]
  LOOP
    BEGIN
      PERFORM cron.unschedule(j);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END
$u$;

SELECT cron.schedule(
  'ultrathink_phase1_feeds_cron',
  '6,16,26,36,46,56 * * * *',
  $sql$
  SELECT public.invoke_viaconnect_bearer_cron('/api/cron/ultrathink-feeds');
  $sql$
);
