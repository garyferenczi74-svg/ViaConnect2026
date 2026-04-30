-- Prompt #142 v2 Phase A: auto-derived columns on public.products.
--
-- Per #142 v2 §3 Phase A, four columns are populated by deterministic
-- rules with zero copy authored:
--   1. product_type: direct copy of products.category
--   2. price_msrp: COALESCE(master_skus.msrp, products.price)
--   3. requires_practitioner_order: pricing_tier IN ('L3','L4')
--   4. slug: kebab-case derivation from name with dedupe
--
-- Spec amendments applied (documented at #142 v2 Phase A pre-flight):
--
--   Amendment 1 (price_msrp join): The spec says "joined on sku" but
--     production products.sku follows the FC-NAME-001 pattern while
--     master_skus.sku follows "01"-"64". They do not directly join.
--     #142a added products.master_sku as a text FK to master_skus.sku
--     specifically to bridge this. Phase A uses the master_sku FK for
--     the join, falling back to products.price for the 9 rows where
--     master_sku is NULL.
--
--   Amendment 2 (requires_practitioner_order skip): All 93 rows after
--     #142a load have pricing_tier='L1' (default) and
--     requires_practitioner_order=false (default). The rule produces
--     false for every row. The UPDATE would be a no-op. Skipped here
--     with the understanding that a future L3/L4 tagging phase will
--     update both pricing_tier AND requires_practitioner_order
--     together. Documented in §6 verification: a future re-derive
--     after L3/L4 tagging must re-run this column.
--
-- Idempotency: COALESCE pattern. UPDATE only WHERE target IS NULL.
-- Safe to re-run on the same dataset.
--
-- Defensive peptide exclusion: every UPDATE includes
-- WHERE category != 'peptide'. Currently zero peptide rows in products
-- (verified pre-flight) but the guard is mandated by #142 v2 §0 rule 1.
--
-- Audit trail: writes one row per UPDATE'd product into backfill_audit
-- with run_id, source_table='phase_a_derive', columns_loaded list.
--
-- Slug derivation rules (per #142 v2 §3 Phase A table 1):
--   1. lowercase
--   2. strip ™ (U+2122)
--   3. replace + with -plus
--   4. replace & with -and-
--   5. replace U+2013 (en-dash) and U+2014 (em-dash) with -
--   6. replace anything non-alphanumeric-non-dash with -
--   7. collapse runs of dashes
--   8. trim leading/trailing dashes
--   9. dedupe collisions with -2, -3, etc. via ROW_NUMBER over base_slug
--
-- Duplicate-name observation: production has ~7 confirmed name dupes
-- (genetic + snp legacy parallel category lines collapsed to
-- category='supplement' by #142a). Dedupe rule produces -2 suffix on
-- the second occurrence; e.g., two "ACAT+ Mitochondrial Support" rows
-- produce slugs "acat-plus-mitochondrial-support" and
-- "acat-plus-mitochondrial-support-2". Acceptable per spec; future
-- merge/reconcile phase may decide to consolidate.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_product_type_count integer;
    v_price_msrp_count integer;
    v_slug_count integer;
BEGIN
    -- Rule 1: product_type direct copy from category.
    WITH updated AS (
        UPDATE public.products
        SET product_type = category
        WHERE product_type IS NULL
          AND category != 'peptide'
        RETURNING id, sku
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_a_derive',
        'products',
        u.sku,
        u.id,
        jsonb_build_object('column', 'product_type', 'rule', 'category direct copy')
    FROM updated u;
    GET DIAGNOSTICS v_product_type_count = ROW_COUNT;

    -- Rule 2: price_msrp via master_sku FK (Amendment 1).
    WITH updated AS (
        UPDATE public.products p
        SET price_msrp = COALESCE(
            (SELECT ms.msrp FROM public.master_skus ms WHERE ms.sku = p.master_sku),
            p.price
        )
        WHERE p.price_msrp IS NULL
          AND p.category != 'peptide'
        RETURNING id, sku
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_a_derive',
        'products',
        u.sku,
        u.id,
        jsonb_build_object('column', 'price_msrp', 'rule', 'COALESCE(master_skus.msrp via master_sku FK, products.price)')
    FROM updated u;
    GET DIAGNOSTICS v_price_msrp_count = ROW_COUNT;

    -- Rule 3: requires_practitioner_order is currently false for all 93
    -- rows (Amendment 2). Skipped here. Future L3/L4 tagging phase
    -- updates pricing_tier AND requires_practitioner_order together.

    -- Rule 4: slug derivation with dedupe.
    WITH base_slugs AS (
        SELECT
            id,
            sku,
            TRIM(BOTH '-' FROM
                regexp_replace(
                    regexp_replace(
                        regexp_replace(
                            regexp_replace(
                                regexp_replace(
                                    regexp_replace(
                                        regexp_replace(
                                            LOWER(name),
                                            E'™', '', 'g'
                                        ),
                                        '\+', '-plus', 'g'
                                    ),
                                    '&', '-and-', 'g'
                                ),
                                E'–', '-', 'g'
                            ),
                            E'—', '-', 'g'
                        ),
                        '[^a-z0-9-]+', '-', 'g'
                    ),
                    '-+', '-', 'g'
                )
            ) AS base_slug
        FROM public.products
        WHERE slug IS NULL AND category != 'peptide'
    ),
    ranked AS (
        SELECT
            id,
            sku,
            base_slug,
            ROW_NUMBER() OVER (PARTITION BY base_slug ORDER BY id) AS dup_idx
        FROM base_slugs
    ),
    final_slugs AS (
        SELECT
            id,
            sku,
            CASE
                WHEN dup_idx = 1 THEN base_slug
                ELSE base_slug || '-' || dup_idx::text
            END AS final_slug
        FROM ranked
    ),
    updated AS (
        UPDATE public.products p
        SET slug = f.final_slug
        FROM final_slugs f
        WHERE p.id = f.id
        RETURNING p.id, p.sku
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_a_derive',
        'products',
        u.sku,
        u.id,
        jsonb_build_object('column', 'slug', 'rule', 'kebab-case from name with -2/-3 dedupe')
    FROM updated u;
    GET DIAGNOSTICS v_slug_count = ROW_COUNT;

    RAISE NOTICE 'Phase A derive complete: product_type=%, price_msrp=%, slug=% rows updated; run_id=%',
        v_product_type_count, v_price_msrp_count, v_slug_count, v_run_id;
END $$;
