-- =============================================================================
-- Migration: bos_telemetry_hardening (Prompt #161b)
-- =============================================================================
-- Purpose:
--   Hardens the bos_write_telemetry pipeline added in
--   20260512020236_bos_compute_v2.sql §11 with three changes:
--     1. A SQL sanitize function bos_sanitize_error_message(text) that
--        mirrors the TypeScript sanitizeErrorMessage helper in
--        src/lib/scoring/sanitize-error.ts. Both implementations apply
--        the same rule sequence so future trigger writes (#163) and the
--        application write path produce identical persisted values.
--     2. A SECURITY DEFINER retention sweep function
--        bos_telemetry_retention_sweep() that deletes telemetry rows
--        older than 90 days and processed compute_queue rows older than
--        30 days. Returns the per-table deletion counts.
--     3. A pg_cron job scheduled at 04:00 UTC daily named
--        bos_telemetry_retention_sweep (snake_case to match the existing
--        12/13 cron job naming convention).
--
-- Locked decisions (#161b §0):
--   D1 Sanitize at BOTH boundaries (TS app writes + SQL trigger writes)
--   D2 UUID regex replace with <uuid> + truncate to 500 chars
--   D3 Retention windows: 90 days telemetry, 30 days processed queue
--   D4 Sweep is idempotent + bounded (single DELETE per table)
--   D5 SQL sanitize ships now so #163 triggers can call it
--   D6 Cron schedule '0 4 * * *' UTC
--
-- Append-only. Forward-only. Idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Block 1: bos_sanitize_error_message(text)
-- -----------------------------------------------------------------------------
-- Lockstep parallel to src/lib/scoring/sanitize-error.ts. Marked IMMUTABLE so
-- the planner can fold constant inputs; PARALLEL SAFE because no I/O or
-- session state is touched. search_path is pinned to pg_catalog + pg_temp so
-- the function cannot be hijacked by a shadowed regexp_replace or length()
-- definition in a user schema.
CREATE OR REPLACE FUNCTION public.bos_sanitize_error_message(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_out text;
  v_max integer := 500;
  v_suffix text := ' ...';
BEGIN
  IF input IS NULL THEN
    RETURN NULL;
  END IF;

  -- Replace every RFC 4122 style UUID with the redaction token.
  -- The 'g' flag is the global match in PostgreSQL regexp_replace.
  v_out := regexp_replace(
    input,
    '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
    '<uuid>',
    'g'
  );

  IF length(v_out) > v_max THEN
    v_out := substring(v_out FROM 1 FOR v_max - length(v_suffix)) || v_suffix;
  END IF;

  RETURN v_out;
END;
$$;

-- -----------------------------------------------------------------------------
-- Block 2: bos_telemetry_retention_sweep()
-- -----------------------------------------------------------------------------
-- Single bounded DELETE per table. Returns one row per table with the count
-- of rows removed for that table. SECURITY DEFINER so the pg_cron job (which
-- runs as the cron extension owner) can execute it without needing direct
-- DELETE grants on the underlying tables. service_role is the only role
-- granted EXECUTE in Block 5.
CREATE OR REPLACE FUNCTION public.bos_telemetry_retention_sweep()
RETURNS TABLE (table_name text, rows_deleted bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_telemetry_deleted bigint := 0;
  v_queue_deleted bigint := 0;
BEGIN
  DELETE FROM public.bos_write_telemetry
   WHERE occurred_at < now() - interval '90 days';
  GET DIAGNOSTICS v_telemetry_deleted = ROW_COUNT;

  DELETE FROM public.bos_compute_queue
   WHERE processed_at IS NOT NULL
     AND processed_at < now() - interval '30 days';
  GET DIAGNOSTICS v_queue_deleted = ROW_COUNT;

  table_name := 'bos_write_telemetry';
  rows_deleted := v_telemetry_deleted;
  RETURN NEXT;

  table_name := 'bos_compute_queue';
  rows_deleted := v_queue_deleted;
  RETURN NEXT;

  RETURN;
END;
$$;

-- -----------------------------------------------------------------------------
-- Block 3: Optional one-time backfill of legacy error_message values
-- -----------------------------------------------------------------------------
-- At migration apply time, bos_write_telemetry has zero rows (verified by
-- the orchestrator pre-flight). The statement below is preserved for
-- documentation value: it shows the exact backfill a future re-apply (or a
-- staging environment with legacy rows) would run to bring existing rows in
-- line with the new sanitize rules. Idempotent: the WHERE clause filters to
-- rows that actually need rewriting.
UPDATE public.bos_write_telemetry
   SET error_message = public.bos_sanitize_error_message(error_message)
 WHERE error_message IS NOT NULL
   AND (error_message ~ '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
        OR length(error_message) > 500);

-- -----------------------------------------------------------------------------
-- Block 4: pg_cron extension verification + job registration
-- -----------------------------------------------------------------------------
-- pg_cron is already enabled on this project (verified by the orchestrator
-- pre-flight). The CREATE EXTENSION IF NOT EXISTS is here defensively so
-- re-applying this migration on a fresh branch does not require pg_cron to
-- be pre-installed.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Idempotent unschedule. cron.unschedule raises if the job does not exist,
-- so the block is wrapped in EXCEPTION WHEN OTHERS to make migration
-- replays safe. The job name uses snake_case to match the existing 12/13
-- jobs (channel_re_verify_daily, commission_reconciliation_daily, etc.).
DO $$
BEGIN
  PERFORM cron.unschedule('bos_telemetry_retention_sweep');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule(
  'bos_telemetry_retention_sweep',
  '0 4 * * *',
  $cron$select public.bos_telemetry_retention_sweep()$cron$
);

-- -----------------------------------------------------------------------------
-- Block 5: COMMENT ON + GRANT EXECUTE
-- -----------------------------------------------------------------------------
COMMENT ON FUNCTION public.bos_sanitize_error_message(text) IS
  'Sanitizes an error_message string before persistence to bos_write_telemetry: redacts every RFC 4122 UUID to <uuid> and truncates to 500 chars with a trailing space + three dots. Lockstep parallel to src/lib/scoring/sanitize-error.ts (#161b).';

COMMENT ON FUNCTION public.bos_telemetry_retention_sweep() IS
  'Retention sweep for BOS telemetry: deletes bos_write_telemetry rows older than 90 days and processed bos_compute_queue rows older than 30 days. Returns one row per table with the deletion count. Scheduled daily at 04:00 UTC by the bos_telemetry_retention_sweep pg_cron job (#161b).';

REVOKE ALL ON FUNCTION public.bos_sanitize_error_message(text) FROM public;
GRANT EXECUTE ON FUNCTION public.bos_sanitize_error_message(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.bos_telemetry_retention_sweep() FROM public;
GRANT EXECUTE ON FUNCTION public.bos_telemetry_retention_sweep() TO service_role;
