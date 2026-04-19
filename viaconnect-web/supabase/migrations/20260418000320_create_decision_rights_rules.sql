-- =============================================================================
-- Prompt #95 Phase 1.5: Decision rights rules.
-- =============================================================================
-- Four tiers (minor, moderate, major, structural) with classification
-- thresholds and approver routing. Seeded with Gary's confirmed defaults.
-- Admins can adjust thresholds via the Phase 2 configuration UI; changes
-- are logged to governance_configuration_log (Phase 2 migration).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.decision_rights_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tier TEXT NOT NULL CHECK (tier IN ('minor', 'moderate', 'major', 'structural')),

  min_percent_change NUMERIC(6, 3),
  max_percent_change NUMERIC(6, 3),
  min_affected_customers INTEGER,
  max_affected_customers INTEGER,
  applies_to_categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  required_approvers TEXT[] NOT NULL,
  advisory_approvers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  requires_board_notification BOOLEAN NOT NULL DEFAULT false,
  requires_board_approval BOOLEAN NOT NULL DEFAULT false,

  target_decision_sla_hours INTEGER,

  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.decision_rights_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='decision_rights_rules' AND policyname='decision_rights_admin_all') THEN
    CREATE POLICY "decision_rights_admin_all"
      ON public.decision_rights_rules FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- Seed: four canonical tiers per Gary's confirmed decision rights.
INSERT INTO public.decision_rights_rules (
  tier, min_percent_change, max_percent_change, applies_to_categories,
  required_approvers, advisory_approvers,
  requires_board_notification, requires_board_approval,
  target_decision_sla_hours, sort_order
) VALUES
  ('minor', 0, 5.0,
    ARRAY['consumer_subscription', 'one_time_purchase', 'supplement_msrp', 'peptide_msrp'],
    ARRAY['ceo'],
    ARRAY[]::TEXT[],
    false, false,
    4, 1),
  ('moderate', 5.0, 15.0,
    ARRAY['consumer_subscription', 'practitioner_subscription', 'one_time_purchase',
          'certification', 'outcome_stack_discount', 'supplement_msrp', 'peptide_msrp'],
    ARRAY['ceo', 'cfo'],
    ARRAY['advisory_cto'],
    false, false,
    24, 2),
  ('major', 15.0, NULL,
    ARRAY['consumer_subscription', 'practitioner_subscription', 'one_time_purchase',
          'certification', 'wholesale_discount', 'outcome_stack_discount',
          'helix_redemption_cap', 'supplement_msrp', 'peptide_msrp'],
    ARRAY['ceo', 'cfo'],
    ARRAY['advisory_cto', 'advisory_medical'],
    true, false,
    72, 3),
  ('structural', NULL, NULL,
    ARRAY['practitioner_subscription', 'wholesale_discount'],
    ARRAY['ceo', 'cfo', 'board_member'],
    ARRAY['advisory_cto'],
    true, true,
    168, 4)
ON CONFLICT DO NOTHING;
