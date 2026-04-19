-- =============================================================================
-- Prompt #95 Phase 1.2: Pricing proposals.
-- =============================================================================
-- Every price-change proposal lives here. 30-day auto-expiration if not
-- activated, renewable by initiator. Status transitions are enforced at the
-- application layer (Phase 4 state machine); the table stores the end state.
--
-- Note on unit_economics_snapshot_id: the spec has this as a FK to
-- public.unit_economics_snapshots(id), but that table ships with Prompt #94.
-- We store as plain UUID with a descriptive comment; a follow-up migration
-- adds the FK once the target table exists.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pricing_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_number SERIAL NOT NULL UNIQUE,

  title TEXT NOT NULL,
  summary TEXT NOT NULL,

  pricing_domain_id TEXT NOT NULL REFERENCES public.pricing_domains(id),
  target_object_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  current_value_cents BIGINT,
  proposed_value_cents BIGINT,
  current_value_percent NUMERIC(6, 3),
  proposed_value_percent NUMERIC(6, 3),
  change_type TEXT NOT NULL CHECK (change_type IN ('price_amount', 'discount_percent')),

  percent_change NUMERIC(8, 4),

  impact_tier TEXT NOT NULL CHECK (impact_tier IN ('minor', 'moderate', 'major', 'structural')),
  auto_classified_tier TEXT NOT NULL CHECK (auto_classified_tier IN ('minor', 'moderate', 'major', 'structural')),
  tier_override_justification TEXT,

  estimated_affected_customers INTEGER,
  estimated_annual_revenue_impact_cents BIGINT,

  projected_ltv_change_percent NUMERIC(8, 4),
  projected_churn_change_percent NUMERIC(8, 4),
  projected_ltv_cac_ratio_24mo_before NUMERIC(6, 3),
  projected_ltv_cac_ratio_24mo_after NUMERIC(6, 3),
  unit_economics_snapshot_id UUID,
  raw_calculation_inputs JSONB,

  rationale TEXT NOT NULL,
  competitive_analysis TEXT,
  stakeholder_communication_plan TEXT,
  risks_and_mitigations TEXT,

  proposed_effective_date DATE NOT NULL,
  grandfathering_policy TEXT NOT NULL CHECK (grandfathering_policy IN (
    'indefinite', 'twelve_months', 'six_months', 'thirty_days', 'no_grandfathering'
  )),
  grandfathering_override_justification TEXT,

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'submitted_for_approval',
    'under_review',
    'approved_pending_activation',
    'activated',
    'rolled_back',
    'rejected',
    'withdrawn',
    'expired'
  )),

  is_emergency BOOLEAN NOT NULL DEFAULT false,
  emergency_justification TEXT,

  initiated_by UUID NOT NULL REFERENCES auth.users(id),
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID REFERENCES auth.users(id),
  rollback_justification TEXT,
  expired_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.pricing_proposals IS
  'Proposals for price changes across all pricing domains. Every change to priced objects flows through this table.';
COMMENT ON COLUMN public.pricing_proposals.auto_classified_tier IS
  'Tier computed by decision rights engine based on percent change and affected customer count. Separate from impact_tier to preserve audit trail when admin overrides classification.';
COMMENT ON COLUMN public.pricing_proposals.unit_economics_snapshot_id IS
  'Reference to the unit_economics_snapshots row used for projection. FK deferred until Prompt #94 applies its snapshot table.';
COMMENT ON COLUMN public.pricing_proposals.expires_at IS
  'Auto-expiration 30 days after creation if not activated. Can be renewed by initiator.';

CREATE INDEX IF NOT EXISTS idx_pricing_proposals_status
  ON public.pricing_proposals(status, submitted_at DESC)
  WHERE status IN ('submitted_for_approval', 'under_review');
CREATE INDEX IF NOT EXISTS idx_pricing_proposals_domain
  ON public.pricing_proposals(pricing_domain_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_proposals_initiator
  ON public.pricing_proposals(initiated_by, initiated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_proposals_expires
  ON public.pricing_proposals(expires_at)
  WHERE status IN ('submitted_for_approval', 'under_review');
CREATE INDEX IF NOT EXISTS idx_pricing_proposals_emergency
  ON public.pricing_proposals(is_emergency, initiated_at DESC)
  WHERE is_emergency = true;

ALTER TABLE public.pricing_proposals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pricing_proposals' AND policyname='pricing_proposals_admin_all') THEN
    CREATE POLICY "pricing_proposals_admin_all"
      ON public.pricing_proposals FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- Trigger: auto-compute percent_change before INSERT / UPDATE.
CREATE OR REPLACE FUNCTION public.compute_percent_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.change_type = 'price_amount'
     AND NEW.current_value_cents IS NOT NULL
     AND NEW.current_value_cents > 0
     AND NEW.proposed_value_cents IS NOT NULL THEN
    NEW.percent_change := ((NEW.proposed_value_cents - NEW.current_value_cents)::NUMERIC
                           / NEW.current_value_cents::NUMERIC) * 100;
  ELSIF NEW.change_type = 'discount_percent'
        AND NEW.current_value_percent IS NOT NULL
        AND NEW.proposed_value_percent IS NOT NULL THEN
    NEW.percent_change := NEW.proposed_value_percent - NEW.current_value_percent;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS compute_percent_change_trigger ON public.pricing_proposals;
CREATE TRIGGER compute_percent_change_trigger
  BEFORE INSERT OR UPDATE ON public.pricing_proposals
  FOR EACH ROW EXECUTE FUNCTION public.compute_percent_change();
