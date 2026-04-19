-- =============================================================================
-- Prompt #94 Phase 7.1: Unit economics alerts
-- =============================================================================
-- Append-only. The snapshot tick (Phase 7.3) evaluates each new snapshot
-- against a fixed set of board-significant thresholds (LTV:CAC, payback
-- period, GRR, NRR, monthly churn, contribution margin) and writes a row
-- here for every breach. The admin alerts page lets the founder
-- acknowledge each alert; acknowledged alerts are hidden by default but
-- the audit trail is preserved.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.unit_economics_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'ltv_cac_below_threshold',
    'payback_above_threshold',
    'grr_below_threshold',
    'nrr_below_threshold',
    'monthly_churn_above_threshold',
    'contribution_margin_below_threshold',
    'cac_above_threshold',
    'cohort_size_too_small'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),

  snapshot_month DATE NOT NULL,
  segment_type   TEXT NOT NULL,
  segment_value  TEXT NOT NULL,

  threshold_value NUMERIC,
  current_value   NUMERIC,
  message         TEXT NOT NULL,

  is_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledgement_note TEXT,

  raw_payload JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (alert_type, snapshot_month, segment_type, segment_value)
);

COMMENT ON TABLE public.unit_economics_alerts IS
  'Per-segment-per-month threshold breach log. Snapshot tick evaluates and writes; founder acknowledges.';
COMMENT ON CONSTRAINT unit_economics_alerts_alert_type_snapshot_month_segment__key
  ON public.unit_economics_alerts IS
  'Idempotency: same alert is not double-written for the same snapshot month and segment.';

CREATE INDEX IF NOT EXISTS idx_ue_alerts_unack
  ON public.unit_economics_alerts(snapshot_month DESC)
  WHERE is_acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_ue_alerts_segment
  ON public.unit_economics_alerts(segment_type, segment_value, snapshot_month DESC);

ALTER TABLE public.unit_economics_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ue_alerts_admin_all ON public.unit_economics_alerts;
CREATE POLICY ue_alerts_admin_all
  ON public.unit_economics_alerts FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
