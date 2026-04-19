-- =============================================================================
-- Prompt #95 Phase 1.4: Proposal comments.
-- =============================================================================
-- Threaded discussion on proposals. Soft-delete via is_deleted; rows are
-- retained for audit. Edits tracked via edited_at timestamp.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.proposal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.pricing_proposals(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id),

  comment_body TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'discussion' CHECK (comment_type IN (
    'discussion', 'concern', 'question', 'answer', 'clarification'
  )),

  reply_to_comment_id UUID REFERENCES public.proposal_comments(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal
  ON public.proposal_comments(proposal_id, created_at);

ALTER TABLE public.proposal_comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='proposal_comments' AND policyname='proposal_comments_admin_all') THEN
    CREATE POLICY "proposal_comments_admin_all"
      ON public.proposal_comments FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;
