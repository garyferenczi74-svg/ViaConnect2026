-- =============================================================================
-- Prompt #104 Phase 1: Enforcement actions, templates, marketplace, DMCA
-- =============================================================================
-- Workstream B. Append-only.
--
-- Critical legal-process integrity rules enforced at the DB level:
--   - Status cannot transition to 'sent' without approved_at +
--     approved_by + approval_confirmation_text populated. (No
--     auto-send.)
--   - Approval confirmation text minimum length = 6 chars (typed
--     confirmation requires deliberate intent).
--   - DMCA filings reject INSERT unless all six § 512(c)(3)(A)
--     statutory_elements_json keys are present and truthy.
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE template_status AS ENUM ('draft', 'active', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enforcement_action_type AS ENUM (
    'cease_and_desist_letter', 'dmca_takedown',
    'marketplace_ip_complaint', 'marketplace_tos_complaint',
    'refusal_to_sell', 'wholesale_account_suspension',
    'customs_referral', 'information_request', 'follow_up'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enforcement_action_status AS ENUM (
    'draft', 'pending_approval', 'approved_awaiting_send', 'sent',
    'acknowledged', 'response_received', 'complied', 'disputed',
    'counter_notice_received', 'escalated', 'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Templates library (versioned, append-only via UNIQUE (family, version))
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_templates_library (
  template_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_family           TEXT NOT NULL,
  version                   TEXT NOT NULL,
  applicable_buckets        legal_case_bucket[] NOT NULL,
  applicable_jurisdictions  TEXT[] NOT NULL DEFAULT '{}',
  required_merge_fields     TEXT[] NOT NULL DEFAULT '{}',
  markdown_body             TEXT NOT NULL CHECK (length(markdown_body) >= 50),
  status                    template_status NOT NULL DEFAULT 'draft',
  last_counsel_review_at    TIMESTAMPTZ,
  last_counsel_reviewer     TEXT,
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_family, version)
);

CREATE INDEX IF NOT EXISTS idx_legal_templates_family
  ON public.legal_templates_library(template_family, status);

-- ---------------------------------------------------------------------------
-- Enforcement actions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_enforcement_actions (
  action_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID NOT NULL REFERENCES public.legal_investigation_cases(case_id) ON DELETE RESTRICT,
  action_type               enforcement_action_type NOT NULL,
  template_id               UUID REFERENCES public.legal_templates_library(template_id),
  target_platform           TEXT,
  target_listing_url        TEXT,
  draft_storage_path        TEXT,
  draft_content_sha256      TEXT CHECK (draft_content_sha256 IS NULL OR draft_content_sha256 ~ '^[0-9a-f]{64}$'),
  final_storage_path        TEXT,
  final_content_sha256      TEXT CHECK (final_content_sha256 IS NULL OR final_content_sha256 ~ '^[0-9a-f]{64}$'),
  status                    enforcement_action_status NOT NULL DEFAULT 'draft',
  drafted_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  drafted_by                UUID REFERENCES auth.users(id),
  approved_at               TIMESTAMPTZ,
  approved_by               UUID REFERENCES auth.users(id),
  approval_confirmation_text TEXT,
  sent_at                   TIMESTAMPTZ,
  sent_via                  TEXT,
  external_reference_id     TEXT,
  response_deadline         TIMESTAMPTZ,
  response_received_at      TIMESTAMPTZ,
  response_classification   TEXT,
  metadata_json             JSONB NOT NULL DEFAULT '{}'::JSONB,
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_actions_case
  ON public.legal_enforcement_actions(case_id);
CREATE INDEX IF NOT EXISTS idx_legal_actions_status
  ON public.legal_enforcement_actions(status);
CREATE INDEX IF NOT EXISTS idx_legal_actions_pending_approval
  ON public.legal_enforcement_actions(drafted_at ASC) WHERE status = 'pending_approval';
CREATE INDEX IF NOT EXISTS idx_legal_actions_response_overdue
  ON public.legal_enforcement_actions(response_deadline ASC)
  WHERE status = 'sent' AND response_deadline IS NOT NULL;

-- HARD STOP §15: no auto-send. Status cannot reach 'approved_awaiting_send'
-- or 'sent' without a recorded approval (approver + timestamp +
-- typed-confirmation text >= 6 chars).
CREATE OR REPLACE FUNCTION public.enforce_legal_action_no_auto_send()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('approved_awaiting_send', 'sent') THEN
    IF NEW.approved_by IS NULL OR NEW.approved_at IS NULL
       OR NEW.approval_confirmation_text IS NULL
       OR length(NEW.approval_confirmation_text) < 6 THEN
      RAISE EXCEPTION
        'Cannot move enforcement action to % without recorded approval (approver + timestamp + typed-confirmation text >= 6 chars). action_id=%',
        NEW.status, NEW.action_id
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF NEW.status = 'sent' AND NEW.sent_at IS NULL THEN
    RAISE EXCEPTION 'sent_at required when transitioning enforcement action to sent (action_id=%)', NEW.action_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_legal_action_no_auto_send ON public.legal_enforcement_actions;
CREATE TRIGGER trg_legal_action_no_auto_send
  BEFORE INSERT OR UPDATE OF status, approved_by, approved_at, approval_confirmation_text, sent_at
  ON public.legal_enforcement_actions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_legal_action_no_auto_send();

-- ---------------------------------------------------------------------------
-- Marketplace integrations + complaints
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_marketplace_integrations (
  integration_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform                  TEXT NOT NULL UNIQUE,
  enrolled_in_ip_program    BOOLEAN NOT NULL DEFAULT FALSE,
  enrollment_reference      TEXT,
  api_access_available      BOOLEAN NOT NULL DEFAULT FALSE,
  api_credentials_vault_ref TEXT,
  complaint_submission_url  TEXT,
  notes                     TEXT,
  last_verified_at          TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.legal_marketplace_complaints (
  complaint_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enforcement_action_id     UUID NOT NULL REFERENCES public.legal_enforcement_actions(action_id),
  platform                  TEXT NOT NULL,
  platform_complaint_id     TEXT,
  complaint_type            TEXT NOT NULL CHECK (complaint_type IN (
    'counterfeit', 'ip_infringement', 'tos_violation'
  )),
  listing_url               TEXT NOT NULL,
  submitted_at              TIMESTAMPTZ,
  platform_status           TEXT,
  platform_response_at      TIMESTAMPTZ,
  platform_response_text    TEXT,
  counter_notice_received   BOOLEAN NOT NULL DEFAULT FALSE,
  counter_notice_received_at TIMESTAMPTZ,
  listing_removed_at        TIMESTAMPTZ,
  listing_verified_removed_at TIMESTAMPTZ,
  notes                     TEXT
);

CREATE INDEX IF NOT EXISTS idx_legal_marketplace_complaints_action
  ON public.legal_marketplace_complaints(enforcement_action_id);
CREATE INDEX IF NOT EXISTS idx_legal_marketplace_complaints_platform
  ON public.legal_marketplace_complaints(platform, submitted_at DESC);

-- ---------------------------------------------------------------------------
-- DMCA filings + counter-notices
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_dmca_counter_notices (
  counter_notice_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_filing_id        UUID NOT NULL,
  received_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  counter_notice_content_vault_ref TEXT,
  response_deadline         TIMESTAMPTZ NOT NULL,
  response_action           TEXT CHECK (response_action IS NULL OR response_action IN ('suit_filed', 'withdrawn', 'expired')),
  resolved_at               TIMESTAMPTZ,
  notes                     TEXT
);

CREATE TABLE IF NOT EXISTS public.legal_dmca_filings (
  filing_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enforcement_action_id     UUID NOT NULL REFERENCES public.legal_enforcement_actions(action_id),
  host_platform             TEXT NOT NULL,
  infringing_url            TEXT NOT NULL,
  copyrighted_work_ref      TEXT NOT NULL,
  copyright_registration    TEXT,
  statutory_elements_json   JSONB NOT NULL,
  signing_officer           TEXT NOT NULL,
  filed_at                  TIMESTAMPTZ,
  platform_ticket_id        TEXT,
  takedown_effected_at      TIMESTAMPTZ,
  counter_notice_filing_id  UUID REFERENCES public.legal_dmca_counter_notices(counter_notice_id),
  notes                     TEXT,

  -- HARD STOP §15: every § 512(c)(3)(A) element must be present.
  CONSTRAINT dmca_statutory_elements_complete CHECK (
    (statutory_elements_json ? 'signature')                              AND length(statutory_elements_json->>'signature') > 0
    AND (statutory_elements_json ? 'copyrighted_work_identification')    AND length(statutory_elements_json->>'copyrighted_work_identification') > 0
    AND (statutory_elements_json ? 'infringing_material_identification') AND length(statutory_elements_json->>'infringing_material_identification') > 0
    AND (statutory_elements_json ? 'contact_info')
    AND (statutory_elements_json ? 'good_faith_statement_present')       AND (statutory_elements_json->>'good_faith_statement_present')::BOOLEAN = TRUE
    AND (statutory_elements_json ? 'perjury_statement_present')          AND (statutory_elements_json->>'perjury_statement_present')::BOOLEAN = TRUE
  )
);

ALTER TABLE public.legal_dmca_counter_notices
  DROP CONSTRAINT IF EXISTS legal_dmca_counter_notices_original_fk;
ALTER TABLE public.legal_dmca_counter_notices
  ADD CONSTRAINT legal_dmca_counter_notices_original_fk
  FOREIGN KEY (original_filing_id) REFERENCES public.legal_dmca_filings(filing_id);

CREATE INDEX IF NOT EXISTS idx_legal_dmca_action
  ON public.legal_dmca_filings(enforcement_action_id);

COMMENT ON CONSTRAINT dmca_statutory_elements_complete ON public.legal_dmca_filings IS
  'Prompt #104 HARD STOP: 17 USC § 512(c)(3)(A) requires all six elements. Missing any blocks the INSERT.';
