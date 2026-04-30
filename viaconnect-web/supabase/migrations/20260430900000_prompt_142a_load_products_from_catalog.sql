-- Prompt #142a: Load public.products from public.product_catalog and
-- public.master_skus.
--
-- Predecessor to Prompt #142 v2 Phase A. Populates the empty products
-- table with one row per product_catalog row (93 expected), preserving
-- the master_sku FK chain to master_skus for Phase A's price_msrp
-- COALESCE rule.
--
-- Schema additions:
--   - products.master_sku text FK to master_skus(sku). The F141 v3
--     schema extension assumed products.sku = master_skus.sku, which
--     does not hold in production data (FC-NAME-001 vs "01"-"64").
--     This column preserves the join.
--   - public.backfill_audit table for run-keyed rollback support.
--
-- Column mapping (per #142a §4 + post-pre-flight category collapse):
--   sku, name, price, image_url, active, created_at: direct copy
--   description: COALESCE(short_description, description, '')
--   short_name: name (product_catalog has no short_name)
--   format: LOWER(delivery_form), with test_kit / test kit -> kit
--   pricing_tier: 'L1' default (Q1 recommendation; L3/L4 tagging deferred)
--   master_sku: product_catalog.master_sku (FK string)
--   category: COLLAPSE 11 legacy product_catalog.category values into the
--     4 products.category CHECK-allowed values. test_kit + Testing -> 'test_kit'
--     (7 rows total: 5 GeneX360 panels + CannabisIQ + PeptidesIQ);
--     all other legacy categories (genetic, snp, advanced, womens, base,
--     mushroom, childrens, core, supplement) -> 'supplement' (86 rows).
--     Zero rows -> peptide or cannabis. The granular legacy classification
--     is preserved and surfaced via category_slug in #142 v2 Phase B.
--
-- All F141 v3 new columns stay NULL: category_slug, slug, summary,
-- status_tags, image_urls, testing_meta, snp_targets, bioavailability_pct,
-- product_type, ingredients, price_msrp, gene_match_score,
-- requires_practitioner_order. #142 v2 Phase A populates them.
--
-- Idempotency: ON CONFLICT (sku) DO NOTHING. Re-runs are no-ops on
-- existing rows.
--
-- Pre-flight verified before this migration:
--   - 93 rows in product_catalog, all unique SKUs, zero peptide rows
--   - All non-NULL master_sku values resolve in master_skus (no FK orphans)
--   - delivery_form normalization rules cover all 8 distinct values
--   - products.category CHECK constraint allows only ('supplement',
--     'test_kit', 'peptide', 'cannabis'); 11 legacy product_catalog
--     categories require collapse to two of those four values

-- Schema: master_sku FK column on products
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS master_sku text
    REFERENCES public.master_skus(sku) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_master_sku
    ON public.products(master_sku)
    WHERE master_sku IS NOT NULL;

-- Audit log table for #142a + future backfill runs.
CREATE TABLE IF NOT EXISTS public.backfill_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL,
    source_table text NOT NULL,
    target_table text NOT NULL,
    sku text,
    product_id uuid,
    columns_loaded jsonb NOT NULL DEFAULT '{}'::jsonb,
    applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backfill_audit_run_id
    ON public.backfill_audit(run_id);

CREATE INDEX IF NOT EXISTS idx_backfill_audit_target_sku
    ON public.backfill_audit(target_table, sku);

ALTER TABLE public.backfill_audit ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies for authenticated. RLS-on
-- plus no policy equals deny-all for non-service-role callers. Reads
-- happen via createAdminClient (admin reconciler / rollback tooling)
-- and writes happen inside the SECURITY-context-elevated migration
-- itself.

COMMENT ON TABLE public.backfill_audit IS
    '#142a: append-only audit log for backfill runs. service_role-only access. Rollback via DELETE FROM <target_table> WHERE id IN (SELECT product_id FROM backfill_audit WHERE run_id = <id>).';

-- Load: product_catalog -> products with run-keyed audit trail.
DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_audit_count integer;
BEGIN
    WITH inserted AS (
        INSERT INTO public.products (
            sku,
            name,
            short_name,
            description,
            category,
            price,
            image_url,
            active,
            created_at,
            pricing_tier,
            master_sku,
            format
        )
        SELECT
            pc.sku,
            pc.name,
            pc.name,
            COALESCE(pc.short_description, pc.description, ''),
            CASE
                WHEN LOWER(pc.category) IN ('test_kit', 'testing') THEN 'test_kit'
                ELSE 'supplement'
            END,
            pc.price,
            pc.image_url,
            COALESCE(pc.active, true),
            pc.created_at,
            'L1',
            pc.master_sku,
            CASE
                WHEN LOWER(pc.delivery_form) IN ('test_kit', 'test kit') THEN 'kit'
                ELSE LOWER(pc.delivery_form)
            END
        FROM public.product_catalog pc
        ON CONFLICT (sku) DO NOTHING
        RETURNING id, sku
    )
    INSERT INTO public.backfill_audit (
        run_id,
        source_table,
        target_table,
        sku,
        product_id,
        columns_loaded
    )
    SELECT
        v_run_id,
        'product_catalog',
        'products',
        i.sku,
        i.id,
        jsonb_build_object(
            'load_phase', '142a',
            'columns', jsonb_build_array(
                'sku', 'name', 'short_name', 'description', 'category',
                'price', 'image_url', 'active', 'created_at', 'pricing_tier',
                'master_sku', 'format'
            )
        )
    FROM inserted i;

    GET DIAGNOSTICS v_audit_count = ROW_COUNT;
    RAISE NOTICE '#142a load complete: % rows inserted into products with run_id %', v_audit_count, v_run_id;
END $$;
