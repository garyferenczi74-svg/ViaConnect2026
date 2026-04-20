-- Prompt #102 append-only audit log across Workstream A + B.
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum

CREATE TABLE IF NOT EXISTS public.practitioner_operations_audit_log (
  audit_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id           UUID REFERENCES auth.users(id),
  actor_role              TEXT,
  action_category         TEXT NOT NULL CHECK (action_category IN (
    'channel','tax_info','payout_method','payout_batch','dispute','pii_access'
  )),
  action_verb             TEXT NOT NULL,
  target_table            TEXT NOT NULL,
  target_id               UUID,
  practitioner_id         UUID REFERENCES public.practitioners(id),
  before_state_json       JSONB,
  after_state_json        JSONB,
  context_json            JSONB,
  ip_address              INET,
  user_agent              TEXT
);
CREATE INDEX IF NOT EXISTS idx_poal_occurred
  ON public.practitioner_operations_audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_poal_practitioner
  ON public.practitioner_operations_audit_log(practitioner_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_poal_category
  ON public.practitioner_operations_audit_log(action_category, occurred_at DESC);

-- Reuse the shared block_audit_mutation function (from migration _330)
-- rather than creating a new per-table prevent_audit_log_mutation, to
-- keep one append-only policy across the codebase.
DROP TRIGGER IF EXISTS trg_poal_append_only ON public.practitioner_operations_audit_log;
CREATE TRIGGER trg_poal_append_only
  BEFORE UPDATE OR DELETE ON public.practitioner_operations_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();

COMMENT ON TABLE public.practitioner_operations_audit_log IS
  'Append-only audit trail for Prompt #102 Workstream A + B state changes. Every channel, tax_info, payout_method, payout_batch, dispute, and pii_access event writes here.';
