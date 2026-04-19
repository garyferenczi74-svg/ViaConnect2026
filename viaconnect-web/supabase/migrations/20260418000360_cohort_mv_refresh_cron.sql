-- =============================================================================
-- Prompt #94 Phase 4.4: cohort_customer_monthly nightly refresh
-- =============================================================================
-- Append-only. Refreshes the materialized view CONCURRENTLY (no read-side
-- lock) at 02:14 UTC daily. Off-zero minute avoids collision with the
-- existing cron fleet (mailer :03/:08/:13/..., arnold-tick :17/:47,
-- sherlock :07, cert-reminder 09:23, engagement-scores 03:33, brand
-- enricher).
-- =============================================================================

DO $$
BEGIN
  PERFORM cron.unschedule('cohort_customer_monthly_refresh');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cohort_customer_monthly_refresh',
  '14 2 * * *',
  $sql$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.cohort_customer_monthly;
  $sql$
);
