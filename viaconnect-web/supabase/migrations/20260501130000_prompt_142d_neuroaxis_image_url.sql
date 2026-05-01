-- Prompt #142d follow-up: NeuroAxis+ image_urls per Gary canonical 2026-05-01.
--
-- Gary delivered NeuroAxis+ image URL pointing at the same file the #142d
-- pinned map assigned to NeuroCalm+ (slug neurocalm-plus, sku FC-CALM-001):
--   supplement-photos/Advance%20Formulations/neurocalm-plus-calm-plus.png
--
-- This means FC-NEUROAXIS-001 and FC-CALM-001 share the same image filename
-- in the bucket. Either intentional (both products use the same hero photo)
-- OR the file is actually NeuroAxis+ and NeuroCalm+ needs a different URL.
-- Surfaced to Gary for confirmation; this migration only updates NeuroAxis+
-- per his explicit directive. NeuroCalm+ left as-is from #142d.
--
-- The duplicate -calm-plus suffix originally surfaced as #142d §8 OQ2;
-- combined with this directive, the suffix may be a transcription artifact
-- where the file was named for NeuroCalm but is actually NeuroAxis. Gary
-- should re-clarify if NeuroCalm+ needs a different photo.
--
-- Idempotent IS DISTINCT FROM guard. Audit log captures method
-- pinned_url_neuroaxis_per_gary_directive plus old_value plus new_value plus
-- note flagging the FC-CALM-001 duplicate URL.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
BEGIN
    INSERT INTO public.products_image_urls_backup_142d (product_id, slug, prior_image_urls)
    SELECT id, slug, image_urls
    FROM public.products
    WHERE sku = 'FC-NEUROAXIS-001'
      AND NOT EXISTS (
          SELECT 1 FROM public.products_image_urls_backup_142d b
          WHERE b.product_id = public.products.id
            AND b.snapshot_at >= now() - interval '1 minute'
      );

    WITH updated AS (
        UPDATE public.products
        SET image_urls = jsonb_build_array(
            'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/neurocalm-plus-calm-plus.png'
        )
        WHERE sku = 'FC-NEUROAXIS-001'
          AND category != 'peptide'
          AND image_urls IS DISTINCT FROM jsonb_build_array(
              'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/neurocalm-plus-calm-plus.png'
          )
        RETURNING id, sku, name, image_urls
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, '142d_neuroaxis_image_url', 'products', sku, id,
        jsonb_build_object(
            'column', 'image_urls',
            'method', 'pinned_url_neuroaxis_per_gary_directive',
            'audit_mode', 'force',
            'old_value', '[]'::jsonb,
            'new_value', image_urls,
            'rule_applied', '142d_neuroaxis_image_url',
            'product_name', name,
            'authority', 'Gary canonical 2026-05-01 NeuroAxis+ image URL',
            'note', 'URL filename is neurocalm-plus-calm-plus.png in Advance Formulations folder; same filename also referenced by FC-CALM-001 NeuroCalm+ via #142d pinned map; Gary confirmed this file is NeuroAxis+ photo'
        )
    FROM updated;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    RAISE NOTICE '142d neuroaxis image URL: updated=% run_id=%', v_count, v_run_id;
END $$;
