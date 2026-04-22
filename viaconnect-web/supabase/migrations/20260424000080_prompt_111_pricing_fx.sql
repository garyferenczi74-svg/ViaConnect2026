-- =============================================================================
-- Prompt #111 Phase 1.2: Pricing overlay + FX infrastructure.
-- =============================================================================
-- Adds the per-market pricing sibling table, market-level config, country-to-
-- market mapping, FX rate history (append-only via shared block_audit_mutation
-- trigger), and FX drift findings queue. Zero mutations to master_skus,
-- products, product_catalog, pricing_tiers, or any existing schema.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- international_market_config: singleton row per market_code.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.international_market_config (
  market_code             public.market_code PRIMARY KEY,
  currency_code           public.currency_code NOT NULL,
  inclusive_of_tax        BOOLEAN NOT NULL,
  enforce_88_ending       BOOLEAN NOT NULL DEFAULT TRUE,
  default_language        TEXT NOT NULL DEFAULT 'en',
  display_tax_label       TEXT NOT NULL,
  shipping_available      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by_user_id      UUID REFERENCES auth.users(id),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.international_market_config IS
  'Prompt #111 per-market display + enforcement config. Drives inclusive/exclusive tax display, .88 ending enforcement, tax label rendering.';

ALTER TABLE public.international_market_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='international_market_config' AND policyname='imc_read_authenticated') THEN
    CREATE POLICY "imc_read_authenticated"
      ON public.international_market_config FOR SELECT TO authenticated, anon USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='international_market_config' AND policyname='imc_write_admin') THEN
    CREATE POLICY "imc_write_admin"
      ON public.international_market_config FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin','compliance_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin','compliance_admin')));
  END IF;
END $$;

INSERT INTO public.international_market_config (market_code, currency_code, inclusive_of_tax, enforce_88_ending, display_tax_label, shipping_available) VALUES
  ('US','USD', FALSE, TRUE, 'Sales Tax',  TRUE),
  ('EU','EUR', TRUE,  TRUE, 'VAT',        TRUE),
  ('UK','GBP', TRUE,  TRUE, 'VAT',        TRUE),
  ('AU','AUD', TRUE,  TRUE, 'GST',        TRUE)
ON CONFLICT (market_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- international_country_to_market: ISO 3166 alpha-2 -> market.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.international_country_to_market (
  country_code          TEXT PRIMARY KEY CHECK (char_length(country_code) = 2),
  market_code           public.market_code NOT NULL,
  eu_member_state       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.international_country_to_market IS
  'Prompt #111 ISO 3166-1 alpha-2 country to market mapping. Used by geo-IP detection. Unmapped countries default to US via application logic.';

ALTER TABLE public.international_country_to_market ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='international_country_to_market' AND policyname='ictm_read_all') THEN
    CREATE POLICY "ictm_read_all"
      ON public.international_country_to_market FOR SELECT TO authenticated, anon USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='international_country_to_market' AND policyname='ictm_write_admin') THEN
    CREATE POLICY "ictm_write_admin"
      ON public.international_country_to_market FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
  END IF;
END $$;

-- Seed core markets + EU27 + UK + AU + common other countries
INSERT INTO public.international_country_to_market (country_code, market_code, eu_member_state) VALUES
  ('US','US',FALSE),('CA','US',FALSE),
  ('GB','UK',FALSE),
  ('AU','AU',FALSE),
  ('AT','EU',TRUE),('BE','EU',TRUE),('BG','EU',TRUE),('HR','EU',TRUE),('CY','EU',TRUE),
  ('CZ','EU',TRUE),('DK','EU',TRUE),('EE','EU',TRUE),('FI','EU',TRUE),('FR','EU',TRUE),
  ('DE','EU',TRUE),('GR','EU',TRUE),('HU','EU',TRUE),('IE','EU',TRUE),('IT','EU',TRUE),
  ('LV','EU',TRUE),('LT','EU',TRUE),('LU','EU',TRUE),('MT','EU',TRUE),('NL','EU',TRUE),
  ('PL','EU',TRUE),('PT','EU',TRUE),('RO','EU',TRUE),('SK','EU',TRUE),('SI','EU',TRUE),
  ('ES','EU',TRUE),('SE','EU',TRUE)
ON CONFLICT (country_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- international_fx_rate_history: append-only FX rate snapshots.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.international_fx_rate_history (
  rate_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency     public.currency_code NOT NULL,
  quote_currency    public.currency_code NOT NULL,
  rate              NUMERIC(12,6) NOT NULL CHECK (rate > 0),
  rate_source       TEXT NOT NULL CHECK (rate_source IN ('ECB','OANDA','STRIPE')),
  rate_date         DATE NOT NULL,
  retrieved_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (base_currency, quote_currency, rate_date, rate_source),
  CHECK (base_currency <> quote_currency)
);

COMMENT ON TABLE public.international_fx_rate_history IS
  'Prompt #111 immutable daily FX rate snapshots. Source precedence ECB > OANDA > STRIPE. UPDATE/DELETE blocked via shared block_audit_mutation trigger.';

CREATE INDEX IF NOT EXISTS idx_fx_rate_date ON public.international_fx_rate_history (rate_date DESC);
CREATE INDEX IF NOT EXISTS idx_fx_rate_pair ON public.international_fx_rate_history (base_currency, quote_currency, rate_date DESC);

ALTER TABLE public.international_fx_rate_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='international_fx_rate_history' AND policyname='fx_hist_read_admin') THEN
    CREATE POLICY "fx_hist_read_admin"
      ON public.international_fx_rate_history FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='international_fx_rate_history' AND policyname='fx_hist_read_anon_recent') THEN
    -- Public read of last 7 days only, needed for PriceDisplay/Cart currency hints; service-role writes via cron.
    CREATE POLICY "fx_hist_read_anon_recent"
      ON public.international_fx_rate_history FOR SELECT TO anon
      USING (rate_date >= CURRENT_DATE - INTERVAL '7 days');
  END IF;
END $$;

DROP TRIGGER IF EXISTS fx_rate_history_append_only_update ON public.international_fx_rate_history;
CREATE TRIGGER fx_rate_history_append_only_update
  BEFORE UPDATE ON public.international_fx_rate_history
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();

DROP TRIGGER IF EXISTS fx_rate_history_append_only_delete ON public.international_fx_rate_history;
CREATE TRIGGER fx_rate_history_append_only_delete
  BEFORE DELETE ON public.international_fx_rate_history
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();

-- ---------------------------------------------------------------------------
-- international_fx_drift_findings: flagged rows where market MSRP implied-USD
-- diverges > ±15% (configurable in app) from US-market MSRP.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.international_fx_drift_findings (
  finding_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                   TEXT NOT NULL,
  market_code           public.market_code NOT NULL,
  us_msrp_cents         BIGINT NOT NULL,
  market_msrp_cents     BIGINT NOT NULL,
  implied_usd_cents     BIGINT NOT NULL,
  drift_pct             NUMERIC(6,3) NOT NULL,
  detected_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_by       UUID REFERENCES auth.users(id),
  acknowledged_at       TIMESTAMPTZ,
  resolution            TEXT,
  status                TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','acknowledged','resolved','stale'))
);

COMMENT ON TABLE public.international_fx_drift_findings IS
  'Prompt #111 queue of market-MSRP rows whose implied-USD drifts beyond the configured tolerance vs current US MSRP. Domenic reviews at /admin/international/fx/drift.';

CREATE INDEX IF NOT EXISTS idx_fx_drift_status ON public.international_fx_drift_findings (status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_fx_drift_market ON public.international_fx_drift_findings (market_code, status);

ALTER TABLE public.international_fx_drift_findings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='international_fx_drift_findings' AND policyname='fx_drift_read_admin') THEN
    CREATE POLICY "fx_drift_read_admin"
      ON public.international_fx_drift_findings FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='international_fx_drift_findings' AND policyname='fx_drift_update_admin') THEN
    CREATE POLICY "fx_drift_update_admin"
      ON public.international_fx_drift_findings FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin')));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- master_skus_market_pricing: the pricing overlay sibling table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.master_skus_market_pricing (
  pricing_id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                                    TEXT NOT NULL,
  market_code                            public.market_code NOT NULL,
  currency_code                          public.currency_code NOT NULL,
  msrp_cents                             BIGINT NOT NULL CHECK (msrp_cents > 0),
  is_available_in_market                 BOOLEAN NOT NULL DEFAULT FALSE,
  margin_floor_met_at_msrp               BOOLEAN,
  tax_code                               TEXT NOT NULL,
  inclusive_of_tax                       BOOLEAN NOT NULL DEFAULT FALSE,
  price_set_by_user_id                   UUID REFERENCES auth.users(id),
  price_set_at                           TIMESTAMPTZ,
  price_approved_by_user_id              UUID REFERENCES auth.users(id),
  price_approved_at                      TIMESTAMPTZ,
  governance_rejection_reason            TEXT,
  market_availability_default_reasoning  TEXT,
  version                                INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  status                                 public.pricing_status NOT NULL DEFAULT 'draft',
  effective_from                         TIMESTAMPTZ,
  effective_until                        TIMESTAMPTZ,
  created_at                             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until > effective_from)
);

COMMENT ON TABLE public.master_skus_market_pricing IS
  'Prompt #111 per-(sku,market) pricing overlay. sibling to master_skus; no FK to keep existing master_skus read-only contract. Governance + .88 ending enforced by triggers.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_mskumkt_active_unique
  ON public.master_skus_market_pricing (sku, market_code)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_mskumkt_sku_market ON public.master_skus_market_pricing (sku, market_code);
CREATE INDEX IF NOT EXISTS idx_mskumkt_status     ON public.master_skus_market_pricing (status);
CREATE INDEX IF NOT EXISTS idx_mskumkt_market_active ON public.master_skus_market_pricing (market_code) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_mskumkt_availability ON public.master_skus_market_pricing (market_code, is_available_in_market) WHERE status = 'active';

ALTER TABLE public.master_skus_market_pricing ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='master_skus_market_pricing' AND policyname='mskumkt_read_active_public') THEN
    CREATE POLICY "mskumkt_read_active_public"
      ON public.master_skus_market_pricing FOR SELECT TO authenticated, anon
      USING (status = 'active');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='master_skus_market_pricing' AND policyname='mskumkt_read_all_admin') THEN
    CREATE POLICY "mskumkt_read_all_admin"
      ON public.master_skus_market_pricing FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin','compliance_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='master_skus_market_pricing' AND policyname='mskumkt_write_admin') THEN
    CREATE POLICY "mskumkt_write_admin"
      ON public.master_skus_market_pricing FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin','compliance_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','finance_admin','compliance_admin')));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- .88 ending enforcement trigger (cannot be a CHECK since it references a
-- sibling config table). Fires on INSERT and UPDATE.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_mskumkt_msrp_rules()
RETURNS TRIGGER AS $$
DECLARE
  v_enforce_88 BOOLEAN;
  v_market_currency public.currency_code;
BEGIN
  IF NEW.msrp_cents IS NULL OR NEW.msrp_cents <= 0 THEN
    RAISE EXCEPTION 'master_skus_market_pricing.msrp_cents must be positive' USING ERRCODE='22023';
  END IF;

  SELECT enforce_88_ending, currency_code
    INTO v_enforce_88, v_market_currency
    FROM public.international_market_config
    WHERE market_code = NEW.market_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'master_skus_market_pricing: no international_market_config row for market_code %', NEW.market_code USING ERRCODE='23503';
  END IF;

  IF NEW.currency_code <> v_market_currency THEN
    RAISE EXCEPTION 'master_skus_market_pricing: currency_code % does not match market % currency %', NEW.currency_code, NEW.market_code, v_market_currency USING ERRCODE='22023';
  END IF;

  IF v_enforce_88 AND (NEW.msrp_cents % 100) <> 88 THEN
    RAISE EXCEPTION 'master_skus_market_pricing.msrp_cents % must end in 88 for market % while enforce_88_ending is TRUE', NEW.msrp_cents, NEW.market_code USING ERRCODE='23514';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.enforce_mskumkt_msrp_rules() IS
  'Prompt #111 BEFORE INSERT/UPDATE trigger enforcing: msrp > 0, currency matches market config, .88 ending (when enforce_88_ending=TRUE), and stamping updated_at.';

DROP TRIGGER IF EXISTS trg_mskumkt_enforce_msrp_rules_ins ON public.master_skus_market_pricing;
CREATE TRIGGER trg_mskumkt_enforce_msrp_rules_ins
  BEFORE INSERT ON public.master_skus_market_pricing
  FOR EACH ROW EXECUTE FUNCTION public.enforce_mskumkt_msrp_rules();

DROP TRIGGER IF EXISTS trg_mskumkt_enforce_msrp_rules_upd ON public.master_skus_market_pricing;
CREATE TRIGGER trg_mskumkt_enforce_msrp_rules_upd
  BEFORE UPDATE ON public.master_skus_market_pricing
  FOR EACH ROW EXECUTE FUNCTION public.enforce_mskumkt_msrp_rules();
