-- =============================================================================
-- Prompt #103 Phase 2: Wire 7 canonical SKUs to brand + category
-- =============================================================================
-- Defensive: the `products` rows themselves are created via admin UI and
-- application seed scripts (the table schema lives outside migrations).
-- This migration matches the 7 canonical SKUs by NAME (ILIKE) and
-- populates brand_id, product_category_id, serving_count, serving_unit,
-- dose_per_serving_text, pricing_tier ('L1' default), and for Advanced
-- Formulas SKUs the per-SKU palette hex values.
--
-- If a SKU row does not exist yet, the corresponding UPDATE is a no-op
-- — Gary can re-run this migration via MCP apply_migration once images
-- land and product rows are created. Columns update is guarded by
-- IS NULL checks so it won't overwrite manual admin edits.
-- =============================================================================

DO $$
DECLARE
  v_viacura_id          UUID;
  v_sproutables_id      UUID;
  v_viacura_snp_id      UUID;
  v_cat_base            UUID;
  v_cat_advanced        UUID;
  v_cat_womens          UUID;
  v_cat_childrens       UUID;
  v_cat_snp             UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = 'products') THEN
    RAISE NOTICE 'public.products table not present; skipping SKU wiring.';
    RETURN;
  END IF;

  SELECT brand_id INTO v_viacura_id     FROM public.brands WHERE brand_slug = 'viacura';
  SELECT brand_id INTO v_sproutables_id FROM public.brands WHERE brand_slug = 'sproutables';
  SELECT brand_id INTO v_viacura_snp_id FROM public.brands WHERE brand_slug = 'viacura-snp';

  SELECT product_category_id INTO v_cat_base      FROM public.product_categories WHERE category_slug = 'base_formulas';
  SELECT product_category_id INTO v_cat_advanced  FROM public.product_categories WHERE category_slug = 'advanced_formulas';
  SELECT product_category_id INTO v_cat_womens    FROM public.product_categories WHERE category_slug = 'womens_health';
  SELECT product_category_id INTO v_cat_childrens FROM public.product_categories WHERE category_slug = 'childrens_methylated';
  SELECT product_category_id INTO v_cat_snp       FROM public.product_categories WHERE category_slug = 'snp_support';

  -- ── Base Formulas: MethylB Complete+ ─────────────────────────────────────
  UPDATE public.products
     SET brand_id              = COALESCE(brand_id, v_viacura_id),
         product_category_id   = COALESCE(product_category_id, v_cat_base),
         serving_count         = COALESCE(serving_count, 60),
         serving_unit          = COALESCE(serving_unit, 'capsules'),
         dose_per_serving_text = COALESCE(dose_per_serving_text, '75 mg / cap')
   WHERE name ILIKE '%MethylB Complete%' OR name ILIKE '%Methyl B Complete%';

  -- ── Advanced Formulas: Creatine HCL+ (silver + copper/green) ────────────
  UPDATE public.products
     SET brand_id                        = COALESCE(brand_id, v_viacura_id),
         product_category_id             = COALESCE(product_category_id, v_cat_advanced),
         serving_count                   = COALESCE(serving_count, 60),
         serving_unit                    = COALESCE(serving_unit, 'scoops'),
         dose_per_serving_text           = COALESCE(dose_per_serving_text, '5 g / serving'),
         sku_bottle_color_primary_hex    = COALESCE(sku_bottle_color_primary_hex, '#C0C0C0'),
         sku_typography_primary_hex      = COALESCE(sku_typography_primary_hex, '#B75E18'),
         sku_typography_secondary_hex    = COALESCE(sku_typography_secondary_hex, '#1F5F3F'),
         sku_accent_color_hex            = COALESCE(sku_accent_color_hex, '#1F5F3F'),
         sku_dd_mark_primary_hex         = COALESCE(sku_dd_mark_primary_hex, '#B75E18'),
         sku_dd_mark_outline_hex         = COALESCE(sku_dd_mark_outline_hex, '#1F5F3F')
   WHERE name ILIKE '%Creatine HCL%';

  -- ── Advanced Formulas: Rise+ (champagne + burgundy/near-black) ──────────
  UPDATE public.products
     SET brand_id                        = COALESCE(brand_id, v_viacura_id),
         product_category_id             = COALESCE(product_category_id, v_cat_advanced),
         serving_count                   = COALESCE(serving_count, 60),
         serving_unit                    = COALESCE(serving_unit, 'capsules'),
         dose_per_serving_text           = COALESCE(dose_per_serving_text, '865 mg / cap'),
         sku_bottle_color_primary_hex    = COALESCE(sku_bottle_color_primary_hex, '#F3E6C9'),
         sku_typography_primary_hex      = COALESCE(sku_typography_primary_hex, '#7A1F2B'),
         sku_typography_secondary_hex    = COALESCE(sku_typography_secondary_hex, '#111111'),
         sku_accent_color_hex            = COALESCE(sku_accent_color_hex, '#7A1F2B'),
         sku_dd_mark_primary_hex         = COALESCE(sku_dd_mark_primary_hex, '#7A1F2B'),
         sku_dd_mark_outline_hex         = COALESCE(sku_dd_mark_outline_hex, '#111111')
   WHERE name ILIKE 'Rise+%' OR name = 'Rise+';

  -- ── Advanced Formulas: Replenish NAD+ (icy blue + royal blue/deep navy) ─
  UPDATE public.products
     SET brand_id                        = COALESCE(brand_id, v_viacura_id),
         product_category_id             = COALESCE(product_category_id, v_cat_advanced),
         serving_count                   = COALESCE(serving_count, 60),
         serving_unit                    = COALESCE(serving_unit, 'capsules'),
         dose_per_serving_text           = COALESCE(dose_per_serving_text, '740 mg / cap'),
         sku_bottle_color_primary_hex    = COALESCE(sku_bottle_color_primary_hex, '#CCE6F4'),
         sku_typography_primary_hex      = COALESCE(sku_typography_primary_hex, '#1D4E9A'),
         sku_typography_secondary_hex    = COALESCE(sku_typography_secondary_hex, '#0A2745'),
         sku_accent_color_hex            = COALESCE(sku_accent_color_hex, '#1D4E9A'),
         sku_dd_mark_primary_hex         = COALESCE(sku_dd_mark_primary_hex, '#1D4E9A'),
         sku_dd_mark_outline_hex         = COALESCE(sku_dd_mark_outline_hex, '#0A2745')
   WHERE name ILIKE '%Replenish NAD%' OR name ILIKE '%NAD+%';

  -- ── Women's Health: Desire+ (single-palette category) ────────────────────
  UPDATE public.products
     SET brand_id              = COALESCE(brand_id, v_viacura_id),
         product_category_id   = COALESCE(product_category_id, v_cat_womens),
         serving_count         = COALESCE(serving_count, 60),
         serving_unit          = COALESCE(serving_unit, 'capsules'),
         dose_per_serving_text = COALESCE(dose_per_serving_text, '500 mg / cap')
   WHERE name ILIKE 'Desire+%' OR name = 'Desire+';

  -- ── SNP Support Formulations: MTHFR Support+ ────────────────────────────
  UPDATE public.products
     SET brand_id              = COALESCE(brand_id, v_viacura_snp_id),
         product_category_id   = COALESCE(product_category_id, v_cat_snp),
         serving_count         = COALESCE(serving_count, 60),
         serving_unit          = COALESCE(serving_unit, 'capsules'),
         dose_per_serving_text = COALESCE(dose_per_serving_text, '985 mg / cap')
   WHERE name ILIKE '%MTHFR Support%';

  -- ── Children's Methylated Formulas: Sproutables Children's+ ─────────────
  UPDATE public.products
     SET brand_id              = COALESCE(brand_id, v_sproutables_id),
         product_category_id   = COALESCE(product_category_id, v_cat_childrens),
         serving_count         = COALESCE(serving_count, 120),
         serving_unit          = COALESCE(serving_unit, 'gummies'),
         dose_per_serving_text = COALESCE(dose_per_serving_text, '95 mg / 2 gummies')
   WHERE name ILIKE '%Sproutables%' OR name ILIKE '%Children''s Methylated%';
END $$;
