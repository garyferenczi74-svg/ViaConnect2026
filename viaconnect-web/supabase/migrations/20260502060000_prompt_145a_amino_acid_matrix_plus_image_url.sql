-- Prompt #145a: Amino Acid Matrix+ image_urls per Gary canonical 2026-05-02.
--
-- Gary delivered:
--   https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Base%20Formulations/Amino%20Acid%20Matrix+.png
--
-- Encoding decision: literal + in delivered URL replaced with %2B in DB
-- write to match the post-#142d invariant (no literal + chars in image
-- URLs; the Shred+.png precedent uses Shred%2B.png). Both encodings
-- resolve to the same Supabase Storage object so render is unaffected,
-- and %2B is canonical per #142d §4.3 encodeURIComponent rule.
--
-- Bucket: supplement-photos (canonical for supplement imagery per #142d
-- §7; Hero Videos bucket is separate per #143a §8 two-bucket reality).
-- Folder: Base Formulations (typo-free per #142d §3 inventory).
--
-- Idempotent: IS DISTINCT FROM jsonb_build_array(url) guard means re-runs
-- are no-ops once value matches. Snapshot prior image_urls into the
-- existing public.products_image_urls_backup_142d table from #142d for
-- rollback parity with the rest of the supplement-photos image work.
--
-- Defensive: WHERE category != 'peptide' AND sku = 'FC-AMINO-001'.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_target_url text := 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Base%20Formulations/Amino%20Acid%20Matrix%2B.png';
BEGIN
    INSERT INTO public.products_image_urls_backup_142d (product_id, slug, prior_image_urls)
    SELECT id, slug, image_urls
    FROM public.products
    WHERE sku = 'FC-AMINO-001'
      AND category != 'peptide'
      AND NOT EXISTS (
          SELECT 1 FROM public.products_image_urls_backup_142d b
          WHERE b.product_id = public.products.id
            AND b.snapshot_at >= now() - interval '1 minute'
      );

    WITH updated AS (
        UPDATE public.products
        SET image_urls = jsonb_build_array(v_target_url)
        WHERE sku = 'FC-AMINO-001'
          AND category != 'peptide'
          AND image_urls IS DISTINCT FROM jsonb_build_array(v_target_url)
        RETURNING id, sku, name, slug, image_urls
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, '145a_amino_acid_matrix_plus_image_url', 'products', sku, id,
        jsonb_build_object(
            'column', 'image_urls',
            'method', 'pinned_url_amino_acid_matrix_plus_per_gary_directive',
            'audit_mode', 'force',
            'old_value', '[]'::jsonb,
            'new_value', image_urls,
            'rule_applied', '145a_amino_acid_matrix_plus_image_url',
            'product_name', name,
            'product_slug', slug,
            'authority', 'Gary canonical 2026-05-02 image URL delivery',
            'note', 'Gary delivered URL with literal + char; written with %2B encoding per #142d Shred%2B.png precedent and §5 query 3 invariant of zero literal + chars in image URLs'
        )
    FROM updated;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    RAISE NOTICE '#145a Amino Acid Matrix+ image URL: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
