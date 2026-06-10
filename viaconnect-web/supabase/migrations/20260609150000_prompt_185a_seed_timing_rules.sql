-- Prompt 185a slice 2: seed supplement_timing_rules (Hannah's knowledge base).
--
-- Append only and idempotent: INSERT ... ON CONFLICT (match_key) DO NOTHING so
-- reruns are safe and no applied migration is edited. Builds on slice 1
-- (20260609140000_prompt_185_supplement_schedule_foundation.sql).
--
-- match_key MAPPING CHOICE (recorded per the slice 2 instruction):
--   match_key uses canonical INGREDIENT slugs (magnesium_glycinate, vitamin_d3,
--   iron, b_complex, ...), NOT the catalog category_slug or the per SKU slug.
--   Reasons, from Step 0 discovery:
--     1. The 63 SKU Via Cura catalog's per SKU ingredient data lives only in
--        the live public.products.ingredients jsonb. public.products has no
--        CREATE TABLE migration, so the ingredient vocabulary cannot be
--        grounded from migration files.
--     2. user_current_supplements carries no catalog FK. It stores free text
--        supplement_name, an often empty key_ingredients text[], and a free
--        text category (default 'general', in practice a delivery method label
--        such as 'Methylated Vitamins'). None of these is the catalog
--        category_slug, and three category vocabularies diverge across the
--        catalog json, the canonical SKU migration, and the regimen table.
--     3. The existing engine (recommendTiming / classifyIngredient in
--        src/lib/caq/supplements/timing/rules.ts) already matches a supplement
--        to a class by ingredient NAME substring. Ingredient slug match_keys
--        align with that matcher, so slice 3 maps a user's supplement to a rule
--        by normalizing its name and ingredients, independent of catalog vocab.
--   Multi ingredient products are resolved to a primary active by the slice 3
--   matcher; the rows below are one ingredient each.
--
-- compliance_reviewed stays false on every row until the slice 8 Kelsey and
-- Marshall pass clears the condition adjacent copy. Surfaced copy is general
-- wellness only, no disease or treatment claims. No emojis. No em or en dashes
-- anywhere including comments.

INSERT INTO public.supplement_timing_rules
  (match_key, default_time_of_day, with_food, empty_stomach, fat_soluble, away_from, rationale_short, source_citation, compliance_reviewed)
VALUES
  ('b_complex',           'morning', NULL, NULL,  false, '{}',                   'B vitamins can be activating, so morning dosing supports daytime energy and avoids disturbing sleep for some people.', 'NIH Office of Dietary Supplements, B vitamin fact sheets', false),
  ('vitamin_c',           'morning', NULL, NULL,  false, '{}',                   'Well tolerated at any time of day and pairs with iron to support its absorption.',                                  'NIH Office of Dietary Supplements, Vitamin C fact sheet',  false),
  ('vitamin_d3',          'morning', true, NULL,  true,  '{}',                   'Fat soluble, so it absorbs best when taken with the largest fat containing meal of the day.',                       'NIH Office of Dietary Supplements, Vitamin D fact sheet',  false),
  ('iron',                'morning', NULL, true,  false, '{calcium,coffee,tea}', 'Absorbs best on an empty stomach or with vitamin C; keep it away from calcium, coffee, and tea.',                   'NIH Office of Dietary Supplements, Iron fact sheet',       false),
  ('coq10',               'morning', true, NULL,  true,  '{}',                   'Fat soluble, so take it with food earlier in the day.',                                                             'Examine, CoQ10 supplement timing',                         false),
  ('omega_3',             'morning', true, NULL,  true,  '{}',                   'Take with food, typically the largest meal, to support absorption and reduce aftertaste.',                          'Examine, Omega 3 supplement timing',                       false),
  ('probiotic',           'morning', NULL, NULL,  false, '{}',                   'Follow the product strain guidance; morning is a sensible default.',                                                'Examine, Probiotic supplement guidance',                   false),
  ('magnesium_glycinate', 'evening', NULL, NULL,  false, '{}',                   'A gentle, well absorbed form that supports relaxation and sleep quality for many people in the evening.',            'Examine, Magnesium glycinate timing',                      false),
  ('calcium',             'evening', NULL, NULL,  false, '{iron}',               'Evening works well; keep it separate from iron, which competes for absorption.',                                    'NIH Office of Dietary Supplements, Calcium fact sheet',    false),
  ('zinc',                'evening', true, NULL,  false, '{calcium,iron}',       'Take it with food in the evening and keep it away from calcium and iron.',                                          'NIH Office of Dietary Supplements, Zinc fact sheet',       false),
  ('melatonin',           'evening', NULL, NULL,  false, '{}',                   'Evening only, shortly before your wind down window.',                                                               'Examine, Melatonin timing',                                false),
  ('ashwagandha',         'evening', NULL, NULL,  false, '{}',                   'Evening by default for relaxation support; morning is acceptable for daytime use.',                                 'Examine, Ashwagandha guidance',                            false),
  ('l_theanine',          'evening', NULL, NULL,  false, '{}',                   'Evening; supports a calm, steady wind down.',                                                                       'Examine, L theanine timing',                               false),
  ('glycine',             'evening', NULL, NULL,  false, '{}',                   'Evening; supports sleep quality for many people.',                                                                  'Examine, Glycine and sleep',                               false)
ON CONFLICT (match_key) DO NOTHING;
