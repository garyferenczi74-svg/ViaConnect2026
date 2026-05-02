-- Prompt #144 v2 v2_rev1 alignment: 8 format drifts to match canonical
-- export delivered by Gary 2026-05-02 at scripts/144v2/vc_master_formulations_v2_rev1.json.
--
-- Per #142 v3 §11 standing xlsx revision tracking protocol, Gary's
-- delivery of v2_rev1 is the explicit promotion to canonical with
-- written signoff (the prompt message itself). The 8 format changes
-- below reconcile production to v2_rev1.
--
-- Format drifts (all are force overwrites; values diverged from
-- canonical and Gary signed off on canonical):
--   bhb-ketone-salts          capsule -> tablet   (reverts #144 v2 Phase 2;
--                                                  bottle photo was correct;
--                                                  prior capsule directive
--                                                  superseded by v2_rev1)
--   cyclesync-plus            capsule -> powder
--   menobalance-plus          capsule -> powder
--   radiance-plus             capsule -> powder
--   shred-plus                capsule -> powder
--   sproutables-infant-tincture liquid -> tincture
--                                                 (introduces tincture as
--                                                  format token; FormatIndicator
--                                                  is permissive lowercase
--                                                  toLower; no allowed-set
--                                                  enforcement at DB level)
--   teloprime-plus-telomere-support  capsule -> powder
--   thyrobalance-plus         capsule -> powder
--
-- Intentionally HELD (canonical diverges from latest Gary intermediate
-- directive; canonical does NOT supersede recent explicit Gary moves):
--   neurocalm-plus  category_slug   advanced-formulas (canonical) vs
--                                   base-formulations (production)
--                                   Gary Phase L 2026-04-30 explicitly
--                                   moved to base-formulations.
--                                   HOLD per most-recent-Gary-directive-wins.
--   aptigen-complex                 deleted Phase L 2026-04-30 per
--                                   Gary directive replace with NeuroCalm+.
--                                   HOLD; do not auto-reinsert from canonical.
--
-- Slug aliases (production slug stable; canonical informational only):
--   inferno-plus-glp-1-activator-complex (canonical) <-> glp-1-activator-complex
--                                   (production). Renaming the production
--                                   slug would break #142d image_urls map
--                                   and the #142c canonical_slug_per_category
--                                   unique partial index. Production slug
--                                   remains glp-1-activator-complex.
--   lion-s-mane-mushroom-capsules (canonical) <-> lions-mane-mushroom-capsules
--                                   (production). Same constraints; production
--                                   slug remains lions-mane.
--
-- Idempotent: WHERE format != canonical guard means re-runs are no-ops.
-- Defensive: WHERE category != 'peptide' on every UPDATE.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
BEGIN
    WITH canonical_format(slug, target_format) AS (
        VALUES
            ('bhb-ketone-salts', 'tablet'),
            ('cyclesync-plus', 'powder'),
            ('menobalance-plus', 'powder'),
            ('radiance-plus', 'powder'),
            ('shred-plus', 'powder'),
            ('sproutables-infant-tincture', 'tincture'),
            ('teloprime-plus-telomere-support', 'powder'),
            ('thyrobalance-plus', 'powder')
    ),
    updated AS (
        UPDATE public.products p
        SET format = c.target_format
        FROM canonical_format c
        WHERE p.slug = c.slug
          AND p.category != 'peptide'
          AND p.format IS DISTINCT FROM c.target_format
        RETURNING p.id, p.sku, p.name, p.slug, p.format AS new_format,
            (SELECT format FROM canonical_format cc WHERE cc.slug = p.slug) AS expected_format
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, '144v2_v2_rev1_format_alignment', 'products', sku, id,
        jsonb_build_object(
            'column', 'format',
            'method', 'v2_rev1_canonical_alignment',
            'audit_mode', 'force_per_canonical_promotion',
            'rule_applied', 'v2_rev1_format_alignment',
            'product_name', name,
            'product_slug', slug,
            'new_value', new_format,
            'authority', 'Gary canonical vc_master_formulations_v2_rev1.json delivered 2026-05-02'
        )
    FROM updated;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    RAISE NOTICE 'v2_rev1 format alignment: rows updated=% / 8 expected; run_id=%', v_count, v_run_id;
END $$;
