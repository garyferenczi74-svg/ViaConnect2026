-- Prompt #144 v2 Phase 2: format-data corrections per Gary 2026-05-02.
--
-- Three rows in public.products had wrong format values from earlier
-- seeding passes. Gary specified the actual product forms 2026-05-02:
--
--   bhb-ketone-salts             powder -> capsule  (xlsx canonical also
--                                                    Scoop Powder; Gary
--                                                    correction supersedes)
--   electrolyte-blend            powder -> tablet   (xlsx canonical also
--                                                    Scoop Powder; Gary
--                                                    correction supersedes)
--   blast-plus-nitric-oxide-stack powder -> capsule (xlsx canonical
--                                                    already capsule;
--                                                    DB diverged via
--                                                    earlier seed bug)
--
-- Force overwrite (audit_mode=force) since these are explicit corrections
-- of pre-existing wrong values, not COALESCE fills. Per row backfill_audit
-- captures old_value (powder) plus new_value plus rule_applied
-- format_correction_144v2.
--
-- The xlsx canonical export gets a v2_rev1 sibling file at
-- scripts/144v2/ per #142 v3 §11 standing protocol; v2 is preserved
-- never modified.
--
-- Idempotent: WHERE format = 'powder' guard means re-runs are no-ops
-- once values match canonical.
--
-- Defensive: WHERE category != 'peptide' on every UPDATE.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pass integer;
BEGIN
    WITH updated AS (
        UPDATE public.products
        SET format = 'capsule'
        WHERE slug = 'bhb-ketone-salts'
          AND format = 'powder'
          AND category != 'peptide'
        RETURNING id, sku, name, slug
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, '144v2_format_corrections', 'products', sku, id,
        jsonb_build_object(
            'column', 'format',
            'method', 'format_correction_144v2',
            'audit_mode', 'force',
            'old_value', 'powder',
            'new_value', 'capsule',
            'rule_applied', 'format_correction_144v2',
            'product_name', name,
            'product_slug', slug,
            'authority', 'Gary canonical 2026-05-02 BHB Ketone Salts is capsule not powder'
        )
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    WITH updated AS (
        UPDATE public.products
        SET format = 'tablet'
        WHERE slug = 'electrolyte-blend'
          AND format = 'powder'
          AND category != 'peptide'
        RETURNING id, sku, name, slug
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, '144v2_format_corrections', 'products', sku, id,
        jsonb_build_object(
            'column', 'format',
            'method', 'format_correction_144v2',
            'audit_mode', 'force',
            'old_value', 'powder',
            'new_value', 'tablet',
            'rule_applied', 'format_correction_144v2',
            'product_name', name,
            'product_slug', slug,
            'authority', 'Gary canonical 2026-05-02 Electrolyte Blend is tablet not powder; tablet token added to #141 v3 allowed format set'
        )
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    WITH updated AS (
        UPDATE public.products
        SET format = 'capsule'
        WHERE slug = 'blast-plus-nitric-oxide-stack'
          AND format = 'powder'
          AND category != 'peptide'
        RETURNING id, sku, name, slug
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, '144v2_format_corrections', 'products', sku, id,
        jsonb_build_object(
            'column', 'format',
            'method', 'format_correction_144v2',
            'audit_mode', 'force',
            'old_value', 'powder',
            'new_value', 'capsule',
            'rule_applied', 'format_correction_144v2',
            'product_name', name,
            'product_slug', slug,
            'authority', 'Gary canonical 2026-05-02 BLAST plus is capsule; xlsx canonical already capsule, DB diverged via earlier seed bug'
        )
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    RAISE NOTICE '144v2 format corrections: rows updated=% / 3 expected; run_id=%', v_count, v_run_id;
END $$;
