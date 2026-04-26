-- =============================================================================
-- Prompt #138e Outcome Timeline starting content seed.
-- =============================================================================
-- Per spec section 4: variant set '30_60_90' + section title + intro paragraph
-- + 3 phase cards + qualifier + hand-off CTA. All rows ship inactive
-- (active=false). Activation requires Marshall pre-check pass + Steve
-- approval, plus the qualifier must be active and adjacent for any phase
-- card to activate (enforced by MARSHALL.MARKETING.OUTCOME_TIMELINE_QUALIFIER_REQUIRED P0).
--
-- Em-dashes from spec section 4 rewritten to commas, semicolons, colons,
-- and periods per the no-dashes Standing Rule.
-- =============================================================================

-- Variant set
INSERT INTO public.outcome_timeline_variant_sets (id, variant_set_code, variant_set_label) VALUES
  ('aaaaaaaa-1111-4111-8111-000000000001', '30_60_90', 'Standard 30/60/90 timeline')
ON CONFLICT (id) DO NOTHING;

-- Section blocks: title + intro paragraph
INSERT INTO public.outcome_timeline_section_blocks (id, variant_set_id, block_kind, block_text) VALUES
  ('bbbbbbbb-1111-4111-8111-000000000001',
   'aaaaaaaa-1111-4111-8111-000000000001',
   'section_title',
   'What the next 90 days might look like.'),
  ('bbbbbbbb-1111-4111-8111-000000000002',
   'aaaaaaaa-1111-4111-8111-000000000001',
   'intro_paragraph',
   'Biology doesn''t change overnight, and good wellness work shouldn''t pretend otherwise. The patterns below describe the typical sequence people who follow tiered protocols tend to notice: sleep often shifting before energy, energy often shifting before deeper recovery markers. Your own timeline will reflect your own biology. The point of this section is to make the journey legible.')
ON CONFLICT (id) DO NOTHING;

-- Phase cards (three)
INSERT INTO public.outcome_timeline_phases (id, variant_set_id, phase_id, phase_title, phase_subtitle, phase_body, display_order) VALUES
  ('cccccccc-1111-4111-8111-000000000001',
   'aaaaaaaa-1111-4111-8111-000000000001',
   'phase_1_30',
   'Days 1 to 30: Foundation.',
   'What month one establishes.',
   'The first month is mostly about settling in. You complete your assessment, your protocol categories begin showing up in your daily plan, and your Bio Optimization Score starts capturing the inputs that will tell its story over time. People often report that the most reliable shift in this window is around sleep: sleep onset getting steadier, mid-night wakings becoming less frequent. Sleep responds to small inputs faster than most other categories. Energy patterns may begin to shift, but more often that becomes obvious in month two.',
   0),
  ('cccccccc-1111-4111-8111-000000000002',
   'aaaaaaaa-1111-4111-8111-000000000001',
   'phase_31_60',
   'Days 31 to 60: Deepening.',
   'What month two deepens.',
   'By the end of month two, the categories that were settling start to feel like patterns. Afternoon energy may feel less like a wall and more like a glide. Mental clarity in the late morning often steadies. For people on a Tier 2 or Tier 3 protocol, the engine begins refining suggestions based on the data you''ve added; your Score reflects the trajectory of those refinements. This is also the window where many people notice that recovery from physical effort or stressful days feels less like catching up.',
   1),
  ('cccccccc-1111-4111-8111-000000000003',
   'aaaaaaaa-1111-4111-8111-000000000001',
   'phase_61_90',
   'Days 61 to 90: Enablement.',
   'What month three enables.',
   'Month three is where the protocol starts feeling less like something you''re following and more like something that''s just part of how you operate. The categories that were deepening become familiar. People often report that the question shifts from "is this working" to "what do I want to focus on next". That is the right question, because by this point the engine has refined its picture of you and your protocol has matured around your biology. For Tier 3 users with a GeneX360 panel, this is typically when pathway-level refinements become most apparent.',
   2)
ON CONFLICT (id) DO NOTHING;

-- Qualifier
INSERT INTO public.outcome_timeline_qualifier (id, variant_set_id, qualifier_text) VALUES
  ('dddddddd-1111-4111-8111-000000000001',
   'aaaaaaaa-1111-4111-8111-000000000001',
   'Not everyone experiences the same pattern, and some categories shift faster than others depending on individual biology. The timeline above describes what tends to be the case across people on tiered protocols; your own may move faster, slower, or in a different order. The platform''s job is to track that for you, not to predict it.')
ON CONFLICT (id) DO NOTHING;

-- Hand-off CTA
INSERT INTO public.outcome_timeline_cta (id, variant_set_id, cta_lead_text, cta_label, cta_destination) VALUES
  ('eeeeeeee-1111-4111-8111-000000000001',
   'aaaaaaaa-1111-4111-8111-000000000001',
   'Your timeline will be yours, built from your assessment, your data, and your biology. Start the assessment when you''re ready.',
   'Start my assessment',
   '/signup')
ON CONFLICT (id) DO NOTHING;
