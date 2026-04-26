-- =============================================================================
-- Prompt #138d Sarah Scenario starting content seed.
-- =============================================================================
-- Per spec section 4: 4 categories + 1 Sarah persona + 7 copy blocks +
-- 1 closing disclosure. The opening disclosure is implicit in the
-- intro_paragraph copy block per spec section 4.2.
-- All rows ship inactive; activation requires Marshall pre-check pass +
-- Steve approval. The MARSHALL.MARKETING.COMPOSITE_DISCLOSURE P0 rule
-- requires both opening and closing disclosure adjacency at render time.
--
-- Em-dashes from spec section 4 rewritten to commas, semicolons, colons,
-- and periods per the no-dashes Standing Rule.
-- =============================================================================

-- Categories (4 functional-medicine areas)
INSERT INTO public.scenario_categories (id, category_code, category_display_name, category_description) VALUES
  ('11111111-1111-4d11-8d11-100000000001', 'methylation_pathway_support', 'Methylation-Pathway Support',
   'Addresses how efficiently the body processes folate, B-vitamins, and related nutrients that affect energy, detoxification, and hormone balance.'),
  ('11111111-1111-4d11-8d11-100000000002', 'sleep_architecture_optimization', 'Sleep Architecture Optimization',
   'Supports the biological patterns underlying deep sleep, REM cycles, and nighttime recovery; often where fatigue issues originate.'),
  ('11111111-1111-4d11-8d11-100000000003', 'stress_response_balance', 'Stress-Response Balance',
   'Supports the HPA axis: the system that governs cortisol, stress recovery, and resilience under chronic load.'),
  ('11111111-1111-4d11-8d11-100000000004', 'mitochondrial_energy_support', 'Mitochondrial Energy Support',
   'Addresses the cellular energy factories that affect stamina, recovery, and baseline vitality.')
ON CONFLICT (id) DO NOTHING;

-- Sarah persona
INSERT INTO public.scenario_personas (
  id, persona_code, persona_display_name, age_band, lifestyle_descriptors,
  health_concerns_consumer_language, protocol_category_refs, tier_reached, tier_rationale, display_order
) VALUES (
  '22222222-2222-4d22-8d22-200000000001',
  'sarah',
  'Sarah',
  'late 30s',
  ARRAY['busy professional','frequent traveler'],
  ARRAY['afternoon energy crashes','inconsistent sleep'],
  ARRAY[
    '11111111-1111-4d11-8d11-100000000001'::uuid,
    '11111111-1111-4d11-8d11-100000000002'::uuid,
    '11111111-1111-4d11-8d11-100000000003'::uuid,
    '11111111-1111-4d11-8d11-100000000004'::uuid
  ],
  2,
  'assessment paired with a lab panel',
  0
) ON CONFLICT (id) DO NOTHING;

-- Copy blocks (section title, intro, 3 phase cards, tier explainer, hand-off CTA lead)
INSERT INTO public.scenario_copy_blocks (id, slot_id, surface, block_text, persona_scoped_to, display_order) VALUES
  ('33333333-3333-4d33-8d33-300000000001',
   'walkthrough.section_title', 'walkthrough',
   'How the engine works: a walkthrough.',
   NULL, 0),
  ('33333333-3333-4d33-8d33-300000000002',
   'walkthrough.intro_paragraph', 'walkthrough',
   'Sarah isn''t a real person; she''s a composite built to show how the ViaConnect engine interprets an assessment and returns a reviewed protocol. Your own results will look different because your biology is different. The purpose of this walkthrough is to make the process concrete.',
   'sarah', 1),
  ('33333333-3333-4d33-8d33-300000000003',
   'walkthrough.phase_1', 'walkthrough',
   'Sarah starts with the Comprehensive Assessment, about 70 questions covering her current health, family history, supplements and medications she''s using, sleep and stress patterns, and goals. It takes her about 12 minutes.',
   'sarah', 2),
  ('33333333-3333-4d33-8d33-300000000004',
   'walkthrough.phase_2', 'walkthrough',
   'The engine reviews Sarah''s responses and identifies four protocol categories that the evidence suggests are worth addressing: methylation-pathway support, sleep architecture optimization, stress-response balance, and mitochondrial energy support. For each category, the engine assembles the relevant research and matches it to the specific details Sarah shared.',
   'sarah', 3),
  ('33333333-3333-4d33-8d33-300000000005',
   'walkthrough.phase_3', 'walkthrough',
   'Before the protocol reaches Sarah, every category she receives has been reviewed by Dr. Fadi Dagher, Medical Director, as part of the platform''s oversight model. Sarah''s scenario reaches Tier 2, meaning her assessment was paired with a lab panel. Tier 2 protocols carry a higher confidence rating than Tier 1 because the lab data refines the engine''s suggestions.',
   'sarah', 4),
  ('33333333-3333-4d33-8d33-300000000006',
   'walkthrough.tier_explainer', 'walkthrough',
   'The protocol engine operates at three confidence tiers, and each user''s protocol is labeled with its tier so there''s no ambiguity. Tier 1: Assessment only. The engine works with your CAQ responses. Useful as a starting point; less precise than higher tiers. Tier 2: Assessment plus labs. Adding a lab panel gives the engine measurable biomarkers to work with. The engine''s suggestions are tuned to the lab data, and Dr. Fadi''s review accounts for both sources. Tier 3: Assessment plus labs plus genetics. Adding a genetic panel (GeneX360) gives the engine your metabolic and pathway-level context. Tier 3 is the most tailored, and carries the highest confidence rating.',
   NULL, 5),
  ('33333333-3333-4d33-8d33-300000000007',
   'walkthrough.hand_off_cta_lead', 'walkthrough',
   'Your assessment will be different because your biology is different. Start yours, about 12 minutes.',
   NULL, 6)
ON CONFLICT (id) DO NOTHING;

-- Closing illustrative disclosure (opening is implicit in the intro_paragraph)
INSERT INTO public.scenario_disclosures (id, disclosure_placement, disclosure_text, font_weight_matches_body, renders_as_footnote) VALUES
  ('44444444-4444-4d44-8d44-400000000001',
   'closing',
   'Sarah is a composite. Your own protocol will reflect your own biology, your own lifestyle, and your own health history.',
   true, false)
ON CONFLICT (id) DO NOTHING;
