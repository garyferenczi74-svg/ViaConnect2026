-- Prompt #142e: SKU cleanup for three dropped products per Gary 2026-05-02.
--
-- Pre-flight verified that 2 of 3 target SKUs already removed by prior
-- phases (per #142e §2 idempotent handling):
--   aptigen-complex: hard-deleted 2026-05-01 via Phase L
--   neurocalm-bh4-complex: hard-deleted 2026-05-02 via 144v2_remove_neurocalm_bh4_complex
-- Their full to_jsonb backups live in backfill_audit; rollback paths
-- documented in tmp/142e/142e-cleanup-plan.txt and the per-slug audit
-- JSONs.
--
-- Only neuroaxis-plus (FC-NEUROAXIS-001) remains for #142e action.
-- Currently soft-deactivated active=false from 2026-05-01 directive
-- "I will add it at a later date"; Gary now confirms permanent retirement
-- via #142e spec body delivery 2026-05-02 supersedes the soft-deactivate.
-- FK references zero across order_items + helix_transactions + all map_*
-- tables; per #142e §4.2 default action is HARD DELETE.
--
-- Pre-cleanup snapshot to public.products_dropped_backup_142e per §4.1
-- (belt-and-suspenders rollback beyond backfill_audit).
--
-- Per row backfill_audit captures full to_jsonb of pre-delete row in
-- old_value plus method hard_delete_per_142e plus rule_applied
-- sku_cleanup_142e plus authority Gary canonical 2026-05-02 #142e spec.
--
-- Image storage file note: neuroaxis-plus image_urls[0] points at
-- supplement-photos/Advance%20Formulations/neurocalm-plus-calm-plus.png
-- which is ALSO referenced by FC-CALM-001 NeuroCalm+ per #142d OQ2
-- unresolved. Storage file MUST stay in place even after row deletion;
-- §5 default leave-in-place applies and is explicitly required here
-- for FC-CALM-001 to continue rendering.
--
-- Idempotent: WHERE slug = 'neuroaxis-plus' AND EXISTS guard ensures
-- re-runs are no-ops once row removed.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count_snapshot integer := 0;
    v_count_audit integer := 0;
    v_count_deleted integer := 0;
BEGIN
    CREATE TABLE IF NOT EXISTS public.products_dropped_backup_142e (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        snapshot_at timestamptz NOT NULL DEFAULT now(),
        original_id uuid NOT NULL,
        slug text,
        full_row jsonb NOT NULL
    );

    WITH snap AS (
        INSERT INTO public.products_dropped_backup_142e (original_id, slug, full_row)
        SELECT p.id, p.slug, to_jsonb(p)
        FROM public.products p
        WHERE p.slug = 'neuroaxis-plus'
          AND p.category != 'peptide'
          AND NOT EXISTS (
              SELECT 1 FROM public.products_dropped_backup_142e b
              WHERE b.original_id = p.id
          )
        RETURNING 1
    )
    SELECT count(*) INTO v_count_snapshot FROM snap;

    WITH audited AS (
        INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
        SELECT v_run_id, '142e_sku_cleanup', 'products', p.sku, p.id,
            jsonb_build_object(
                'method', 'hard_delete_per_142e_default_fk_zero',
                'old_value', to_jsonb(p),
                'new_value', NULL,
                'rule_applied', 'sku_cleanup_142e',
                'audit_mode', 'force_destructive_post_audit_approval',
                'authority', 'Gary canonical 2026-05-02 #142e spec body delivery supersedes prior soft-deactivate',
                'product_name', p.name,
                'product_slug', p.slug,
                'fk_audit', jsonb_build_object(
                    'order_items', 0,
                    'helix_transactions', 0,
                    'map_policies', 0,
                    'map_price_observations', 0,
                    'map_violations', 0,
                    'map_vip_exemptions', 0,
                    'map_waiver_skus', 0
                ),
                'storage_file_note', 'image_urls[0] points at supplement-photos/Advance%20Formulations/neurocalm-plus-calm-plus.png ALSO referenced by FC-CALM-001 NeuroCalm+ per #142d OQ2; storage file stays in place'
            )
        FROM public.products p
        WHERE p.slug = 'neuroaxis-plus'
          AND p.category != 'peptide'
          AND NOT EXISTS (
              SELECT 1 FROM public.backfill_audit ba
              WHERE ba.product_id = p.id
                AND ba.source_table = '142e_sku_cleanup'
          )
        RETURNING 1
    )
    SELECT count(*) INTO v_count_audit FROM audited;

    WITH deleted AS (
        DELETE FROM public.products
        WHERE slug = 'neuroaxis-plus'
          AND category != 'peptide'
        RETURNING 1
    )
    SELECT count(*) INTO v_count_deleted FROM deleted;

    RAISE NOTICE '#142e SKU cleanup: snapshot=% audit=% deleted=% run_id=%',
        v_count_snapshot, v_count_audit, v_count_deleted, v_run_id;
END $$;
