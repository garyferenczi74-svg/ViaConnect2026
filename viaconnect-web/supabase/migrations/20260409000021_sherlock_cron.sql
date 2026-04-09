-- =============================================================
-- Prompt #61b: Sherlock cron schedule (every 6 hours)
-- Hits the sherlock-research-hub edge function via http_post.
-- Off-zero minute (:07) so it doesn't collide with the
-- jeffery_master / brand_enricher cron fleet.
-- =============================================================

-- Unschedule any prior version (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('sherlock_research_hub_cron');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sherlock_research_hub_cron',
  '7 */6 * * *',  -- every 6 hours at minute :07 (00:07, 06:07, 12:07, 18:07 UTC)
  $sql$
  SELECT extensions.http_post(
    url := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/sherlock-research-hub',
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
