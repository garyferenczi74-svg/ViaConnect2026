-- =============================================================================
-- Prompt #138a Phase 4: Seed the homepage hero variants per spec section 4.
-- =============================================================================
-- All five rows ship inactive (active_in_test = false). Activation requires
-- word_count_validated AND marshall_precheck_passed AND steve_approval_at,
-- enforced by the variant_can_only_activate_when_validated_and_approved CHECK
-- constraint on marketing_copy_variants.
--
-- The control row exists so the marketing_copy_impressions.slot_id FK is
-- satisfied for every render including pre-test rollout (Phase A baseline).
-- HeroVariantRenderer routes the control slot to HeroSection's default
-- rendering, so the displayed copy stays unchanged from today's homepage.
--
-- Em-dashes from spec section 4 variant text are rewritten to commas /
-- periods / colons per the platform no-dashes Standing Rule. Word counts
-- still fit the WORD_COUNT_BUDGETS (12 / 32) declared in
-- src/lib/marketing/variants/types.ts.
-- =============================================================================

INSERT INTO public.marketing_copy_variants (
  slot_id, surface, variant_label, framing,
  headline_text, subheadline_text, cta_label, cta_destination
) VALUES
  ('hero.variant.control', 'hero', 'Control (existing copy)', 'other',
   'Precision Personal Health. Powered by Your Data.',
   'One Genome  One Formulation  One Life at a Time. Precision health insights from your DNA, delivered through formulations engineered for your unique genome.',
   'Your Journey Starts Here', '/signup'),

  ('hero.variant.A', 'hero', 'Process Narrative', 'process_narrative',
   'Your wellness protocol, built from your biology, in three steps.',
   'Answer the assessment. Add your data. Get the precise protocol your body needs, with the science behind every recommendation.',
   'Start the assessment', '/signup'),

  ('hero.variant.B', 'hero', 'Outcome First', 'outcome_first',
   'Sleep deeper. Wake clearer. Know exactly what your body needs.',
   'ViaConnect builds your Bio Optimization protocol from your assessment, your supplements, and (optionally) your genetics. The next 30 days actually move your numbers.',
   'Build my protocol', '/signup'),

  ('hero.variant.C', 'hero', 'Proof First', 'proof_first',
   'Precision wellness, reviewed by clinicians.',
   'FarmCeutica''s protocol engine is medically directed by Dr. Fadi Dagher. Every recommendation is grounded in published research, FTC compliant claims, and your own biology.',
   'See how it works', '/signup'),

  ('hero.variant.D', 'hero', 'Time to Value', 'time_to_value',
   'Your personalized protocol in about 12 minutes.',
   'Answer the Comprehensive Assessment, optionally add your genetic panel, and get a Tier 1, 2, or 3 protocol, backed by Dr. Fadi Dagher and the Marshall compliance system.',
   'Begin: 12 minutes', '/signup')
ON CONFLICT (slot_id) DO NOTHING;
