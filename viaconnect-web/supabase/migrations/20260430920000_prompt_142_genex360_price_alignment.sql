-- Prompt #142 v2 spec-alignment patch: GeneX360 flagship price.
--
-- Per #141b working assumption A: the legacy "Combo Test" at $688.88 is
-- deprecated and replaced by the GeneX360 flagship at $1188.88 (6-panel
-- suite at ~30% bundle savings). Per #141b working assumption C:
-- wholesale = 50% off MSRP, distributor = 70% off MSRP.
--
-- After #142a + #142 v2 Phase A, the production state had:
--   master_skus sku='61' GeneX360: msrp=688.88, wholesale=344.44, distributor=206.66
--   products    sku='FC-TEST-COMBO-001' GeneX360: price_msrp=688.88 (pulled from master_skus via Phase A)
--
-- This migration brings both rows in line with the #141b spec.
--
-- New values:
--   msrp        : 688.88  -> 1188.88  (#141b §12.1 flagship MSRP)
--   wholesale   : 344.44  -> 594.44   (1188.88 * 0.50, working assumption C)
--   distributor : 206.66  -> 356.66   (1188.88 * 0.30, working assumption C; spec says 356.664, rounded to 356.66 to match the 2-decimal convention used elsewhere in master_skus)
--   dtc_margin  : recomputed from msrp + cogs
--   ws_margin   : recomputed from wholesale + cogs
--   dist_margin : recomputed from distributor + cogs
--   cogs_ratio  : recomputed from cogs + msrp
--
-- products.price (raw historical) is intentionally NOT updated; only
-- products.price_msrp tracks the current spec-aligned price. The raw
-- price column preserves the original load value as a permanent record.
--
-- Audit trail: writes 2 rows to backfill_audit (one per target table)
-- under a fresh run_id. Rollback restores the prior values via DELETE
-- + manual UPDATE referencing the columns_loaded jsonb old/new map.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
BEGIN
    -- Update master_skus row + recompute margins from updated msrp/wholesale/distributor
    UPDATE public.master_skus
    SET msrp = 1188.88,
        wholesale = 594.44,
        distributor = 356.66,
        dtc_margin = ROUND(((1188.88 - cogs) / 1188.88 * 100)::numeric, 1),
        ws_margin = ROUND(((594.44 - cogs) / 594.44 * 100)::numeric, 1),
        dist_margin = ROUND(((356.66 - cogs) / 356.66 * 100)::numeric, 1),
        cogs_ratio = ROUND((cogs / 1188.88 * 100)::numeric, 1),
        updated_at = now()
    WHERE sku = '61';

    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, columns_loaded
    )
    VALUES (
        v_run_id,
        'spec_alignment_141b_assumption_a',
        'master_skus',
        '61',
        jsonb_build_object(
            'reason', '#141b working assumption A: GeneX360 flagship $1188.88 (Combo Test deprecated)',
            'msrp', jsonb_build_object('old', 688.88, 'new', 1188.88),
            'wholesale', jsonb_build_object('old', 344.44, 'new', 594.44),
            'distributor', jsonb_build_object('old', 206.66, 'new', 356.66),
            'margins_recomputed', true
        )
    );

    -- Update products.price_msrp to match. products.price (historical raw)
    -- intentionally preserved.
    UPDATE public.products
    SET price_msrp = 1188.88
    WHERE sku = 'FC-TEST-COMBO-001';

    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'spec_alignment_141b_assumption_a',
        'products',
        'FC-TEST-COMBO-001',
        id,
        jsonb_build_object(
            'reason', '#141b working assumption A: GeneX360 flagship $1188.88',
            'price_msrp', jsonb_build_object('old', 688.88, 'new', 1188.88)
        )
    FROM public.products
    WHERE sku = 'FC-TEST-COMBO-001';

    RAISE NOTICE 'GeneX360 price alignment to $1188.88 complete; run_id=%', v_run_id;
END $$;
