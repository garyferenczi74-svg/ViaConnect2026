-- Prompt #142d follow-up: deactivate NeuroAxis+ card per Gary 2026-05-01.
--
-- Gary directive: "remove NeuroAxis+ Card off Advanced Formulas. I will
-- add it at a later date."
--
-- Soft-deactivation via active=false is preferred over DELETE since Gary
-- intends to reactivate. Row preserves: ingredients (17 from canonical),
-- image_urls (just set in 20260501130000), description, summary, slug,
-- price (0 placeholder), price_msrp (NULL pending). Reactivation is a
-- one-line UPDATE active=true when Gary signals ready.
--
-- Net advanced-formulas active count post-deactivation: 17 (was 18).
-- The card hides from PLP since the shop query filters active=true.
--
-- Idempotent: WHERE active=true guard ensures re-run no-op.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
BEGIN
    WITH updated AS (
        UPDATE public.products
        SET active = false
        WHERE sku = 'FC-NEUROAXIS-001'
          AND active = true
          AND category != 'peptide'
        RETURNING id, sku, name, category_slug
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, '142_neuroaxis_deactivate', 'products', sku, id,
        jsonb_build_object(
            'column', 'active',
            'method', 'soft_deactivate_neuroaxis_per_gary_directive',
            'audit_mode', 'force',
            'old_value', true,
            'new_value', false,
            'rule_applied', '142_neuroaxis_deactivate',
            'product_name', name,
            'category_slug', category_slug,
            'authority', 'Gary canonical 2026-05-01 remove NeuroAxis+ card from PLP add later',
            'note', 'Soft-deactivate; row preserved with all data including image_urls; reactivation is single UPDATE active=true when ready'
        )
    FROM updated;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    RAISE NOTICE '142 neuroaxis deactivate: updated=% run_id=%', v_count, v_run_id;
END $$;
