-- =============================================================================
-- Prompt #102 Workstream A — verified channels self-service.
-- =============================================================================
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum
-- Scope: a practitioner declares a sales channel they own; ownership is
-- proven via meta-tag / DNS / OAuth / manual upload; verified channels
-- auto-grant VIP exemption coverage to the MAP monitoring engine for
-- L1/L2 sales attributable to that channel.
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='channel_type') THEN
    CREATE TYPE public.channel_type AS ENUM (
      'own_website','amazon_storefront','etsy_shop','shopify_store',
      'tiktok_shop','physical_clinic_pos','wholesale_partner_storefront','pop_up_event'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='channel_state') THEN
    CREATE TYPE public.channel_state AS ENUM (
      'pending_verification','verified','verification_lapsed',
      'verification_failed','volume_flagged','suspended'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='verification_method') THEN
    CREATE TYPE public.verification_method AS ENUM (
      'domain_meta_tag','dns_txt_record','marketplace_oauth',
      'manual_document_upload','email_from_domain'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.practitioner_verified_channels (
  channel_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id         UUID NOT NULL REFERENCES public.practitioners(id),
  channel_type            public.channel_type NOT NULL,
  channel_url             TEXT NOT NULL,
  channel_display_name    TEXT NOT NULL,
  state                   public.channel_state NOT NULL DEFAULT 'pending_verification',
  verification_method     public.verification_method,
  verified_at             TIMESTAMPTZ,
  re_verify_due_at        TIMESTAMPTZ,
  oauth_token_vault_ref   TEXT,
  metadata_json           JSONB NOT NULL DEFAULT '{}'::JSONB,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (practitioner_id, channel_url)
);
CREATE INDEX IF NOT EXISTS idx_pvc_practitioner ON public.practitioner_verified_channels(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_pvc_state ON public.practitioner_verified_channels(state);
CREATE INDEX IF NOT EXISTS idx_pvc_re_verify
  ON public.practitioner_verified_channels(re_verify_due_at)
  WHERE state = 'verified';

DROP TRIGGER IF EXISTS trg_pvc_touch_updated_at ON public.practitioner_verified_channels;
CREATE TRIGGER trg_pvc_touch_updated_at
  BEFORE UPDATE ON public.practitioner_verified_channels
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.channel_verification_attempts (
  attempt_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id              UUID NOT NULL REFERENCES public.practitioner_verified_channels(channel_id) ON DELETE CASCADE,
  method                  public.verification_method NOT NULL,
  attempt_token           TEXT NOT NULL,
  expires_at              TIMESTAMPTZ NOT NULL,
  attempt_status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (attempt_status IN ('pending','succeeded','failed','expired')),
  failure_reason          TEXT,
  evidence_json           JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at             TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cva_channel ON public.channel_verification_attempts(channel_id);
CREATE INDEX IF NOT EXISTS idx_cva_pending
  ON public.channel_verification_attempts(expires_at)
  WHERE attempt_status = 'pending';

CREATE TABLE IF NOT EXISTS public.channel_volume_checks (
  check_id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id                       UUID NOT NULL REFERENCES public.practitioner_verified_channels(channel_id) ON DELETE CASCADE,
  check_period_start               DATE NOT NULL,
  check_period_end                 DATE NOT NULL,
  apparent_retail_volume_cents     BIGINT NOT NULL,
  wholesale_inventory_volume_cents BIGINT NOT NULL,
  ratio_observed                   NUMERIC(8,2),
  flag_triggered                   BOOLEAN NOT NULL DEFAULT FALSE,
  resolved                         BOOLEAN NOT NULL DEFAULT FALSE,
  resolution_notes                 TEXT,
  created_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cvc_channel ON public.channel_volume_checks(channel_id);
CREATE INDEX IF NOT EXISTS idx_cvc_flagged
  ON public.channel_volume_checks(created_at DESC)
  WHERE flag_triggered = TRUE AND resolved = FALSE;
