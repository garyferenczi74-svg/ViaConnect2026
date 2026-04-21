-- =============================================================================
-- Prompt #104 Phase 1: Investigation, evidence, counterparty registry
-- =============================================================================
-- Workstream A. Append-only. Source of all enforcement reasoning.
--
-- Notes:
--   - source_violation_id is a free-form UUID (no FK to map_violations
--     so #100/#101 can be uninstalled without orphaning legal cases).
--   - state machine enforced by trg_legal_case_state_transition;
--     mirrors src/lib/legal/caseStateMachine.ts.
--   - counterparty FK lives in this same migration (forward-declared).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE legal_case_state AS ENUM (
    'intake', 'triage_ai', 'pending_human_triage',
    'pending_medical_director_review', 'classified',
    'active_enforcement',
    'resolved_successful', 'resolved_unsuccessful',
    'escalated_to_outside_counsel', 'escalated_to_litigation',
    'closed_no_action', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE legal_case_bucket AS ENUM (
    'unclassified', 'map_only',
    'gray_market_no_differences', 'gray_market_material_differences',
    'counterfeit'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE legal_case_priority AS ENUM ('p1_critical', 'p2_high', 'p3_normal', 'p4_low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE evidence_artifact_type AS ENUM (
    'page_screenshot', 'html_snapshot', 'pricing_capture',
    'whois_lookup', 'marketplace_seller_profile', 'trademark_usage_capture',
    'test_purchase_receipt', 'product_photograph', 'lab_report',
    'customer_complaint', 'platform_decision_doc',
    'counterparty_correspondence', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE counterparty_type AS ENUM (
    'individual', 'sole_proprietor', 'llc', 'corp', 'foreign_entity', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Counterparties (forward-declared so cases can reference)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_counterparties (
  counterparty_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_label             TEXT NOT NULL,
  counterparty_type         counterparty_type NOT NULL DEFAULT 'unknown',
  primary_jurisdiction      TEXT,
  jurisdictions             TEXT[] DEFAULT '{}',
  verified_business_reg_id  TEXT,
  verified_domain           TEXT,
  marketplace_handles       JSONB NOT NULL DEFAULT '[]'::JSONB,
  contact_info_vault_ref    TEXT,
  identity_confidence       NUMERIC(3,2) NOT NULL DEFAULT 0.50
                             CHECK (identity_confidence BETWEEN 0 AND 1),
  disputed_identity         BOOLEAN NOT NULL DEFAULT FALSE,
  notes                     TEXT,
  first_seen_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_cases_count         INTEGER NOT NULL DEFAULT 0,
  total_settlement_cents    BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_legal_counterparties_domain
  ON public.legal_counterparties(verified_domain) WHERE verified_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_legal_counterparties_business_reg
  ON public.legal_counterparties(verified_business_reg_id) WHERE verified_business_reg_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_legal_counterparties_disputed
  ON public.legal_counterparties(counterparty_id) WHERE disputed_identity = TRUE;

CREATE TABLE IF NOT EXISTS public.legal_counterparty_merge_history (
  merge_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surviving_counterparty_id UUID NOT NULL REFERENCES public.legal_counterparties(counterparty_id),
  merged_counterparty_id    UUID NOT NULL,
  merge_reason              TEXT NOT NULL,
  merged_identifiers_json   JSONB,
  merged_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  merged_by                 UUID NOT NULL REFERENCES auth.users(id),
  unmerged_at               TIMESTAMPTZ,
  unmerged_by               UUID REFERENCES auth.users(id),
  unmerge_reason            TEXT
);

CREATE INDEX IF NOT EXISTS idx_legal_counterparty_merge_surviving
  ON public.legal_counterparty_merge_history(surviving_counterparty_id);

-- ---------------------------------------------------------------------------
-- Cases
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_investigation_cases (
  case_id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_label                TEXT NOT NULL UNIQUE,
  source_violation_id       UUID,
  state                     legal_case_state NOT NULL DEFAULT 'intake',
  bucket                    legal_case_bucket NOT NULL DEFAULT 'unclassified',
  bucket_confidence_score   NUMERIC(3,2) CHECK (bucket_confidence_score IS NULL OR (bucket_confidence_score BETWEEN 0 AND 1)),
  priority                  legal_case_priority NOT NULL DEFAULT 'p3_normal',
  counterparty_id           UUID REFERENCES public.legal_counterparties(counterparty_id),
  assigned_reviewer_id      UUID REFERENCES auth.users(id),
  estimated_damages_cents   BIGINT CHECK (estimated_damages_cents IS NULL OR estimated_damages_cents >= 0),
  has_medical_claim_flag    BOOLEAN NOT NULL DEFAULT FALSE,
  medical_director_reviewed_at TIMESTAMPTZ,
  affected_product_ids      UUID[] NOT NULL DEFAULT '{}',
  affected_brand_ids        UUID[] NOT NULL DEFAULT '{}',
  intake_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  classified_at             TIMESTAMPTZ,
  resolved_at               TIMESTAMPTZ,
  closed_at                 TIMESTAMPTZ,
  retention_until           TIMESTAMPTZ,
  metadata_json             JSONB NOT NULL DEFAULT '{}'::JSONB,
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_cases_state ON public.legal_investigation_cases(state);
CREATE INDEX IF NOT EXISTS idx_legal_cases_priority
  ON public.legal_investigation_cases(priority, intake_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_cases_counterparty
  ON public.legal_investigation_cases(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_legal_cases_active
  ON public.legal_investigation_cases(updated_at DESC)
  WHERE state NOT IN ('resolved_successful', 'closed_no_action', 'archived');

-- State-transition validator: rejects any transition not enumerated
-- in src/lib/legal/caseStateMachine.ts. Pure SQL, no row-locking
-- gymnastics — Postgres serializable isolation handles concurrent
-- writes; this trigger only validates the proposed transition.
CREATE OR REPLACE FUNCTION public.enforce_legal_case_state_transition()
RETURNS TRIGGER AS $$
DECLARE
  allowed legal_case_state[];
BEGIN
  IF OLD.state = NEW.state THEN
    RETURN NEW;
  END IF;

  allowed := CASE OLD.state
    WHEN 'intake'                             THEN ARRAY['triage_ai','closed_no_action']::legal_case_state[]
    WHEN 'triage_ai'                          THEN ARRAY['pending_human_triage','pending_medical_director_review','closed_no_action']::legal_case_state[]
    WHEN 'pending_human_triage'               THEN ARRAY['pending_medical_director_review','classified','closed_no_action']::legal_case_state[]
    WHEN 'pending_medical_director_review'    THEN ARRAY['classified','closed_no_action']::legal_case_state[]
    WHEN 'classified'                         THEN ARRAY['active_enforcement','escalated_to_outside_counsel','closed_no_action']::legal_case_state[]
    WHEN 'active_enforcement'                 THEN ARRAY['resolved_successful','resolved_unsuccessful','escalated_to_outside_counsel','escalated_to_litigation','closed_no_action']::legal_case_state[]
    WHEN 'resolved_unsuccessful'              THEN ARRAY['active_enforcement','escalated_to_outside_counsel','escalated_to_litigation','closed_no_action','archived']::legal_case_state[]
    WHEN 'escalated_to_outside_counsel'       THEN ARRAY['escalated_to_litigation','resolved_successful','resolved_unsuccessful','closed_no_action']::legal_case_state[]
    WHEN 'escalated_to_litigation'            THEN ARRAY['resolved_successful','resolved_unsuccessful','closed_no_action']::legal_case_state[]
    WHEN 'resolved_successful'                THEN ARRAY['archived']::legal_case_state[]
    WHEN 'closed_no_action'                   THEN ARRAY['archived']::legal_case_state[]
    WHEN 'archived'                           THEN ARRAY[]::legal_case_state[]
    ELSE ARRAY[]::legal_case_state[]
  END;

  IF NOT (NEW.state = ANY(allowed)) THEN
    RAISE EXCEPTION 'Invalid legal case state transition: % -> % (case %)', OLD.state, NEW.state, OLD.case_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_legal_case_state_transition ON public.legal_investigation_cases;
CREATE TRIGGER trg_legal_case_state_transition
  BEFORE UPDATE OF state ON public.legal_investigation_cases
  FOR EACH ROW EXECUTE FUNCTION public.enforce_legal_case_state_transition();

-- ---------------------------------------------------------------------------
-- Evidence
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_investigation_evidence (
  evidence_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID NOT NULL REFERENCES public.legal_investigation_cases(case_id) ON DELETE RESTRICT,
  artifact_type             evidence_artifact_type NOT NULL,
  storage_path              TEXT NOT NULL,
  content_sha256            TEXT NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  mime_type                 TEXT,
  file_size_bytes           BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  captured_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_by               UUID REFERENCES auth.users(id),
  captured_via              TEXT,
  chain_of_custody_json     JSONB NOT NULL DEFAULT '[]'::JSONB,
  description               TEXT,
  redacted_for_filing       BOOLEAN NOT NULL DEFAULT FALSE,
  redacted_storage_path     TEXT,
  CONSTRAINT redacted_path_paired
    CHECK ((redacted_for_filing = FALSE AND redacted_storage_path IS NULL)
        OR (redacted_for_filing = TRUE  AND redacted_storage_path IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_legal_evidence_case
  ON public.legal_investigation_evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_legal_evidence_type
  ON public.legal_investigation_evidence(artifact_type);

COMMENT ON TABLE public.legal_investigation_evidence IS
  'Prompt #104: chain-of-custody evidence artifacts. content_sha256 computed at capture; verified on every read. Mismatch = critical alert (chain-of-custody breach).';
