-- =============================================================================
-- Prompt #93 Phase 1.5: Scheduled flag activations.
-- =============================================================================
-- Pre-scheduled state changes executed by the Phase 5 Edge Function
-- (execute-scheduled-flags) when NOW() >= scheduled_for. Admins can cancel a
-- pending activation via the Phase 4 admin UI; the Edge Function skips rows
-- where canceled_at is not null.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.scheduled_flag_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id TEXT NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  target_action TEXT NOT NULL CHECK (target_action IN (
    'activate', 'deactivate',
    'kill_switch_engage', 'kill_switch_release',
    'rollout_percentage_change', 'phase_advance'
  )),
  target_value JSONB NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  execution_result TEXT CHECK (execution_result IS NULL OR execution_result IN (
    'success', 'failed', 'canceled'
  )),
  execution_error TEXT,
  scheduled_by UUID NOT NULL REFERENCES auth.users(id),
  canceled_at TIMESTAMPTZ,
  canceled_by UUID REFERENCES auth.users(id),
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.scheduled_flag_activations IS
  'Pre-scheduled flag state changes. Executed by the Phase 5 execute-scheduled-flags Edge Function at scheduled_for.';
COMMENT ON COLUMN public.scheduled_flag_activations.target_value IS
  'JSONB payload specific to target_action. For rollout_percentage_change: {percentage: 0..100}. For kill_switch_engage: {reason: text}. For phase_advance: {phase_id, new_status}.';

ALTER TABLE public.scheduled_flag_activations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='scheduled_flag_activations' AND policyname='scheduled_activations_admin_all') THEN
    CREATE POLICY "scheduled_activations_admin_all"
      ON public.scheduled_flag_activations FOR ALL
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='scheduled_flag_activations' AND policyname='scheduled_activations_service_all') THEN
    CREATE POLICY "scheduled_activations_service_all"
      ON public.scheduled_flag_activations FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scheduled_activations_pending
  ON public.scheduled_flag_activations(scheduled_for)
  WHERE executed_at IS NULL AND canceled_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_scheduled_activations_feature
  ON public.scheduled_flag_activations(feature_id, scheduled_for DESC);
