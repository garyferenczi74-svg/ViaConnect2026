-- Prompt #142 v2 Phase E: data-derivable subset of admin-CSV phase.
--
-- Spec §3 Phase E classifies the remaining columns (snp_targets,
-- bioavailability_pct, status_tags, plus testing_meta in §F) as
-- "admin-only CSV import flow, out of scope for auto-backfill". This
-- migration ships the subset that IS data-derivable from existing
-- columns without manual input:
--
--   1. status_tags (data-derivable from category_slug per §4):
--        TIER 3 trigger fires when category_slug = 'advanced-formulas'
--        (per §4 table). Other triggers (NEW, BUNDLE, RX REQUIRED,
--        LIPOSOMAL, LIMITED) do not fire on current production data:
--        NEW would fire on all rows since the #142a load timestamps
--        are recent but semantically they are not new products, just
--        recently loaded; BUNDLE columns absent from schema; RX
--        REQUIRED requires_practitioner_order=true is false everywhere
--        per Phase A's deferred treatment; LIPOSOMAL format='liposomal'
--        zero rows (format is the delivery vehicle e.g. capsule, the
--        liposomal nature is in ingredient names not delivery form);
--        LIMITED columns absent from schema.
--
--   2. snp_targets (data-derivable from product name per #141b §12.5):
--        For category_slug='methylation-snp' rows, extract the leading
--        uppercase token via regex ^([A-Z][A-Z0-9]+) which captures
--        ACAT, ACHY, ADO, APOE, BHMT, CBS, COMT, CYP450, DAO, GST,
--        MAOA, MTHFR, MTR, MTRR, NAT, NOS, RFC1, SHMT, SOD, SUOX,
--        TCN2, VDR. Wrap in single-element jsonb array.
--
-- Out of scope (still admin CSV per spec):
--   - bioavailability_pct: clinical claim per product, not derivable
--   - testing_meta: explicit stub-only per spec §F (the 8 testing
--     kits already have testing_meta='{}'::jsonb default; Phase F
--     delivers a CSV stub for Gary to fill)
--
-- Defensive: idempotent on jsonb_array_length=0 guards, peptide
-- exclusion preserved (zero peptide rows currently).

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_status_count integer;
    v_snp_count integer;
BEGIN
    -- Pass 1: status_tags TIER 3 for advanced-formulas
    WITH updated AS (
        UPDATE public.products
        SET status_tags = jsonb_build_array('TIER 3')
        WHERE category != 'peptide'
          AND category_slug = 'advanced-formulas'
          AND (status_tags IS NULL OR jsonb_array_length(status_tags) = 0)
        RETURNING id, sku, name
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_e_data_derived',
        'products',
        u.sku,
        u.id,
        jsonb_build_object(
            'column', 'status_tags',
            'method', 'data_derived_tier_3',
            'value', jsonb_build_array('TIER 3'),
            'reason', 'category_slug=advanced-formulas per #142 v2 §4 TIER 3 trigger',
            'product_name', u.name
        )
    FROM updated u;
    GET DIAGNOSTICS v_status_count = ROW_COUNT;

    -- Pass 2: snp_targets gene extraction for methylation-snp
    WITH updated AS (
        UPDATE public.products
        SET snp_targets = jsonb_build_array(
            (regexp_match(name, '^([A-Z][A-Z0-9]+)'))[1]
        )
        WHERE category != 'peptide'
          AND category_slug = 'methylation-snp'
          AND (snp_targets IS NULL OR jsonb_array_length(snp_targets) = 0)
          AND regexp_match(name, '^([A-Z][A-Z0-9]+)') IS NOT NULL
        RETURNING id, sku, name, snp_targets
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_e_data_derived',
        'products',
        u.sku,
        u.id,
        jsonb_build_object(
            'column', 'snp_targets',
            'method', 'data_derived_gene_name_extract',
            'value', u.snp_targets,
            'regex', '^([A-Z][A-Z0-9]+)',
            'reason', 'leading uppercase token extracted as canonical SNP gene target',
            'product_name', u.name
        )
    FROM updated u;
    GET DIAGNOSTICS v_snp_count = ROW_COUNT;

    RAISE NOTICE 'Phase E data-derived: status_tags TIER 3=%, snp_targets gene=% rows; run_id=%',
        v_status_count, v_snp_count, v_run_id;
END $$;
