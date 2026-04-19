-- =============================================================================
-- Prompt #95 Phase 1.1: Pricing domain registry.
-- =============================================================================
-- The catalog of priced objects on the platform. Every price-change proposal
-- (Phase 2+) references a domain row. Adding new priced objects means
-- inserting here; it does not require code changes.
--
-- Domains whose target tables do not yet exist (practitioner_tiers,
-- certification_levels, helix_redemption_caps) are seeded with
-- is_active = false so the admin UI surfaces them as "pending dependency"
-- without allowing proposals to be created against them. When those tables
-- land, a follow-up migration flips is_active = true.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pricing_domains (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'consumer_subscription','practitioner_subscription','one_time_purchase',
    'certification','wholesale_discount','outcome_stack_discount',
    'helix_redemption_cap','supplement_msrp','peptide_msrp'
  )),
  target_table TEXT NOT NULL,
  target_column TEXT NOT NULL,
  target_id_column TEXT NOT NULL DEFAULT 'id',
  target_id_type TEXT NOT NULL DEFAULT 'text' CHECK (target_id_type IN ('text','uuid','integer')),
  requires_grandfathering BOOLEAN NOT NULL DEFAULT false,
  default_grandfathering_policy TEXT CHECK (default_grandfathering_policy IN (
    'indefinite','twelve_months','six_months','thirty_days','no_grandfathering'
  )),
  affected_customer_query_template TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  pending_dependency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.pricing_domains IS
  'Registry of all priced objects on the platform. is_active = false means the domain is known but not yet usable (its target table has not shipped).';
COMMENT ON COLUMN public.pricing_domains.affected_customer_query_template IS
  'SQL template that returns count of customers affected by a change to this domain.';
COMMENT ON COLUMN public.pricing_domains.pending_dependency IS
  'When is_active=false, names the prompt whose migration is blocked on. NULL when active.';

ALTER TABLE public.pricing_domains ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pricing_domains' AND policyname='pricing_domains_admin_all') THEN
    CREATE POLICY "pricing_domains_admin_all"
      ON public.pricing_domains FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Seed: 22 canonical pricing domains (11 active + 11 pending dependency).
-- -----------------------------------------------------------------------------
INSERT INTO public.pricing_domains (
  id, display_name, category, target_table, target_column,
  target_id_column, target_id_type,
  requires_grandfathering, default_grandfathering_policy,
  affected_customer_query_template, description, sort_order,
  is_active, pending_dependency
) VALUES
  ('consumer_gold_monthly','Consumer Gold Monthly Price','consumer_subscription','membership_tiers','monthly_price_cents','id','text',true,'indefinite',
   'SELECT COUNT(*) FROM memberships WHERE tier_id = ''gold'' AND billing_cycle = ''monthly'' AND status = ''active''',
   'Monthly price for Gold tier consumer subscription.',1,true,NULL),
  ('consumer_gold_annual','Consumer Gold Annual Price','consumer_subscription','membership_tiers','annual_price_cents','id','text',true,'indefinite',
   'SELECT COUNT(*) FROM memberships WHERE tier_id = ''gold'' AND billing_cycle = ''annual'' AND status = ''active''',
   'Annual price for Gold tier consumer subscription.',2,true,NULL),
  ('consumer_platinum_monthly','Consumer Platinum Monthly Price','consumer_subscription','membership_tiers','monthly_price_cents','id','text',true,'indefinite',
   'SELECT COUNT(*) FROM memberships WHERE tier_id = ''platinum'' AND billing_cycle = ''monthly'' AND status = ''active''',
   'Monthly price for Platinum tier.',3,true,NULL),
  ('consumer_platinum_annual','Consumer Platinum Annual Price','consumer_subscription','membership_tiers','annual_price_cents','id','text',true,'indefinite',
   'SELECT COUNT(*) FROM memberships WHERE tier_id = ''platinum'' AND billing_cycle = ''annual'' AND status = ''active''',
   'Annual price for Platinum tier.',4,true,NULL),
  ('consumer_platinum_plus_monthly','Consumer Platinum+ Family Monthly Price','consumer_subscription','membership_tiers','monthly_price_cents','id','text',true,'indefinite',
   'SELECT COUNT(*) FROM memberships WHERE tier_id = ''platinum_family'' AND billing_cycle = ''monthly'' AND status = ''active''',
   'Monthly base price for Platinum+ Family tier.',5,true,NULL),
  ('consumer_platinum_plus_annual','Consumer Platinum+ Family Annual Price','consumer_subscription','membership_tiers','annual_price_cents','id','text',true,'indefinite',
   'SELECT COUNT(*) FROM memberships WHERE tier_id = ''platinum_family'' AND billing_cycle = ''annual'' AND status = ''active''',
   'Annual base price for Platinum+ Family.',6,true,NULL),
  ('genex360_m','GeneX-M One-Time Price','one_time_purchase','genex360_products','price_cents','id','text',false,'no_grandfathering',NULL,
   'One-time price for GeneX-M genetic test.',10,true,NULL),
  ('genex360_core','GeneX360 Core One-Time Price','one_time_purchase','genex360_products','price_cents','id','text',false,'no_grandfathering',NULL,
   'One-time price for GeneX360 Core.',11,true,NULL),
  ('genex360_complete','GeneX360 Complete One-Time Price','one_time_purchase','genex360_products','price_cents','id','text',false,'no_grandfathering',NULL,
   'One-time price for GeneX360 Complete.',12,true,NULL),
  ('practitioner_standard_monthly','Practitioner Standard Portal Monthly','practitioner_subscription','practitioner_tiers','monthly_price_cents','id','text',true,'indefinite',NULL,
   'Monthly price for Standard Practitioner Portal.',20,false,'Prompt 91 revised'),
  ('practitioner_standard_annual','Practitioner Standard Portal Annual','practitioner_subscription','practitioner_tiers','annual_price_cents','id','text',true,'indefinite',NULL,
   'Annual price for Standard Practitioner Portal.',21,false,'Prompt 91 revised'),
  ('practitioner_white_label_monthly','White-Label Platform Monthly','practitioner_subscription','practitioner_tiers','monthly_price_cents','id','text',true,'indefinite',NULL,
   'Monthly price for White-Label Platform tier.',22,false,'Prompt 91 revised'),
  ('practitioner_white_label_annual','White-Label Platform Annual','practitioner_subscription','practitioner_tiers','annual_price_cents','id','text',true,'indefinite',NULL,
   'Annual price for White-Label Platform tier.',23,false,'Prompt 91 revised'),
  ('practitioner_wholesale_discount','Practitioner Wholesale Discount Percent','wholesale_discount','practitioner_tiers','wholesale_discount_percent','id','text',true,'twelve_months',NULL,
   'Wholesale discount applied to practitioner purchases.',30,false,'Prompt 91 revised'),
  ('certification_precision_designer','Level 2 Precision Protocol Designer Fee','certification','certification_levels','price_cents','id','text',false,'no_grandfathering',NULL,
   'One-time fee for Level 2 certification.',40,false,'Prompt 91 revised'),
  ('certification_master_practitioner','Level 3 Master Practitioner Fee','certification','certification_levels','price_cents','id','text',false,'no_grandfathering',NULL,
   'One-time fee for Level 3 certification.',41,false,'Prompt 91 revised'),
  ('certification_annual_recertification','Annual Recertification Fee','certification','certification_levels','annual_recertification_price_cents','id','text',false,'no_grandfathering',NULL,
   'Annual recertification fee for Level 2 and Level 3 practitioners.',42,false,'Prompt 91 revised'),
  ('outcome_stack_discount','Outcome Stack Bundle Discount Percent','outcome_stack_discount','outcome_stacks','discount_percent','id','text',false,'no_grandfathering',NULL,
   'Discount applied to Outcome Stack bundles.',50,true,NULL),
  ('helix_redemption_cap_individual','Helix Individual Discount Cap','helix_redemption_cap','helix_redemption_caps','individual_discount_percent','id','text',false,'no_grandfathering',NULL,
   'Maximum discount per single Helix redemption.',60,false,'Prompt 92 helix_redemption_caps table'),
  ('helix_redemption_cap_combined','Helix Combined Stacked Discount Cap','helix_redemption_cap','helix_redemption_caps','combined_discount_percent','id','text',false,'no_grandfathering',NULL,
   'Maximum combined discount across all redemption types.',61,false,'Prompt 92 helix_redemption_caps table'),
  ('supplement_msrp_generic','Supplement MSRP (per-SKU)','supplement_msrp','product_catalog','msrp_cents','id','uuid',false,'no_grandfathering',NULL,
   'MSRP for individual supplement SKU.',70,true,NULL),
  ('peptide_msrp_generic','Peptide MSRP (per-SKU)','peptide_msrp','product_catalog','msrp_cents','id','uuid',false,'no_grandfathering',NULL,
   'MSRP for individual peptide SKU.',71,true,NULL)
ON CONFLICT (id) DO NOTHING;
