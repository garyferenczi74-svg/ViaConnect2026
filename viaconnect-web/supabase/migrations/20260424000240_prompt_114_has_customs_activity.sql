-- =============================================================================
-- Prompt #114 P1: legal_investigation_cases.has_customs_activity + cron refresh
-- =============================================================================
-- Q4 locked 2026-04-23: DROP the per-row trigger pattern; replace with
-- cron-refreshed boolean derived from EXISTS across 4 customs_* tables.
-- Autoheal-friendly (no FK-trigger write amplification on the hot parent).
--
-- Image SHA-256 verifier (per security-advisor) deferred to P4 as an
-- Edge Function, since Postgres cannot recompute hashes on Supabase
-- Storage objects from within pg_cron SQL.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Column add (append-only; default=FALSE is Postgres-catalog-stored, no rewrite)
-- ---------------------------------------------------------------------------

ALTER TABLE public.legal_investigation_cases
  ADD COLUMN IF NOT EXISTS has_customs_activity BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.legal_investigation_cases.has_customs_activity IS
  'Prompt #114: TRUE if any customs_detentions, customs_seizures, customs_iprs_scan_results, or customs_e_allegations row references this case. Refreshed every 5 min by refresh_customs_activity_flags(); see pg_cron job customs_activity_flag_refresh.';

-- Partial index for the /admin/legal/customs dashboard "Active cases with customs activity" query.
-- Non-concurrent: legal_investigation_cases is low-write; migration runs fast.
CREATE INDEX IF NOT EXISTS idx_legal_cases_has_customs_active
  ON public.legal_investigation_cases (updated_at DESC)
  WHERE has_customs_activity = TRUE;

-- ---------------------------------------------------------------------------
-- Refresh function (idempotent, set-based)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_customs_activity_flags()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  flipped_count INTEGER;
BEGIN
  WITH target_state AS (
    SELECT
      c.case_id,
      (
        EXISTS (SELECT 1 FROM public.customs_detentions d WHERE d.case_id = c.case_id)
        OR EXISTS (SELECT 1 FROM public.customs_seizures s WHERE s.case_id = c.case_id)
        OR EXISTS (SELECT 1 FROM public.customs_iprs_scan_results i WHERE i.case_id = c.case_id)
        OR EXISTS (SELECT 1 FROM public.customs_e_allegations e WHERE e.case_id = c.case_id)
      ) AS should_have_activity
    FROM public.legal_investigation_cases c
  ),
  flipped AS (
    UPDATE public.legal_investigation_cases c
    SET has_customs_activity = ts.should_have_activity
    FROM target_state ts
    WHERE c.case_id = ts.case_id
      AND c.has_customs_activity <> ts.should_have_activity
    RETURNING c.case_id
  )
  SELECT COUNT(*) INTO flipped_count FROM flipped;

  RETURN flipped_count;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_customs_activity_flags() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_customs_activity_flags() TO service_role;

-- ---------------------------------------------------------------------------
-- pg_cron schedule: every 5 minutes
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'customs_activity_flag_refresh') THEN
      PERFORM cron.unschedule('customs_activity_flag_refresh');
    END IF;

    PERFORM cron.schedule(
      'customs_activity_flag_refresh',
      '*/5 * * * *',  -- every 5 minutes
      $cron$ SELECT public.refresh_customs_activity_flags(); $cron$
    );
  END IF;
END $$;

-- Initial bootstrap so the flag isn't all-FALSE on cold start.
-- (No-op if no customs activity exists yet, which is the case at P1 apply time.)
SELECT public.refresh_customs_activity_flags();

-- =============================================================================
-- End of 20260424000240_prompt_114_has_customs_activity.sql
-- =============================================================================
