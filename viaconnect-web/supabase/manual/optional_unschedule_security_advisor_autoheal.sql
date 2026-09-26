-- OPTIONAL. Gary decides at apply time whether to apply this file.
-- Unschedule pg_cron job security_advisor_autoheal (production job 1) only.
-- Guarded and idempotent: does nothing when cron.job or the job is absent.
--
-- Does not drop or alter extensions.security_advisor_autoheal,
-- extensions.security_advisor_autoheal_run, or any other function.
-- Does not drop or alter extensions.policy_rewrite_backup or
-- extensions.performance_advisor_autoheal_log.
--
-- Needs Gary approval before applying.

DO $$ BEGIN
  IF to_regclass('cron.job') IS NOT NULL AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'security_advisor_autoheal') THEN
    PERFORM cron.unschedule('security_advisor_autoheal');
  END IF;
END $$;
