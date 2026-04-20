-- Prompt #102 Workstream B — reconciliation runs, payout batches, lines,
-- transactions, statements, disputes.
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum

CREATE TABLE IF NOT EXISTS public.commission_reconciliation_runs (
  run_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id         UUID NOT NULL REFERENCES public.practitioners(id),
  period_start            DATE NOT NULL,
  period_end              DATE NOT NULL,
  gross_accrued_cents     BIGINT NOT NULL DEFAULT 0,
  total_clawbacks_cents   BIGINT NOT NULL DEFAULT 0,
  total_holds_cents       BIGINT NOT NULL DEFAULT 0,
  net_payable_cents       BIGINT NOT NULL DEFAULT 0,
  margin_floor_breach     BOOLEAN NOT NULL DEFAULT FALSE,
  status                  TEXT NOT NULL DEFAULT 'reconciled' CHECK (status IN (
    'reconciled','paid_out','rolled_to_next_period','held_pending_dispute'
  )),
  run_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes                   TEXT,
  UNIQUE (practitioner_id, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS idx_crr_practitioner ON public.commission_reconciliation_runs(practitioner_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_crr_unpaid ON public.commission_reconciliation_runs(period_end DESC) WHERE status = 'reconciled';

CREATE TABLE IF NOT EXISTS public.commission_reconciliation_lines (
  line_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                  UUID NOT NULL REFERENCES public.commission_reconciliation_runs(run_id) ON DELETE CASCADE,
  source_accrual_id       UUID REFERENCES public.commission_accruals(accrual_id) ON DELETE SET NULL,
  source_order_id         UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  line_type               TEXT NOT NULL CHECK (line_type IN (
    'accrual','refund_clawback','map_violation_hold','manual_adjustment'
  )),
  amount_cents            BIGINT NOT NULL,
  description             TEXT,
  related_violation_id    UUID REFERENCES public.map_violations(violation_id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crl_run ON public.commission_reconciliation_lines(run_id);

CREATE TABLE IF NOT EXISTS public.payout_batches (
  batch_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_label           TEXT NOT NULL,
  period_start          DATE NOT NULL,
  period_end            DATE NOT NULL,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','pending_admin_approval','approved','executing','completed','failed','cancelled'
  )),
  total_lines_count     INTEGER NOT NULL DEFAULT 0,
  total_payout_cents    BIGINT NOT NULL DEFAULT 0,
  total_held_count      INTEGER NOT NULL DEFAULT 0,
  total_held_cents      BIGINT NOT NULL DEFAULT 0,
  created_by            UUID NOT NULL REFERENCES auth.users(id),
  approved_by           UUID REFERENCES auth.users(id),
  approved_at           TIMESTAMPTZ,
  executed_at           TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pb_status ON public.payout_batches(status);

CREATE TABLE IF NOT EXISTS public.payout_batch_lines (
  line_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id                UUID NOT NULL REFERENCES public.payout_batches(batch_id) ON DELETE CASCADE,
  practitioner_id         UUID NOT NULL REFERENCES public.practitioners(id),
  reconciliation_run_id   UUID NOT NULL REFERENCES public.commission_reconciliation_runs(run_id),
  net_payable_cents       BIGINT NOT NULL,
  payout_method_id        UUID REFERENCES public.practitioner_payout_methods(method_id),
  rail_used               public.payout_rail,
  status                  TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued','held_below_threshold','held_no_tax_info','held_no_payment_method',
    'held_admin_review','paying','paid','failed'
  )),
  hold_reason             TEXT,
  transaction_reference   TEXT,
  failed_reason           TEXT,
  paid_at                 TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (batch_id, practitioner_id)
);
CREATE INDEX IF NOT EXISTS idx_pbl_batch ON public.payout_batch_lines(batch_id);
CREATE INDEX IF NOT EXISTS idx_pbl_practitioner ON public.payout_batch_lines(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_pbl_status ON public.payout_batch_lines(status);

DROP TRIGGER IF EXISTS trg_pbl_touch_updated_at ON public.payout_batch_lines;
CREATE TRIGGER trg_pbl_touch_updated_at BEFORE UPDATE ON public.payout_batch_lines
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.payout_transactions (
  txn_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_line_id           UUID NOT NULL REFERENCES public.payout_batch_lines(line_id),
  practitioner_id         UUID NOT NULL REFERENCES public.practitioners(id),
  rail                    public.payout_rail NOT NULL,
  amount_cents            BIGINT NOT NULL,
  currency                TEXT NOT NULL DEFAULT 'USD',
  external_transaction_id TEXT NOT NULL,
  external_status         TEXT,
  external_response_json  JSONB,
  initiated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at              TIMESTAMPTZ,
  fee_cents               BIGINT
);
CREATE INDEX IF NOT EXISTS idx_pt_batch_line ON public.payout_transactions(batch_line_id);
CREATE INDEX IF NOT EXISTS idx_pt_external ON public.payout_transactions(external_transaction_id);

CREATE TABLE IF NOT EXISTS public.practitioner_statements (
  statement_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id         UUID NOT NULL REFERENCES public.practitioners(id),
  period_start            DATE NOT NULL,
  period_end              DATE NOT NULL,
  template_version        TEXT NOT NULL,
  storage_path            TEXT NOT NULL,
  net_payable_cents       BIGINT NOT NULL,
  ytd_paid_cents          BIGINT NOT NULL,
  payout_transaction_id   UUID REFERENCES public.payout_transactions(txn_id),
  generated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  emailed_at              TIMESTAMPTZ,
  UNIQUE (practitioner_id, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS idx_ps_practitioner ON public.practitioner_statements(practitioner_id, period_end DESC);

CREATE TABLE IF NOT EXISTS public.payout_disputes (
  dispute_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id          UUID NOT NULL REFERENCES public.practitioners(id),
  reconciliation_line_id   UUID NOT NULL REFERENCES public.commission_reconciliation_lines(line_id),
  dispute_reason           TEXT NOT NULL CHECK (dispute_reason IN (
    'refund_was_invalid','map_violation_was_not_mine','calculation_error','other'
  )),
  practitioner_explanation TEXT NOT NULL CHECK (length(practitioner_explanation) BETWEEN 10 AND 2000),
  supporting_docs_paths    TEXT[] DEFAULT '{}',
  status                   TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'pending_review','more_info_requested','approved','partially_approved','rejected'
  )),
  resolved_amount_cents    BIGINT,
  resolution_notes         TEXT,
  reviewer_id              UUID REFERENCES auth.users(id),
  resolved_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pd_practitioner ON public.payout_disputes(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_pd_pending ON public.payout_disputes(created_at ASC)
  WHERE status IN ('pending_review','more_info_requested');

DROP TRIGGER IF EXISTS trg_pd_touch_updated_at ON public.payout_disputes;
CREATE TRIGGER trg_pd_touch_updated_at BEFORE UPDATE ON public.payout_disputes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
