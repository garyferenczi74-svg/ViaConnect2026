-- pgTAP: pg_cron registration for bos_telemetry_retention_sweep
--
-- Verifies the migration registered exactly one cron job under the
-- expected name with the expected schedule and command. cron.job is
-- global state, so this file is NOT wrapped in BEGIN/ROLLBACK; it
-- inspects rather than mutates the catalog.
--
-- MUST be run AFTER 20260512074126_bos_telemetry_hardening.sql applies.
SELECT plan(4);

-- Row exists
SELECT ok(
  EXISTS (
    SELECT 1 FROM cron.job
     WHERE jobname = 'bos_telemetry_retention_sweep'
  ),
  'cron job bos_telemetry_retention_sweep is registered'
);

-- Exactly one row
SELECT is(
  (SELECT count(*)::int FROM cron.job WHERE jobname = 'bos_telemetry_retention_sweep'),
  1,
  'exactly one bos_telemetry_retention_sweep cron job exists'
);

-- Schedule is daily 04:00 UTC
SELECT is(
  (SELECT schedule FROM cron.job WHERE jobname = 'bos_telemetry_retention_sweep'),
  '0 4 * * *',
  'schedule is 0 4 * * * (daily 04:00 UTC)'
);

-- Command invokes bos_telemetry_retention_sweep
SELECT ok(
  (SELECT command FROM cron.job WHERE jobname = 'bos_telemetry_retention_sweep')
    LIKE '%bos_telemetry_retention_sweep%',
  'cron command invokes bos_telemetry_retention_sweep function'
);

SELECT * FROM finish();
