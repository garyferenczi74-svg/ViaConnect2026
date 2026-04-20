-- =============================================================================
-- Prompt #97 Phase 7.3: register 7 Level 4 governance domains.
-- =============================================================================
-- Every Level 4 tunable parameter flows through Prompt #95 governance.
-- Activation of custom_formulations_2029 launch phase requires structural-
-- tier proposal (board approval) per decision rights rules; individual
-- parameter tweaks within the tier use moderate/major tiers depending on
-- magnitude.
--
-- Category mapping:
--   fees (development, medical review, admin refund): one_time_purchase
--   MOQ / min order / overhead / markup: wholesale_discount (practitioner-side economics)
-- =============================================================================

INSERT INTO public.pricing_domains (
  id, display_name, category, target_table, target_column,
  target_id_column, target_id_type,
  requires_grandfathering, default_grandfathering_policy,
  affected_customer_query_template, description, sort_order,
  is_active, pending_dependency
) VALUES
  ('l4_formulation_development_fee',
   'Level 4 Formulation Development Fee',
   'one_time_purchase', 'level_4_parameters', 'development_fee_cents', 'id', 'text',
   false, 'no_grandfathering', NULL,
   'One-time fee per custom formulation development. Default $3,888; refundable against first production order minus $500 admin fee on abandonment.',
   90, true, NULL),

  ('l4_medical_review_fee',
   'Level 4 Medical Review Fee',
   'one_time_purchase', 'level_4_parameters', 'medical_review_fee_cents', 'id', 'text',
   false, 'no_grandfathering', NULL,
   'Medical review fee per formulation submission (Fadi Dagher). Default $888; re-charged for substantive or material revisions.',
   91, true, NULL),

  ('l4_moq_per_formulation',
   'Level 4 MOQ Per Formulation',
   'wholesale_discount', 'level_4_parameters', 'moq_per_formulation', 'id', 'text',
   false, 'no_grandfathering', NULL,
   'Minimum units per formulation per production run. Default 500.',
   92, true, NULL),

  ('l4_minimum_order_value',
   'Level 4 Minimum Order Value',
   'wholesale_discount', 'level_4_parameters', 'minimum_order_value_cents', 'id', 'text',
   false, 'no_grandfathering', NULL,
   'Minimum total order value for Level 4 production runs. Default $30,000.',
   93, true, NULL),

  ('l4_manufacturing_overhead',
   'Level 4 Manufacturing Overhead Percent',
   'wholesale_discount', 'level_4_parameters', 'manufacturing_overhead_percent', 'id', 'text',
   false, 'no_grandfathering', NULL,
   'Manufacturing overhead percent applied to COGS in Level 4 pricing. Default 25%.',
   94, true, NULL),

  ('l4_markup_percent',
   'Level 4 ViaCura Markup Percent',
   'wholesale_discount', 'level_4_parameters', 'markup_percent', 'id', 'text',
   false, 'no_grandfathering', NULL,
   'ViaCura markup applied to total unit cost in Level 4 pricing. Default 40%.',
   95, true, NULL),

  ('l4_admin_fee_on_refund',
   'Level 4 Admin Fee Retained on Refund',
   'one_time_purchase', 'level_4_parameters', 'admin_fee_on_refund_cents', 'id', 'text',
   false, 'no_grandfathering', NULL,
   'Administrative fee retained when development fee is refunded due to practitioner fault (abandonment, validation failure, review rejection). Default $500.',
   96, true, NULL)
ON CONFLICT (id) DO NOTHING;
