-- =============================================================================
-- Prompt #93 Phase 2.2: user_feature_opt_ins.
-- =============================================================================
-- Backing table for the opt_in rollout strategy. A user opts into a feature
-- (via an in-product setting) and the row is written here. The evaluation
-- engine reads opted_in to determine inclusion. Users can always self-manage
-- their own opt-ins; admins cannot write on behalf of a user.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_feature_opt_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  opted_in BOOLEAN NOT NULL DEFAULT true,
  opted_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opted_out_at TIMESTAMPTZ,
  UNIQUE (user_id, feature_id)
);

COMMENT ON TABLE public.user_feature_opt_ins IS
  'User explicit opt-in for features with rollout_strategy = opt_in. Evaluation engine reads opted_in to determine inclusion.';

ALTER TABLE public.user_feature_opt_ins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_feature_opt_ins' AND policyname='user_opt_ins_self_manage') THEN
    CREATE POLICY "user_opt_ins_self_manage"
      ON public.user_feature_opt_ins FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_feature_opt_ins' AND policyname='user_opt_ins_admin_read') THEN
    CREATE POLICY "user_opt_ins_admin_read"
      ON public.user_feature_opt_ins FOR SELECT
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_opt_ins_active
  ON public.user_feature_opt_ins(user_id, feature_id)
  WHERE opted_in = true;
