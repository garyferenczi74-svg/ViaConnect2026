-- Prompt #105 — board member roster + meetings + distributions + download events.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='board_member_role') THEN
    CREATE TYPE public.board_member_role AS ENUM ('director','advisor','observer','executive','auditor');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='nda_status') THEN
    CREATE TYPE public.nda_status AS ENUM ('not_submitted','submitted','under_review','on_file','expired');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.board_members (
  member_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id            UUID UNIQUE REFERENCES auth.users(id),
  display_name            TEXT NOT NULL,
  role                    public.board_member_role NOT NULL,
  appointment_date        DATE NOT NULL,
  departure_date          DATE,
  email_primary           TEXT NOT NULL,
  email_distribution      TEXT NOT NULL,
  nda_status              public.nda_status NOT NULL DEFAULT 'not_submitted',
  nda_vault_ref           TEXT,
  nda_effective_date      DATE,
  nda_expires_at          DATE,
  board_reporting_scope   JSONB NOT NULL DEFAULT '["quarterly","annual"]'::JSONB,
  access_revoked_at       TIMESTAMPTZ,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bm_active ON public.board_members(role) WHERE departure_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_bm_nda_status ON public.board_members(nda_status);
DROP TRIGGER IF EXISTS trg_bm_touch ON public.board_members;
CREATE TRIGGER trg_bm_touch BEFORE UPDATE ON public.board_members FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.board_meetings (
  meeting_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_code            TEXT NOT NULL UNIQUE,
  meeting_type            TEXT NOT NULL CHECK (meeting_type IN ('quarterly_regular','annual','special','committee')),
  scheduled_date          DATE NOT NULL,
  actual_date             DATE,
  location_description    TEXT,
  agenda_md               TEXT,
  attendees               UUID[] DEFAULT '{}',
  status                  TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','held','cancelled','rescheduled')),
  minutes_storage_path    TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bme_scheduled ON public.board_meetings(scheduled_date DESC);
DROP TRIGGER IF EXISTS trg_bme_touch ON public.board_meetings;
CREATE TRIGGER trg_bme_touch BEFORE UPDATE ON public.board_meetings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.board_pack_distributions (
  distribution_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id                   UUID NOT NULL REFERENCES public.board_packs(pack_id),
  member_id                 UUID NOT NULL REFERENCES public.board_members(member_id),
  watermark_token           TEXT NOT NULL UNIQUE,
  distributed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_notification_sent_at TIMESTAMPTZ,
  access_revoked_at         TIMESTAMPTZ,
  revocation_reason         TEXT,
  UNIQUE (pack_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_bpd_pack ON public.board_pack_distributions(pack_id);
CREATE INDEX IF NOT EXISTS idx_bpd_member ON public.board_pack_distributions(member_id);

CREATE TABLE IF NOT EXISTS public.board_pack_download_events (
  event_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id           UUID NOT NULL REFERENCES public.board_pack_distributions(distribution_id),
  artifact_format           TEXT NOT NULL,
  downloaded_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address                INET,
  user_agent                TEXT,
  watermark_token_presented TEXT NOT NULL,
  watermark_validated       BOOLEAN NOT NULL,
  byte_size_served          BIGINT,
  download_duration_ms      INTEGER,
  acknowledgment_typed      BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_bpde_distribution ON public.board_pack_download_events(distribution_id, downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_bpde_time ON public.board_pack_download_events(downloaded_at DESC);

-- NDA + active-membership gate at distribution create time.
CREATE OR REPLACE FUNCTION public.enforce_distribution_nda_gate()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE m RECORD;
BEGIN
  SELECT nda_status, departure_date INTO m FROM public.board_members WHERE member_id = NEW.member_id;
  IF m.nda_status != 'on_file'::nda_status THEN
    RAISE EXCEPTION 'Distribution blocked: member nda_status is %, required on_file', m.nda_status USING ERRCODE = 'P0001';
  END IF;
  IF m.departure_date IS NOT NULL AND m.departure_date <= CURRENT_DATE THEN
    RAISE EXCEPTION 'Distribution blocked: member departed on %', m.departure_date USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_bpd_nda_gate ON public.board_pack_distributions;
CREATE TRIGGER trg_bpd_nda_gate BEFORE INSERT ON public.board_pack_distributions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_distribution_nda_gate();
