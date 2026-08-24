-- =============================================================================
-- Prompt 211a W4 Part 2 FIX: correct the scan cadence nudge cron invocation
-- Migration: 20260712000500_prompt_211a_scan_cadence_nudge_cron_fix.sql
-- =============================================================================
-- WHY (defect found at deploy time, 2026-07-12):
-- The original 20260710120500 scheduled scan_cadence_nudge_tick_cron with
-- extensions.http_post and an Authorization header of
--   'Bearer ' || current_setting('app.settings.service_role_key', true)
-- and the edge function was deployed verify_jwt=true (CLI default). But this
-- project has NO app.settings.service_role_key configured (verified: NULL), and
-- every WORKING edge-function cron here (nutrition-insights-daily / weekly, the
-- ultrathink agents, iprs_daily_scan) invokes its function with net.http_post
-- and NO auth header, against a function deployed verify_jwt=false. So as
-- originally written the cron's Bearer was empty and a verify_jwt=true function
-- rejected every call: the nudge would never fire.
--
-- FIX: the scan-cadence-nudge-tick function has been redeployed verify_jwt=false
-- (matching the repo convention; there is no config.toml, cron functions are
-- deployed --no-verify-jwt manually -- REDEPLOY THIS FUNCTION WITH --no-verify-jwt).
-- This migration reschedules the job to the proven net.http_post / no-auth-header
-- pattern. APPEND-ONLY: only the cron schedule is replaced; the ultrathink
-- registry row and the scan_streak / scan_cadence_reminders tables from the
-- earlier 211a migrations are untouched. Idempotent (guarded unschedule).
-- =============================================================================

DO $$
BEGIN
  PERFORM cron.unschedule('scan_cadence_nudge_tick_cron');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 10:41 UTC daily. net.http_post + no auth header, matching the working repo
-- edge-function cron pattern (nutrition-insights). The function is verify_jwt
-- =false, so no JWT is required; it is idempotent per (user_id, trigger_key)
-- so an unauthenticated trigger cannot spam nudges.
SELECT cron.schedule(
  'scan_cadence_nudge_tick_cron',
  '41 10 * * *',
  $sql$
  SELECT net.http_post(
    url := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/scan-cadence-nudge-tick',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"trigger":"cron"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $sql$
);
