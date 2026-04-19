-- =============================================================================
-- Prompt #93 Phase 5 audit: atomic row claim for scheduled activations.
-- =============================================================================
-- Jeffery review flagged a race: the Edge Function fetches rows with
-- `executed_at IS NULL` then processes them serially. Two overlapping
-- invocations (pg_cron retry + manual trigger, or slow batch + next tick)
-- would both pick the same rows and double-execute.
--
-- Fix:
--   1. Add execution_started_at column so a claim is visible before the
--      final executed_at is written.
--   2. SECURITY DEFINER RPC claim_pending_flag_activations() uses
--      FOR UPDATE SKIP LOCKED inside the subselect so concurrent callers
--      never see the same row. The RPC returns the claimed rows for
--      processing; after processing the Edge Function writes executed_at +
--      execution_result to finalize.
-- =============================================================================

ALTER TABLE public.scheduled_flag_activations
  ADD COLUMN IF NOT EXISTS execution_started_at TIMESTAMPTZ;

COMMENT ON COLUMN public.scheduled_flag_activations.execution_started_at IS
  'Set by claim_pending_flag_activations RPC when a worker claims the row. Prevents concurrent double-execution. executed_at is still the authoritative completion marker.';

-- Update the pending index so claimed-but-not-yet-executed rows are excluded
-- from the scan. Existing index is replaced with a broader predicate.
DROP INDEX IF EXISTS public.idx_scheduled_activations_pending;
CREATE INDEX IF NOT EXISTS idx_scheduled_activations_pending
  ON public.scheduled_flag_activations(scheduled_for)
  WHERE executed_at IS NULL
    AND canceled_at IS NULL
    AND execution_started_at IS NULL;

CREATE OR REPLACE FUNCTION public.claim_pending_flag_activations(p_limit INT DEFAULT 100)
RETURNS TABLE (
  id UUID,
  feature_id TEXT,
  target_action TEXT,
  target_value JSONB,
  scheduled_for TIMESTAMPTZ,
  scheduled_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.scheduled_flag_activations s
     SET execution_started_at = now()
   WHERE s.id IN (
     SELECT sub.id
       FROM public.scheduled_flag_activations sub
      WHERE sub.scheduled_for <= now()
        AND sub.executed_at IS NULL
        AND sub.canceled_at IS NULL
        AND sub.execution_started_at IS NULL
      ORDER BY sub.scheduled_for
      LIMIT p_limit
      FOR UPDATE SKIP LOCKED
   )
  RETURNING s.id, s.feature_id, s.target_action, s.target_value,
            s.scheduled_for, s.scheduled_by;
END;
$$;

COMMENT ON FUNCTION public.claim_pending_flag_activations(INT) IS
  'Atomically claim up to p_limit pending scheduled flag activations. Uses FOR UPDATE SKIP LOCKED so concurrent workers never double-claim. Returns the claimed rows for the caller to process.';

-- Only the service role should claim. The admin-facing endpoints never need
-- to invoke this — they manipulate the rows directly.
REVOKE ALL ON FUNCTION public.claim_pending_flag_activations(INT) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_pending_flag_activations(INT) TO service_role;
