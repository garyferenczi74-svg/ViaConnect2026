-- Prompt #152w.1: Inferno+ pricing population.
--
-- Closes 152w.1 follow-up per spec acceptance criterion 32 (pricing
-- deferred from #152w PDP ship). Gary provided MSRP $88.88 on
-- 2026-05-07.
--
-- MSRP: $88.88 (ends in .88 per Via Cura convention; sits between
-- $58.88 mid-tier and $98.88 top-tier base formulations like FLEX+).
-- Price set to match MSRP (no MAP discount applied at launch).
--
-- pricing_tier: L1 retained (matches all 8 other base-formulations
-- products in live data; tier shift not authorized in this scope).
--
-- IMPORTANT NAMING NOTE: Gary's source message identified the product
-- as "Inferno + GLP-1 Activator Complex". Live name in DB is
-- "Inferno+ Natural Metabolic Activator Complex" per #152w spec
-- explicit FDA-enforcement-risk reframing + Hannah pre-flight FIX 6
-- compression. This migration does NOT change the product name; only
-- price_msrp + price are touched. If Gary subsequently directs a
-- name revert to GLP-1 Activator naming, that would require a
-- separate decision against the standing rule "no GLP-1 booster /
-- natural Ozempic / pharmaceutical-class equivalence claims".
--
-- Idempotent: WHERE clause guards on price_msrp IS NULL.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_msrp numeric := 88.88;
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'inferno-plus-natural-metabolic-activator'
      AND p.sku = 'FC-INFERNO-001'
      AND p.price_msrp IS NULL;

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152w.1 Inferno+ pricing population skipped: row not found OR price_msrp already populated (idempotent no-op)';
        RETURN;
    END IF;

    UPDATE public.products
    SET price_msrp = v_msrp,
        price = v_msrp
    WHERE id = v_product_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    SELECT to_jsonb(p) INTO v_post_row FROM public.products p WHERE p.id = v_product_id;

    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    VALUES (
        v_run_id,
        '152w.1_inferno_plus_pricing_population',
        'products',
        'FC-INFERNO-001',
        v_product_id,
        jsonb_build_object(
            'method', 'price_population_152w_followup_1',
            'columns', jsonb_build_array('price_msrp', 'price'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'via_cura_pricing_convention_88_suffix',
            'authority', 'Gary 2026-05-07: Inferno + GLP-1 Activator Complex MSRP $88.88 (live name Inferno+ Natural Metabolic Activator Complex retained per #152w FDA reframing; only pricing touched in this migration)',
            'change_summary', jsonb_build_object(
                'old_price_msrp', NULL,
                'new_price_msrp', 88.88,
                'old_price', 0.00,
                'new_price', 88.88
            ),
            'pricing_position', 'sits between $58.88 mid-tier base formulations and $98.88 top-tier base formulations like FLEX+; pricing_tier L1 retained matching all 8 other base-formulations products',
            'naming_flag', 'Gary source message used GLP-1 Activator Complex naming; live retained as Natural Metabolic Activator Complex per #152w spec explicit FDA-enforcement-risk reframing + Hannah FIX 6; name change NOT applied in this migration; awaiting explicit Gary directive if revert intended',
            'remaining_152w_followups', '152w.4 master_sku NULL still pending; 152w.7 ingredients[] empty for JSONB reconciliation including BPC-157 Path A actual-identifier disclosure per FDA 21 CFR 101.36'
        )
    );

    RAISE NOTICE '#152w.1 Inferno+ pricing populated: rows updated=% / 1 expected; run_id=%; msrp=%', v_count, v_run_id, v_msrp;
END $$;
