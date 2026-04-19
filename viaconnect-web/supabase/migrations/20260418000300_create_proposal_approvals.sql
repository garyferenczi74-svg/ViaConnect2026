-- =============================================================================
-- Prompt #95 Phase 1.3: Proposal approvals.
-- =============================================================================
-- Per-approver decision record for each proposal. Required and advisory
-- approvers are recorded in the same table; advisory rows cannot transition
-- proposal state but record sentiment via advisory_comment.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.proposal_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.pricing_proposals(id) ON DELETE CASCADE,

  approver_user_id UUID NOT NULL REFERENCES auth.users(id),
  approver_role TEXT NOT NULL CHECK (approver_role IN (
    'ceo', 'cfo', 'advisory_cto', 'advisory_medical', 'board_member'
  )),

  is_required BOOLEAN NOT NULL,
  is_advisory BOOLEAN NOT NULL,

  decision TEXT CHECK (decision IN ('approved', 'rejected', 'abstain')),
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,

  advisory_comment TEXT,
  advisory_commented_at TIMESTAMPTZ,

  notified_at TIMESTAMPTZ,
  reminded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (proposal_id, approver_user_id)
);

COMMENT ON TABLE public.proposal_approvals IS
  'Per-approver decision records for each proposal. Advisory approvers (Thomas CTO, Fadi Medical) record comments without formal approve/reject authority.';

CREATE INDEX IF NOT EXISTS idx_proposal_approvals_proposal
  ON public.proposal_approvals(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_approvals_approver
  ON public.proposal_approvals(approver_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposal_approvals_pending
  ON public.proposal_approvals(proposal_id)
  WHERE decision IS NULL AND is_required = true;

ALTER TABLE public.proposal_approvals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='proposal_approvals' AND policyname='proposal_approvals_admin_all') THEN
    CREATE POLICY "proposal_approvals_admin_all"
      ON public.proposal_approvals FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;
