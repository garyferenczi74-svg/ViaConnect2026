-- =============================================================================
-- Prompt #95 Phase 6 audit fix: atomic row claim for hourly activator.
-- =============================================================================
-- Jeffery review flagged a race: the activate-approved-proposals Edge
-- Function fetches candidates then processes serially. Two overlapping
-- cron fires (or cron + manual /activate) could both process the same
-- proposal, double-inserting customer_price_bindings and double-writing
-- price_change_history.
--
-- Fix: SECURITY DEFINER RPC that atomically transitions eligible rows
-- from approved_pending_activation to a transient "activating" status
-- inside FOR UPDATE SKIP LOCKED. Concurrent workers never see the same
-- row. The Edge Function calls this RPC and processes the returned rows.
-- =============================================================================

-- Add 'activating' as a valid transient status.
ALTER TABLE public.pricing_proposals
  DROP CONSTRAINT IF EXISTS pricing_proposals_status_check;

ALTER TABLE public.pricing_proposals
  ADD CONSTRAINT pricing_proposals_status_check CHECK (status IN (
    'draft',
    'submitted_for_approval',
    'under_review',
    'approved_pending_activation',
    'activating',
    'activated',
    'rolled_back',
    'rejected',
    'withdrawn',
    'expired'
  ));

COMMENT ON CONSTRAINT pricing_proposals_status_check ON public.pricing_proposals IS
  'Adds transient ''activating'' status used exclusively by the atomic claim RPC. A proposal that stays in activating for more than a few seconds means the activator crashed mid-run and human intervention is required.';

CREATE OR REPLACE FUNCTION public.claim_pending_proposal_activations(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  initiated_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.pricing_proposals p
     SET status = 'activating',
         updated_at = now()
   WHERE p.id IN (
     SELECT sub.id
       FROM public.pricing_proposals sub
      WHERE sub.status = 'approved_pending_activation'
        AND sub.proposed_effective_date <= CURRENT_DATE
      ORDER BY sub.proposed_effective_date, sub.submitted_at
      LIMIT p_limit
      FOR UPDATE SKIP LOCKED
   )
  RETURNING p.id, p.initiated_by;
END;
$$;

COMMENT ON FUNCTION public.claim_pending_proposal_activations(INT) IS
  'Atomically claims up to p_limit approved_pending_activation proposals whose effective date has arrived. Uses FOR UPDATE SKIP LOCKED so concurrent workers never double-process. Callers MUST transition each returned row to activated (or revert to approved_pending_activation on failure) to avoid stuck activating state.';

REVOKE ALL ON FUNCTION public.claim_pending_proposal_activations(INT) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_pending_proposal_activations(INT) TO service_role;
