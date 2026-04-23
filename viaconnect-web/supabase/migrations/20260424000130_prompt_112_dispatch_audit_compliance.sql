-- =============================================================================
-- Prompt #112 Phase 1.3: Events inbox queue + batch queue + dispatch audit +
-- TCPA opt-in log + PHI redaction failures. Audit tables are append-only via
-- the shared public.block_audit_mutation() trigger function.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- notification_events_inbox: pull-architecture queue. Emitter writes; dispatcher
-- reads + marks processed. Keeps dispatch off the request path.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_events_inbox (
  inbox_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_code               TEXT NOT NULL REFERENCES public.notification_event_registry(event_code),
  practitioner_ids         UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  legal_ops                BOOLEAN NOT NULL DEFAULT FALSE,
  context_ref              TEXT NOT NULL,
  context_data             JSONB NOT NULL DEFAULT '{}'::JSONB,
  priority_override        public.notification_priority,
  emitted_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at             TIMESTAMPTZ,
  processing_started_at    TIMESTAMPTZ,
  processing_attempts      INTEGER NOT NULL DEFAULT 0,
  last_error               TEXT,
  source_prompt_of_emitter TEXT
);

COMMENT ON TABLE public.notification_events_inbox IS
  'Prompt #112 pull-architecture event queue. Emitters INSERT; dispatcher claims rows by setting processing_started_at, then writes to notifications_dispatched + marks processed_at. Retry by clearing processing_started_at.';

CREATE INDEX IF NOT EXISTS idx_inbox_pending ON public.notification_events_inbox (emitted_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inbox_event   ON public.notification_events_inbox (event_code, emitted_at DESC);

ALTER TABLE public.notification_events_inbox ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_events_inbox' AND policyname='inbox_insert_authenticated') THEN
    CREATE POLICY "inbox_insert_authenticated" ON public.notification_events_inbox FOR INSERT TO authenticated
      WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_events_inbox' AND policyname='inbox_read_admin') THEN
    CREATE POLICY "inbox_read_admin" ON public.notification_events_inbox FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- notification_batch_queue: events deferred by quiet hours or rate limit, to be
-- dispatched as a digest by the batch-digest cron.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_batch_queue (
  queue_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_ops_recipient_id UUID REFERENCES public.notification_legal_ops_recipients(recipient_id) ON DELETE CASCADE,
  event_code             TEXT NOT NULL REFERENCES public.notification_event_registry(event_code),
  context_ref            TEXT NOT NULL,
  priority               public.notification_priority NOT NULL,
  defer_reason           TEXT NOT NULL CHECK (defer_reason IN ('quiet_hours','rate_limit','channel_unavailable')),
  queued_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispatched_at          TIMESTAMPTZ,
  dispatch_digest_id     UUID,
  CHECK (practitioner_id IS NOT NULL OR legal_ops_recipient_id IS NOT NULL)
);

COMMENT ON TABLE public.notification_batch_queue IS
  'Prompt #112 deferred-event queue. Cleared by the batch-digest cron every 5 minutes. A row is eligible for dispatch when the deferral reason no longer applies.';

CREATE INDEX IF NOT EXISTS idx_batch_pending ON public.notification_batch_queue (queued_at) WHERE dispatched_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_batch_prac    ON public.notification_batch_queue (practitioner_id) WHERE dispatched_at IS NULL;

ALTER TABLE public.notification_batch_queue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_batch_queue' AND policyname='nbq_read_scoped') THEN
    CREATE POLICY "nbq_read_scoped" ON public.notification_batch_queue FOR SELECT TO authenticated
      USING (practitioner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- notifications_dispatched: append-only per-channel-per-event audit log.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications_dispatched (
  dispatch_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_code                   TEXT NOT NULL,
  recipient_practitioner_id    UUID REFERENCES auth.users(id),
  legal_ops_recipient_id       UUID REFERENCES public.notification_legal_ops_recipients(recipient_id),
  channel                      public.notification_channel NOT NULL,
  delivery_status              TEXT NOT NULL CHECK (delivery_status IN (
    'pending','queued_batch','queued_rate_limit','queued_quiet_hours',
    'dispatched','delivered','failed',
    'dropped_phi','dropped_no_optin','dropped_unknown_event','dropped_disabled','dropped_no_channel'
  )),
  external_body_rendered       TEXT,
  priority_resolved            public.notification_priority,
  carrier_message_id           TEXT,
  delivery_receipt_json        JSONB,
  retry_count                  INTEGER NOT NULL DEFAULT 0,
  phi_redaction_result         JSONB,
  attorney_work_product_bypass BOOLEAN NOT NULL DEFAULT FALSE,
  context_ref                  TEXT,
  inbox_id                     UUID REFERENCES public.notification_events_inbox(inbox_id),
  dispatcher_version           TEXT DEFAULT 'prompt_112_v1'
);

COMMENT ON TABLE public.notifications_dispatched IS
  'Prompt #112 immutable audit log. Every dispatch attempt is a row, including drops (PHI redaction, no opt-in, disabled event). UPDATE/DELETE blocked via block_audit_mutation trigger.';

CREATE INDEX IF NOT EXISTS idx_nd_occurred   ON public.notifications_dispatched (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_nd_recipient  ON public.notifications_dispatched (recipient_practitioner_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_nd_event      ON public.notifications_dispatched (event_code, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_nd_status     ON public.notifications_dispatched (delivery_status, occurred_at DESC);

ALTER TABLE public.notifications_dispatched ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications_dispatched' AND policyname='nd_read_admin') THEN
    CREATE POLICY "nd_read_admin" ON public.notifications_dispatched FOR SELECT TO authenticated
      USING (
        recipient_practitioner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin'))
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications_dispatched' AND policyname='nd_insert_authenticated') THEN
    CREATE POLICY "nd_insert_authenticated" ON public.notifications_dispatched FOR INSERT TO authenticated
      WITH CHECK (TRUE);
  END IF;
END $$;

DROP TRIGGER IF EXISTS nd_append_only_upd ON public.notifications_dispatched;
CREATE TRIGGER nd_append_only_upd BEFORE UPDATE ON public.notifications_dispatched
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();
DROP TRIGGER IF EXISTS nd_append_only_del ON public.notifications_dispatched;
CREATE TRIGGER nd_append_only_del BEFORE DELETE ON public.notifications_dispatched
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();

-- ---------------------------------------------------------------------------
-- notification_sms_opt_in_log: append-only TCPA compliance log (10-year retention).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_sms_opt_in_log (
  log_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  practitioner_id         UUID NOT NULL REFERENCES auth.users(id),
  action                  TEXT NOT NULL CHECK (action IN (
    'verification_sent','verification_confirmed',
    'compliant_opt_in_sent','opt_in_accepted',
    'opt_out_received','reactivation_attempted','help_sent'
  )),
  phone_number            TEXT NOT NULL,
  message_sid             TEXT,
  message_body_sent       TEXT,
  reply_body              TEXT,
  ip_address              INET,
  user_agent              TEXT
);

COMMENT ON TABLE public.notification_sms_opt_in_log IS
  'Prompt #112 TCPA defense evidence. Append-only. 10-year retention minimum. UPDATE/DELETE blocked at trigger.';

CREATE INDEX IF NOT EXISTS idx_optin_prac ON public.notification_sms_opt_in_log (practitioner_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_optin_phone ON public.notification_sms_opt_in_log (phone_number, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_optin_action ON public.notification_sms_opt_in_log (action, occurred_at DESC);

ALTER TABLE public.notification_sms_opt_in_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_sms_opt_in_log' AND policyname='optin_read_admin') THEN
    CREATE POLICY "optin_read_admin" ON public.notification_sms_opt_in_log FOR SELECT TO authenticated
      USING (
        practitioner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin'))
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_sms_opt_in_log' AND policyname='optin_insert_authenticated') THEN
    CREATE POLICY "optin_insert_authenticated" ON public.notification_sms_opt_in_log FOR INSERT TO authenticated
      WITH CHECK (TRUE);
  END IF;
END $$;

DROP TRIGGER IF EXISTS optin_append_only_upd ON public.notification_sms_opt_in_log;
CREATE TRIGGER optin_append_only_upd BEFORE UPDATE ON public.notification_sms_opt_in_log
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();
DROP TRIGGER IF EXISTS optin_append_only_del ON public.notification_sms_opt_in_log;
CREATE TRIGGER optin_append_only_del BEFORE DELETE ON public.notification_sms_opt_in_log
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();

-- ---------------------------------------------------------------------------
-- notification_phi_redaction_failures: forensic record of every blocked
-- external notification. Admin alerted on INSERT via app code (no DB trigger
-- needed; alerting runs where Slack/email side-effects are allowed).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_phi_redaction_failures (
  failure_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_code              TEXT NOT NULL,
  intended_recipient      UUID,
  channel                 public.notification_channel NOT NULL,
  body_attempted          TEXT NOT NULL,
  violations_json         JSONB NOT NULL,
  template_version        TEXT,
  resolved_at             TIMESTAMPTZ,
  resolved_by_user_id     UUID REFERENCES auth.users(id),
  resolution_notes        TEXT
);

COMMENT ON TABLE public.notification_phi_redaction_failures IS
  'Prompt #112 forensic record: every external body that failed PHI validation. Row contains the attempted body verbatim for root-cause analysis. UPDATE restricted to resolution fields by app code.';

CREATE INDEX IF NOT EXISTS idx_phi_fail_unresolved ON public.notification_phi_redaction_failures (occurred_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_phi_fail_event ON public.notification_phi_redaction_failures (event_code);

ALTER TABLE public.notification_phi_redaction_failures ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_phi_redaction_failures' AND policyname='phifail_admin_all') THEN
    CREATE POLICY "phifail_admin_all" ON public.notification_phi_redaction_failures FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
END $$;

DROP TRIGGER IF EXISTS phifail_append_only_del ON public.notification_phi_redaction_failures;
CREATE TRIGGER phifail_append_only_del BEFORE DELETE ON public.notification_phi_redaction_failures
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();

-- UPDATE allowed only for resolution fields (checked in app layer; no DB
-- trigger because partial UPDATE restriction is awkward in Postgres triggers
-- and the RLS already scopes to admin/compliance_admin).
