-- Prompt #142 v3 Phase I: canonical brand-name normalization for testing kits.
--
-- Gary canonical 2026-04-30 (in response to v3 §9 Q5/Q6 surface):
-- the correct testing kit brand names are:
--   PeptideIQ    (production currently "PeptidesIQ")
--   EpigenDX     (production currently "EpiGenDX")
--   GenXM        (production currently "GeneXM")
--   CannabisIQ   (matches; no change)
--
-- Q5 + Q6 resolved Option A: PeptideIQ + CannabisIQ keep at category_slug
-- 'genex360' and ship in testing PLP at launch. Brand-naming audit
-- piggy-backed on the same decision since divergences surfaced together.
--
-- Per #142 v3 §0 hard rule 7 (idempotent by default), these are FORCE
-- overwrite operations; existing values get replaced. audit_mode='force'.
--
-- Slug recomputation:
--   PeptidesIQ -> PeptideIQ : peptidesiq -> peptideiq
--   EpiGenDX   -> EpigenDX  : epigendx   -> epigendx (no change; lower equal)
--   GeneXM     -> GenXM     : genexm     -> genxm
--
-- Downstream text reference: FC-CUSTOM-VIT-001 30 Day Custom Vitamin
-- Package summary contains the literal "GeneXM" (Phase C.1 direct seed
-- from #141b §12.1). Updated to "GenXM" in the same migration.
--
-- Image URL recheck: existing image_urls reference legacy filenames in
-- the Products bucket (PeptidesIQ Genetic..., GenexM Genetic..., EpiGenDX
-- Biological..., CannabisIQ.png). Filename strings are not a public brand
-- surface (they sit behind img src) so URLs are NOT updated here. Gary
-- decides whether to rename uploaded files to match canonical brand and
-- update image_urls in a follow-up. Audit log flags this as
-- pending_image_filename_review.
--
-- Defensive: WHERE category != 'peptide' on every UPDATE.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pass integer;
BEGIN
    -- FC-TEST-PEPTIDES-001 PeptidesIQ -> PeptideIQ
    WITH updated AS (
        UPDATE public.products
        SET
            name = 'PeptideIQ',
            short_name = 'PeptideIQ',
            slug = 'peptideiq'
        WHERE sku = 'FC-TEST-PEPTIDES-001'
          AND name = 'PeptidesIQ'
          AND category != 'peptide'
        RETURNING id, sku
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id, 'phase_i_canonical_brand_names', 'products', sku, id,
        jsonb_build_object(
            'columns', jsonb_build_array('name', 'short_name', 'slug'),
            'method', 'v3_canonical_brand_rename',
            'audit_mode', 'force',
            'old_name', 'PeptidesIQ',
            'new_name', 'PeptideIQ',
            'old_slug', 'peptidesiq',
            'new_slug', 'peptideiq',
            'authority', 'Gary canonical 2026-04-30',
            'pending_image_filename_review', true
        )
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT;
    v_count := v_count + v_pass;

    -- FC-TEST-EPIGEN-001 EpiGenDX -> EpigenDX (slug unchanged; lowercase identical)
    WITH updated AS (
        UPDATE public.products
        SET
            name = 'EpigenDX',
            short_name = 'EpigenDX'
        WHERE sku = 'FC-TEST-EPIGEN-001'
          AND name = 'EpiGenDX'
          AND category != 'peptide'
        RETURNING id, sku
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id, 'phase_i_canonical_brand_names', 'products', sku, id,
        jsonb_build_object(
            'columns', jsonb_build_array('name', 'short_name'),
            'method', 'v3_canonical_brand_rename',
            'audit_mode', 'force',
            'old_name', 'EpiGenDX',
            'new_name', 'EpigenDX',
            'slug_unchanged', 'epigendx',
            'authority', 'Gary canonical 2026-04-30',
            'pending_image_filename_review', true
        )
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT;
    v_count := v_count + v_pass;

    -- FC-TEST-METH-001 GeneXM -> GenXM
    WITH updated AS (
        UPDATE public.products
        SET
            name = 'GenXM',
            short_name = 'GenXM',
            slug = 'genxm'
        WHERE sku = 'FC-TEST-METH-001'
          AND name = 'GeneXM'
          AND category != 'peptide'
        RETURNING id, sku
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id, 'phase_i_canonical_brand_names', 'products', sku, id,
        jsonb_build_object(
            'columns', jsonb_build_array('name', 'short_name', 'slug'),
            'method', 'v3_canonical_brand_rename',
            'audit_mode', 'force',
            'old_name', 'GeneXM',
            'new_name', 'GenXM',
            'old_slug', 'genexm',
            'new_slug', 'genxm',
            'authority', 'Gary canonical 2026-04-30',
            'pending_image_filename_review', true
        )
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT;
    v_count := v_count + v_pass;

    -- FC-CUSTOM-VIT-001 summary text reference GeneXM -> GenXM
    WITH updated AS (
        UPDATE public.products
        SET summary = replace(summary, 'GeneXM', 'GenXM')
        WHERE sku = 'FC-CUSTOM-VIT-001'
          AND summary LIKE '%GeneXM%'
          AND category != 'peptide'
        RETURNING id, sku, summary
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id, 'phase_i_canonical_brand_names', 'products', sku, id,
        jsonb_build_object(
            'columns', jsonb_build_array('summary'),
            'method', 'v3_canonical_brand_text_reference_update',
            'audit_mode', 'force',
            'pattern', 'GeneXM',
            'replacement', 'GenXM',
            'authority', 'cascading rename from FC-TEST-METH-001',
            'final_summary', summary
        )
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT;
    v_count := v_count + v_pass;

    RAISE NOTICE 'Phase I canonical brand rename: rows updated=%; run_id=%',
        v_count, v_run_id;
END $$;
