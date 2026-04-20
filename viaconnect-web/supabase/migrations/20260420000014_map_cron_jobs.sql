-- Prompt #100 MAP Enforcement — pg_cron schedules.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'map_compliance_scores_daily') THEN
    PERFORM cron.schedule(
      'map_compliance_scores_daily',
      '30 6 * * *',
      $cron$ SELECT public.calculate_map_compliance_scores(); $cron$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'map_violation_detection') THEN
    PERFORM cron.schedule(
      'map_violation_detection',
      '*/15 * * * *',
      $cron$ SELECT public.detect_map_violations(); $cron$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'map_grace_period_expiration') THEN
    PERFORM cron.schedule(
      'map_grace_period_expiration',
      '0 * * * *',
      $cron$ SELECT public.process_expired_map_grace_periods(); $cron$
    );
  END IF;
END $$;
