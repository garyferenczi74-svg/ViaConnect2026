-- Retire pg_cron job performance_advisor_autoheal (production job 10).
-- Guarded and idempotent: does nothing when the cron schema or the job is absent.
-- Does not unschedule security_advisor_autoheal (production job 1) or any other job.
-- The only allowed touch of job 1 is the optional unschedule migration, which
-- Gary decides at apply time.
--
-- The function body is dropped only by the next migration. Gary can skip that
-- file and keep extensions.performance_advisor_autoheal() and
-- extensions.performance_advisor_autoheal_run() installed (unschedule-only).
--
-- Needs Gary approval before applying. Apply in a quiet window after confirming
-- job 10 is still paused.

DO $$
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'performance_advisor_autoheal'
    ) THEN
      PERFORM cron.unschedule('performance_advisor_autoheal');
    END IF;
  END IF;
END $$;
