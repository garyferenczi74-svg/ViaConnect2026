-- =============================================================================
-- Prompt #102 Bridge: commission_accruals.
-- =============================================================================
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum
--
-- Prompt #98 shipped referrals, attribution, milestones, and fraud review,
-- but the accrual-per-settled-order rows that the reconciliation engine
-- consumes were never written to a dedicated table. This migration ships
-- the minimum accrual schema so the Prompt #102 reconciliation pipeline
-- has a source of truth. #98's commission_payouts retains the already-paid
-- history; commission_accruals represents the pre-payout side.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.commission_accruals (
  accrual_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id         UUID NOT NULL REFERENCES public.practitioners(id),
  source_order_id         UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  source_order_item_id    UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  accrual_amount_cents    BIGINT NOT NULL CHECK (accrual_amount_cents >= 0),
  commission_rate_pct     NUMERIC(5,2),
  accrual_reason          TEXT NOT NULL CHECK (accrual_reason IN (
    'referral', 'white_label', 'subscription', 'custom_formulation', 'other'
  )),
  accrual_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  reconciled_at           TIMESTAMPTZ,
  reconciliation_run_id   UUID,
  status                  TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'eligible_for_payout', 'reconciled', 'refund_clawed_back', 'held'
  )),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_accruals_practitioner_status
  ON public.commission_accruals(practitioner_id, status);
CREATE INDEX IF NOT EXISTS idx_commission_accruals_unreconciled
  ON public.commission_accruals(accrual_date DESC)
  WHERE reconciled_at IS NULL;

ALTER TABLE public.commission_accruals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='commission_accruals'
      AND policyname='commission_accruals_self_read'
  ) THEN
    CREATE POLICY "commission_accruals_self_read"
      ON public.commission_accruals FOR SELECT TO authenticated
      USING (
        practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='commission_accruals'
      AND policyname='commission_accruals_service_all'
  ) THEN
    CREATE POLICY "commission_accruals_service_all"
      ON public.commission_accruals FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE public.commission_accruals IS
  'Pre-payout commission accruals consumed by Prompt #102 reconciliation pipeline. One row per commission-bearing order_item at the moment the order settles.';
