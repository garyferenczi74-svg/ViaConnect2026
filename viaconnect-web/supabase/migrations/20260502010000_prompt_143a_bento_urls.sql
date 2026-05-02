-- Prompt #143a: Bento Tile Video URL Pinning per Gary canonical 2026-05-02.
--
-- Source: scripts/143a/vc_bento_video_url_map.json. 7 categories mapped:
--   5 video assignments: methylation-snp, genex360, advanced-formulas,
--                        womens-health, childrens-formulations
--   2 image assignments: base-formulations, functional-mushrooms
--
-- Bucket: Hero Videos (capital H, capital V, single space) at root level,
-- a SECOND canonical bucket alongside supplement-photos per #143a §1
-- Change 1 and §8 standing rule amendment.
--
-- URL pattern: https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/<filename-encoded>
-- Encoding rules: space to %20, plus to %2B, apostrophe literal preserved.
-- All 7 URLs pre-encoded in the map and written verbatim per §0 hard rule 1.
--
-- 5 video assignments target column video_url; 2 image assignments target
-- column hero_image_url. <CollectionTileVideoLayer> from #143 returns null
-- when video_url is null so the 2 image categories render the static
-- hero_image_url with no video element in the DOM per §1 Change 2.
--
-- Idempotency: WHERE column IS DISTINCT FROM 'new_url' guard means
-- re-running this migration is a no-op when values already match.
--
-- Audit trail: per-row backfill_audit captures method 143a_bento_urls plus
-- column_name plus status_kind plus old_value plus new_value plus
-- category_slug plus authority Gary canonical 2026-05-02. Reuse the
-- existing backfill_audit table per §3 path 1 with product_id NULL since
-- categories are a different table; category slug stored in columns_loaded.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count_video integer := 0;
    v_count_image integer := 0;
BEGIN
    -- Pre-flight: assert schema columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'categories'
          AND column_name IN ('video_url', 'video_poster_url')
        GROUP BY table_name
        HAVING COUNT(*) = 2
    ) THEN
        RAISE EXCEPTION '143a aborted: categories.video_url or video_poster_url missing. Run #143 schema migration first.';
    END IF;

    -- Pre-flight: assert Hero Videos bucket exists with exact casing
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'Hero Videos') THEN
        RAISE EXCEPTION '143a aborted: bucket Hero Videos not found in storage.buckets. Verify capital H, capital V, single space.';
    END IF;

    -- Step 1: 5 video assignments to categories.video_url
    WITH pinned_videos(slug, new_url, status_kind) AS (
        VALUES
            ('methylation-snp', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Methylation%20SNP%20Support.mp4', 'matched'),
            ('genex360', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Methylation%20Support%20genetic%20Scientist.mp4', 'verify_genex360_content_oq1'),
            ('advanced-formulas', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Advanced%20Formulas.mp4', 'matched'),
            ('womens-health', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Woman%20on%20beach.mp4', 'matched'),
            ('childrens-formulations', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/children%20on%20beach.mp4', 'matched')
    ),
    updated_videos AS (
        UPDATE public.categories c
        SET video_url = pv.new_url
        FROM pinned_videos pv
        WHERE c.slug = pv.slug
          AND c.video_url IS DISTINCT FROM pv.new_url
        RETURNING c.slug, pv.new_url, pv.status_kind, c.video_url AS prior_value
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, '143a_bento_urls', 'categories', NULL, NULL,
        jsonb_build_object(
            'category_slug', uv.slug,
            'column_name', 'video_url',
            'method', 'pinned_map_143a',
            'status_kind', uv.status_kind,
            'audit_mode', 'force_per_143a_spec',
            'old_value', NULL,
            'new_value', uv.new_url,
            'rule_applied', 'pinned_map_143a',
            'authority', 'Gary canonical 2026-05-02 vc_bento_video_url_map.json'
        )
    FROM updated_videos uv;
    GET DIAGNOSTICS v_count_video = ROW_COUNT;

    -- Step 2: 2 image assignments to categories.hero_image_url
    WITH pinned_images(slug, new_url, status_kind) AS (
        VALUES
            ('base-formulations', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Doctor%20Hands.png', 'matched'),
            ('functional-mushrooms', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Videos/Mushrooms.png', 'matched')
    ),
    updated_images AS (
        UPDATE public.categories c
        SET hero_image_url = pi.new_url
        FROM pinned_images pi
        WHERE c.slug = pi.slug
          AND c.hero_image_url IS DISTINCT FROM pi.new_url
        RETURNING c.slug, pi.new_url, pi.status_kind, c.hero_image_url AS prior_value
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, '143a_bento_urls', 'categories', NULL, NULL,
        jsonb_build_object(
            'category_slug', ui.slug,
            'column_name', 'hero_image_url',
            'method', 'pinned_map_143a',
            'status_kind', ui.status_kind,
            'audit_mode', 'force_overwrite_per_143a_oq2',
            'old_value', NULL,
            'new_value', ui.new_url,
            'rule_applied', 'pinned_map_143a',
            'authority', 'Gary canonical 2026-05-02 vc_bento_video_url_map.json'
        )
    FROM updated_images ui;
    GET DIAGNOSTICS v_count_image = ROW_COUNT;

    RAISE NOTICE '143a bento URLs: video_assigned=% image_assigned=% run_id=%',
        v_count_video, v_count_image, v_run_id;
END $$;
