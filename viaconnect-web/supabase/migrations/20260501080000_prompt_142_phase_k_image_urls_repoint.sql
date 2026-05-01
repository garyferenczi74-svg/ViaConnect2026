-- Prompt #142 v3 Phase K: image_urls repoint for all 8 GeneX360 category products.
--
-- Gary delivered the canonical image URLs 2026-04-30. Bucket migrated
-- from 'Products' (Phase D / D.1 destination) to
-- 'supplement-photos/GeneX360 Testing and Diagnostics/' subfolder.
-- All 8 testing/genex360 products get force-overwrite to canonical URL.
--
-- Bucket note: this is a deviation from the Phase D / D.1 'Products'
-- bucket pattern (and from the post-#110 memory that 'Products' was
-- canonical). Gary's canonical 2026-04-30 puts testing/genex360 imagery
-- under 'supplement-photos/GeneX360 Testing and Diagnostics/'. Memory
-- updated separately to reflect the dual-bucket reality.
--
-- Filename quirks (kept as Gary delivered):
--   FC-TEST-METH-001: bucket has GenexM.png (lowercase x) while product
--   name is GeneXM(TM) (uppercase X). Filename mismatch is bucket-side
--   only; not user-visible behind img src.
--
--   FC-CUSTOM-VIT-001: bucket retained legacy short filename
--   '30 Day Custom Vitamin Package.png' even after Phase J renamed the
--   product to '30 Day Custom Methylation Based Vitamin Formulations'.
--   Per Gary's URL list, this is intentional; filename does not need to
--   match canonical brand name since it sits behind img src.
--
-- audit_mode='force_v3_canonical_image_repoint' since this overwrites
-- existing image_urls values from Phase D / D.1.
--
-- Defensive: WHERE category != 'peptide' on every UPDATE.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pass integer;
    v_base_url text := 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/GeneX360%20Testing%20and%20Diagnostics/';
BEGIN
    -- FC-TEST-CANNABIS-001 -> CannabisIQ.png
    WITH updated AS (
        UPDATE public.products
        SET image_urls = jsonb_build_array(v_base_url || 'CannabisIQ.png')
        WHERE sku = 'FC-TEST-CANNABIS-001' AND category != 'peptide'
        RETURNING id, sku, image_urls
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_k_image_urls_repoint', 'products', sku, id,
        jsonb_build_object('column','image_urls','method','v3_canonical_image_repoint',
            'audit_mode','force_v3_canonical_image_repoint',
            'new_bucket','supplement-photos/GeneX360 Testing and Diagnostics',
            'filename','CannabisIQ.png','new_image_urls', image_urls,
            'authority','Gary canonical 2026-04-30')
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    -- FC-TEST-EPIGEN-001 -> EpiGenDX.png
    WITH updated AS (
        UPDATE public.products
        SET image_urls = jsonb_build_array(v_base_url || 'EpiGenDX.png')
        WHERE sku = 'FC-TEST-EPIGEN-001' AND category != 'peptide'
        RETURNING id, sku, image_urls
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_k_image_urls_repoint', 'products', sku, id,
        jsonb_build_object('column','image_urls','method','v3_canonical_image_repoint',
            'audit_mode','force_v3_canonical_image_repoint',
            'new_bucket','supplement-photos/GeneX360 Testing and Diagnostics',
            'filename','EpiGenDX.png','new_image_urls', image_urls,
            'authority','Gary canonical 2026-04-30')
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    -- FC-TEST-COMBO-001 -> GeneX360.png
    WITH updated AS (
        UPDATE public.products
        SET image_urls = jsonb_build_array(v_base_url || 'GeneX360.png')
        WHERE sku = 'FC-TEST-COMBO-001' AND category != 'peptide'
        RETURNING id, sku, image_urls
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_k_image_urls_repoint', 'products', sku, id,
        jsonb_build_object('column','image_urls','method','v3_canonical_image_repoint',
            'audit_mode','force_v3_canonical_image_repoint',
            'new_bucket','supplement-photos/GeneX360 Testing and Diagnostics',
            'filename','GeneX360.png','new_image_urls', image_urls,
            'authority','Gary canonical 2026-04-30')
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    -- FC-TEST-METH-001 -> GenexM.png (note: bucket lowercase x vs product GeneXM(TM))
    WITH updated AS (
        UPDATE public.products
        SET image_urls = jsonb_build_array(v_base_url || 'GenexM.png')
        WHERE sku = 'FC-TEST-METH-001' AND category != 'peptide'
        RETURNING id, sku, image_urls
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_k_image_urls_repoint', 'products', sku, id,
        jsonb_build_object('column','image_urls','method','v3_canonical_image_repoint',
            'audit_mode','force_v3_canonical_image_repoint',
            'new_bucket','supplement-photos/GeneX360 Testing and Diagnostics',
            'filename','GenexM.png','new_image_urls', image_urls,
            'filename_case_quirk','bucket lowercase x vs product GeneXM(TM) uppercase X',
            'authority','Gary canonical 2026-04-30')
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    -- FC-TEST-DUTCH-001 -> HormoneIQ.png
    WITH updated AS (
        UPDATE public.products
        SET image_urls = jsonb_build_array(v_base_url || 'HormoneIQ.png')
        WHERE sku = 'FC-TEST-DUTCH-001' AND category != 'peptide'
        RETURNING id, sku, image_urls
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_k_image_urls_repoint', 'products', sku, id,
        jsonb_build_object('column','image_urls','method','v3_canonical_image_repoint',
            'audit_mode','force_v3_canonical_image_repoint',
            'new_bucket','supplement-photos/GeneX360 Testing and Diagnostics',
            'filename','HormoneIQ.png','new_image_urls', image_urls,
            'authority','Gary canonical 2026-04-30')
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    -- FC-TEST-NUTR-001 -> NutrigenDX.png
    WITH updated AS (
        UPDATE public.products
        SET image_urls = jsonb_build_array(v_base_url || 'NutrigenDX.png')
        WHERE sku = 'FC-TEST-NUTR-001' AND category != 'peptide'
        RETURNING id, sku, image_urls
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_k_image_urls_repoint', 'products', sku, id,
        jsonb_build_object('column','image_urls','method','v3_canonical_image_repoint',
            'audit_mode','force_v3_canonical_image_repoint',
            'new_bucket','supplement-photos/GeneX360 Testing and Diagnostics',
            'filename','NutrigenDX.png','new_image_urls', image_urls,
            'authority','Gary canonical 2026-04-30')
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    -- FC-TEST-PEPTIDES-001 -> PeptidesIQ.png
    WITH updated AS (
        UPDATE public.products
        SET image_urls = jsonb_build_array(v_base_url || 'PeptidesIQ.png')
        WHERE sku = 'FC-TEST-PEPTIDES-001' AND category != 'peptide'
        RETURNING id, sku, image_urls
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_k_image_urls_repoint', 'products', sku, id,
        jsonb_build_object('column','image_urls','method','v3_canonical_image_repoint',
            'audit_mode','force_v3_canonical_image_repoint',
            'new_bucket','supplement-photos/GeneX360 Testing and Diagnostics',
            'filename','PeptidesIQ.png','new_image_urls', image_urls,
            'authority','Gary canonical 2026-04-30')
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    -- FC-CUSTOM-VIT-001 -> 30 Day Custom Vitamin Package.png (legacy filename retained per Gary)
    WITH updated AS (
        UPDATE public.products
        SET image_urls = jsonb_build_array(v_base_url || '30%20Day%20Custom%20Vitamin%20Package.png')
        WHERE sku = 'FC-CUSTOM-VIT-001' AND category != 'peptide'
        RETURNING id, sku, image_urls
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_k_image_urls_repoint', 'products', sku, id,
        jsonb_build_object('column','image_urls','method','v3_canonical_image_repoint',
            'audit_mode','force_v3_canonical_image_repoint',
            'new_bucket','supplement-photos/GeneX360 Testing and Diagnostics',
            'filename','30 Day Custom Vitamin Package.png',
            'filename_legacy_retained_intentionally','product renamed Phase J but filename retained per Gary URL list',
            'new_image_urls', image_urls,
            'authority','Gary canonical 2026-04-30')
    FROM updated;
    GET DIAGNOSTICS v_pass = ROW_COUNT; v_count := v_count + v_pass;

    RAISE NOTICE 'Phase K image_urls repoint: rows updated=% / 8 expected; run_id=%',
        v_count, v_run_id;
END $$;
