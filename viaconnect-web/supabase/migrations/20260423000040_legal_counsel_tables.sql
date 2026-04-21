-- =============================================================================
-- Prompt #104 Phase 1: Outside counsel, engagements, privileged comms,
-- settlements, privilege grants
-- =============================================================================
-- Workstream C. Append-only. Privilege scope enforced at the row
-- level: legal_privileged_communications visible only to actors with
-- an active legal_privilege_grants row for that case (or admin).
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE counsel_engagement_status AS ENUM (
    'proposed', 'pending_cfo_approval', 'pending_ceo_approval',
    'approved', 'active', 'completed', 'withdrawn', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE privileged_comms_direction AS ENUM ('inbound', 'outbound', 'internal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Outside counsel roster
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_outside_counsel (
  counsel_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_name                 TEXT NOT NULL,
  attorney_name             TEXT NOT NULL,
  specialty                 TEXT[] NOT NULL DEFAULT '{}',
  jurisdictions             TEXT[] NOT NULL DEFAULT '{}',
  billing_rate_cents        BIGINT CHECK (billing_rate_cents IS NULL OR billing_rate_cents >= 0),
  retainer_required         BOOLEAN NOT NULL DEFAULT FALSE,
  retainer_amount_cents     BIGINT CHECK (retainer_amount_cents IS NULL OR retainer_amount_cents >= 0),
  contact_info_vault_ref    TEXT NOT NULL,
  engagement_letter_vault_ref TEXT,
  active                    BOOLEAN NOT NULL DEFAULT TRUE,
  performance_history_json  JSONB NOT NULL DEFAULT '{}'::JSONB,
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_counsel_active
  ON public.legal_outside_counsel(active);

-- ---------------------------------------------------------------------------
-- Counsel engagements + budget approval chain
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_counsel_engagements (
  engagement_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID NOT NULL REFERENCES public.legal_investigation_cases(case_id),
  counsel_id                UUID NOT NULL REFERENCES public.legal_outside_counsel(counsel_id),
  status                    counsel_engagement_status NOT NULL DEFAULT 'proposed',
  scope_description         TEXT NOT NULL CHECK (length(scope_description) >= 30),
  estimated_budget_cents    BIGINT NOT NULL CHECK (estimated_budget_cents >= 0),
  approved_budget_cents     BIGINT CHECK (approved_budget_cents IS NULL OR approved_budget_cents >= 0),
  briefing_packet_vault_ref TEXT,
  proposed_by               UUID REFERENCES auth.users(id),
  proposed_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cfo_approved_by           UUID REFERENCES auth.users(id),
  cfo_approved_at           TIMESTAMPTZ,
  ceo_approved_by           UUID REFERENCES auth.users(id),
  ceo_approved_at           TIMESTAMPTZ,
  activated_at              TIMESTAMPTZ,
  completed_at              TIMESTAMPTZ,
  total_invoiced_cents      BIGINT NOT NULL DEFAULT 0 CHECK (total_invoiced_cents >= 0),
  notes                     TEXT
);

CREATE INDEX IF NOT EXISTS idx_legal_engagements_case
  ON public.legal_counsel_engagements(case_id);
CREATE INDEX IF NOT EXISTS idx_legal_engagements_counsel
  ON public.legal_counsel_engagements(counsel_id);
CREATE INDEX IF NOT EXISTS idx_legal_engagements_pending_approval
  ON public.legal_counsel_engagements(proposed_at ASC)
  WHERE status IN ('pending_cfo_approval', 'pending_ceo_approval');

-- HARD STOP §15: budget approval chain enforcement.
--   < $5,000  → no CFO required
--   >= $5,000 → CFO approval required to leave 'pending_cfo_approval'
--   >= $25,000 → CEO approval required to reach 'approved' or 'active'
CREATE OR REPLACE FUNCTION public.enforce_counsel_engagement_approvals()
RETURNS TRIGGER AS $$
DECLARE
  cfo_threshold CONSTANT BIGINT := 500000;       -- $5,000
  ceo_threshold CONSTANT BIGINT := 2500000;      -- $25,000
BEGIN
  IF NEW.status IN ('approved', 'active', 'completed') THEN
    IF NEW.estimated_budget_cents >= cfo_threshold AND (NEW.cfo_approved_by IS NULL OR NEW.cfo_approved_at IS NULL) THEN
      RAISE EXCEPTION 'Engagement requires CFO approval (>= $5,000); estimated_budget_cents=%', NEW.estimated_budget_cents
        USING ERRCODE = 'P0001';
    END IF;
    IF NEW.estimated_budget_cents >= ceo_threshold AND (NEW.ceo_approved_by IS NULL OR NEW.ceo_approved_at IS NULL) THEN
      RAISE EXCEPTION 'Engagement requires CEO approval (>= $25,000); estimated_budget_cents=%', NEW.estimated_budget_cents
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_legal_engagement_approvals ON public.legal_counsel_engagements;
CREATE TRIGGER trg_legal_engagement_approvals
  BEFORE INSERT OR UPDATE OF status, estimated_budget_cents, cfo_approved_by, cfo_approved_at, ceo_approved_by, ceo_approved_at
  ON public.legal_counsel_engagements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_counsel_engagement_approvals();

-- ---------------------------------------------------------------------------
-- Privilege grants: per-case access to privileged_communications
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_privilege_grants (
  grant_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID NOT NULL REFERENCES public.legal_investigation_cases(case_id) ON DELETE RESTRICT,
  user_id                   UUID NOT NULL REFERENCES auth.users(id),
  granted_by                UUID NOT NULL REFERENCES auth.users(id),
  granted_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active                    BOOLEAN NOT NULL DEFAULT TRUE,
  revoked_at                TIMESTAMPTZ,
  revoked_by                UUID REFERENCES auth.users(id),
  notes                     TEXT,
  UNIQUE (case_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_legal_privilege_grants_case_user
  ON public.legal_privilege_grants(case_id, user_id) WHERE active = TRUE;

-- ---------------------------------------------------------------------------
-- Privileged communications (Vault refs only; no plaintext bodies here)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_privileged_communications (
  comm_id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID NOT NULL REFERENCES public.legal_investigation_cases(case_id),
  engagement_id             UUID REFERENCES public.legal_counsel_engagements(engagement_id),
  direction                 privileged_comms_direction NOT NULL,
  subject                   TEXT,
  body_vault_ref            TEXT NOT NULL,
  attachment_vault_refs     TEXT[] NOT NULL DEFAULT '{}',
  communication_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  from_identifier_vault_ref TEXT,
  to_identifier_vault_refs  TEXT[] NOT NULL DEFAULT '{}',
  privilege_scope           TEXT NOT NULL DEFAULT 'attorney_client'
    CHECK (privilege_scope IN ('attorney_client', 'work_product', 'common_interest')),
  notes                     TEXT
);

CREATE INDEX IF NOT EXISTS idx_legal_privileged_comms_case
  ON public.legal_privileged_communications(case_id);
CREATE INDEX IF NOT EXISTS idx_legal_privileged_comms_engagement
  ON public.legal_privileged_communications(engagement_id);

COMMENT ON TABLE public.legal_privileged_communications IS
  'Prompt #104: attorney-client privileged comms. body_vault_ref points to encrypted-at-rest body (pgcrypto until Supabase Vault provisioned). RLS gates by legal_privilege_grants.';

-- ---------------------------------------------------------------------------
-- Settlements with approval-tier enforcement
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_case_settlements (
  settlement_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID NOT NULL REFERENCES public.legal_investigation_cases(case_id),
  settlement_date           DATE NOT NULL,
  monetary_amount_cents     BIGINT NOT NULL DEFAULT 0 CHECK (monetary_amount_cents >= 0),
  currency                  TEXT NOT NULL DEFAULT 'USD',
  payment_method            TEXT,
  payment_received_at       TIMESTAMPTZ,
  nda_required              BOOLEAN NOT NULL DEFAULT FALSE,
  nda_vault_ref             TEXT,
  future_conduct_obligations_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  release_scope             TEXT NOT NULL DEFAULT 'specific_claim'
    CHECK (release_scope IN ('specific_claim', 'all_claims', 'global_release')),
  drafted_by_counsel_id     UUID REFERENCES public.legal_outside_counsel(counsel_id),
  approved_by               UUID REFERENCES auth.users(id),
  approved_at               TIMESTAMPTZ,
  approval_tier             TEXT NOT NULL CHECK (approval_tier IN (
    'compliance_only', 'compliance_plus_cfo', 'compliance_plus_cfo_plus_ceo'
  )),
  cfo_approved_by           UUID REFERENCES auth.users(id),
  cfo_approved_at           TIMESTAMPTZ,
  ceo_approved_by           UUID REFERENCES auth.users(id),
  ceo_approved_at           TIMESTAMPTZ,
  executed_at               TIMESTAMPTZ,
  notes                     TEXT
);

CREATE INDEX IF NOT EXISTS idx_legal_settlements_case
  ON public.legal_case_settlements(case_id);

-- HARD STOP §15: settlement amount must match the recorded approval tier.
CREATE OR REPLACE FUNCTION public.enforce_settlement_approval_tier()
RETURNS TRIGGER AS $$
DECLARE
  cfo_threshold CONSTANT BIGINT := 500000;
  ceo_threshold CONSTANT BIGINT := 2500000;
  expected_tier TEXT;
BEGIN
  expected_tier := CASE
    WHEN NEW.monetary_amount_cents >= ceo_threshold THEN 'compliance_plus_cfo_plus_ceo'
    WHEN NEW.monetary_amount_cents >= cfo_threshold THEN 'compliance_plus_cfo'
    ELSE 'compliance_only'
  END;

  IF NEW.approval_tier <> expected_tier THEN
    RAISE EXCEPTION 'Settlement amount % cents requires approval_tier=%; got %',
      NEW.monetary_amount_cents, expected_tier, NEW.approval_tier
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.executed_at IS NOT NULL THEN
    IF expected_tier IN ('compliance_plus_cfo', 'compliance_plus_cfo_plus_ceo')
       AND (NEW.cfo_approved_by IS NULL OR NEW.cfo_approved_at IS NULL) THEN
      RAISE EXCEPTION 'Settlement >= $5,000 cannot execute without CFO approval'
        USING ERRCODE = 'P0001';
    END IF;
    IF expected_tier = 'compliance_plus_cfo_plus_ceo'
       AND (NEW.ceo_approved_by IS NULL OR NEW.ceo_approved_at IS NULL) THEN
      RAISE EXCEPTION 'Settlement >= $25,000 cannot execute without CEO approval'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_legal_settlement_tier ON public.legal_case_settlements;
CREATE TRIGGER trg_legal_settlement_tier
  BEFORE INSERT OR UPDATE OF monetary_amount_cents, approval_tier, executed_at, cfo_approved_by, cfo_approved_at, ceo_approved_by, ceo_approved_at
  ON public.legal_case_settlements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_settlement_approval_tier();
