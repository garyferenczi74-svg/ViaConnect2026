-- Prompt #152w.2: Inferno+ image_urls population.
--
-- Closes 152w.2 follow-up per spec acceptance criterion 32 (image
-- upload deferred from #152w PDP ship). Gary provided the canonical
-- URL 2026-05-07.
--
-- URL: https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/
--      public/supplement-photos/Base%20Formulations/Inferno+.png
--
-- Bucket convention per feedback_supplement_photos_canonical_bucket.md
-- (standing rule supersession 2026-05-01): supplement-photos is the
-- canonical bucket for supplement + testing imagery; #110 Products-
-- bucket-canonical rule rescinded per #142d §7. Subfolder "Base
-- Formulations" matches the existing convention used by Electrolyte
-- Blend (supplement-photos/Base Formulations/electrolyte-blend.png),
-- BHB Ketone Salts, MethylB Complete+, etc.
--
-- Filename "Inferno+.png" preserves the literal "+" character in the
-- product name (Gary-provided URL uses literal "+" not %2B encoding).
-- Browsers handle "+" in URL path components as a literal character
-- (URL space-encoding "+" only applies to query strings, not path
-- segments). If Supabase storage 404s the literal-"+" form, a follow-
-- up migration can normalize to %2B encoding (per SHRED+ precedent
-- from #142d).
--
-- Idempotent: WHERE clause includes "image_urls = []" guard so re-run
-- after population is a no-op.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_image_url text := 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Base%20Formulations/Inferno+.png';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'inferno-plus-natural-metabolic-activator'
      AND p.sku = 'FC-INFERNO-001'
      AND (p.image_urls IS NULL OR jsonb_array_length(p.image_urls) = 0);

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152w.2 Inferno+ image_urls population skipped: row not found OR image_urls already populated (idempotent no-op)';
        RETURN;
    END IF;

    UPDATE public.products
    SET image_urls = jsonb_build_array(v_image_url)
    WHERE id = v_product_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    SELECT to_jsonb(p) INTO v_post_row FROM public.products p WHERE p.id = v_product_id;

    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    VALUES (
        v_run_id,
        '152w.2_inferno_plus_image_url_population',
        'products',
        'FC-INFERNO-001',
        v_product_id,
        jsonb_build_object(
            'method', 'image_url_population_152w_followup_2',
            'columns', jsonb_build_array('image_urls'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'supplement_photos_canonical_bucket_per_feedback_2026_05_01',
            'authority', 'Gary 2026-05-07: provided canonical URL closing 152w.2 follow-up after Inferno+ card visibility fix (152w.0.1)',
            'image_url', v_image_url,
            'bucket', 'supplement-photos',
            'subfolder', 'Base Formulations',
            'filename', 'Inferno+.png',
            'filename_encoding_note', 'literal "+" preserved in filename (not %2B encoded); browsers treat "+" in URL path component as literal character; if 404s observed will follow up with %2B normalization per SHRED+ #142d precedent',
            'remaining_152w_followups', '152w.1 pricing still pending (price_msrp NULL; card shows $0.00); 152w.4 master_sku NULL; 152w.7 ingredients[] empty for JSONB reconciliation including BPC-157 Path A actual identifier disclosure per FDA 21 CFR 101.36'
        )
    );

    RAISE NOTICE '#152w.2 Inferno+ image_urls populated: rows updated=% / 1 expected; run_id=%; url=%', v_count, v_run_id, v_image_url;
END $$;
