-- Prompt #152v.0: Pre-rename Histamine Relief Protocol ingredient #2 brand.
--
-- Per Gary 2026-05-06 four-decision lock-in ahead of formal #152v PDP
-- prompt. Of the four decisions (BPC-157 Hannah pre-flight, Digestzorb+
-- rename, distinct positioning vs DAO+, drift pattern continues), only
-- Decision 2 is data-actionable now; the rest are positioning notes for
-- when the formal #152v prompt arrives. This migration applies Decision
-- 2 ahead of #152v so the live JSONB ingredient name is canonical when
-- the PDP copy is drafted.
--
-- Change: ingredients[1].name (the second ingredient, 0-indexed at 1):
--   "Digestzorb Probiotic Blend (10B CFU)"
--   -> "Digestzorb+ Probiotic Blend (10B CFU)"
--
-- Critical sub-brand distinction (per Gary 2026-05-06):
--   * Digestzorb+ (lowercase z) = NEW probiotic sub-brand for this
--     Histamine Relief Protocol entry.
--   * DigestiZorb+ (mixed case, capital Z + lowercase i) = SEPARATE
--     enzyme product brand (FC-DIGEST-001 DigestiZorb+ Enzyme Complex,
--     shipped via #152q).
--   * The two sub-brands are intentionally distinct by capitalization.
--     Do NOT normalize the spellings to match. This is a deliberate
--     Via Cura branding architecture decision, not a typo.
--
-- BioB Fusion status: NOT renamed in this migration. Gary's Decision 2
-- only authorized the Digestzorb rename; "BioB Fusion Methylated B
-- Complex" stays in this product's JSONB despite portfolio-wide
-- "MethylB Complete+" branding elsewhere (Grow+ Pre-Natal #152t, GST+
-- Cellular Detox #152u). Cross-product naming reconciliation deferred
-- until Gary explicitly directs.
--
-- Live row state (verified 2026-05-06):
--   * id a14d... wait, id 481b174a-c656-405f-a61e-a960ff1c05ed
--   * slug histamine-relief-protocol, sku FC-HISTAMINE-001
--   * 15 ingredients in JSONB, totaling 657.4 mg per serving
--   * status_tags ["TIER 3"], category_slug advanced-formulas
--   * price_msrp $158.88, master_sku 24
--   * existing summary + description are 68-char placeholder
--     ("Multi-enzyme histamine clearance and mast cell stabilization
--     formula"); #152v will replace with rev2 structured copy.
--   * BPC-157 IS in live formulation at 0.2 mg (compliance-critical
--     for #152v PDP copy; Hannah pre-flight required per
--     feedback_clinical_preflight_pattern.md before drafting).
--   * Bioperine ® present in live JSONB.
--
-- This migration is INTENTIONALLY NARROW: only updates ingredients[1]
-- name. Does NOT touch summary, description, or any other field.
-- Does NOT begin the #152v PDP copy work. The full #152v formal prompt
-- will arrive separately and will bundle the description rewrite + any
-- other Lane 2 corrections (BPC-157 Hannah substitution, Bioperine®
-- preservation in bullet header, etc.) into one clean migration.
--
-- Idempotent on re-run: WHERE clause keys on slug AND sku AND
-- category != peptide; jsonb_set on a single array element is
-- idempotent (re-applying the same string yields the same JSONB).
-- backfill_audit gets a new row each run.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_old_ingredient_name text;
    v_new_ingredient_name text := 'Digestzorb+ Probiotic Blend (10B CFU)';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'histamine-relief-protocol'
      AND p.sku = 'FC-HISTAMINE-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152v.0 Histamine Relief Protocol Digestzorb+ rename skipped: row not found at slug histamine-relief-protocol / SKU FC-HISTAMINE-001';
        RETURN;
    END IF;

    v_old_ingredient_name := v_pre_row->'ingredients'->1->>'name';

    UPDATE public.products
    SET ingredients = jsonb_set(
        ingredients,
        '{1,name}',
        to_jsonb(v_new_ingredient_name)
    )
    WHERE id = v_product_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    SELECT to_jsonb(p) INTO v_post_row FROM public.products p WHERE p.id = v_product_id;

    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    VALUES (
        v_run_id,
        '152v.0_histamine_relief_protocol_digestzorb_plus_rename',
        'products',
        'FC-HISTAMINE-001',
        v_product_id,
        jsonb_build_object(
            'method', 'ingredient_brand_rename_pre_152v_formal_prompt',
            'columns', jsonb_build_array('ingredients[1].name'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'gary_decision_2_locked_2026_05_06_digestzorb_plus_subbrand_distinction',
            'authority', 'Gary 2026-05-06 four-decision pre-152v lock-in (item 2): rename ingredient #2 brand prefix to Digestzorb+ preserving lowercase z to intentionally distinguish from DigestiZorb+ Enzyme Complex (FC-DIGEST-001) mixed-case enzyme sub-brand',
            'change_summary', jsonb_build_object(
                'old_ingredient_name', v_old_ingredient_name,
                'new_ingredient_name', v_new_ingredient_name,
                'change_type', 'brand_prefix_rename',
                'preserved_descriptors', '"Probiotic Blend (10B CFU)" descriptor + CFU count preserved'
            ),
            'subbrand_distinction', 'Digestzorb+ (lowercase z) = probiotic sub-brand vs DigestiZorb+ (mixed case, capital Z + lowercase i) = enzyme sub-brand; deliberate Via Cura branding architecture per Gary',
            'biob_fusion_status', 'NOT renamed; Gary Decision 2 only authorized Digestzorb rename; BioB Fusion Methylated B Complex stays as-is in this product JSONB despite portfolio-wide MethylB Complete+ branding in Grow+ #152t + GST+ #152u; cross-product reconciliation deferred until Gary directs',
            'pre_152v_decisions_locked', jsonb_build_array(
                'Decision 1 BPC-157: PROCEED with Hannah pre-flight clinical review BEFORE drafting #152v PDP copy; BPC-157 stays in formulation but PDP public copy CANNOT name BPC-157 per Marshall scan rule; Hannah will substitute bullet to neutral mechanism language similar to 152t iodine pattern',
                'Decision 2 Digestzorb+ rename: APPLIED IN THIS MIGRATION',
                'Decision 3 cross-product positioning: Histamine Relief Protocol and DAO+ Histamine Balance are DIFFERENT products with distinct positioning; PDP must differentiate cleanly without merging',
                'Decision 4 drift pattern: PROCEED with established INSERT-to-UPDATE Lane 2 reconciliation pattern when #152v formal prompt arrives (6th consecutive drift expected after 152q + 152r + 152s + 152t + 152u)'
            ),
            'related_companion_product', 'DAO+ Histamine Balance (slug dao-plus-histamine-balance, sku 38, $108.88, methylation-snp tier, full PDP copy from #152n shipped 2026-05-04); Histamine Relief Protocol is the TIER 3 advanced complement at $158.88 advanced-formulas tier'
        )
    );

    RAISE NOTICE '#152v.0 Histamine Relief Protocol Digestzorb+ rename: rows updated=% / 1 expected; run_id=%; old=%; new=%', v_count, v_run_id, v_old_ingredient_name, v_new_ingredient_name;
END $$;
