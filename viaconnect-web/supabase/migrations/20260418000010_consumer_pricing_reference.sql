-- =============================================================
-- Prompt #90 Phase 1.1: Consumer Pricing Reference Tables
-- Seeded reference data for membership tiers, features, discount
-- rules, and outcome stack bundles. Append-only; no existing
-- tables touched. Outcome stacks are a NEW consumer-facing
-- concept distinct from the existing financial BI `bundles`.
-- =============================================================

-- 1. Membership tier catalog
CREATE TABLE IF NOT EXISTS public.membership_tiers (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  tier_level INTEGER NOT NULL UNIQUE,
  monthly_price_cents INTEGER NOT NULL,
  annual_price_cents INTEGER NOT NULL,
  annual_savings_cents INTEGER GENERATED ALWAYS AS (monthly_price_cents * 12 - annual_price_cents) STORED,
  description TEXT,
  is_family_tier BOOLEAN NOT NULL DEFAULT false,
  base_adults_included INTEGER NOT NULL DEFAULT 1,
  base_children_included INTEGER NOT NULL DEFAULT 0,
  max_adults_allowed INTEGER NOT NULL DEFAULT 1,
  additional_adult_price_cents INTEGER,
  additional_children_chunk_price_cents INTEGER,
  children_chunk_size INTEGER,
  stripe_product_id TEXT,
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.membership_tiers IS 'Canonical reference for consumer membership tiers (Free, Gold, Platinum, Platinum+ Family). Updated via controlled migrations only.';

ALTER TABLE public.membership_tiers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='membership_tiers' AND policyname='membership_tiers_read_all_authenticated') THEN
    CREATE POLICY "membership_tiers_read_all_authenticated"
      ON public.membership_tiers FOR SELECT
      TO authenticated USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='membership_tiers' AND policyname='membership_tiers_read_all_anon') THEN
    CREATE POLICY "membership_tiers_read_all_anon"
      ON public.membership_tiers FOR SELECT
      TO anon USING (is_active = true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_membership_tiers_level ON public.membership_tiers(tier_level) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_membership_tiers_sort  ON public.membership_tiers(sort_order)  WHERE is_active = true;

INSERT INTO public.membership_tiers (
  id, display_name, tier_level, monthly_price_cents, annual_price_cents,
  description, is_family_tier, base_adults_included, base_children_included,
  max_adults_allowed, additional_adult_price_cents, additional_children_chunk_price_cents,
  children_chunk_size, sort_order
) VALUES
  ('free','Free',0,0,0,
    'CAQ assessment, basic Bio Optimization Score at 72% confidence, static protocol recommendation, shop at MSRP.',
    false,1,0,1,NULL,NULL,NULL,0),
  ('gold','Gold',1,888,8800,
    'Full platform access including unlimited Hannah, dynamic Bio Optimization Score, wearable integration (1), Helix Rewards, nutrition logging, 10% subscription supplement discount.',
    false,1,0,1,NULL,NULL,NULL,1),
  ('platinum','Platinum',2,2888,28800,
    'Complete platform including GeneX360 integration, 96% confidence recommendations, multiple wearable integration, family/practitioner integration, priority Hannah, 15% subscription supplement discount.',
    false,1,0,1,NULL,NULL,NULL,2),
  ('platinum_family','Platinum+ Family',3,4888,48888,
    'Complete platform for families. 2 adults + 2 children base, with add-ons available. Family Wellness Dashboard, 25% GeneX360 family discount, Sproutables integration, quarterly wellness coach consultations.',
    true,2,2,4,888,888,2,3)
ON CONFLICT (id) DO NOTHING;

-- 2. Supplement discount rules
CREATE TABLE IF NOT EXISTS public.supplement_discount_rules (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 0 AND 100),
  rule_priority INTEGER NOT NULL UNIQUE,
  requires_subscription BOOLEAN NOT NULL DEFAULT false,
  requires_genex360_any BOOLEAN NOT NULL DEFAULT false,
  requires_genex360_complete BOOLEAN NOT NULL DEFAULT false,
  requires_active_protocol BOOLEAN NOT NULL DEFAULT false,
  is_annual_prepay_bonus BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.supplement_discount_rules IS 'Hierarchical discount rules. Highest qualifying non-bonus rule wins. Annual prepay bonus is additive. Business logic caps total discount at 25%.';

ALTER TABLE public.supplement_discount_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='supplement_discount_rules' AND policyname='discount_rules_read_all') THEN
    CREATE POLICY "discount_rules_read_all"
      ON public.supplement_discount_rules FOR SELECT
      TO authenticated, anon USING (is_active = true);
  END IF;
END $$;

INSERT INTO public.supplement_discount_rules (
  id, display_name, discount_percent, rule_priority,
  requires_subscription, requires_genex360_any, requires_genex360_complete,
  requires_active_protocol, is_annual_prepay_bonus
) VALUES
  ('subscription_base','Auto-ship subscription',10,1,true,false,false,false,false),
  ('genex360_member','GeneX360 member',15,2,true,true,false,false,false),
  ('full_precision','Full precision (GeneX360 Complete + active protocol)',20,3,true,false,true,true,false),
  ('annual_prepay_bonus','Annual prepay bonus',5,99,true,false,false,false,true)
ON CONFLICT (id) DO NOTHING;

-- 3. Outcome stack bundles (NEW; does not touch existing financial BI `bundles` table)
CREATE TABLE IF NOT EXISTS public.outcome_stacks (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  outcome_category TEXT NOT NULL CHECK (outcome_category IN (
    'sleep','cognitive','longevity','gut_health',
    'methylation','performance_male','vitality_female',
    'immune','energy','stress','custom'
  )),
  bundle_discount_percent INTEGER NOT NULL DEFAULT 20 CHECK (bundle_discount_percent BETWEEN 0 AND 100),
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  hero_image_url TEXT,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.outcome_stacks IS 'Consumer-facing outcome-focused bundles priced 20% below individual SKU totals. Distinct from the `bundles` table which stores financial BI forecasts.';

CREATE TABLE IF NOT EXISTS public.outcome_stack_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id TEXT NOT NULL REFERENCES public.outcome_stacks(id) ON DELETE CASCADE,
  sku TEXT NOT NULL REFERENCES public.master_skus(sku),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stack_id, sku)
);

COMMENT ON TABLE public.outcome_stack_components IS 'Component SKUs for each outcome stack. References master_skus(sku).';
COMMENT ON COLUMN public.outcome_stack_components.is_primary IS 'The flagship / hero SKU in the stack for display.';

ALTER TABLE public.outcome_stacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_stack_components ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='outcome_stacks' AND policyname='outcome_stacks_read_all') THEN
    CREATE POLICY "outcome_stacks_read_all"
      ON public.outcome_stacks FOR SELECT
      TO authenticated, anon USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='outcome_stack_components' AND policyname='outcome_stack_components_read_all') THEN
    CREATE POLICY "outcome_stack_components_read_all"
      ON public.outcome_stack_components FOR SELECT
      TO authenticated, anon
      USING (EXISTS (SELECT 1 FROM public.outcome_stacks s WHERE s.id = stack_id AND s.is_active = true));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_outcome_stacks_category ON public.outcome_stacks(outcome_category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_outcome_stacks_sort     ON public.outcome_stacks(sort_order)        WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_stack_components_stack  ON public.outcome_stack_components(stack_id);

INSERT INTO public.outcome_stacks (id, display_name, description, outcome_category, sort_order) VALUES
  ('sleep_stack','Sleep Stack',
    'Comprehensive sleep support combining RELAX+ Sleep Support, Magnesium Synergy Matrix, and MethylB Complete+. Addresses sleep quality, duration, and methylation supported neurotransmitter balance.',
    'sleep',1),
  ('cognitive_stack','Cognitive Stack',
    'Focused mental performance stack: FOCUS+ Nootropic Formula, NeuroCalm BH4+, and Omega-3 DHA/EPA. Supports attention, mental clarity, and neurological health.',
    'cognitive',2),
  ('longevity_stack','Longevity Stack',
    'Cellular longevity and performance: Replenish NAD+, Teloprime+ Telomere Support, and Creatine HCL+. Addresses cellular energy, telomere integrity, and performance.',
    'longevity',3),
  ('gut_health_stack','Gut Health Stack',
    'Complete gut repair protocol: Balance+ Gut Repair, DigestiZorb+ Enzyme Complex, and Magnesium Synergy Matrix. Supports gut lining integrity, digestion, and motility.',
    'gut_health',4),
  ('methylation_stack','Methylation Stack',
    'Targeted methylation pathway support: MethylB Complete+, Magnesium Synergy Matrix, and Replenish NAD+. Core stack for MTHFR, COMT, and methylation pathway optimization.',
    'methylation',5),
  ('performance_male_stack','Performance Stack (Male)',
    'Male performance optimization: Creatine HCL+, BLAST+ Nitric Oxide, and RISE+ Male Testosterone. Supports physical performance, vascular function, and hormonal optimization.',
    'performance_male',6),
  ('vitality_female_stack','Vitality Stack (Female)',
    'Female hormonal and methylation vitality: DESIRE+ Female Hormonal, MethylB Complete+, and Magnesium Synergy Matrix. Supports hormonal balance and methylation.',
    'vitality_female',7)
ON CONFLICT (id) DO NOTHING;

-- Seed components with verified master_skus references
-- SKU mapping: RELAX+=15, MagSyn=05, MethylB=02, FOCUS+=19, NeuroCalm BH4+=23, Omega3=07,
-- NAD+=11, Teloprime+=17, Creatine=09, Balance+=12, DigestiZorb=18,
-- BLAST+=13, RISE+=20, DESIRE+=25
INSERT INTO public.outcome_stack_components (stack_id, sku, quantity, is_primary, sort_order) VALUES
  ('sleep_stack','15',1,true,1),
  ('sleep_stack','05',1,false,2),
  ('sleep_stack','02',1,false,3),
  ('cognitive_stack','19',1,true,1),
  ('cognitive_stack','23',1,false,2),
  ('cognitive_stack','07',1,false,3),
  ('longevity_stack','11',1,true,1),
  ('longevity_stack','17',1,false,2),
  ('longevity_stack','09',1,false,3),
  ('gut_health_stack','12',1,true,1),
  ('gut_health_stack','18',1,false,2),
  ('gut_health_stack','05',1,false,3),
  ('methylation_stack','02',1,true,1),
  ('methylation_stack','05',1,false,2),
  ('methylation_stack','11',1,false,3),
  ('performance_male_stack','09',1,true,1),
  ('performance_male_stack','13',1,false,2),
  ('performance_male_stack','20',1,false,3),
  ('vitality_female_stack','25',1,true,1),
  ('vitality_female_stack','02',1,false,2),
  ('vitality_female_stack','05',1,false,3)
ON CONFLICT (stack_id, sku) DO NOTHING;

-- 4. Feature gate catalog
CREATE TABLE IF NOT EXISTS public.features (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'assessment','ai_coaching','tracking','integration',
    'personalization','family','practitioner','rewards',
    'analytics','support','commerce'
  )),
  minimum_tier_level INTEGER NOT NULL REFERENCES public.membership_tiers(tier_level),
  requires_family_tier BOOLEAN NOT NULL DEFAULT false,
  requires_genex360 BOOLEAN NOT NULL DEFAULT false,
  gate_behavior TEXT NOT NULL DEFAULT 'hide'
    CHECK (gate_behavior IN ('hide','preview','upgrade_prompt','read_only')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.features IS 'Feature flags with tier gating. minimum_tier_level references membership_tiers.tier_level.';

ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='features' AND policyname='features_read_all') THEN
    CREATE POLICY "features_read_all"
      ON public.features FOR SELECT
      TO authenticated, anon USING (is_active = true);
  END IF;
END $$;

INSERT INTO public.features (id, display_name, category, minimum_tier_level, requires_family_tier, requires_genex360, gate_behavior) VALUES
  ('caq_assessment','CAQ Assessment','assessment',0,false,false,'hide'),
  ('basic_bio_score','Basic Bio Optimization Score (72% confidence)','assessment',0,false,false,'hide'),
  ('static_protocol','Static Protocol Recommendation','personalization',0,false,false,'hide'),
  ('shop_retail_access','Shop at MSRP','commerce',0,false,false,'hide'),
  ('research_hub_readonly','Research Hub (read-only)','personalization',0,false,false,'hide'),
  ('annual_caq_reassess','Annual CAQ Reassessment','assessment',0,false,false,'hide'),
  ('hannah_unlimited','Unlimited Hannah Interactions','ai_coaching',1,false,false,'preview'),
  ('dynamic_bio_score','Dynamic Bio Optimization Score Tracking','tracking',1,false,false,'preview'),
  ('forty_day_reassess','40-day Automatic Reassessment','assessment',1,false,false,'upgrade_prompt'),
  ('lab_data_integration','Lab Data Integration (86% confidence)','integration',1,false,false,'upgrade_prompt'),
  ('nutrition_logging','Nutrition Logging with AI Analysis','tracking',1,false,false,'upgrade_prompt'),
  ('supplement_adherence','Supplement Adherence Tracking','tracking',1,false,false,'upgrade_prompt'),
  ('wearable_single','Wearable Integration (1 device)','integration',1,false,false,'upgrade_prompt'),
  ('helix_rewards_basic','Helix Rewards Earning & Redemption','rewards',1,false,false,'preview'),
  ('subscription_discount_10','Subscription Discount (10% off MSRP)','commerce',1,false,false,'preview'),
  ('priority_email_support','Priority Email Support','support',1,false,false,'hide'),
  ('research_hub_annotations','Research Hub Save & Annotate','personalization',1,false,false,'upgrade_prompt'),
  ('genex360_integration','GeneX360 Genetic Data Integration','integration',2,false,true,'preview'),
  ('full_precision_score','96% Confidence Recommendations','personalization',2,false,true,'preview'),
  ('variant_explorer','Genetic Variant Explorer','personalization',2,false,true,'upgrade_prompt'),
  ('flagship_recommendations','Flagship SKU Protocol Recommendations','personalization',2,false,false,'upgrade_prompt'),
  ('wearable_multiple','Multiple Wearable Integration','integration',2,false,false,'upgrade_prompt'),
  ('practitioner_integration','Practitioner Integration','practitioner',2,false,false,'upgrade_prompt'),
  ('priority_hannah','Priority Hannah Response Times','ai_coaching',2,false,false,'preview'),
  ('advanced_analytics','Advanced Analytics & Predictive Modeling','analytics',2,false,false,'upgrade_prompt'),
  ('early_access_features','Early Access to New Features','support',2,false,false,'hide'),
  ('research_hub_deep','Full Research Hub Deep Access','personalization',2,false,false,'upgrade_prompt'),
  ('helix_platinum_tier','Helix Rewards Platinum Tier (5x multiplier)','rewards',2,false,false,'preview'),
  ('subscription_discount_15','Subscription Discount (15% off MSRP)','commerce',2,false,false,'preview'),
  ('family_dashboard','Family Wellness Dashboard','family',3,true,false,'upgrade_prompt'),
  ('family_protocol_coord','Family Protocol Coordination','family',3,true,false,'upgrade_prompt'),
  ('family_health_history','Family Health History Tracking','family',3,true,false,'upgrade_prompt'),
  ('family_priority_support','Dedicated Family Account Manager','support',3,true,false,'hide'),
  ('quarterly_wellness_consult','Quarterly Family Wellness Consultations','support',3,true,false,'upgrade_prompt'),
  ('family_genex360_discount','25% Family GeneX360 Discount','commerce',3,true,false,'upgrade_prompt'),
  ('children_accounts','Children Account Management','family',3,true,false,'hide'),
  ('sproutables_integration','Sproutables Product Integration','family',3,true,false,'hide'),
  ('family_helix_pool','Family Helix Rewards Pool','rewards',3,true,false,'hide'),
  ('family_shared_billing','Family Shared Billing','commerce',3,true,false,'hide')
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_features_tier     ON public.features(minimum_tier_level) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_features_category ON public.features(category)           WHERE is_active = true;
