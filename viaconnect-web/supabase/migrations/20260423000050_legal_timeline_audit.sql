-- =============================================================================
-- Prompt #104 Phase 1: Case timeline + append-only operations audit log
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Per-case timeline
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_case_timeline (
  event_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                   UUID NOT NULL REFERENCES public.legal_investigation_cases(case_id) ON DELETE RESTRICT,
  event_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type                TEXT NOT NULL,
  event_description         TEXT NOT NULL,
  actor_user_id             UUID REFERENCES auth.users(id),
  related_entity_type       TEXT,
  related_entity_id         UUID,
  metadata_json             JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_legal_timeline_case
  ON public.legal_case_timeline(case_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_timeline_type
  ON public.legal_case_timeline(event_type, event_at DESC);

-- ---------------------------------------------------------------------------
-- Operations audit log (append-only)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.legal_operations_audit_log (
  audit_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id             UUID REFERENCES auth.users(id),
  actor_role                TEXT,
  action_category           TEXT NOT NULL CHECK (action_category IN (
    'case', 'evidence', 'counterparty', 'template', 'enforcement_action',
    'dmca', 'marketplace_complaint', 'counsel_engagement', 'privileged_comm',
    'settlement', 'pii_access', 'privileged_access'
  )),
  action_verb               TEXT NOT NULL,
  target_table              TEXT NOT NULL,
  target_id                 UUID,
  case_id                   UUID REFERENCES public.legal_investigation_cases(case_id),
  before_state_json         JSONB,
  after_state_json          JSONB,
  hash_verified             BOOLEAN,
  context_json              JSONB,
  ip_address                INET,
  user_agent                TEXT
);

CREATE INDEX IF NOT EXISTS idx_legal_audit_occurred
  ON public.legal_operations_audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_audit_case
  ON public.legal_operations_audit_log(case_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_audit_category
  ON public.legal_operations_audit_log(action_category, occurred_at DESC);

-- HARD STOP §15: append-only enforcement.
CREATE OR REPLACE FUNCTION public.prevent_legal_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'legal_operations_audit_log is append-only; UPDATE/DELETE forbidden'
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_legal_audit_no_update ON public.legal_operations_audit_log;
CREATE TRIGGER trg_legal_audit_no_update
  BEFORE UPDATE ON public.legal_operations_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_legal_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_legal_audit_no_delete ON public.legal_operations_audit_log;
CREATE TRIGGER trg_legal_audit_no_delete
  BEFORE DELETE ON public.legal_operations_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_legal_audit_log_mutation();

COMMENT ON TABLE public.legal_operations_audit_log IS
  'Prompt #104: append-only audit log for legal-ops state changes, evidence access, PII access, privileged-material access. 7-year retention from case closure (IP enforcement standard).';
