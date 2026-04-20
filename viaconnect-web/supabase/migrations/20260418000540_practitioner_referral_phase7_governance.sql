-- =============================================================================
-- Prompt #98 Phase 7: Launch phase + governance + parameters
-- =============================================================================
-- Append-only. Four pieces:
--
--   1. Seed the practitioner_referral_2027 launch phase. phase_type
--      uses 'custom_event' (launch_phases CHECK does not include a
--      referral-specific type; admins can filter by id).
--
--   2. Create practitioner_referral_parameters singleton table + seed
--      spec defaults. Runtime code loads from here so governance-
--      approved changes take effect without a code deploy.
--
--   3. Register 13 pricing_domains rows defensively (Prompt #95
--      governance may not yet be present; DO block tolerates both
--      states).
--
--   4. Storage bucket for W-9 tax documents with tight admin-only
--      RLS (referrer's own row is readable by the referrer so they
--      can download their 1099 when generated).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Launch phase
-- ---------------------------------------------------------------------------
INSERT INTO public.launch_phases (
  id, display_name, description, phase_type, target_activation_date,
  activation_status, sort_order, metadata
) VALUES (
  'practitioner_referral_2027',
  'Practitioner Referral Program',
  'B2B2B referral program. Activates 30 to 60 days after the practitioner portal goes live. Infrastructure built in Prompt #98; activation is a moderate-tier governance proposal per Prompt #95.',
  'custom_event',
  '2027-03-01',
  'planned',
  35,
  jsonb_build_object('origin_prompt', 'Prompt #98', 'program', 'practitioner_referral')
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Parameters table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practitioner_referral_parameters (
  id TEXT PRIMARY KEY DEFAULT 'default',

  milestone_1_reward_cents          INTEGER NOT NULL DEFAULT 20000     CHECK (milestone_1_reward_cents >= 0),
  milestone_2_reward_cents          INTEGER NOT NULL DEFAULT 50000     CHECK (milestone_2_reward_cents >= 0),
  milestone_3_reward_cents          INTEGER NOT NULL DEFAULT 100000    CHECK (milestone_3_reward_cents >= 0),
  milestone_4_reward_cents          INTEGER NOT NULL DEFAULT 200000    CHECK (milestone_4_reward_cents >= 0),

  subscription_discount_percent     INTEGER NOT NULL DEFAULT 15        CHECK (subscription_discount_percent BETWEEN 0 AND 100),
  cert_discount_percent             INTEGER NOT NULL DEFAULT 15        CHECK (cert_discount_percent         BETWEEN 0 AND 100),

  attribution_window_days           INTEGER NOT NULL DEFAULT 90        CHECK (attribution_window_days >= 1),
  fraud_hold_days                   INTEGER NOT NULL DEFAULT 30        CHECK (fraud_hold_days >= 0),
  credit_expiration_months          INTEGER NOT NULL DEFAULT 24        CHECK (credit_expiration_months >= 1),

  bronze_threshold                  INTEGER NOT NULL DEFAULT 5         CHECK (bronze_threshold >= 1),
  silver_threshold                  INTEGER NOT NULL DEFAULT 10        CHECK (silver_threshold >= 1),
  gold_threshold                    INTEGER NOT NULL DEFAULT 25        CHECK (gold_threshold >= 1),

  tax_form_1099_threshold_cents     INTEGER NOT NULL DEFAULT 60000     CHECK (tax_form_1099_threshold_cents >= 0),
  high_velocity_threshold_per_30d   INTEGER NOT NULL DEFAULT 5         CHECK (high_velocity_threshold_per_30d >= 1),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.practitioner_referral_parameters IS
  'Singleton (id=default) table holding the governance-controlled parameters for the practitioner referral program. Loaded at runtime by the orders + benefit + vesting paths so approved changes take effect without a code deploy.';

INSERT INTO public.practitioner_referral_parameters (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.practitioner_referral_parameters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ref_params_read_all ON public.practitioner_referral_parameters;
CREATE POLICY ref_params_read_all
  ON public.practitioner_referral_parameters FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS ref_params_admin_all ON public.practitioner_referral_parameters;
CREATE POLICY ref_params_admin_all
  ON public.practitioner_referral_parameters FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 3. Pricing domains (defensive against Prompt #95 not present)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pricing_domains') THEN
    INSERT INTO public.pricing_domains (
      id, display_name, category, target_table, target_column,
      requires_grandfathering, default_grandfathering_policy,
      description, sort_order
    ) VALUES
      ('ref_milestone_1_reward', 'Referral Milestone 1 Reward (Activation + First Purchase)',
        'one_time_purchase', 'practitioner_referral_parameters', 'milestone_1_reward_cents',
        false, 'no_grandfathering',
        'Credit for milestone 1: subscription + first wholesale >= $500. Default 20000 cents.', 100),
      ('ref_milestone_2_reward', 'Referral Milestone 2 Reward (Master Certification)',
        'one_time_purchase', 'practitioner_referral_parameters', 'milestone_2_reward_cents',
        false, 'no_grandfathering',
        'Credit for milestone 2: Master Practitioner certification complete. Default 50000 cents.', 101),
      ('ref_milestone_3_reward', 'Referral Milestone 3 Reward (Level 3 First Delivery)',
        'one_time_purchase', 'practitioner_referral_parameters', 'milestone_3_reward_cents',
        false, 'no_grandfathering',
        'Credit for milestone 3: Level 3 White-Label first production delivered. Default 100000 cents.', 102),
      ('ref_milestone_4_reward', 'Referral Milestone 4 Reward (Level 4 First Approval)',
        'one_time_purchase', 'practitioner_referral_parameters', 'milestone_4_reward_cents',
        false, 'no_grandfathering',
        'Credit for milestone 4: Level 4 first formulation approved. Default 200000 cents.', 103),
      ('ref_referred_subscription_discount', 'Referred Practitioner First-Month Subscription Discount',
        'subscription_tier', 'practitioner_referral_parameters', 'subscription_discount_percent',
        false, 'no_grandfathering',
        'Discount percent on first subscription month. Default 15.', 104),
      ('ref_referred_cert_discount', 'Referred Practitioner Level 2 Cert Discount',
        'subscription_tier', 'practitioner_referral_parameters', 'cert_discount_percent',
        false, 'no_grandfathering',
        'Discount percent on Level 2 Precision Protocol cert. Default 15.', 105),
      ('ref_attribution_window_days', 'Referral Attribution Window (Days)',
        'subscription_tier', 'practitioner_referral_parameters', 'attribution_window_days',
        false, 'no_grandfathering',
        'Days between first click and signup during which attribution is valid. Default 90.', 106),
      ('ref_fraud_hold_days', 'Referral Reward Fraud Hold (Days)',
        'subscription_tier', 'practitioner_referral_parameters', 'fraud_hold_days',
        false, 'no_grandfathering',
        'Days between milestone achievement and vesting. Default 30.', 107),
      ('ref_credit_expiration_months', 'Referral Credit Expiration (Months)',
        'subscription_tier', 'practitioner_referral_parameters', 'credit_expiration_months',
        false, 'no_grandfathering',
        'Months after earning before unused credits expire. Default 24.', 108),
      ('ref_bronze_tier_threshold', 'Bronze Referrer Tier Threshold',
        'subscription_tier', 'practitioner_referral_parameters', 'bronze_threshold',
        false, 'no_grandfathering',
        'Successful referral count for Bronze. Default 5.', 109),
      ('ref_silver_tier_threshold', 'Silver Referrer Tier Threshold',
        'subscription_tier', 'practitioner_referral_parameters', 'silver_threshold',
        false, 'no_grandfathering',
        'Successful referral count for Silver. Default 10.', 110),
      ('ref_gold_tier_threshold', 'Gold Referrer Tier Threshold',
        'subscription_tier', 'practitioner_referral_parameters', 'gold_threshold',
        false, 'no_grandfathering',
        'Successful referral count for Gold. Default 25.', 111),
      ('ref_1099_threshold_cents', 'Referral Tax Reporting Threshold',
        'one_time_purchase', 'practitioner_referral_parameters', 'tax_form_1099_threshold_cents',
        false, 'no_grandfathering',
        'Annual earnings threshold requiring 1099-MISC. Default 60000 cents ($600).', 112)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Storage bucket for tax documents (1099 + W-9)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('practitioner-referral-tax-documents', 'practitioner-referral-tax-documents',
        false, 10485760,   -- 10 MB per file
        ARRAY['application/pdf', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- Practitioner reads own; admin all. Paths convention:
--   {practitioner_id}/w9/{year}.pdf
--   {practitioner_id}/1099/{year}.pdf
DROP POLICY IF EXISTS ref_tax_self_read ON storage.objects;
CREATE POLICY ref_tax_self_read
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'practitioner-referral-tax-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.practitioners WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ref_tax_self_write_w9 ON storage.objects;
CREATE POLICY ref_tax_self_write_w9
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'practitioner-referral-tax-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.practitioners WHERE user_id = auth.uid()
    ) AND
    (storage.foldername(name))[2] = 'w9'
  );

DROP POLICY IF EXISTS ref_tax_admin_all ON storage.objects;
CREATE POLICY ref_tax_admin_all
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'practitioner-referral-tax-documents' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'practitioner-referral-tax-documents' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
