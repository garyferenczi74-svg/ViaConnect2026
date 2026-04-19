-- =============================================================================
-- Prompt #95 Phase 7: governance notifications queue.
-- =============================================================================
-- Every governance event that would notify a stakeholder writes a row here.
-- Actual email delivery is a separate operational process (respects Gary's
-- Supabase-built-in-email + no-template-modification constraints). This
-- table is the source of truth for "what did we notify, when, and why."
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.governance_notifications_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'proposal_submitted_required',
    'proposal_submitted_advisory',
    'approval_recorded',
    'proposal_approved',
    'proposal_rejected',
    'board_notification',
    'board_approval_required',
    'proposal_activated',
    'proposal_rolled_back',
    'emergency_override_activated',
    'grandfathering_expiring_soon',
    'grandfathering_expired',
    'sla_reminder_50',
    'sla_reminder_80',
    'sla_breach',
    'proposal_expiring_soon',
    'proposal_expired',
    'governance_config_changed'
  )),

  proposal_id UUID REFERENCES public.pricing_proposals(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES auth.users(id),
  recipient_email TEXT,

  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'dispatched', 'failed', 'canceled'
  )),
  dispatched_at TIMESTAMPTZ,
  dispatch_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (recipient_user_id IS NOT NULL OR recipient_email IS NOT NULL)
);

COMMENT ON TABLE public.governance_notifications_queue IS
  'Governance notifications queued for delivery. Actual email sending is operational; this table is the audit surface for who was notified of what.';

CREATE INDEX IF NOT EXISTS idx_gov_notif_pending
  ON public.governance_notifications_queue(created_at)
  WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_gov_notif_proposal
  ON public.governance_notifications_queue(proposal_id, created_at DESC)
  WHERE proposal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gov_notif_recipient
  ON public.governance_notifications_queue(recipient_user_id, created_at DESC)
  WHERE recipient_user_id IS NOT NULL;

ALTER TABLE public.governance_notifications_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='governance_notifications_queue' AND policyname='gov_notif_admin_all') THEN
    CREATE POLICY "gov_notif_admin_all"
      ON public.governance_notifications_queue FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='governance_notifications_queue' AND policyname='gov_notif_service_all') THEN
    CREATE POLICY "gov_notif_service_all"
      ON public.governance_notifications_queue FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='governance_notifications_queue' AND policyname='gov_notif_self_read') THEN
    CREATE POLICY "gov_notif_self_read"
      ON public.governance_notifications_queue FOR SELECT TO authenticated
      USING (recipient_user_id = auth.uid());
  END IF;
END $$;
