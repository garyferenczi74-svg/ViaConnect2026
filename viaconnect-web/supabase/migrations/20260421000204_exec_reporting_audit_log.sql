-- Prompt #105 — executive_reporting_audit_log (append-only, 10-year retention).
-- Separate from practitioner_operations_audit_log (#102) and legal_operations_audit_log (#104)
-- because audit surfaces for governance artifacts are answerable to different audiences
-- (fiduciary counsel, institutional investors, auditors) than operational or legal logs.

CREATE TABLE IF NOT EXISTS public.executive_reporting_audit_log (
  audit_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id           UUID REFERENCES auth.users(id),
  actor_role              TEXT,
  action_category         TEXT NOT NULL CHECK (action_category IN (
    'aggregation_snapshot','kpi_library','template','pack',
    'mdna_draft','board_member','distribution','download',
    'ai_prompt_version','access_revocation'
  )),
  action_verb             TEXT NOT NULL,
  target_table            TEXT NOT NULL,
  target_id               UUID,
  pack_id                 UUID REFERENCES public.board_packs(pack_id),
  member_id               UUID REFERENCES public.board_members(member_id),
  before_state_json       JSONB,
  after_state_json        JSONB,
  context_json            JSONB,
  ip_address              INET,
  user_agent              TEXT
);
CREATE INDEX IF NOT EXISTS idx_eral_occurred ON public.executive_reporting_audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_eral_pack ON public.executive_reporting_audit_log(pack_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_eral_member ON public.executive_reporting_audit_log(member_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_eral_category ON public.executive_reporting_audit_log(action_category, occurred_at DESC);

-- Reuse the shared block_audit_mutation function to preserve one
-- append-only pattern across the codebase.
DROP TRIGGER IF EXISTS trg_eral_append_only ON public.executive_reporting_audit_log;
CREATE TRIGGER trg_eral_append_only
  BEFORE UPDATE OR DELETE ON public.executive_reporting_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();

COMMENT ON TABLE public.executive_reporting_audit_log IS
  'Append-only audit trail for Prompt #105 governance artifacts. 10-year retention; every KPI snapshot, pack state change, board-member action, distribution, and download writes here.';
