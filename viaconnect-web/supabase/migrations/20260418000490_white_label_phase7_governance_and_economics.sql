-- =============================================================================
-- Prompt #96 Phase 7: Governance + unit economics integration
-- =============================================================================
-- Append-only. Three pieces:
--
--   1. Supporting tables: white_label_discount_tiers + white_label_parameters.
--      Seeded with the spec defaults. The order route loads from these at
--      runtime so governance-approved changes (Prompt #95) take effect
--      without a code deploy.
--
--   2. Pricing-domain registrations. Seven rows in pricing_domains, one per
--      governable parameter. The inserts are defensive: ON CONFLICT
--      DO NOTHING so this migration is safe to apply when Prompt #95
--      governance has not yet shipped its pricing_domains table (the
--      domain rows then arrive automatically when the table is created).
--      We tolerate either situation rather than couple the migrations.
--
--   3. white_label_economics view: per-practitioner aggregator the unit
--      economics dashboard (Prompt #94) joins against to extend its
--      segment_type list with white-label segments.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Governable supporting tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.white_label_discount_tiers (
  id TEXT PRIMARY KEY,
  min_units INTEGER NOT NULL,
  max_units INTEGER,                                  -- NULL = open upper bound
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 0 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.white_label_discount_tiers IS
  'Per-tier wholesale discount percent for white-label production runs. Loaded by the order route at quote time.';

INSERT INTO public.white_label_discount_tiers (id, min_units, max_units, discount_percent) VALUES
  ('tier_100_499',   100,  499,  60),
  ('tier_500_999',   500,  999,  65),
  ('tier_1000_plus', 1000, NULL, 70)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.white_label_discount_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wl_disc_tiers_read_all ON public.white_label_discount_tiers;
CREATE POLICY wl_disc_tiers_read_all
  ON public.white_label_discount_tiers FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS wl_disc_tiers_admin_all ON public.white_label_discount_tiers;
CREATE POLICY wl_disc_tiers_admin_all
  ON public.white_label_discount_tiers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


CREATE TABLE IF NOT EXISTS public.white_label_parameters (
  id TEXT PRIMARY KEY,
  minimum_order_value_cents BIGINT NOT NULL,
  expedited_surcharge_percent INTEGER NOT NULL CHECK (expedited_surcharge_percent BETWEEN 0 AND 100),
  storage_fee_cents_per_unit_day INTEGER NOT NULL CHECK (storage_fee_cents_per_unit_day >= 0),
  free_storage_days INTEGER NOT NULL CHECK (free_storage_days >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.white_label_parameters IS
  'Singleton-style table (id=default) holding the scalar governable parameters for the white-label program. Loaded by the order route + the storage-fee tick.';

INSERT INTO public.white_label_parameters (
  id, minimum_order_value_cents, expedited_surcharge_percent,
  storage_fee_cents_per_unit_day, free_storage_days
) VALUES
  ('default', 1500000, 15, 2, 60)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.white_label_parameters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wl_params_read_all ON public.white_label_parameters;
CREATE POLICY wl_params_read_all
  ON public.white_label_parameters FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS wl_params_admin_all ON public.white_label_parameters;
CREATE POLICY wl_params_admin_all
  ON public.white_label_parameters FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 2. Pricing-domain registrations (defensive against Prompt #95 not present)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pricing_domains') THEN
    INSERT INTO public.pricing_domains (
      id, display_name, category, target_table, target_column,
      requires_grandfathering, default_grandfathering_policy,
      description, sort_order
    ) VALUES
      ('wl_discount_tier_100_499', 'White-Label Discount Tier 100 to 499 Units',
        'wholesale_discount', 'white_label_discount_tiers', 'discount_percent',
        true, 'six_months',
        'Discount percentage for white-label production orders at the 100 to 499 unit tier. Default 60.', 80),
      ('wl_discount_tier_500_999', 'White-Label Discount Tier 500 to 999 Units',
        'wholesale_discount', 'white_label_discount_tiers', 'discount_percent',
        true, 'six_months',
        'Discount percentage for the 500 to 999 unit tier. Default 65.', 81),
      ('wl_discount_tier_1000_plus', 'White-Label Discount Tier 1000+ Units',
        'wholesale_discount', 'white_label_discount_tiers', 'discount_percent',
        true, 'six_months',
        'Discount percentage for the 1000+ unit tier. Default 70.', 82),
      ('wl_minimum_order_value', 'White-Label Minimum Order Value',
        'wholesale_discount', 'white_label_parameters', 'minimum_order_value_cents',
        false, 'no_grandfathering',
        'Minimum total order value for a white-label production run. Default 1500000 cents ($15,000).', 83),
      ('wl_expedited_surcharge', 'White-Label Expedited Production Surcharge',
        'wholesale_discount', 'white_label_parameters', 'expedited_surcharge_percent',
        false, 'no_grandfathering',
        'Surcharge percent for expedited (6 week) production timeline. Default 15.', 84),
      ('wl_storage_fee_per_unit_day', 'White-Label Storage Fee Per Unit Per Day',
        'wholesale_discount', 'white_label_parameters', 'storage_fee_cents_per_unit_day',
        false, 'no_grandfathering',
        'Daily per-unit storage fee for ViaCura-held inventory beyond the free window. Default 2 cents.', 85),
      ('wl_free_storage_days', 'White-Label Free Storage Days',
        'wholesale_discount', 'white_label_parameters', 'free_storage_days',
        false, 'no_grandfathering',
        'Days of free storage at ViaCura warehouse before storage fees begin. Default 60.', 86)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Unit economics view (Prompt #94 integration)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.white_label_economics AS
SELECT
  wle.practitioner_id,
  wle.status                                                 AS enrollment_status,
  COUNT(DISTINCT wpo.id) FILTER (WHERE wpo.status IN ('shipped', 'delivered')) AS lifetime_production_orders,
  COALESCE(SUM(wpo.total_cents) FILTER (WHERE wpo.status IN ('shipped', 'delivered')), 0)::BIGINT AS lifetime_production_revenue_cents,
  COALESCE(AVG(wpo.total_cents) FILTER (WHERE wpo.status IN ('shipped', 'delivered')), 0)::BIGINT AS average_production_order_cents,
  MAX(wpo.delivered_at)                                      AS most_recent_delivery_at,
  COALESCE(SUM(wil.units_sold), 0)                           AS total_units_sold_to_patients,
  COALESCE(SUM(
    wil.units_produced - wil.units_sold - wil.units_expired - wil.units_returned - wil.units_recalled
  ), 0)                                                      AS units_on_hand,
  COALESCE(SUM(wil.viacura_storage_fee_accrued_cents), 0)::BIGINT AS storage_fees_accrued_cents
FROM public.white_label_enrollments wle
LEFT JOIN public.white_label_production_orders wpo
       ON wpo.enrollment_id = wle.id
LEFT JOIN public.white_label_inventory_lots wil
       ON wil.practitioner_id = wle.practitioner_id
GROUP BY wle.practitioner_id, wle.status;

COMMENT ON VIEW public.white_label_economics IS
  'Per-practitioner white-label aggregates for the unit economics dashboard (Prompt #94). Counts only shipped + delivered production orders toward revenue.';
