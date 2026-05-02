-- Prompt #144 v2 follow-up: remove NeuroCalm BH4 Complex per Gary 2026-05-02.
--
-- Gary directive: "remove the Neurocalm BH4 from Base formulation. Leave
-- NeuroClam BH4+ (Advanced) where it is."
--
-- FC-NEUROCALM-001 (NeuroCalm BH4 Complex, slug neurocalm-bh4-complex) is
-- the canonical orphan flagged in #142d §8 OQ4 (no entry in
-- vc_master_formulations canonical export including v2 plus v2_rev1).
-- Production row had ingredients empty array since Phase D.5 had no
-- canonical to source from. The bucket file
-- supplement-photos/base-formulations/neurocalm-bh4-complex.png is
-- referenced by image_urls but exists in lowercase folder pattern that
-- does not resolve.
--
-- Hard delete (not soft-deactivate) since: (a) no canonical formulation
-- exists, (b) Gary's directive is unconditional remove with no add-later
-- signal contrary to NeuroAxis+ Phase L which got active=false, (c) the
-- separate NeuroCalm BH4+ (Advanced) FC-NEUROCALM2-001 covers the BH4
-- complex use case in advanced-formulas.
--
-- NeuroCalm BH4+ (Advanced) FC-NEUROCALM2-001 stays untouched in
-- advanced-formulas per Gary explicit directive "Leave NeuroClam BH4+
-- (Advanced) where it is".
-- NeuroCalm+ FC-CALM-001 stays untouched in base-formulations per the
-- prior memorialized canonical override.
--
-- Audit trail: full to_jsonb of deleted row captured in old_value for
-- rollback per #142c §0 hard rule 5 carry-forward.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
BEGIN
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, '144v2_remove_neurocalm_bh4_complex', 'products', sku, id,
        jsonb_build_object(
            'method', 'orphan_canonical_delete_per_gary_directive',
            'old_value', to_jsonb(p),
            'new_value', NULL,
            'rule_applied', '144v2_remove_neurocalm_bh4_complex',
            'audit_mode', 'force_destructive',
            'authority', 'Gary canonical 2026-05-02 remove NeuroCalm BH4 from Base formulation; not in vc_master_formulations_v2_rev1 canonical; #142d OQ4 resolution',
            'product_name', name,
            'product_slug', slug
        )
    FROM public.products p
    WHERE p.sku = 'FC-NEUROCALM-001'
      AND p.category != 'peptide'
      AND NOT EXISTS (
          SELECT 1 FROM public.backfill_audit ba
          WHERE ba.product_id = p.id
            AND ba.source_table = '144v2_remove_neurocalm_bh4_complex'
      );

    WITH deleted AS (
        DELETE FROM public.products
        WHERE sku = 'FC-NEUROCALM-001'
          AND category != 'peptide'
        RETURNING 1
    )
    SELECT count(*) INTO v_count FROM deleted;

    RAISE NOTICE '144v2 remove neurocalm bh4 complex: deleted=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
