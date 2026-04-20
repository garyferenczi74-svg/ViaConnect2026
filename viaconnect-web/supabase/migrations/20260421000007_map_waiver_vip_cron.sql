-- Prompt #101: VIP auto-expiry + waiver auto-expiry cron jobs.

-- Daily cron at 7:00 AM EST: expire VIP exemptions past window or past 180-day auto-expiry.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='map_vip_exemptions_auto_expire') THEN
    PERFORM cron.schedule(
      'map_vip_exemptions_auto_expire',
      '0 7 * * *',
      $cron$
        UPDATE public.map_vip_exemptions
        SET status = 'expired_auto', updated_at = NOW()
        WHERE status = 'active'
          AND (NOW() > exemption_end_at OR NOW() > auto_expiry_at);
      $cron$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='map_waivers_auto_expire') THEN
    PERFORM cron.schedule(
      'map_waivers_auto_expire',
      '15 7 * * *',
      $cron$
        UPDATE public.map_waivers
        SET status = 'expired', updated_at = NOW()
        WHERE status = 'active' AND NOW() > waiver_end_at;
      $cron$
    );
  END IF;
END $$;
