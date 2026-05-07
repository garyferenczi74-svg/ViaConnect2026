-- Prompt #152w.0.1: Inferno+ product_type NULL -> 'supplement' fix.
--
-- BUG: Inferno+ Natural Metabolic Activator Complex card not appearing
-- in /shop/base-formulations PLP grid despite live row having
-- active=true, category_slug='base-formulations', and category=
-- 'supplement'.
--
-- ROOT CAUSE: getProductsByCategory query (src/lib/shop/queries.ts:104)
-- uses .not('product_type', 'eq', 'peptide') which translates to SQL
-- "product_type != 'peptide'". When product_type IS NULL, this
-- predicate evaluates to NULL (not TRUE), so PostgreSQL filters out
-- the row. All 8 OTHER base-formulations products have
-- product_type='supplement' and pass the filter; Inferno+ alone has
-- product_type=NULL and is filtered out.
--
-- FIX: set product_type='supplement' on Inferno+ to match the rest of
-- the base-formulations cohort. This is a data-only correction;
-- nothing else changes.
--
-- Idempotent: WHERE clause includes "product_type IS NULL" so re-run
-- after the column is set is a no-op.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'inferno-plus-natural-metabolic-activator'
      AND p.sku = 'FC-INFERNO-001'
      AND p.product_type IS NULL;

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152w.0.1 Inferno+ product_type fix skipped: row not found OR product_type already populated (idempotent no-op)';
        RETURN;
    END IF;

    UPDATE public.products
    SET product_type = 'supplement'
    WHERE id = v_product_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    SELECT to_jsonb(p) INTO v_post_row FROM public.products p WHERE p.id = v_product_id;

    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    VALUES (
        v_run_id,
        '152w.0.1_inferno_plus_product_type_fix',
        'products',
        'FC-INFERNO-001',
        v_product_id,
        jsonb_build_object(
            'method', 'product_type_null_fix_post_152w_PDP_ship',
            'columns', jsonb_build_array('product_type'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'plp_filter_compliance_product_type_not_peptide',
            'authority', 'Gary 2026-05-07: bug report Inferno card is not showing in Base Formulations after #152w PDP description ship',
            'root_cause', 'getProductsByCategory query in src/lib/shop/queries.ts:104 uses .not(product_type, eq, peptide) which translates to SQL product_type != peptide. When product_type IS NULL the predicate evaluates to NULL (not TRUE) and PostgreSQL filters out the row. Inferno+ alone in base-formulations cohort had product_type=NULL.',
            'fix', 'Set product_type=supplement to match the 8 other base-formulations products (Amino Acid Matrix+, BHB Ketone Salts, Electrolyte Blend, Magnesium Synergy Matrix, MethylB Complete+, NeuroCalm+, Omega-3 DHA EPA Algal, ToxiBind Matrix all already at product_type=supplement)',
            'change_summary', jsonb_build_object(
                'old_product_type', NULL,
                'new_product_type', 'supplement'
            ),
            'remaining_152w_followups', 'price_msrp NULL still pending 152w.1; master_sku NULL pending 152w.4; image_urls empty pending 152w.2; ingredients[] empty pending 152w.7. Card will render with CategoryFallbackImage gradient placeholder and $0.00 price until those follow-ups land. None of those gaps prevent card render once product_type is populated.'
        )
    );

    RAISE NOTICE '#152w.0.1 Inferno+ product_type fix: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
