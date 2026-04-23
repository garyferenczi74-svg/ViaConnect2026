-- =============================================================================
-- Prompt #114 P1: CBP Customs e-Recordation + Counterfeit Customs — core schema
-- =============================================================================
-- Workstream A. Append-only. 14 customs_* tables + 16 enums.
--
-- Notes:
--   - All case_id FKs point at public.legal_investigation_cases(case_id) from
--     #104. There is NO counterfeit_cases table (spec text was misaligned;
--     remap A1 locked 2026-04-23).
--   - There is NO customs_case_channel enum. The new enum
--     customs_case_activity_type scopes customs events only.
--   - Importer/supplier PII uses the *_vault_ref TEXT indirection pattern
--     from #104 legal_outside_counsel.contact_info_vault_ref.
--   - trade_secrets_flag defaults TRUE globally (18 U.S.C. § 1905 opt-out).
--   - ai_drafted + ai_disclaimer columns on Marshall-drafted rows; CHECK
--     prevents submission without counsel review.
--   - Indexes ship in 20260424000210 (CONCURRENTLY, outside transaction).
--   - RLS policies ship in 20260424000220.
--   - Counsel MFA + nightly expiry ships in 20260424000230 (Q2=2a scope-add).
--   - has_customs_activity column + pg_cron refresh ships in 20260424000240.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums (16)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE customs_recordation_type AS ENUM ('trademark', 'copyright');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customs_recordation_status AS ENUM (
    'draft', 'pending_fee', 'under_review', 'active',
    'grace_period', 'expired', 'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customs_detention_status AS ENUM (
    'notice_received', 'response_required', 'importer_responded',
    'rightsholder_assist', 'sample_provided', 'closed_released', 'escalated_seizure'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customs_determination AS ENUM (
    'authentic', 'not_authentic', 'unable_to_determine'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customs_seizure_status AS ENUM (
    'seized', 'forfeiture_initiated', 'awaiting_disclosure', 'disclosure_received',
    'destroyed', 'donated', 'mark_obliterated', 'released_unusual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customs_training_format AS ENUM (
    'in_person', 'virtual_webinar', 'recorded_module'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customs_training_status AS ENUM (
    'requested', 'vetting', 'scheduled', 'delivered', 'declined'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customs_case_activity_type AS ENUM (
    'customs_detention', 'customs_seizure', 'iprs_unauthorized',
    'e_allegation', 'moiety_claim'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customs_guide_status AS ENUM (
    'draft', 'counsel_review', 'submitted_to_cbp', 'acknowledged', 'retired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customs_guide_section_type AS ENUM (
    'brand_intro', 'mark_specimen', 'genuine_characteristics',
    'packaging_features', 'authorized_distribution', 'known_variants',
    'contact_points'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customs_iprs_result_status AS ENUM (
    'new', 'requires_review', 'confirmed_unauthorized',
    'confirmed_authorized', 'dismissed', 'case_opened'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customs_e_allegation_posture AS ENUM ('named', 'anonymous');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customs_e_allegation_status AS ENUM (
    'draft', 'counsel_review', 'submitted', 'acknowledged', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customs_moiety_claim_status AS ENUM (
    'forecast', 'filed', 'awarded', 'denied', 'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customs_fee_type AS ENUM (
    'recordation_initial', 'recordation_renewal', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customs_counsel_review_kind AS ENUM (
    'authentication_determination', 'e_allegation', 'recordation',
    'authentication_guide', 'moiety_claim', 'training_deck'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customs_counsel_review_status AS ENUM (
    'pending', 'approved', 'rejected', 'changes_requested'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Shared AI-disclaimer default (extracted for reuse)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE DOMAIN marshall_ai_disclaimer AS TEXT
    NOT NULL
    DEFAULT 'Claude-drafted by Marshall. Requires licensed IP counsel review before submission to CBP. FarmCeutica Wellness LLC makes no legal representation via this document.'
    CONSTRAINT marshall_ai_disclaimer_nonempty CHECK (length(VALUE) > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 1. customs_recordations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customs_recordations (
  recordation_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recordation_type          customs_recordation_type NOT NULL,
  status                    customs_recordation_status NOT NULL DEFAULT 'draft',
  mark_text                 TEXT,
  mark_image_vault_ref      TEXT,
  uspto_registration_number TEXT,
  uspto_registration_date   DATE,
  uspto_renewal_date        DATE,
  copyright_registration_number TEXT,
  copyright_registration_date   DATE,
  cbp_recordation_number    TEXT UNIQUE,
  cbp_recordation_date      DATE,
  cbp_expiration_date       DATE,
  cbp_grace_expiration_date DATE,
  total_ic_count            INTEGER CHECK (total_ic_count IS NULL OR total_ic_count > 0),
  total_fee_cents           BIGINT  CHECK (total_fee_cents IS NULL OR total_fee_cents >= 0),
  renewal_fee_cents         BIGINT  CHECK (renewal_fee_cents IS NULL OR renewal_fee_cents >= 0),
  ceo_approval_required     BOOLEAN NOT NULL DEFAULT FALSE,
  ceo_approved_by           UUID REFERENCES auth.users(id),
  ceo_approved_at           TIMESTAMPTZ,
  counsel_reviewed_by       UUID REFERENCES auth.users(id),
  counsel_reviewed_at       TIMESTAMPTZ,
  submitted_at              TIMESTAMPTZ,
  iprr_confirmation_vault_ref TEXT,
  trade_secrets_flag        BOOLEAN NOT NULL DEFAULT TRUE,
  notes                     TEXT,
  created_by                UUID REFERENCES auth.users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customs_recordations_trademark_has_mark CHECK (
    recordation_type <> 'trademark' OR mark_text IS NOT NULL
  ),
  CONSTRAINT customs_recordations_copyright_has_reg CHECK (
    recordation_type <> 'copyright' OR copyright_registration_number IS NOT NULL
  )
);

COMMENT ON TABLE public.customs_recordations IS
  'Prompt #114: one row per CBP IPRR filing under 19 C.F.R. Part 133. Extends to renewal and grace-period tracking.';

-- HARD STOP: CEO sign-off required when total_fee_cents > $1,000 (Q5 locked 2026-04-23).
CREATE OR REPLACE FUNCTION public.enforce_customs_recordation_ceo_approval()
RETURNS TRIGGER AS $$
DECLARE
  ceo_threshold_cents CONSTANT BIGINT := 100000;  -- $1,000.00
BEGIN
  IF NEW.status IN ('pending_fee', 'under_review', 'active') THEN
    IF COALESCE(NEW.total_fee_cents, 0) > ceo_threshold_cents THEN
      IF NEW.ceo_approved_by IS NULL OR NEW.ceo_approved_at IS NULL THEN
        RAISE EXCEPTION
          'Recordation total fee % cents exceeds $1,000 CEO-approval threshold; ceo_approved_by/ceo_approved_at required',
          NEW.total_fee_cents
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customs_recordations_ceo_approval ON public.customs_recordations;
CREATE TRIGGER trg_customs_recordations_ceo_approval
  BEFORE INSERT OR UPDATE OF status, total_fee_cents, ceo_approved_by, ceo_approved_at
  ON public.customs_recordations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_customs_recordation_ceo_approval();

-- ---------------------------------------------------------------------------
-- 2. customs_recordation_classes — International Class breakout (trademark only)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customs_recordation_classes (
  class_row_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recordation_id            UUID NOT NULL REFERENCES public.customs_recordations(recordation_id) ON DELETE CASCADE,
  international_class       INTEGER NOT NULL CHECK (international_class BETWEEN 1 AND 45),
  class_description         TEXT NOT NULL,
  fee_cents                 INTEGER NOT NULL DEFAULT 19000 CHECK (fee_cents >= 0),
  renewal_fee_cents         INTEGER NOT NULL DEFAULT 8000 CHECK (renewal_fee_cents >= 0),
  authorized_manufacturers  TEXT[] NOT NULL DEFAULT '{}',
  countries_of_manufacture  TEXT[] NOT NULL DEFAULT '{}',
  trade_secrets_flag        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recordation_id, international_class)
);

COMMENT ON TABLE public.customs_recordation_classes IS
  'Prompt #114: IC breakout per trademark recordation. Copyrights have no IC so rows do not exist for them.';

-- ---------------------------------------------------------------------------
-- 3. customs_fee_ledger — fee postings (separate from recordation row for history)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customs_fee_ledger (
  fee_entry_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recordation_id            UUID REFERENCES public.customs_recordations(recordation_id),
  fee_type                  customs_fee_type NOT NULL,
  amount_cents              BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency                  TEXT NOT NULL DEFAULT 'USD',
  posted_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  posted_by                 UUID REFERENCES auth.users(id),
  external_reference        TEXT,
  notes                     TEXT
);

-- ---------------------------------------------------------------------------
-- 4. customs_detentions — CBP Notice of Detention intake
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customs_detentions (
  detention_id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                         UUID REFERENCES public.legal_investigation_cases(case_id),
  recordation_id                  UUID REFERENCES public.customs_recordations(recordation_id),
  cbp_notice_reference            TEXT,
  cbp_port_code                   TEXT,
  cbp_port_name                   TEXT,
  detention_date                  DATE NOT NULL,
  notice_date                     DATE NOT NULL,
  response_deadline_date          DATE NOT NULL,
  detention_30day_deadline_date   DATE NOT NULL,
  importer_name_vault_ref         TEXT,
  importer_address_vault_ref      TEXT,
  importer_ein_vault_ref          TEXT,
  consignee_name_vault_ref        TEXT,
  shipper_name_vault_ref          TEXT,
  carrier                         TEXT,
  bill_of_lading_vault_ref        TEXT,
  hts_code                        TEXT,
  country_of_origin               TEXT,
  merchandise_description         TEXT,
  quantity                        INTEGER CHECK (quantity IS NULL OR quantity >= 0),
  declared_value_cents            BIGINT  CHECK (declared_value_cents IS NULL OR declared_value_cents >= 0),
  msrp_genuine_value_cents        BIGINT  CHECK (msrp_genuine_value_cents IS NULL OR msrp_genuine_value_cents >= 0),
  status                          customs_detention_status NOT NULL DEFAULT 'notice_received',
  sample_requested                BOOLEAN NOT NULL DEFAULT FALSE,
  sample_received_at              TIMESTAMPTZ,
  sample_returned_at              TIMESTAMPTZ,
  sample_bond_amount_cents        BIGINT CHECK (sample_bond_amount_cents IS NULL OR sample_bond_amount_cents >= 0),
  cbp_contact_name                TEXT,
  cbp_contact_email               TEXT,
  assigned_to                     UUID REFERENCES auth.users(id),
  rightsholder_determination      customs_determination,
  rightsholder_determination_rationale TEXT,
  response_text                   TEXT,
  response_submitted_at           TIMESTAMPTZ,
  counsel_reviewed_by             UUID REFERENCES auth.users(id),
  counsel_reviewed_at             TIMESTAMPTZ,
  ai_drafted                      BOOLEAN NOT NULL DEFAULT FALSE,
  ai_disclaimer                   marshall_ai_disclaimer,
  trade_secrets_flag              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customs_detentions_ai_content_counsel_gate CHECK (
    response_submitted_at IS NULL
    OR ai_drafted = FALSE
    OR counsel_reviewed_at IS NOT NULL
  )
);

COMMENT ON TABLE public.customs_detentions IS
  'Prompt #114: CBP Notice of Detention intake. 7-business-day response clock under 19 C.F.R. § 133.21(b)(2)(i); 30-calendar-day detention clock under § 133.21(b)(4). All importer identifiers behind vault_ref per Trade Secrets Act (18 U.S.C. § 1905).';

-- ---------------------------------------------------------------------------
-- 5. customs_detention_images — CBP-disclosed sample photos (SHA-256 chain)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customs_detention_images (
  image_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detention_id              UUID NOT NULL REFERENCES public.customs_detentions(detention_id) ON DELETE CASCADE,
  storage_path              TEXT NOT NULL,
  filename                  TEXT NOT NULL,
  content_type              TEXT NOT NULL,
  sha256                    TEXT NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  file_size_bytes           BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  uploaded_by               UUID REFERENCES auth.users(id),
  uploaded_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_integrity_verified_at TIMESTAMPTZ,
  last_integrity_verified_ok BOOLEAN,
  trade_secrets_flag        BOOLEAN NOT NULL DEFAULT TRUE,
  notes                     TEXT
);

COMMENT ON TABLE public.customs_detention_images IS
  'Prompt #114: chain-of-custody for CBP-disclosed sample photos. sha256 verified on every read and by scheduled verifier (see #240 pg_cron job).';

-- ---------------------------------------------------------------------------
-- 6. customs_seizures — post-detention seizure lifecycle
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customs_seizures (
  seizure_id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detention_id                  UUID REFERENCES public.customs_detentions(detention_id),
  case_id                       UUID REFERENCES public.legal_investigation_cases(case_id),
  seized_at                     TIMESTAMPTZ NOT NULL,
  seizure_date                  DATE NOT NULL,
  seizure_notice_date           DATE,
  seizure_notice_reference      TEXT,
  cbp_disclosure_deadline_date  DATE NOT NULL,
  cbp_disclosure_received_at    TIMESTAMPTZ,
  cbp_disclosure_complete       BOOLEAN NOT NULL DEFAULT FALSE,
  forfeiture_notice_published_url TEXT,
  forfeiture_notice_start_date  DATE,
  forfeiture_notice_end_date    DATE,
  destruction_date              DATE,
  destruction_method            TEXT,
  civil_fine_imposed            BOOLEAN NOT NULL DEFAULT FALSE,
  importer_prior_violations     INTEGER NOT NULL DEFAULT 0 CHECK (importer_prior_violations >= 0),
  status                        customs_seizure_status NOT NULL DEFAULT 'seized',
  trade_secrets_flag            BOOLEAN NOT NULL DEFAULT TRUE,
  notes                         TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.customs_seizures IS
  'Prompt #114: post-seizure record. 30-business-day CBP disclosure clock under 19 C.F.R. § 133.21(e).';

-- ---------------------------------------------------------------------------
-- 7. customs_fines_imposed — § 133.27 civil fines (CBP collects; we track)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customs_fines_imposed (
  fine_id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seizure_id                UUID REFERENCES public.customs_seizures(seizure_id),
  importer_name_vault_ref   TEXT,
  importer_address_vault_ref TEXT,
  violation_number          INTEGER NOT NULL CHECK (violation_number >= 1),
  msrp_genuine_cents        BIGINT NOT NULL CHECK (msrp_genuine_cents >= 0),
  fine_amount_cents         BIGINT CHECK (fine_amount_cents IS NULL OR fine_amount_cents >= 0),
  fine_notice_date          DATE,
  status                    TEXT,
  trade_secrets_flag        BOOLEAN NOT NULL DEFAULT TRUE,
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 8. customs_e_allegations — outbound Trade Violations Reporting allegations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customs_e_allegations (
  e_allegation_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID REFERENCES public.legal_investigation_cases(case_id),
  posture                   customs_e_allegation_posture NOT NULL DEFAULT 'named',
  allegation_body           TEXT,
  evidence_summary          TEXT,
  violator_identity_vault_ref TEXT,
  conduct_description       TEXT,
  status                    customs_e_allegation_status NOT NULL DEFAULT 'draft',
  cbp_allegation_number     TEXT,
  submitted_at              TIMESTAMPTZ,
  submitted_by              UUID REFERENCES auth.users(id),
  counsel_reviewed_by       UUID REFERENCES auth.users(id),
  counsel_reviewed_at       TIMESTAMPTZ,
  ai_drafted                BOOLEAN NOT NULL DEFAULT FALSE,
  ai_disclaimer             marshall_ai_disclaimer,
  trade_secrets_flag        BOOLEAN NOT NULL DEFAULT TRUE,
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customs_e_allegations_ai_content_counsel_gate CHECK (
    submitted_at IS NULL
    OR ai_drafted = FALSE
    OR counsel_reviewed_at IS NOT NULL
  )
);

-- ---------------------------------------------------------------------------
-- 9. customs_moiety_claims — 19 U.S.C. § 1619 whistleblower claims
--    RLS narrowed to admin + ceo + cfo only (Q6 locked 2026-04-23)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customs_moiety_claims (
  moiety_claim_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  e_allegation_id               UUID REFERENCES public.customs_e_allegations(e_allegation_id),
  eapa_case_number              TEXT,
  recovery_type                 TEXT,
  estimated_net_recovery_cents  BIGINT CHECK (estimated_net_recovery_cents IS NULL OR estimated_net_recovery_cents >= 0),
  claim_percentage              NUMERIC(5,2) NOT NULL DEFAULT 25.00 CHECK (claim_percentage BETWEEN 0 AND 50),
  claim_cap_cents               BIGINT NOT NULL DEFAULT 25000000 CHECK (claim_cap_cents >= 0),  -- $250,000
  filed_at                      TIMESTAMPTZ,
  cbp_claim_number              TEXT,
  status                        customs_moiety_claim_status NOT NULL DEFAULT 'forecast',
  awarded_amount_cents          BIGINT CHECK (awarded_amount_cents IS NULL OR awarded_amount_cents >= 0),
  awarded_at                    TIMESTAMPTZ,
  trade_secrets_flag            BOOLEAN NOT NULL DEFAULT TRUE,
  notes                         TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.customs_moiety_claims IS
  'Prompt #114: § 1619 whistleblower moiety forecasts. Access narrowed to admin + ceo + cfo (Q6 locked 2026-04-23); legal_ops and compliance_officer excluded because reward intel is sensitive.';

-- ---------------------------------------------------------------------------
-- 10. customs_authentication_guides — CBP Product Identification Guides
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customs_authentication_guides (
  guide_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recordation_id            UUID NOT NULL REFERENCES public.customs_recordations(recordation_id) ON DELETE CASCADE,
  version                   INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  status                    customs_guide_status NOT NULL DEFAULT 'draft',
  template_version          TEXT NOT NULL,
  submitted_to_cbp_at       TIMESTAMPTZ,
  cbp_feedback              TEXT,
  counsel_reviewed_by       UUID REFERENCES auth.users(id),
  counsel_reviewed_at       TIMESTAMPTZ,
  pdf_storage_path          TEXT,
  created_by                UUID REFERENCES auth.users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recordation_id, version)
);

-- ---------------------------------------------------------------------------
-- 11. customs_guide_sections — structured section blocks (enforces CBP order)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customs_guide_sections (
  section_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id                  UUID NOT NULL REFERENCES public.customs_authentication_guides(guide_id) ON DELETE CASCADE,
  section_type              customs_guide_section_type NOT NULL,
  display_order             INTEGER NOT NULL CHECK (display_order >= 0),
  title                     TEXT,
  body_md                   TEXT,
  images_json               JSONB NOT NULL DEFAULT '[]'::JSONB,
  ai_drafted                BOOLEAN NOT NULL DEFAULT FALSE,
  ai_disclaimer             marshall_ai_disclaimer,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (guide_id, section_type)
);

-- ---------------------------------------------------------------------------
-- 12. customs_trainings — CBP port training requests
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customs_trainings (
  training_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format                    customs_training_format NOT NULL,
  status                    customs_training_status NOT NULL DEFAULT 'requested',
  port_code                 TEXT,
  port_name                 TEXT,
  requested_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_at              TIMESTAMPTZ,
  delivered_at              TIMESTAMPTZ,
  cbp_contact_email         TEXT,
  request_email_vault_ref   TEXT,
  deck_storage_path         TEXT,
  attendance_estimate       INTEGER CHECK (attendance_estimate IS NULL OR attendance_estimate >= 0),
  ai_drafted                BOOLEAN NOT NULL DEFAULT FALSE,
  ai_disclaimer             marshall_ai_disclaimer,
  notes                     TEXT,
  created_by                UUID REFERENCES auth.users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 13. customs_iprs_scan_results — daily IPRS monitoring hits
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customs_iprs_scan_results (
  scan_result_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID REFERENCES public.legal_investigation_cases(case_id),
  recordation_id            UUID REFERENCES public.customs_recordations(recordation_id),
  scan_date                 DATE NOT NULL DEFAULT CURRENT_DATE,
  scanned_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  listing_title             TEXT,
  listing_title_normalized  TEXT,
  listing_url               TEXT,
  listing_source            TEXT,
  seller_identifier_vault_ref TEXT,
  observed_price_cents      BIGINT CHECK (observed_price_cents IS NULL OR observed_price_cents >= 0),
  mark_distance_score       NUMERIC(4,3) CHECK (mark_distance_score IS NULL OR mark_distance_score BETWEEN 0 AND 1),
  content_hash              TEXT,
  status                    customs_iprs_result_status NOT NULL DEFAULT 'new',
  reviewed_by               UUID REFERENCES auth.users(id),
  reviewed_at               TIMESTAMPTZ,
  review_notes              TEXT,
  trade_secrets_flag        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.customs_iprs_scan_results IS
  'Prompt #114: daily IPRS sweep hits. content_hash is sha256 of normalized title+seller+price for exact-match dedup; mark_distance_score is Levenshtein-normalized distance when fuzzy path triggers.';

-- ---------------------------------------------------------------------------
-- 14. customs_counsel_reviews — counsel sign-offs on customs deliverables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customs_counsel_reviews (
  review_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID REFERENCES public.legal_investigation_cases(case_id),
  review_kind               customs_counsel_review_kind NOT NULL,
  target_table              TEXT NOT NULL,
  target_row_id             UUID NOT NULL,
  status                    customs_counsel_review_status NOT NULL DEFAULT 'pending',
  requested_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_by              UUID REFERENCES auth.users(id),
  decided_at                TIMESTAMPTZ,
  decided_by                UUID REFERENCES auth.users(id),
  decision_notes            TEXT,
  trade_secrets_flag        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.customs_counsel_reviews IS
  'Prompt #114: counsel review requests + decisions. Scoped writes allowed only to counsel via legal_privilege_grants (see #220 RLS migration); compliance_officer + admin can open requests.';

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuse existing helper if present; otherwise inline)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.customs_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'customs_recordations',
    'customs_detentions',
    'customs_seizures',
    'customs_authentication_guides',
    'customs_guide_sections',
    'customs_trainings',
    'customs_iprs_scan_results',
    'customs_e_allegations',
    'customs_moiety_claims',
    'customs_counsel_reviews'
  ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_touch_updated_at ON public.%I;
       CREATE TRIGGER trg_%I_touch_updated_at
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.customs_touch_updated_at();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;

-- =============================================================================
-- End of 20260424000200_prompt_114_customs_schema.sql
-- Next: 20260424000210_prompt_114_customs_indexes.sql (CONCURRENTLY, outside TX)
-- =============================================================================
