-- =============================================================================
-- Prompt #112 Phase 1.2: Practitioner notification preferences, channel
-- credentials (SMS phone + Slack tokens + push subscriptions), quiet hours,
-- and legal-ops recipient + preference model.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- notification_preferences: per-(practitioner, event_code) channel toggles.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  preference_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_code          TEXT NOT NULL REFERENCES public.notification_event_registry(event_code) ON DELETE CASCADE,
  sms_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  slack_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  push_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  email_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  in_app_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  priority_override   public.notification_priority,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (practitioner_id, event_code)
);

COMMENT ON TABLE public.notification_preferences IS
  'Prompt #112 per-practitioner preference for each registered event. in_app_enabled defaults TRUE (bell icon always works). SMS/Slack/Push/Email default FALSE unless seeded from registry default_channels[] at first-login hydration.';

CREATE INDEX IF NOT EXISTS idx_npref_prac_event ON public.notification_preferences (practitioner_id, event_code);
CREATE INDEX IF NOT EXISTS idx_npref_event     ON public.notification_preferences (event_code);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_preferences' AND policyname='npref_own_read') THEN
    CREATE POLICY "npref_own_read" ON public.notification_preferences FOR SELECT TO authenticated
      USING (practitioner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_preferences' AND policyname='npref_own_write') THEN
    CREATE POLICY "npref_own_write" ON public.notification_preferences FOR ALL TO authenticated
      USING (practitioner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (practitioner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.stamp_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;
DROP TRIGGER IF EXISTS trg_npref_updated_at ON public.notification_preferences;
CREATE TRIGGER trg_npref_updated_at BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.stamp_notification_preferences_updated_at();

-- ---------------------------------------------------------------------------
-- notification_channel_credentials: one row per practitioner holding all
-- channel-specific credentials. Slack tokens and push VAPID keys referenced
-- by vault path, never stored inline as plaintext.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_channel_credentials (
  credential_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id               UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  sms_phone_number              TEXT,
  sms_opt_in_completed_at       TIMESTAMPTZ,
  sms_opt_in_verification_sid   TEXT,
  sms_pending_verification_code TEXT,
  sms_verification_sent_at      TIMESTAMPTZ,
  slack_workspace_id            TEXT,
  slack_workspace_name          TEXT,
  slack_access_token_vault_ref  TEXT,
  slack_default_channel_id      TEXT,
  slack_is_dm                   BOOLEAN,
  slack_installed_at            TIMESTAMPTZ,
  push_subscriptions            JSONB NOT NULL DEFAULT '[]'::JSONB,
  fcm_device_tokens             JSONB NOT NULL DEFAULT '[]'::JSONB,
  apns_device_tokens            JSONB NOT NULL DEFAULT '[]'::JSONB,
  is_legal_ops                  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (sms_phone_number IS NULL OR sms_phone_number ~ '^\+?[1-9]\d{7,14}$')
);

COMMENT ON TABLE public.notification_channel_credentials IS
  'Prompt #112 per-practitioner channel credentials. SMS double-opt-in gate: dispatch permitted only when sms_opt_in_completed_at IS NOT NULL. Slack/push tokens referenced by vault path.';

CREATE INDEX IF NOT EXISTS idx_ncc_prac ON public.notification_channel_credentials (practitioner_id);
CREATE INDEX IF NOT EXISTS idx_ncc_phone ON public.notification_channel_credentials (sms_phone_number) WHERE sms_phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ncc_slack_ws ON public.notification_channel_credentials (slack_workspace_id) WHERE slack_workspace_id IS NOT NULL;

ALTER TABLE public.notification_channel_credentials ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_channel_credentials' AND policyname='ncc_own_read') THEN
    CREATE POLICY "ncc_own_read" ON public.notification_channel_credentials FOR SELECT TO authenticated
      USING (practitioner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_channel_credentials' AND policyname='ncc_own_write') THEN
    CREATE POLICY "ncc_own_write" ON public.notification_channel_credentials FOR ALL TO authenticated
      USING (practitioner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (practitioner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- notification_quiet_hours: per-day-of-week windows in practitioner's local tz.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_quiet_hours (
  quiet_hours_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week       INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_local_time  TIME NOT NULL,
  end_local_time    TIME NOT NULL,
  timezone          TEXT NOT NULL DEFAULT 'America/New_York',
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (practitioner_id, day_of_week)
);

COMMENT ON TABLE public.notification_quiet_hours IS
  'Prompt #112 quiet hours per day-of-week (0=Sunday..6=Saturday) in IANA timezone. Windows that cross midnight are expressed with end < start (handled in app code).';

CREATE INDEX IF NOT EXISTS idx_nqh_prac ON public.notification_quiet_hours (practitioner_id);

ALTER TABLE public.notification_quiet_hours ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_quiet_hours' AND policyname='nqh_own_all') THEN
    CREATE POLICY "nqh_own_all" ON public.notification_quiet_hours FOR ALL TO authenticated
      USING (practitioner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (practitioner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- notification_legal_ops_recipients: Steve Rica designation + alternate.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_legal_ops_recipients (
  recipient_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  designated_alternate_user_id UUID REFERENCES auth.users(id),
  effective_from              DATE NOT NULL DEFAULT CURRENT_DATE,
  status                      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','retired')),
  designation_notes           TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notification_legal_ops_recipients IS
  'Prompt #112 legal-ops recipient record. Typically Steve Rica; alternate recipient activates when status=suspended or on dedicated handoff.';

ALTER TABLE public.notification_legal_ops_recipients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_legal_ops_recipients' AND policyname='nlor_read_admin') THEN
    CREATE POLICY "nlor_read_admin" ON public.notification_legal_ops_recipients FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR designated_alternate_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_legal_ops_recipients' AND policyname='nlor_write_admin') THEN
    CREATE POLICY "nlor_write_admin" ON public.notification_legal_ops_recipients FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- notification_legal_ops_preferences: parallel to practitioner prefs with
-- restrictive opt-out semantics for organizational-compliance events.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_legal_ops_preferences (
  preference_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id         UUID NOT NULL REFERENCES public.notification_legal_ops_recipients(recipient_id) ON DELETE CASCADE,
  event_code           TEXT NOT NULL REFERENCES public.notification_event_registry(event_code) ON DELETE CASCADE,
  sms_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
  slack_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  push_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  email_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  priority_override    public.notification_priority,
  opt_out_pending      BOOLEAN NOT NULL DEFAULT FALSE,
  opt_out_reason       TEXT,
  opt_out_requested_at TIMESTAMPTZ,
  opt_out_cosigned_by_user_id UUID REFERENCES auth.users(id),
  opt_out_cosigned_at  TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recipient_id, event_code)
);

COMMENT ON TABLE public.notification_legal_ops_preferences IS
  'Prompt #112 legal-ops preferences. Opt-out of an event where registry.organizational_compliance_required=TRUE requires Gary cosign; opt_out_pending=TRUE leaves dispatch active until cosign completes.';

CREATE INDEX IF NOT EXISTS idx_nlop_recipient ON public.notification_legal_ops_preferences (recipient_id, event_code);

ALTER TABLE public.notification_legal_ops_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_legal_ops_preferences' AND policyname='nlop_read_scoped') THEN
    CREATE POLICY "nlop_read_scoped" ON public.notification_legal_ops_preferences FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.notification_legal_ops_recipients lr
          WHERE lr.recipient_id = notification_legal_ops_preferences.recipient_id
            AND (lr.user_id = auth.uid() OR lr.designated_alternate_user_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_legal_ops_preferences' AND policyname='nlop_write_admin') THEN
    CREATE POLICY "nlop_write_admin" ON public.notification_legal_ops_preferences FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;
