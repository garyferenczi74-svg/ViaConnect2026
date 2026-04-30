-- Prompt #142 v2 Phase D.1: repair the 29 broken image_urls pointing at the
-- empty `Products Update` bucket.
--
-- Phase D passthrough'd 90 legacy URLs into image_urls jsonb arrays. 29
-- of those URLs point at `Products Update` which is an empty bucket
-- (only contains .emptyFolderPlaceholder). Phase D.1 repairs them via
-- 4-tier strategy:
--
--   T1 Self-copy from name-sibling: 20 SNP support products
--     (ACAT+, ACHY+, ADO Support+, BHMT+, CBS Support+, COMT+, DAO+,
--     GST+, MAOA+, MTHFR+, MTR+, MTRR+, NAT Support+, NOS+, RFC1+,
--     SHMT+, SOD+, SUOX+, TCN2+, VDR+) each have a name-sibling row
--     (numeric SKU 32-51 from master_skus) that already has a working
--     supplement-photos URL with the proper subfolder structure. Self-
--     copy via DISTINCT ON name pattern matching Phase C.1.
--
--   T2 Bucket-segment swap: 7 EXACT MATCH non-SNP rows where the same
--     filename exists in the Products bucket. Replace the
--     `/Products%20Update/` segment with `/Products/`. Affects
--     FC-CUSTOM-VIT-001 (30 Day Custom Vitamin Package), FC-TEST-CANNABIS-001
--     (CannabisIQ), FC-TEST-EPIGEN-001 (EpiGenDX), FC-TEST-METH-001 (GeneXM),
--     FC-TEST-DUTCH-001 (HormoneIQ), FC-TEST-NUTR-001 (NutragenHQ),
--     FC-TEST-PEPTIDES-001 (PeptidesIQ).
--
--   T3 Hardcoded special: FC-TEST-COMBO-001 (GeneX360 flagship). Old URL
--     pointed at `Combo Test (Meth+Nutr+Dutch).png` (legacy filename).
--     Products bucket has `GeneX360.png` (the new flagship name post
--     #141b assumption A). Hardcode to the canonical filename.
--
--   T4 Empty array fallback: FC-SHRED-001 (SHRED+). No name-sibling and
--     no SHRED file in Products bucket. Set image_urls = '[]'::jsonb so
--     the F141 v3 card system renders the category fallback glyph.
--     Image upload deferred to Gary's manual ops.
--
-- Coverage: T1 (20) + T2 (7) + T3 (1) + T4 (1) = 29, exactly the
-- broken-URL count from Phase D verification.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_t1_count integer;
    v_t2_count integer;
BEGIN
    -- T1: Self-copy 20 SNP rows from name-sibling
    WITH sibling_urls AS (
        SELECT DISTINCT ON (name) name, image_urls AS working_image_urls
        FROM public.products
        WHERE jsonb_array_length(image_urls) > 0
          AND image_urls::text NOT ILIKE '%Products%20Update%'
          AND category != 'peptide'
        ORDER BY name, length(image_urls::text) DESC
    ),
    updated AS (
        UPDATE public.products p
        SET image_urls = s.working_image_urls
        FROM sibling_urls s
        WHERE p.name = s.name
          AND p.image_urls::text ILIKE '%Products%20Update%'
          AND p.category != 'peptide'
        RETURNING p.id, p.sku, p.name, s.working_image_urls
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_d1_image_url_repair',
        'products',
        u.sku,
        u.id,
        jsonb_build_object(
            'column', 'image_urls',
            'method', 'T1_self_copy_from_name_sibling',
            'old_bucket', 'Products Update (broken empty bucket)',
            'new_image_urls', u.working_image_urls,
            'product_name', u.name
        )
    FROM updated u;
    GET DIAGNOSTICS v_t1_count = ROW_COUNT;

    -- T2: Bucket-segment swap for 7 EXACT MATCH non-SNP rows
    WITH updated AS (
        UPDATE public.products
        SET image_urls = jsonb_build_array(
            replace(image_urls->>0, '/Products%20Update/', '/Products/')
        )
        WHERE category != 'peptide'
          AND image_urls::text ILIKE '%Products%20Update%'
          AND sku IN (
              'FC-CUSTOM-VIT-001',
              'FC-TEST-CANNABIS-001',
              'FC-TEST-EPIGEN-001',
              'FC-TEST-METH-001',
              'FC-TEST-DUTCH-001',
              'FC-TEST-NUTR-001',
              'FC-TEST-PEPTIDES-001'
          )
        RETURNING id, sku, name, image_urls
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_d1_image_url_repair',
        'products',
        u.sku,
        u.id,
        jsonb_build_object(
            'column', 'image_urls',
            'method', 'T2_bucket_segment_swap',
            'old_bucket', 'Products Update',
            'new_bucket', 'Products',
            'new_image_urls', u.image_urls,
            'product_name', u.name
        )
    FROM updated u;
    GET DIAGNOSTICS v_t2_count = ROW_COUNT;

    -- T3 special: FC-TEST-COMBO-001 GeneX360 -> Products/GeneX360.png
    UPDATE public.products
    SET image_urls = jsonb_build_array(
        'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Products/GeneX360.png'
    )
    WHERE sku = 'FC-TEST-COMBO-001';

    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_d1_image_url_repair',
        'products',
        'FC-TEST-COMBO-001',
        id,
        jsonb_build_object(
            'column', 'image_urls',
            'method', 'T3_hardcoded_special',
            'reason', 'Old filename Combo Test (Meth+Nutr+Dutch).png deprecated by #141b assumption A; Products bucket has GeneX360.png',
            'new_image_urls', image_urls,
            'product_name', name
        )
    FROM public.products
    WHERE sku = 'FC-TEST-COMBO-001';

    -- T4 special: FC-SHRED-001 SHRED+ -> empty array (no source file)
    UPDATE public.products
    SET image_urls = '[]'::jsonb
    WHERE sku = 'FC-SHRED-001';

    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_d1_image_url_repair',
        'products',
        'FC-SHRED-001',
        id,
        jsonb_build_object(
            'column', 'image_urls',
            'method', 'T4_empty_array_no_source',
            'reason', 'No name-sibling, no SHRED file in Products bucket; F141 v3 falls back to category glyph; manual upload deferred',
            'new_image_urls', image_urls,
            'product_name', name,
            'flagged_for_review', true
        )
    FROM public.products
    WHERE sku = 'FC-SHRED-001';

    RAISE NOTICE 'Phase D.1 image URL repair: T1 self_copy=%, T2 bucket_swap=%, T3 hardcoded=1 (GeneX360), T4 empty=1 (SHRED+); run_id=%',
        v_t1_count, v_t2_count, v_run_id;
END $$;
