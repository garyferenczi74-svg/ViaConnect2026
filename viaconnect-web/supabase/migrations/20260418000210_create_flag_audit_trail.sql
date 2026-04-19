-- =============================================================================
-- Prompt #93 Phase 1.4: Feature flag audit trail.
-- =============================================================================
-- Append-only record of every state change to features. Required for
-- compliance, debugging, and Phase 6 rollback reference. There is no UPDATE
-- or DELETE policy: the audit trail cannot be mutated from the application.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.feature_flag_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id TEXT NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN (
    'created', 'activated', 'deactivated', 'phase_changed',
    'rollout_percentage_changed', 'rollout_strategy_changed',
    'kill_switch_engaged', 'kill_switch_released',
    'scheduled_activation_set', 'scheduled_activation_canceled',
    'cohort_added', 'cohort_removed',
    'owner_changed', 'description_updated'
  )),
  previous_state JSONB,
  new_state JSONB,
  change_reason TEXT,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  ip_address TEXT
);

COMMENT ON TABLE public.feature_flag_audit IS
  'Complete audit trail of every change to feature flag state. Append-only. Used for compliance, debugging, and rollback reference.';

ALTER TABLE public.feature_flag_audit ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='feature_flag_audit' AND policyname='flag_audit_admin_read') THEN
    CREATE POLICY "flag_audit_admin_read"
      ON public.feature_flag_audit FOR SELECT
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='feature_flag_audit' AND policyname='flag_audit_admin_insert') THEN
    CREATE POLICY "flag_audit_admin_insert"
      ON public.feature_flag_audit FOR INSERT
      TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='feature_flag_audit' AND policyname='flag_audit_service_insert') THEN
    CREATE POLICY "flag_audit_service_insert"
      ON public.feature_flag_audit FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_flag_audit_feature
  ON public.feature_flag_audit(feature_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_flag_audit_changed_by
  ON public.feature_flag_audit(changed_by);
CREATE INDEX IF NOT EXISTS idx_flag_audit_type
  ON public.feature_flag_audit(change_type);
