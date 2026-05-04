-- Clean+ Detox & Liver Health image URL swap per Gary directive 2026-05-04.
--
-- Replaces image_urls for FC-CLEAN-001 (slug clean-plus-detox-and-liver-health)
-- to point at the canonical Clean+.png filename in the supplement-photos bucket
-- under the Advance Formulations subfolder (typo preserved per #142d). Prior
-- value pointed at clean-plus-detox-liver-health.png (legacy filename from
-- #142d pinned map). Gary verified the new URL renders the proper image.
--
-- Bucket: supplement-photos (canonical per feedback_supplement_photos_canonical_bucket
--   2026-05-01 supersession of Prompt #110 Products bucket convention).
-- Encoding: literal "+" in filename (Supabase storage accepts both literal "+"
--   and "%2B"; Gary provided URL with literal "+" so this migration uses it
--   verbatim; verified live with curl 2026-05-04 returns 200).
-- Idempotent: WHERE clause keys on slug AND sku AND category != peptide.
-- backfill_audit row captures pre + post jsonb for rollback.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_new_image_url text := 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/Clean+.png';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'clean-plus-detox-and-liver-health'
      AND p.sku = 'FC-CLEAN-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE 'Clean+ image_urls swap skipped: row not found at slug clean-plus-detox-and-liver-health / SKU FC-CLEAN-001';
        RETURN;
    END IF;

    UPDATE public.products
    SET
        image_urls = jsonb_build_array(v_new_image_url)
    WHERE id = v_product_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    SELECT to_jsonb(p) INTO v_post_row FROM public.products p WHERE p.id = v_product_id;

    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    VALUES (
        v_run_id,
        'clean_plus_image_url_swap',
        'products',
        'FC-CLEAN-001',
        v_product_id,
        jsonb_build_object(
            'method', 'image_urls_replace_per_gary_directive',
            'columns', jsonb_build_array('image_urls'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'authority', 'Gary canonical 2026-05-04: wrong image rendering on Clean+ surface; replace with supplement-photos/Advance%20Formulations/Clean+.png',
            'old_filename', 'clean-plus-detox-liver-health.png (from #142d pinned map)',
            'new_filename', 'Clean+.png',
            'bucket', 'supplement-photos (canonical per feedback_supplement_photos_canonical_bucket)',
            'subfolder', 'Advance Formulations (typo preserved per #142d precedent)',
            'product_name', 'Clean+ Detox & Liver Health'
        )
    );

    RAISE NOTICE 'Clean+ image_urls swap: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
