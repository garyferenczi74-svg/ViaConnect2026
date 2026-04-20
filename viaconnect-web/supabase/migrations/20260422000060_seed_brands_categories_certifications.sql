-- =============================================================================
-- Prompt #103 Phase 2: Seed brands + 7 canonical categories + certifications
-- =============================================================================
-- Idempotent (ON CONFLICT DO NOTHING). Palette + mark hex values match
-- the April 20, 2026 packaging proofs. Per-SKU palette categories
-- (Advanced Formulas, Functional Mushrooms) leave the category-level
-- palette fields NULL; per-SKU hex values are set on each product row.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Brands
-- ---------------------------------------------------------------------------
INSERT INTO public.brands (brand_slug, display_name, parent_brand_id, is_sub_line, wordmark_style, master_tagline, storefront_slug)
VALUES
  ('viacura',     'ViaCura',            NULL, FALSE, 'bi_tonal_via_cura',       'Built For Your Biology',        '/shop'),
  ('sproutables', 'Sproutables',        NULL, FALSE, 'sproutables_leaf_figure', 'Peak Growth and Wellness',      '/shop/sproutables')
ON CONFLICT (brand_slug) DO NOTHING;

-- ViaCura SNP sub-line references its parent; insert after master ViaCura lands.
INSERT INTO public.brands (brand_slug, display_name, parent_brand_id, is_sub_line, wordmark_style, master_tagline, storefront_slug)
SELECT 'viacura-snp', 'ViaCura SNP Line',
       (SELECT brand_id FROM public.brands WHERE brand_slug = 'viacura'),
       TRUE, 'monochrome_via_cura', 'Your Genetics | Your Protocol', '/shop/snp'
WHERE NOT EXISTS (SELECT 1 FROM public.brands WHERE brand_slug = 'viacura-snp');

-- ---------------------------------------------------------------------------
-- 2. Seven canonical product categories
-- ---------------------------------------------------------------------------
INSERT INTO public.product_categories (
  category_slug, display_name, brand_id,
  identity_mark_type, palette_rule,
  bottle_color_primary_hex, typography_primary_hex, typography_secondary_hex, accent_color_hex,
  dual_delivery_mark_primary_hex, dual_delivery_mark_outline_hex,
  tagline_primary, display_order
)
SELECT v.category_slug, v.display_name,
       (SELECT brand_id FROM public.brands WHERE brand_slug = v.brand_slug),
       v.identity_mark_type::identity_mark_type, v.palette_rule::palette_rule_type,
       v.bottle_color_primary_hex, v.typography_primary_hex, v.typography_secondary_hex, v.accent_color_hex,
       v.dual_delivery_mark_primary_hex, v.dual_delivery_mark_outline_hex,
       v.tagline_primary, v.display_order
FROM (VALUES
  -- 1. Base Formulas — ViaCura, Methylated badge, Silver bottle + Copper/Green typography
  ('base_formulas',         'Base Formulas',                    'viacura',
   'methylated_formula',      'single_palette_category_wide',
   '#C0C0C0', '#B75E18', '#1F5F3F', '#1F5F3F',
   NULL, NULL,
   'Built For Your Biology', 10),

  -- 2. Advanced Formulas — ViaCura, Dual Delivery, per-SKU palette
  ('advanced_formulas',     'Advanced Formulas',                'viacura',
   'dual_delivery_technology','per_sku_palette',
   NULL, NULL, NULL, NULL,
   NULL, NULL,
   'Built For Your Biology', 20),

  -- 3. Women's Health — ViaCura, Dual Delivery, single palette (Pearl pink + Gray + Rose)
  ('womens_health',         'Women''s Health',                  'viacura',
   'dual_delivery_technology','single_palette_category_wide',
   '#F5E0DC', '#3A3A3A', '#C0566A', '#C0566A',
   '#C0566A', '#3A3A3A',
   'Built For Your Biology', 30),

  -- 4. Children's Methylated Formulas — Sproutables sub-brand, Methylated, Silver + Dark/Bright green
  ('childrens_methylated',  'Children''s Methylated Formulas',  'sproutables',
   'methylated_formula',      'single_palette_category_wide',
   '#C0C0C0', '#1F5F3F', '#6ABF4B', '#6ABF4B',
   NULL, NULL,
   'Peak Growth and Wellness', 40),

  -- 5. SNP Support Formulations — ViaCura SNP sub-line, Dual Delivery, Matte black + Gold
  ('snp_support',           'SNP Support Formulations',         'viacura-snp',
   'dual_delivery_technology','single_palette_category_wide',
   '#1A1A1A', '#D4A020', NULL, '#D4A020',
   '#D4A020', '#D4A020',
   'Your Genetics | Your Protocol', 50),

  -- 6. Functional Mushrooms — ViaCura, Dual Delivery, palette per-SKU (TBD)
  ('functional_mushrooms',  'Functional Mushrooms',             'viacura',
   'dual_delivery_technology','per_sku_palette',
   NULL, NULL, NULL, NULL,
   NULL, NULL,
   'Built For Your Biology', 60),

  -- 7. GeneX360 Testing — ViaCura, no identity mark (test kit format)
  ('genex360_testing',      'GeneX360 Testing',                 'viacura',
   'none',                    'not_applicable',
   NULL, NULL, NULL, NULL,
   NULL, NULL,
   'Precision wellness, written in you', 70)
) AS v(
  category_slug, display_name, brand_slug,
  identity_mark_type, palette_rule,
  bottle_color_primary_hex, typography_primary_hex, typography_secondary_hex, accent_color_hex,
  dual_delivery_mark_primary_hex, dual_delivery_mark_outline_hex,
  tagline_primary, display_order
)
ON CONFLICT (category_slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Certifications
-- ---------------------------------------------------------------------------
INSERT INTO public.product_certifications (certification_slug, display_name)
VALUES
  ('gmp',                    'GMP Certified'),
  ('third_party_lab_tested', 'Third-Party Lab Tested'),
  ('non_gmo',                'Non-GMO')
ON CONFLICT (certification_slug) DO NOTHING;
