-- =============================================================================
-- Prompt #94 Phase 1.4: Unit economics snapshots
-- =============================================================================
-- Append-only. Per-segment monthly metric snapshot. Written by the scheduled
-- Edge Function on the 1st of each month at 06:00 UTC. Enables historical
-- trend analysis without recomputing from raw data.
--
-- segment_value semantics:
--   segment_type='overall'                   -> segment_value='all'
--   segment_type='tier'                      -> segment_value='free'|'gold'|'platinum'|'platinum_plus'
--   segment_type='archetype'                 -> segment_value=archetype_definitions.id
--   segment_type='channel'                   -> segment_value=first_touch_channel
--   segment_type='practitioner_attached'     -> segment_value='true'|'false'
--   segment_type='cohort_month'              -> segment_value='YYYY-MM'
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.unit_economics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  snapshot_month DATE NOT NULL,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('monthly', 'weekly', 'adhoc')),
  snapshot_generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  segment_type TEXT NOT NULL CHECK (segment_type IN (
    'overall', 'tier', 'archetype', 'channel',
    'practitioner_attached', 'cohort_month'
  )),
  segment_value TEXT NOT NULL,

  -- Population
  new_customers_count      INTEGER NOT NULL DEFAULT 0,
  active_customers_count   INTEGER NOT NULL DEFAULT 0,
  churned_customers_count  INTEGER NOT NULL DEFAULT 0,

  -- Revenue (cents)
  total_revenue_cents                    BIGINT NOT NULL DEFAULT 0,
  subscription_revenue_cents             BIGINT NOT NULL DEFAULT 0,
  supplement_revenue_cents               BIGINT NOT NULL DEFAULT 0,
  genex360_revenue_cents                 BIGINT NOT NULL DEFAULT 0,
  practitioner_subscription_revenue_cents BIGINT NOT NULL DEFAULT 0,
  certification_revenue_cents            BIGINT NOT NULL DEFAULT 0,

  -- Variable costs (cents)
  cogs_cents                  BIGINT NOT NULL DEFAULT 0,
  shipping_cost_cents         BIGINT NOT NULL DEFAULT 0,
  payment_processing_cents    BIGINT NOT NULL DEFAULT 0,
  helix_redemption_cost_cents BIGINT NOT NULL DEFAULT 0,
  total_variable_cost_cents   BIGINT NOT NULL DEFAULT 0,

  -- Margin
  contribution_margin_cents   BIGINT NOT NULL DEFAULT 0,
  contribution_margin_percent NUMERIC(6, 3),

  -- CAC
  marketing_spend_cents INTEGER NOT NULL DEFAULT 0,
  blended_cac_cents     INTEGER,
  payback_period_months NUMERIC(6, 2),

  -- LTV horizons
  ltv_12mo_cents INTEGER,
  ltv_24mo_cents INTEGER,
  ltv_36mo_cents INTEGER,

  ltv_cac_ratio_12mo NUMERIC(6, 3),
  ltv_cac_ratio_24mo NUMERIC(6, 3),
  ltv_cac_ratio_36mo NUMERIC(6, 3),

  -- Retention
  net_revenue_retention_percent   NUMERIC(6, 3),
  gross_revenue_retention_percent NUMERIC(6, 3),
  monthly_churn_rate_percent      NUMERIC(6, 3),
  annual_churn_rate_percent       NUMERIC(6, 3),

  -- Other
  arpu_cents INTEGER,
  mrr_cents  BIGINT,
  arr_cents  BIGINT,

  raw_calculation_inputs JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (snapshot_month, segment_type, segment_value, snapshot_type)
);

COMMENT ON TABLE public.unit_economics_snapshots IS
  'Per-segment monthly snapshot of all unit economics metrics. Written by scheduled job. Enables historical trend analysis.';
COMMENT ON COLUMN public.unit_economics_snapshots.raw_calculation_inputs IS
  'JSON of raw inputs used to compute this snapshot. Enables reproducibility and debugging.';

CREATE INDEX IF NOT EXISTS idx_ue_snap_month
  ON public.unit_economics_snapshots(snapshot_month DESC);
CREATE INDEX IF NOT EXISTS idx_ue_snap_segment
  ON public.unit_economics_snapshots(segment_type, segment_value, snapshot_month DESC);

ALTER TABLE public.unit_economics_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ue_snap_admin_all ON public.unit_economics_snapshots;
CREATE POLICY ue_snap_admin_all
  ON public.unit_economics_snapshots FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
