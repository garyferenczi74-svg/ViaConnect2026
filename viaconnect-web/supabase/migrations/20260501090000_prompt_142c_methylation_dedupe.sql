-- Prompt #142c: Methylation SNP Support Duplicate Cleanup.
--
-- Audit (Section 2) ran 2026-04-30 against live Supabase project; deliverables
-- saved to tmp/142c/. Gary approved 2026-04-30 with directive: "APOE+ /
-- CYP450+ were not added by me. They were just added. Remove them. Remove
-- all duplicate listings."
--
-- Findings (full detail in tmp/142c/methylation-duplicate-summary.txt):
--   - 22 canonical-base groups in methylation-snp: 20 Twinned + 2 Singleton
--     (APOE+, CYP450+ unauthorized per Gary)
--   - Cross-table FK refs: zero in order_items / helix_transactions /
--     map_policies / map_price_observations / map_violations /
--     map_vip_exemptions / map_waiver_skus. Cleanup is FK-safe.
--   - Richness scores: 19 normal pairs canonical wins 220 vs 215 by +5
--     canonical tiebreaker; ACAT pair canonical (sku 32, active=false)
--     wins formula but Gary Option B override picks -2 (active=true).
--
-- Cleanup actions:
--   Step 1: Snapshot all 22 methylation-snp rows to
--           public.products_methylation_backup_142c (idempotent INSERT).
--   Step 2: Forward-fill 19 normal pairs canonical winner from -2 loser
--           (description COALESCE NULLIF, ingredients/images/snp_targets/
--           status_tags via array-empty CASE, price_msrp/bioavailability_pct
--           via COALESCE). Skips ACAT (handled separately Option B).
--   Step 3: Audit-log all 22 rows to be deleted (each backfill_audit row
--           captures full to_jsonb of the deleted row in old_value for
--           rollback per #142c §0 hard rule 5).
--   Step 4: DELETE 22 rows: 19 -2 losers (non-ACAT) + 1 ACAT canonical
--           (inactive) + 1 APOE+ (FC-APOE-001) + 1 CYP450+ (FC-CYP-001).
--   Step 5: ACAT slug rename: -2 slug acat-plus-mitochondrial-support-2 to
--           canonical acat-plus-mitochondrial-support (now free post-delete).
--           Audit-log the rename.
--
-- Post-cleanup expected state:
--   methylation-snp row count: 20 (down from 42)
--   All 20 canonical slugs present, active=true
--   Zero -2 suffix slugs remaining
--   Zero canonical-base duplicate groups
--
-- Idempotent: re-running this migration is a no-op since DELETE filters
-- check existence and the rename CTE only fires when the loser is gone.
--
-- Defensive: WHERE category != 'peptide' on every UPDATE/DELETE.
-- Audit trail: every destructive operation writes to backfill_audit
-- with old_value as full to_jsonb of the row plus method classification.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count_snapshot integer := 0;
    v_count_filled integer := 0;
    v_count_audit integer := 0;
    v_count_deleted integer := 0;
    v_count_renamed integer := 0;
BEGIN
    -- Step 1: Snapshot
    CREATE TABLE IF NOT EXISTS public.products_methylation_backup_142c (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        snapshot_at timestamptz NOT NULL DEFAULT now(),
        original_id uuid NOT NULL,
        full_row jsonb NOT NULL
    );

    WITH snap AS (
        INSERT INTO public.products_methylation_backup_142c (original_id, full_row)
        SELECT p.id, to_jsonb(p)
        FROM public.products p
        WHERE p.category_slug = 'methylation-snp'
          AND p.category != 'peptide'
          AND NOT EXISTS (
              SELECT 1 FROM public.products_methylation_backup_142c b
              WHERE b.original_id = p.id
          )
        RETURNING 1
    )
    SELECT count(*) INTO v_count_snapshot FROM snap;

    -- Step 2: Forward-fill 19 normal pairs (canonical winner from -2 loser)
    -- Skips ACAT pair (handled in steps 4 plus 5 with Option B override)
    WITH filled AS (
        UPDATE public.products w
        SET
            description = COALESCE(NULLIF(w.description, ''), l.description),
            summary = COALESCE(NULLIF(w.summary, ''), l.summary),
            ingredients = CASE
                WHEN jsonb_array_length(COALESCE(w.ingredients, '[]'::jsonb)) = 0
                THEN l.ingredients
                ELSE w.ingredients
            END,
            image_urls = CASE
                WHEN jsonb_array_length(COALESCE(w.image_urls, '[]'::jsonb)) = 0
                THEN l.image_urls
                ELSE w.image_urls
            END,
            snp_targets = CASE
                WHEN jsonb_array_length(COALESCE(w.snp_targets, '[]'::jsonb)) = 0
                THEN l.snp_targets
                ELSE w.snp_targets
            END,
            status_tags = CASE
                WHEN jsonb_array_length(COALESCE(w.status_tags, '[]'::jsonb)) = 0
                THEN l.status_tags
                ELSE w.status_tags
            END,
            price_msrp = COALESCE(w.price_msrp, l.price_msrp),
            bioavailability_pct = COALESCE(w.bioavailability_pct, l.bioavailability_pct),
            testing_meta = CASE
                WHEN w.testing_meta IS NULL OR w.testing_meta = '{}'::jsonb
                THEN l.testing_meta
                ELSE w.testing_meta
            END
        FROM public.products l
        WHERE w.category_slug = 'methylation-snp'
          AND w.category != 'peptide'
          AND w.slug NOT LIKE '%-2'
          AND w.slug != 'acat-plus-mitochondrial-support'
          AND l.category_slug = 'methylation-snp'
          AND l.category != 'peptide'
          AND l.slug = w.slug || '-2'
        RETURNING w.id
    )
    SELECT count(*) INTO v_count_filled FROM filled;

    -- Step 3: Audit-log all 22 rows about to be deleted
    -- old_value captures full to_jsonb(row) for rollback per #142c §0 rule 5
    WITH audited AS (
        INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
        SELECT v_run_id, '142c_methylation_dedupe', 'products', p.sku, p.id,
            jsonb_build_object(
                'method', CASE
                    WHEN p.slug LIKE '%-2' AND p.slug != 'acat-plus-mitochondrial-support-2'
                        THEN 'duplicate_minus2_row_delete'
                    WHEN p.slug = 'acat-plus-mitochondrial-support' AND p.active = false
                        THEN 'acat_inactive_canonical_delete_option_B'
                    WHEN p.slug IN ('apoe-plus', 'cyp450-plus')
                        THEN 'unauthorized_singleton_delete_gary_directive'
                    ELSE 'unknown'
                END,
                'old_value', to_jsonb(p),
                'new_value', NULL,
                'rule_applied', '142c_methylation_dedupe',
                'audit_mode', 'force_destructive_post_audit_approval',
                'authority', 'Gary canonical 2026-04-30 audit approval; ACAT Option B; APOE plus CYP450 unauthorized'
            )
        FROM public.products p
        WHERE p.category_slug = 'methylation-snp'
          AND p.category != 'peptide'
          AND (
              (p.slug LIKE '%-2' AND p.slug != 'acat-plus-mitochondrial-support-2')
              OR (p.slug = 'acat-plus-mitochondrial-support' AND p.active = false)
              OR p.slug IN ('apoe-plus', 'cyp450-plus')
          )
          AND NOT EXISTS (
              SELECT 1 FROM public.backfill_audit ba
              WHERE ba.product_id = p.id
                AND ba.source_table = '142c_methylation_dedupe'
          )
        RETURNING 1
    )
    SELECT count(*) INTO v_count_audit FROM audited;

    -- Step 4: DELETE 22 rows
    WITH deleted AS (
        DELETE FROM public.products
        WHERE category_slug = 'methylation-snp'
          AND category != 'peptide'
          AND (
              (slug LIKE '%-2' AND slug != 'acat-plus-mitochondrial-support-2')
              OR (slug = 'acat-plus-mitochondrial-support' AND active = false)
              OR slug IN ('apoe-plus', 'cyp450-plus')
          )
        RETURNING 1
    )
    SELECT count(*) INTO v_count_deleted FROM deleted;

    -- Step 5: ACAT slug rename (Option B): -2 takes canonical slug
    WITH renamed AS (
        UPDATE public.products
        SET slug = 'acat-plus-mitochondrial-support'
        WHERE slug = 'acat-plus-mitochondrial-support-2'
          AND category_slug = 'methylation-snp'
          AND category != 'peptide'
          AND NOT EXISTS (
              SELECT 1 FROM public.products p2
              WHERE p2.slug = 'acat-plus-mitochondrial-support'
                AND p2.id != public.products.id
          )
        RETURNING id, sku
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, '142c_methylation_dedupe', 'products', sku, id,
        jsonb_build_object(
            'method', 'acat_minus2_slug_rename_option_B',
            'old_value', 'acat-plus-mitochondrial-support-2',
            'new_value', 'acat-plus-mitochondrial-support',
            'rule_applied', '142c_methylation_dedupe',
            'audit_mode', 'rename_after_delete',
            'authority', 'Gary canonical 2026-04-30 ACAT Option B keep active row plus rename'
        )
    FROM renamed;
    GET DIAGNOSTICS v_count_renamed = ROW_COUNT;

    RAISE NOTICE 'Phase 142c methylation dedupe: snapshot=% filled=% audit=% deleted=% renamed=% run_id=%',
        v_count_snapshot, v_count_filled, v_count_audit, v_count_deleted, v_count_renamed, v_run_id;
END $$;
