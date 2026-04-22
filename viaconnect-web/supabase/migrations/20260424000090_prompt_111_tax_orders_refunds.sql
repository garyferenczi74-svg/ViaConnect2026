-- =============================================================================
-- Prompt #111 Phase 1.3: Tax registrations, VAT invoices (gap-less jurisdiction
-- sequences), per-order currency details siblings, refunds, daily settlement
-- reports, and the international_audit_log (append-only via shared
-- block_audit_mutation trigger).
-- =============================================================================
-- Zero mutations to existing schema. All tables are new siblings. RLS on.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- international_tax_registrations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.international_tax_registrations (
  registration_id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_code                  TEXT NOT NULL,
  registration_type                  TEXT NOT NULL CHECK (registration_type IN ('oss','standard_vat','gst','sales_tax')),
  registration_number                TEXT NOT NULL,
  registered_entity_name             TEXT NOT NULL,
  effective_date                     DATE NOT NULL,
  expiration_date                    DATE,
  next_renewal_statement_due         DATE,
  compliance_contact_email           TEXT NOT NULL,
  compliance_contact_phone           TEXT,
  registration_certificate_vault_ref TEXT,
  registration_certificate_sha256    TEXT,
  stripe_tax_registration_id         TEXT,
  status                             public.tax_registration_status NOT NULL DEFAULT 'pending',
  notes                              TEXT,
  created_at                         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (jurisdiction_code, registration_number)
);

COMMENT ON TABLE public.international_tax_registrations IS
  'Prompt #111 VAT/GST/sales-tax registrations by jurisdiction. Expiration cron raises T-90/60/30/15/0 warnings.';

CREATE INDEX IF NOT EXISTS idx_tax_reg_jurisdiction ON public.international_tax_registrations (jurisdiction_code);
CREATE INDEX IF NOT EXISTS idx_tax_reg_expiration  ON public.international_tax_registrations (expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tax_reg_status      ON public.international_tax_registrations (status);

ALTER TABLE public.international_tax_registrations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='international_tax_registrations' AND policyname='tax_reg_read_admin') THEN
    CREATE POLICY "tax_reg_read_admin" ON public.international_tax_registrations FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin','compliance_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='international_tax_registrations' AND policyname='tax_reg_write_admin') THEN
    CREATE POLICY "tax_reg_write_admin" ON public.international_tax_registrations FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin','compliance_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin','compliance_admin')));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- international_vat_invoice_sequences: jurisdiction-scoped gap-less counters.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.international_vat_invoice_sequences (
  sequence_name    TEXT PRIMARY KEY,
  current_value    BIGINT NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  prefix           TEXT NOT NULL DEFAULT '',
  last_issued_at   TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.international_vat_invoice_sequences IS
  'Prompt #111 jurisdiction-scoped gap-less invoice numbering. Allocations go through allocate_vat_invoice_number() which is atomic (row-level UPDATE + RETURNING).';

INSERT INTO public.international_vat_invoice_sequences (sequence_name, prefix) VALUES
  ('vat_invoice_seq_eu', 'EU-'),
  ('vat_invoice_seq_uk', 'UK-'),
  ('vat_invoice_seq_au', 'AU-')
ON CONFLICT (sequence_name) DO NOTHING;

ALTER TABLE public.international_vat_invoice_sequences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='international_vat_invoice_sequences' AND policyname='vat_seq_read_admin') THEN
    CREATE POLICY "vat_seq_read_admin" ON public.international_vat_invoice_sequences FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin')));
  END IF;
END $$;

-- Atomic allocator. Advances current_value by 1 and returns the new formatted
-- invoice number. Callers MUST persist the returned number; it is gone
-- forever from the sequence.
CREATE OR REPLACE FUNCTION public.allocate_vat_invoice_number(p_sequence_name TEXT)
RETURNS TEXT AS $$
DECLARE
  v_new_value BIGINT;
  v_prefix    TEXT;
BEGIN
  UPDATE public.international_vat_invoice_sequences
     SET current_value = current_value + 1,
         last_issued_at = NOW(),
         updated_at = NOW()
   WHERE sequence_name = p_sequence_name
  RETURNING current_value, prefix INTO v_new_value, v_prefix;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VAT invoice sequence % not found', p_sequence_name USING ERRCODE='23503';
  END IF;

  RETURN v_prefix || LPAD(v_new_value::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.allocate_vat_invoice_number(TEXT) IS
  'Prompt #111 atomic gap-less invoice number allocator. Every successful call advances the sequence; failures after allocation STILL burn the number (HMRC/EU/ATO convention — gaps require audit explanation, not retroactive reuse).';

-- ---------------------------------------------------------------------------
-- international_vat_invoices
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.international_vat_invoices (
  invoice_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID NOT NULL,
  invoice_number          TEXT NOT NULL UNIQUE,
  jurisdiction_code       TEXT NOT NULL,
  issue_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  supply_date             DATE NOT NULL,
  customer_name           TEXT NOT NULL,
  customer_address        TEXT NOT NULL,
  customer_vat_number     TEXT,
  customer_vat_validated  BOOLEAN,
  supplier_vat_number     TEXT NOT NULL,
  currency_code           public.currency_code NOT NULL,
  net_amount_cents        BIGINT NOT NULL CHECK (net_amount_cents >= 0),
  vat_rate_pct            NUMERIC(5,2) NOT NULL CHECK (vat_rate_pct >= 0),
  vat_amount_cents        BIGINT NOT NULL CHECK (vat_amount_cents >= 0),
  gross_amount_cents      BIGINT NOT NULL CHECK (gross_amount_cents >= 0),
  reverse_charge_applied  BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_pdf_vault_ref   TEXT,
  invoice_pdf_sha256      TEXT,
  status                  public.vat_invoice_status NOT NULL DEFAULT 'draft',
  superseded_by_invoice_id UUID REFERENCES public.international_vat_invoices(invoice_id),
  voided_reason           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (gross_amount_cents = net_amount_cents + vat_amount_cents OR reverse_charge_applied)
);

COMMENT ON TABLE public.international_vat_invoices IS
  'Prompt #111 VAT invoices meeting HMRC/EU-OSS/AU-ATO requirements. Invoice numbers allocated via allocate_vat_invoice_number() (gap-less per jurisdiction).';

CREATE INDEX IF NOT EXISTS idx_vat_inv_order      ON public.international_vat_invoices (order_id);
CREATE INDEX IF NOT EXISTS idx_vat_inv_juris_date ON public.international_vat_invoices (jurisdiction_code, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_vat_inv_status     ON public.international_vat_invoices (status);

ALTER TABLE public.international_vat_invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='international_vat_invoices' AND policyname='vat_inv_read_admin') THEN
    CREATE POLICY "vat_inv_read_admin" ON public.international_vat_invoices FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin','compliance_admin')));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- international_vat_number_validations: validation log for VIES/HMRC/ABR.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.international_vat_number_validations (
  validation_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vat_number               TEXT NOT NULL,
  jurisdiction_code        TEXT NOT NULL,
  validation_service       TEXT NOT NULL CHECK (validation_service IN ('VIES','HMRC','ABR')),
  validation_result        TEXT NOT NULL CHECK (validation_result IN ('valid','invalid','service_unavailable')),
  validation_response_raw  JSONB,
  validated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  order_id                 UUID
);

COMMENT ON TABLE public.international_vat_number_validations IS
  'Prompt #111 log of B2B tax-ID validations against VIES (EU), HMRC VAT API (UK), ABR (AU). Result captured alongside raw response for audit.';

CREATE INDEX IF NOT EXISTS idx_vat_val_number ON public.international_vat_number_validations (jurisdiction_code, vat_number);
CREATE INDEX IF NOT EXISTS idx_vat_val_order  ON public.international_vat_number_validations (order_id);

ALTER TABLE public.international_vat_number_validations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='international_vat_number_validations' AND policyname='vat_val_read_admin') THEN
    CREATE POLICY "vat_val_read_admin" ON public.international_vat_number_validations FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin','compliance_admin')));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- order_currency_details: sibling of orders/shop_orders. No FK to keep read-
-- only contract on existing tables (per §3.2). Uniqueness on order_id enforces
-- one currency context per order.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_currency_details (
  detail_id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                        UUID NOT NULL UNIQUE,
  currency_code                   public.currency_code NOT NULL,
  market_code                     public.market_code NOT NULL,
  subtotal_cents                  BIGINT NOT NULL CHECK (subtotal_cents >= 0),
  discount_cents                  BIGINT NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  tax_cents                       BIGINT NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  shipping_cents                  BIGINT NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  total_cents                     BIGINT NOT NULL CHECK (total_cents >= 0),
  inclusive_of_tax                BOOLEAN NOT NULL,
  fx_rate_to_usd_at_order_time    NUMERIC(12,6) NOT NULL CHECK (fx_rate_to_usd_at_order_time > 0),
  fx_rate_source                  TEXT NOT NULL,
  fx_rate_date                    DATE NOT NULL,
  stripe_payment_intent_id        TEXT,
  stripe_tax_calculation_id       TEXT,
  vat_invoice_id                  UUID REFERENCES public.international_vat_invoices(invoice_id),
  b2b_customer                    BOOLEAN NOT NULL DEFAULT FALSE,
  customer_vat_number             TEXT,
  customer_vat_validation_status  TEXT CHECK (customer_vat_validation_status IS NULL OR customer_vat_validation_status IN ('valid','invalid','service_unavailable','not_provided')),
  customer_vat_validated_at       TIMESTAMPTZ,
  reverse_charge_applied          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.order_currency_details IS
  'Prompt #111 per-order currency + tax context. Sibling of orders/shop_orders (no FK, to keep those read-only). Total arithmetic and FX snapshot live here.';

CREATE INDEX IF NOT EXISTS idx_ocd_market   ON public.order_currency_details (market_code);
CREATE INDEX IF NOT EXISTS idx_ocd_currency ON public.order_currency_details (currency_code);
CREATE INDEX IF NOT EXISTS idx_ocd_created  ON public.order_currency_details (created_at DESC);

ALTER TABLE public.order_currency_details ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_currency_details' AND policyname='ocd_read_admin') THEN
    CREATE POLICY "ocd_read_admin" ON public.order_currency_details FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin','compliance_admin')));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- genex360_purchase_currency_details: parallel sibling for genex360_purchases.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.genex360_purchase_currency_details (
  detail_id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id                     UUID NOT NULL UNIQUE,
  currency_code                   public.currency_code NOT NULL,
  market_code                     public.market_code NOT NULL,
  subtotal_cents                  BIGINT NOT NULL CHECK (subtotal_cents >= 0),
  tax_cents                       BIGINT NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  shipping_cents                  BIGINT NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  total_cents                     BIGINT NOT NULL CHECK (total_cents >= 0),
  inclusive_of_tax                BOOLEAN NOT NULL,
  fx_rate_to_usd_at_order_time    NUMERIC(12,6) NOT NULL CHECK (fx_rate_to_usd_at_order_time > 0),
  stripe_payment_intent_id        TEXT,
  stripe_tax_calculation_id       TEXT,
  vat_invoice_id                  UUID REFERENCES public.international_vat_invoices(invoice_id),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.genex360_purchase_currency_details IS
  'Prompt #111 per-GeneX360-purchase currency + tax context. Sibling of genex360_purchases (no FK).';

CREATE INDEX IF NOT EXISTS idx_gx_ocd_market ON public.genex360_purchase_currency_details (market_code);

ALTER TABLE public.genex360_purchase_currency_details ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='genex360_purchase_currency_details' AND policyname='gx_ocd_read_admin') THEN
    CREATE POLICY "gx_ocd_read_admin" ON public.genex360_purchase_currency_details FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin','compliance_admin')));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- international_refunds: currency-matched refund records.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.international_refunds (
  refund_id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                       UUID NOT NULL,
  original_purchase_currency     public.currency_code NOT NULL,
  refund_amount_cents            BIGINT NOT NULL CHECK (refund_amount_cents > 0),
  stripe_refund_id               TEXT NOT NULL UNIQUE,
  usd_equivalent_cents_at_refund BIGINT NOT NULL,
  fx_rate_at_refund              NUMERIC(12,6) NOT NULL CHECK (fx_rate_at_refund > 0),
  refund_reason                  TEXT,
  refunded_by_user_id            UUID REFERENCES auth.users(id),
  refunded_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status                         TEXT NOT NULL DEFAULT 'initiated'
                                 CHECK (status IN ('initiated','processing','completed','failed'))
);

COMMENT ON TABLE public.international_refunds IS
  'Prompt #111 refund records. Refund currency ALWAYS matches original purchase currency (no retroactive reconversion). USD-equivalent captured at refund time for reporting.';

CREATE INDEX IF NOT EXISTS idx_intl_refund_order ON public.international_refunds (order_id);
CREATE INDEX IF NOT EXISTS idx_intl_refund_status ON public.international_refunds (status);

ALTER TABLE public.international_refunds ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='international_refunds' AND policyname='intl_refund_read_admin') THEN
    CREATE POLICY "intl_refund_read_admin" ON public.international_refunds FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin','compliance_admin')));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- international_settlement_daily_reports: per-day reconciliation snapshots.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.international_settlement_daily_reports (
  report_id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date                   DATE NOT NULL UNIQUE,
  per_currency_json             JSONB NOT NULL,
  total_usd_settled_cents       BIGINT NOT NULL,
  total_fx_spread_impact_cents  BIGINT NOT NULL,
  discrepancy_flag              BOOLEAN NOT NULL DEFAULT FALSE,
  generated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.international_settlement_daily_reports IS
  'Prompt #111 daily 04:00 UTC reconciliation snapshot: per-currency volumes, USD settlement, FX spread impact, discrepancy flag.';

CREATE INDEX IF NOT EXISTS idx_settle_reports_date ON public.international_settlement_daily_reports (report_date DESC);

ALTER TABLE public.international_settlement_daily_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='international_settlement_daily_reports' AND policyname='settle_report_read_admin') THEN
    CREATE POLICY "settle_report_read_admin" ON public.international_settlement_daily_reports FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin')));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- international_audit_log: append-only cross-cutting audit log for #111.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.international_audit_log (
  audit_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id            UUID REFERENCES auth.users(id),
  actor_role               TEXT,
  action_category          TEXT NOT NULL,
  action_verb              TEXT NOT NULL,
  target_table             TEXT,
  target_id                UUID,
  market_code              public.market_code,
  currency_code            public.currency_code,
  before_state_json        JSONB,
  after_state_json         JSONB,
  typed_confirmation_text  TEXT,
  ip_address               INET,
  user_agent               TEXT
);

COMMENT ON TABLE public.international_audit_log IS
  'Prompt #111 append-only audit log. Every state change in the international stack lands here. UPDATE/DELETE blocked via shared block_audit_mutation trigger. 10-year retention (conservative default).';

CREATE INDEX IF NOT EXISTS idx_intl_audit_time   ON public.international_audit_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_intl_audit_actor  ON public.international_audit_log (actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_intl_audit_target ON public.international_audit_log (target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_intl_audit_market ON public.international_audit_log (market_code, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_intl_audit_cat    ON public.international_audit_log (action_category, action_verb);

ALTER TABLE public.international_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='international_audit_log' AND policyname='intl_audit_read_admin') THEN
    CREATE POLICY "intl_audit_read_admin" ON public.international_audit_log FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin','compliance_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='international_audit_log' AND policyname='intl_audit_insert_admin') THEN
    CREATE POLICY "intl_audit_insert_admin" ON public.international_audit_log FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin','compliance_admin')));
  END IF;
END $$;

DROP TRIGGER IF EXISTS intl_audit_log_append_only_update ON public.international_audit_log;
CREATE TRIGGER intl_audit_log_append_only_update
  BEFORE UPDATE ON public.international_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();

DROP TRIGGER IF EXISTS intl_audit_log_append_only_delete ON public.international_audit_log;
CREATE TRIGGER intl_audit_log_append_only_delete
  BEFORE DELETE ON public.international_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();
