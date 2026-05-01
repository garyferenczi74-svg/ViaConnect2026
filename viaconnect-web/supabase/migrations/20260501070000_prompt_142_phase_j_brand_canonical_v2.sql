-- Prompt #142 v3 Phase J: brand canonical correction (supersedes Phase I).
--
-- Gary delivered the authoritative canonical product name list 2026-04-30
-- (in response to bucket-filename clarification request). The list:
--   GeneXM(TM)
--   NutrigenDX(TM)
--   HormoneIQ(TM)
--   GeneX360(TM)
--   EpiGenDX
--   30 Day Custom Methylation Based Vitamin Formulations
--   PeptidesIQ(TM)
--   CannabisIQ(TM)
--
-- This list reverses parts of Phase I (which removed letters and changed
-- capitalization based on an earlier informal note) plus adds (TM) where
-- canonical plus renames two products entirely:
--   NutragenHQ                    -> NutrigenDX(TM)
--   30 Day Custom Vitamin Package -> 30 Day Custom Methylation Based Vitamin Formulations
--
-- Required transitions per Gary canonical:
--   sku                       current             canonical
--   FC-TEST-PEPTIDES-001      PeptideIQ           PeptidesIQ(TM)
--   FC-TEST-EPIGEN-001        EpigenDX            EpiGenDX
--   FC-TEST-METH-001          GenXM               GeneXM(TM)
--   FC-TEST-CANNABIS-001      CannabisIQ          CannabisIQ(TM)
--   FC-TEST-NUTR-001          NutragenHQ          NutrigenDX(TM)
--   FC-TEST-DUTCH-001         HormoneIQ           HormoneIQ(TM)
--   FC-TEST-COMBO-001         GeneX360            GeneX360(TM)
--   FC-CUSTOM-VIT-001         30 Day Custom Vitamin Package
--                                                 30 Day Custom Methylation Based Vitamin Formulations
--
-- Slug recomputation (lowercase + (TM) strip + spaces to hyphens):
--   peptideiq                            -> peptidesiq
--   epigendx                             -> epigendx (no change)
--   genxm                                -> genexm
--   cannabisiq                           -> cannabisiq (no change)
--   nutragenhq                           -> nutrigendx
--   hormoneiq                            -> hormoneiq (no change)
--   genex360                             -> genex360 (no change)
--   30-day-custom-vitamin-package        -> 30-day-custom-methylation-based-vitamin-formulations
--
-- Cascading text refs:
--   FC-CUSTOM-VIT-001 summary contains "GenXM" (Phase I cascade) which
--   needs revert to "GeneXM(TM)" matching the new canonical.
--
-- Image URL recheck:
--   image_urls already point at filenames with old/long-form names
--   (PeptidesIQ Genetic..., GenexM Genetic..., EpiGenDX Biological...,
--   HormoneIQ Genetic..., NutrigenDX Genetic..., 30 Day Custom Vitamin
--   Package.png, CannabisIQ.png, GeneX360.png). Filenames sit behind
--   img src and are not surfaced as brand text. Gary confirmed bucket
--   files are renamed/updated 2026-04-30; storage.objects view may lag.
--   image_urls UNTOUCHED here; bucket repoint deferred until storage
--   view confirms canonical filenames.
--
-- audit_mode='force_v3_canonical_brand_correction' since these are
-- explicit overwrites of values set by Phase I (which itself was a
-- force overwrite of the legacy values).

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pass integer;
BEGIN
    -- FC-TEST-PEPTIDES-001 PeptideIQ -> PeptidesIQ(TM)
    WITH updated AS (
        UPDATE public.products
        SET name = 'PeptidesIQ' || E'™',
            short_name = 'PeptidesIQ' || E'™',
            slug = 'peptidesiq'
        WHERE sku = 'FC-TEST-PEPTIDES-001'
          AND category != 'peptide'
        RETURNING id, sku
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_j_brand_canonical_v2', 'products', sku, id,
        jsonb_build_object(
            'columns', jsonb_build_array('name', 'short_name', 'slug'),
            'method', 'v3_canonical_brand_correction',
            'audit_mode', 'force_v3_canonical_brand_correction',
            'phase_i_value', 'PeptideIQ',
            'canonical_value', 'PeptidesIQ' || E'™',
            'old_slug', 'peptideiq',
            'new_slug', 'peptidesiq',
            'authority', 'Gary canonical 2026-04-30 (supersedes Phase I)'
        )
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    -- FC-TEST-EPIGEN-001 EpigenDX -> EpiGenDX (revert capitalization, no (TM))
    WITH updated AS (
        UPDATE public.products
        SET name = 'EpiGenDX',
            short_name = 'EpiGenDX'
        WHERE sku = 'FC-TEST-EPIGEN-001'
          AND category != 'peptide'
        RETURNING id, sku
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_j_brand_canonical_v2', 'products', sku, id,
        jsonb_build_object(
            'columns', jsonb_build_array('name', 'short_name'),
            'method', 'v3_canonical_brand_correction',
            'audit_mode', 'force_v3_canonical_brand_correction',
            'phase_i_value', 'EpigenDX',
            'canonical_value', 'EpiGenDX',
            'slug_unchanged', 'epigendx',
            'tm_status', 'no_trademark_per_canonical',
            'authority', 'Gary canonical 2026-04-30 (supersedes Phase I)'
        )
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    -- FC-TEST-METH-001 GenXM -> GeneXM(TM)
    WITH updated AS (
        UPDATE public.products
        SET name = 'GeneXM' || E'™',
            short_name = 'GeneXM' || E'™',
            slug = 'genexm'
        WHERE sku = 'FC-TEST-METH-001'
          AND category != 'peptide'
        RETURNING id, sku
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_j_brand_canonical_v2', 'products', sku, id,
        jsonb_build_object(
            'columns', jsonb_build_array('name', 'short_name', 'slug'),
            'method', 'v3_canonical_brand_correction',
            'audit_mode', 'force_v3_canonical_brand_correction',
            'phase_i_value', 'GenXM',
            'canonical_value', 'GeneXM' || E'™',
            'old_slug', 'genxm',
            'new_slug', 'genexm',
            'authority', 'Gary canonical 2026-04-30 (supersedes Phase I)'
        )
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    -- FC-TEST-CANNABIS-001 CannabisIQ -> CannabisIQ(TM)
    WITH updated AS (
        UPDATE public.products
        SET name = 'CannabisIQ' || E'™',
            short_name = 'CannabisIQ' || E'™'
        WHERE sku = 'FC-TEST-CANNABIS-001'
          AND category != 'peptide'
        RETURNING id, sku
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_j_brand_canonical_v2', 'products', sku, id,
        jsonb_build_object(
            'columns', jsonb_build_array('name', 'short_name'),
            'method', 'v3_canonical_brand_tm_addition',
            'audit_mode', 'force_v3_canonical_brand_correction',
            'old_value', 'CannabisIQ',
            'canonical_value', 'CannabisIQ' || E'™',
            'slug_unchanged', 'cannabisiq',
            'authority', 'Gary canonical 2026-04-30'
        )
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    -- FC-TEST-NUTR-001 NutragenHQ -> NutrigenDX(TM)
    WITH updated AS (
        UPDATE public.products
        SET name = 'NutrigenDX' || E'™',
            short_name = 'NutrigenDX' || E'™',
            slug = 'nutrigendx'
        WHERE sku = 'FC-TEST-NUTR-001'
          AND category != 'peptide'
        RETURNING id, sku
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_j_brand_canonical_v2', 'products', sku, id,
        jsonb_build_object(
            'columns', jsonb_build_array('name', 'short_name', 'slug'),
            'method', 'v3_canonical_brand_full_rename',
            'audit_mode', 'force_v3_canonical_brand_correction',
            'old_name', 'NutragenHQ',
            'canonical_value', 'NutrigenDX' || E'™',
            'old_slug', 'nutragenhq',
            'new_slug', 'nutrigendx',
            'authority', 'Gary canonical 2026-04-30 full brand rename'
        )
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    -- FC-TEST-DUTCH-001 HormoneIQ -> HormoneIQ(TM)
    WITH updated AS (
        UPDATE public.products
        SET name = 'HormoneIQ' || E'™',
            short_name = 'HormoneIQ' || E'™'
        WHERE sku = 'FC-TEST-DUTCH-001'
          AND category != 'peptide'
        RETURNING id, sku
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_j_brand_canonical_v2', 'products', sku, id,
        jsonb_build_object(
            'columns', jsonb_build_array('name', 'short_name'),
            'method', 'v3_canonical_brand_tm_addition',
            'audit_mode', 'force_v3_canonical_brand_correction',
            'old_value', 'HormoneIQ',
            'canonical_value', 'HormoneIQ' || E'™',
            'slug_unchanged', 'hormoneiq',
            'authority', 'Gary canonical 2026-04-30'
        )
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    -- FC-TEST-COMBO-001 GeneX360 -> GeneX360(TM)
    WITH updated AS (
        UPDATE public.products
        SET name = 'GeneX360' || E'™',
            short_name = 'GeneX360' || E'™'
        WHERE sku = 'FC-TEST-COMBO-001'
          AND category != 'peptide'
        RETURNING id, sku
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_j_brand_canonical_v2', 'products', sku, id,
        jsonb_build_object(
            'columns', jsonb_build_array('name', 'short_name'),
            'method', 'v3_canonical_brand_tm_addition',
            'audit_mode', 'force_v3_canonical_brand_correction',
            'old_value', 'GeneX360',
            'canonical_value', 'GeneX360' || E'™',
            'slug_unchanged', 'genex360',
            'authority', 'Gary canonical 2026-04-30'
        )
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    -- FC-CUSTOM-VIT-001 30 Day Custom Vitamin Package -> 30 Day Custom Methylation Based Vitamin Formulations
    WITH updated AS (
        UPDATE public.products
        SET name = '30 Day Custom Methylation Based Vitamin Formulations',
            short_name = '30 Day Custom Methylation Based Vitamin Formulations',
            slug = '30-day-custom-methylation-based-vitamin-formulations',
            summary = replace(summary, 'GenXM', 'GeneXM' || E'™')
        WHERE sku = 'FC-CUSTOM-VIT-001'
          AND category != 'peptide'
        RETURNING id, sku, summary
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_j_brand_canonical_v2', 'products', sku, id,
        jsonb_build_object(
            'columns', jsonb_build_array('name', 'short_name', 'slug', 'summary'),
            'method', 'v3_canonical_brand_full_rename_with_text_cascade',
            'audit_mode', 'force_v3_canonical_brand_correction',
            'old_name', '30 Day Custom Vitamin Package',
            'canonical_name', '30 Day Custom Methylation Based Vitamin Formulations',
            'old_slug', '30-day-custom-vitamin-package',
            'new_slug', '30-day-custom-methylation-based-vitamin-formulations',
            'summary_text_ref', 'GenXM -> GeneXM(TM) (cascading from FC-TEST-METH-001)',
            'authority', 'Gary canonical 2026-04-30 full brand rename plus cascade',
            'final_summary', summary
        )
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    RAISE NOTICE 'Phase J brand canonical v2: rows updated=% / 8 expected; run_id=%',
        v_count, v_run_id;
END $$;
