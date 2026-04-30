-- Prompt #142 v2 Phase C.1: seed the 22 T3 deferred summaries.
--
-- Phase C deferred 22 rows where products.description was NULL or < 30
-- chars. Pre-flight confirmed:
--   - 20 SNP support products (ACAT+ through VDR+) each have a
--     name-sibling row in products that already received a summary in
--     Phase C T1 (the genetic+snp parallel-collapse dupes from #142a;
--     one row inherited the catalog short_description, the other did
--     not). Self-copy from sibling is the cleanest path.
--   - 2 standalone rows (30 Day Custom Vitamin Package, ThyroCalm-G+)
--     have no name-sibling. Seeded from #141b §12 canonical Short
--     Descriptions, truncated at word boundary near 320 chars to fit
--     the line-clamp ceiling.
--
-- Marshall scan posture: same as Phase C. The self-copy path re-uses
-- already-live catalog content (zero new copy). The direct-seed path
-- uses #141b §12 finalized editorial copy, presumed Marshall-clear at
-- the time the spec was authored. Strict re-scan deferred to Q1
-- resolution.
--
-- Truncation rule: Phase C's word-boundary regex applied to the 2
-- direct-seed texts since both exceed 320 chars in their full §12 form.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_self_copy_count integer;
    v_seed_count integer;

    -- Canonical texts from #141b §12, full versions (will be truncated
    -- to 320 chars at word boundary if needed).
    v_30day_text text := 'Custom 30 day supply of methylation-based vitamins formulated specifically for your GeneXM methylation panel results. Each daily packet is dispensed by variant-priority logic from the ViaCura SNP support library, accounting for homozygous versus heterozygous status and pathway interaction effects. Replaces the guesswork of self-stacking individual SNP support products with a clinically-sequenced 30 day intervention.';

    v_thyrocalm_text text := 'Comprehensive thyroid support formulation combining selenium, zinc, iodine (kelp), tyrosine, ashwagandha, guggul, and the methylation cofactors required for thyroid hormone synthesis and conversion. ThyroCalm-G+ supports both thyroid hormone production (T4) and the peripheral T4-to-T3 conversion that determines whether thyroid hormone actually reaches metabolically active form.';
BEGIN
    -- Self-copy from name-sibling for the 20 SNP T3 rows
    WITH sibling_summaries AS (
        SELECT DISTINCT ON (name) name, summary
        FROM public.products
        WHERE summary IS NOT NULL
          AND summary <> ''
          AND category != 'peptide'
        ORDER BY name, length(summary) DESC
    ),
    updated AS (
        UPDATE public.products p
        SET summary = s.summary
        FROM sibling_summaries s
        WHERE p.name = s.name
          AND p.summary IS NULL
          AND p.category != 'peptide'
        RETURNING p.id, p.sku, p.name, s.summary AS new_summary
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_c1_summary_seed',
        'products',
        u.sku,
        u.id,
        jsonb_build_object(
            'column', 'summary',
            'method', 'self_copy_from_name_sibling',
            'source', 'products.summary (T1 row of same name from Phase C)',
            'final_length', length(u.new_summary),
            'product_name', u.name
        )
    FROM updated u;
    GET DIAGNOSTICS v_self_copy_count = ROW_COUNT;

    -- Direct seed: 30 Day Custom Vitamin Package (truncate at word boundary if >320)
    UPDATE public.products
    SET summary = CASE
        WHEN length(v_30day_text) <= 320 THEN v_30day_text
        ELSE rtrim(regexp_replace(substring(v_30day_text from 1 for 320), '\s+\S*$', ''))
    END
    WHERE sku = 'FC-CUSTOM-VIT-001'
      AND summary IS NULL;

    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_c1_summary_seed',
        'products',
        'FC-CUSTOM-VIT-001',
        id,
        jsonb_build_object(
            'column', 'summary',
            'method', 'direct_seed_from_141b_section_12_1',
            'source', '#141b §12.1 30 Day Custom Methylation Vitamin Pack canonical Short Description',
            'source_full_length', length(v_30day_text),
            'final_length', length(summary),
            'truncated', length(v_30day_text) > 320,
            'product_name', name
        )
    FROM public.products
    WHERE sku = 'FC-CUSTOM-VIT-001';

    -- Direct seed: ThyroCalm-G+
    UPDATE public.products
    SET summary = CASE
        WHEN length(v_thyrocalm_text) <= 320 THEN v_thyrocalm_text
        ELSE rtrim(regexp_replace(substring(v_thyrocalm_text from 1 for 320), '\s+\S*$', ''))
    END
    WHERE sku = 'FC-THYROCALM-G-001'
      AND summary IS NULL;

    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_c1_summary_seed',
        'products',
        'FC-THYROCALM-G-001',
        id,
        jsonb_build_object(
            'column', 'summary',
            'method', 'direct_seed_from_141b_section_12_3',
            'source', '#141b §12.3 ThyroCalm-G+ canonical Short Description',
            'source_full_length', length(v_thyrocalm_text),
            'final_length', length(summary),
            'truncated', length(v_thyrocalm_text) > 320,
            'product_name', name
        )
    FROM public.products
    WHERE sku = 'FC-THYROCALM-G-001';

    v_seed_count := 2;

    RAISE NOTICE 'Phase C.1 summary seed: self_copy=%, direct_seed=%; run_id=%',
        v_self_copy_count, v_seed_count, v_run_id;
END $$;
