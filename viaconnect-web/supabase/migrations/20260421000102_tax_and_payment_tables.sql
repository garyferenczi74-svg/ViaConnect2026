-- Prompt #102 Workstream B — tax documents + payout methods.
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='tax_form_type') THEN
    CREATE TYPE public.tax_form_type AS ENUM ('w9','w8ben','w8bene','t4a_registration');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='tax_info_status') THEN
    CREATE TYPE public.tax_info_status AS ENUM ('not_submitted','submitted','under_review','on_file','rejected_re_upload_required');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='payout_rail') THEN
    CREATE TYPE public.payout_rail AS ENUM ('stripe_connect_ach','paypal','domestic_wire_us','international_wire');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='payout_method_status') THEN
    CREATE TYPE public.payout_method_status AS ENUM ('pending_setup','verified','failed_verification','revoked');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.practitioner_tax_documents (
  tax_doc_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id         UUID NOT NULL REFERENCES public.practitioners(id),
  form_type               public.tax_form_type NOT NULL,
  status                  public.tax_info_status NOT NULL DEFAULT 'not_submitted',
  encrypted_pii_vault_ref TEXT NOT NULL,
  storage_path            TEXT NOT NULL,
  legal_name_redacted     TEXT,
  country_of_residence    TEXT NOT NULL,
  submitted_at            TIMESTAMPTZ,
  reviewed_at             TIMESTAMPTZ,
  reviewer_id             UUID REFERENCES auth.users(id),
  review_notes            TEXT,
  expires_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (practitioner_id, form_type)
);
CREATE INDEX IF NOT EXISTS idx_ptd_practitioner ON public.practitioner_tax_documents(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_ptd_status ON public.practitioner_tax_documents(status);

CREATE TABLE IF NOT EXISTS public.practitioner_payout_methods (
  method_id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id               UUID NOT NULL REFERENCES public.practitioners(id),
  rail                          public.payout_rail NOT NULL,
  status                        public.payout_method_status NOT NULL DEFAULT 'pending_setup',
  priority                      INTEGER NOT NULL DEFAULT 100,
  display_label                 TEXT NOT NULL,
  stripe_connect_account_id     TEXT,
  paypal_email                  TEXT,
  wire_instructions_vault_ref   TEXT,
  verified_at                   TIMESTAMPTZ,
  last_used_at                  TIMESTAMPTZ,
  metadata_json                 JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ppm_practitioner ON public.practitioner_payout_methods(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_ppm_priority
  ON public.practitioner_payout_methods(practitioner_id, priority)
  WHERE status = 'verified';

DROP TRIGGER IF EXISTS trg_ppm_touch_updated_at ON public.practitioner_payout_methods;
CREATE TRIGGER trg_ppm_touch_updated_at
  BEFORE UPDATE ON public.practitioner_payout_methods
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
