-- Prompt #142 v2 Phase D: image_urls jsonb backfill via legacy URL passthrough.
--
-- Per #142 v2 §3 Phase D, populate products.image_urls (jsonb array) from
-- the legacy products.image_url (text) field. The spec describes a
-- 3-step lookup: (1) existing-row check, (2) legacy URL passthrough or
-- filename-to-URL construction, (3) slug-based HEAD-request fallback.
-- This migration implements steps 1 and 2 (passthrough). Step 3
-- (slug-based HEAD verification) cannot run in SQL since it requires
-- HTTP requests; it is deferred to a follow-up phase.
--
-- Bucket assertion (#142 v2 §3 Phase D first SQL):
--   SELECT 1 FROM storage.buckets WHERE name = 'Products' must succeed.
--   Verified pre-flight: bucket exists (28 images, flat layout). Spec
--   correctly identifies this as the canonical bucket from Prompt #110.
--
-- Pre-flight findings on production data:
--   - 90 of 93 non-peptide products have full URL in image_url
--   - 3 of 93 have NULL or empty image_url
--   - 0 of 93 already have image_urls jsonb populated
--   - URL bucket distribution among the 90 working URLs:
--     * supplement-photos/<category>/<slug>.png (most common, ~80 rows)
--     * Products/<filename>.png (smaller bucket, some testing kits + SNP)
--     * Products Update/<filename>.png (KNOWN BROKEN; empty bucket)
--     * external or other (passthrough as-is)
--
-- Strategy:
--   T1 Passthrough: 90 rows with image_url ILIKE 'http%' get
--     image_urls = jsonb_build_array(image_url). Audit log captures
--     bucket_prefix derived from URL pattern; rows pointing at
--     Products Update flagged for follow-up cleanup.
--   T2 Empty array: 3 rows with NULL or empty image_url get
--     image_urls = '[]'::jsonb. Audit log marks for review; the F141
--     v3 card system uses a category fallback glyph when image_urls
--     is empty.
--
-- Defensive guards: WHERE category != 'peptide' on every UPDATE.
-- Idempotent COALESCE-style: WHERE image_urls IS NULL OR jsonb_array_length(image_urls) = 0.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_bucket_exists boolean;
    v_passthrough_count integer;
    v_empty_count integer;
    v_broken_url_count integer;
BEGIN
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE name = 'Products') INTO v_bucket_exists;
    IF NOT v_bucket_exists THEN
        RAISE EXCEPTION 'Phase D aborted: bucket "Products" not found. Verify Prompt #110 bucket rename was applied.';
    END IF;

    -- T1: Passthrough legacy full URLs to image_urls jsonb array
    WITH updated AS (
        UPDATE public.products
        SET image_urls = jsonb_build_array(image_url)
        WHERE category != 'peptide'
          AND (image_urls IS NULL OR jsonb_array_length(image_urls) = 0)
          AND image_url IS NOT NULL
          AND image_url <> ''
          AND image_url ILIKE 'http%'
        RETURNING id, sku, name, image_url
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_d_image_urls',
        'products',
        u.sku,
        u.id,
        jsonb_build_object(
            'column', 'image_urls',
            'method', 'passthrough_legacy_url',
            'source_url', u.image_url,
            'bucket_prefix', CASE
                WHEN u.image_url ILIKE '%/storage/v1/object/public/Products%20Update/%' THEN 'Products_Update_KNOWN_BROKEN'
                WHEN u.image_url ILIKE '%/storage/v1/object/public/Products/%' THEN 'Products'
                WHEN u.image_url ILIKE '%/storage/v1/object/public/supplement-photos/%' THEN 'supplement-photos'
                ELSE 'other_or_external'
            END,
            'flagged_for_review', (u.image_url ILIKE '%Products%20Update%'),
            'product_name', u.name
        )
    FROM updated u;
    GET DIAGNOSTICS v_passthrough_count = ROW_COUNT;

    -- T2: Empty array for rows with no legacy URL
    WITH updated AS (
        UPDATE public.products
        SET image_urls = '[]'::jsonb
        WHERE category != 'peptide'
          AND (image_urls IS NULL OR jsonb_array_length(image_urls) = 0)
          AND (image_url IS NULL OR image_url = '')
        RETURNING id, sku, name
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_d_image_urls',
        'products',
        u.sku,
        u.id,
        jsonb_build_object(
            'column', 'image_urls',
            'method', 'empty_array_no_legacy_url',
            'reason', 'no legacy image_url to passthrough; F141 v3 card system falls back to category glyph',
            'flagged_for_review', true,
            'product_name', u.name
        )
    FROM updated u;
    GET DIAGNOSTICS v_empty_count = ROW_COUNT;

    -- Count broken-URL flagged rows for the notice
    SELECT count(*) INTO v_broken_url_count
    FROM public.products
    WHERE category != 'peptide'
      AND image_url ILIKE '%Products%20Update%';

    RAISE NOTICE 'Phase D image_urls: passthrough=%, empty=%, flagged_broken_url=% (Products Update points); run_id=%',
        v_passthrough_count, v_empty_count, v_broken_url_count, v_run_id;
END $$;
