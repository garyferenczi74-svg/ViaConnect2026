-- =============================================================================
-- Prompt #125 P5: Scheduler platform state + dual-approval kill switches
-- =============================================================================
-- scheduler_platform_states: one row per platform, current mode.
-- scheduler_platform_state_changes: append-only log of proposed and
-- applied state changes. A change is pending while second approval is
-- absent; when a second (different) admin approves, the change is
-- applied and the active row in scheduler_platform_states is updated.
--
-- Modes:
--   active     normal operation
--   scan_only  evaluate but never intercept (platform interception API
--              misbehaving; Steve stays blind-free)
--   disabled   reject all webhook/poll events from this platform;
--              practitioners notified of coverage lapse
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.scheduler_platform_states (
  platform      text PRIMARY KEY CHECK (platform IN (
                  'buffer','hootsuite','later','sprout_social','planoly'
                )),
  mode          text NOT NULL DEFAULT 'active' CHECK (mode IN ('active','scan_only','disabled')),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id),
  applied_change_id uuid
);

INSERT INTO public.scheduler_platform_states (platform, mode) VALUES
  ('buffer', 'active'),
  ('hootsuite', 'active'),
  ('later', 'active'),
  ('sprout_social', 'active'),
  ('planoly', 'active')
ON CONFLICT (platform) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.scheduler_platform_state_changes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform              text NOT NULL CHECK (platform IN (
                          'buffer','hootsuite','later','sprout_social','planoly'
                        )),
  previous_mode         text NOT NULL CHECK (previous_mode IN ('active','scan_only','disabled')),
  proposed_mode         text NOT NULL CHECK (proposed_mode IN ('active','scan_only','disabled')),
  proposed_by           uuid NOT NULL REFERENCES auth.users(id),
  proposed_at           timestamptz NOT NULL DEFAULT now(),
  proposal_reason       text NOT NULL CHECK (length(proposal_reason) BETWEEN 20 AND 2000),
  approved_by           uuid REFERENCES auth.users(id),
  approved_at           timestamptz,
  rejected_by           uuid REFERENCES auth.users(id),
  rejected_at           timestamptz,
  rejection_reason      text,
  applied_at            timestamptz,
  CHECK (approved_by IS NULL OR approved_by <> proposed_by),
  CHECK (rejected_by IS NULL OR approved_by IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_platform_changes_platform_pending
  ON public.scheduler_platform_state_changes (platform, proposed_at DESC)
  WHERE approved_at IS NULL AND rejected_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_platform_changes_proposed_by
  ON public.scheduler_platform_state_changes (proposed_by);
CREATE INDEX IF NOT EXISTS idx_platform_changes_approved_by
  ON public.scheduler_platform_state_changes (approved_by) WHERE approved_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_changes_rejected_by
  ON public.scheduler_platform_state_changes (rejected_by) WHERE rejected_by IS NOT NULL;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE public.scheduler_platform_states        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_platform_state_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sps_admin_read ON public.scheduler_platform_states;
CREATE POLICY sps_admin_read ON public.scheduler_platform_states
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles
                  WHERE id = auth.uid()
                    AND role IN ('admin','superadmin','compliance_admin')));

DROP POLICY IF EXISTS spc_admin_read ON public.scheduler_platform_state_changes;
CREATE POLICY spc_admin_read ON public.scheduler_platform_state_changes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles
                  WHERE id = auth.uid()
                    AND role IN ('admin','superadmin','compliance_admin')));

DROP POLICY IF EXISTS spc_admin_propose ON public.scheduler_platform_state_changes;
CREATE POLICY spc_admin_propose ON public.scheduler_platform_state_changes
  FOR INSERT TO authenticated
  WITH CHECK (
    proposed_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles
                 WHERE id = auth.uid()
                   AND role IN ('admin','superadmin','compliance_admin'))
  );

DROP POLICY IF EXISTS spc_admin_approve ON public.scheduler_platform_state_changes;
CREATE POLICY spc_admin_approve ON public.scheduler_platform_state_changes
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles
                  WHERE id = auth.uid()
                    AND role IN ('admin','superadmin','compliance_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles
                       WHERE id = auth.uid()
                         AND role IN ('admin','superadmin','compliance_admin')));

COMMENT ON TABLE public.scheduler_platform_states IS
  'Prompt #125 P5: current kill-switch state per scheduler platform. Writes go through approved state changes only.';
COMMENT ON TABLE public.scheduler_platform_state_changes IS
  'Prompt #125 P5: two-person-rule log for platform kill-switch changes. Proposer cannot approve their own change.';
