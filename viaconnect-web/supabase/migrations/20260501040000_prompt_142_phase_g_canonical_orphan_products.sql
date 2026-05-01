-- Prompt #142 v2 Phase G: resolve the 2 canonical-orphan products by
-- INSERTing new rows for Aptigen Complex and NeuroAxis+.
--
-- Phase D.5 surfaced 2 canonical orphans (entries in
-- vc_master_formulations.json with no matching public.products row):
--   1. Aptigen Complex
--   2. NeuroAxis+
--
-- Gary categorized them on 2026-04-30:
--   - Aptigen Complex → base-formulations (category=supplement)
--   - NeuroAxis+      → advanced-formulas (category=supplement)
--
-- This Phase INSERTs both products with the canonical ingredient data
-- (from the JSON heredoc embedded in Phase D.5 migration) plus the
-- standard product columns derived from spec patterns:
--   - sku: FC-{NAME}-001 pattern (FC-APTIGEN-001, FC-NEUROAXIS-001)
--   - slug: lowercase + plus-replacement ("aptigen-complex", "neuroaxis-plus")
--   - short_name: name verbatim
--   - description: brief Marshall-safe storefront copy (mood/cognitive
--       focus reflecting canonical formulation purpose)
--   - summary: copied from description (Phase C T1 pattern)
--   - product_type: 'supplement'
--   - category: 'supplement'
--   - status_tags: ['TIER 3'] for NeuroAxis+ (advanced-formulas trigger
--       per #142 v2 §4 Phase E logic); [] for Aptigen Complex (base)
--   - price: 0 placeholder; price_msrp NULL (Gary admin-CSV follow-up)
--   - image_urls: [] (no Products bucket image yet; manual upload)
--   - ingredients: from canonical, schema-transformed mg→dose
--   - testing_meta: '{}' (default; not testing kits)
--   - snp_targets: [] (not SNP support products)
--   - bioavailability_pct: NULL (admin CSV)
--   - active: true (default; ready to display once price + image filled)
--   - pricing_tier: 'L1' (default)
--
-- Defensive: ON CONFLICT (sku) DO NOTHING so re-running is a no-op.
-- Audit log captures method 'orphan_canonical_insert' plus pending-flags
-- for price/image/summary review.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_inserted_count integer := 0;
    v_aptigen_id uuid;
    v_neuroaxis_id uuid;
BEGIN
    INSERT INTO public.products (
        sku, name, short_name, description, summary, slug,
        category, category_slug, product_type, pricing_tier,
        price, price_msrp, image_urls, ingredients, status_tags,
        snp_targets, testing_meta, requires_practitioner_order, active
    ) VALUES (
        'FC-APTIGEN-001',
        'Aptigen Complex',
        'Aptigen Complex',
        'Mood, motivation, and cognitive resilience formula with dopamine pathway precursors and methylation cofactors',
        'Mood, motivation, and cognitive resilience formula with dopamine pathway precursors and methylation cofactors',
        'aptigen-complex',
        'supplement',
        'base-formulations',
        'supplement',
        'L1',
        0,
        NULL,
        '[]'::jsonb,
        jsonb_build_array(
            jsonb_build_object('name','L-Dopa (from Mucuna pruriens extract)','dose',30,'unit','mg','role',''),
            jsonb_build_object('name','Liposomal L-Tyrosine','dose',25,'unit','mg','role',''),
            jsonb_build_object('name','L-Phenylalanine','dose',15,'unit','mg','role',''),
            jsonb_build_object('name','Liposomal PQQ (Pyrroloquinoline Quinone)','dose',10,'unit','mg','role',''),
            jsonb_build_object('name','Liposomal Coenzyme Q10 (Ubiquinol)','dose',10,'unit','mg','role',''),
            jsonb_build_object('name','Liposomal 5-MTHF (5-Methyltetrahydrofolate)','dose',10,'unit','mg','role',''),
            jsonb_build_object('name','L-Citrulline Malate','dose',15,'unit','mg','role',''),
            jsonb_build_object('name','L-Arginine','dose',10,'unit','mg','role',''),
            jsonb_build_object('name','Liposomal Vitamin C','dose',10,'unit','mg','role',''),
            jsonb_build_object('name','Liposomal L-Theanine','dose',15,'unit','mg','role',''),
            jsonb_build_object('name','Liposomal Magnesium L-Threonate','dose',10,'unit','mg','role',''),
            jsonb_build_object('name','Micellar Lion''s Mane Extract (Hericenones)','dose',10,'unit','mg','role',''),
            jsonb_build_object('name','Saccharomyces Boulardii','dose',10,'unit','mg','role',''),
            jsonb_build_object('name','Lithium Orotate (Elemental Lithium ~1 mg)','dose',5,'unit','mg','role',''),
            jsonb_build_object('name','5-HTP','dose',5,'unit','mg','role','')
        ),
        '[]'::jsonb,
        '[]'::jsonb,
        '{}'::jsonb,
        false,
        true
    )
    ON CONFLICT (sku) DO NOTHING
    RETURNING id INTO v_aptigen_id;

    IF v_aptigen_id IS NOT NULL THEN
        v_inserted_count := v_inserted_count + 1;
    END IF;

    INSERT INTO public.products (
        sku, name, short_name, description, summary, slug,
        category, category_slug, product_type, pricing_tier,
        price, price_msrp, image_urls, ingredients, status_tags,
        snp_targets, testing_meta, requires_practitioner_order, active
    ) VALUES (
        'FC-NEUROAXIS-001',
        'NeuroAxis+',
        'NeuroAxis+',
        'Comprehensive nervous system support stack with Lion''s Mane, Bacopa, and methylated cofactors for axis-wide cognitive balance',
        'Comprehensive nervous system support stack with Lion''s Mane, Bacopa, and methylated cofactors for axis-wide cognitive balance',
        'neuroaxis-plus',
        'supplement',
        'advanced-formulas',
        'supplement',
        'L1',
        0,
        NULL,
        '[]'::jsonb,
        jsonb_build_array(
            jsonb_build_object('name','L-Methylfolate','dose',2,'unit','mg','role',''),
            jsonb_build_object('name','Methylcobalamin B12','dose',1,'unit','mg','role',''),
            jsonb_build_object('name','Pyridoxal-5-Phosphate (P5P)','dose',15,'unit','mg','role',''),
            jsonb_build_object('name','Riboflavin-5-Phosphate','dose',10,'unit','mg','role',''),
            jsonb_build_object('name','Magnesium L-Threonate','dose',80,'unit','mg','role',''),
            jsonb_build_object('name','Citicoline','dose',150,'unit','mg','role',''),
            jsonb_build_object('name','Phosphatidylserine','dose',100,'unit','mg','role',''),
            jsonb_build_object('name','Lion''s Mane Extract','dose',80,'unit','mg','role',''),
            jsonb_build_object('name','Bacopa Monnieri Extract','dose',60,'unit','mg','role',''),
            jsonb_build_object('name','L-Theanine','dose',50,'unit','mg','role',''),
            jsonb_build_object('name','N-Acetyl L-Tyrosine','dose',40,'unit','mg','role',''),
            jsonb_build_object('name','SAMe','dose',30,'unit','mg','role',''),
            jsonb_build_object('name','Alpha-GPC','dose',25,'unit','mg','role',''),
            jsonb_build_object('name','Pterostilbene','dose',15,'unit','mg','role',''),
            jsonb_build_object('name','Huperzine A','dose',0.2,'unit','mg','role',''),
            jsonb_build_object('name','Bioperine®','dose',5,'unit','mg','role',''),
            jsonb_build_object('name','Liposomal/Micellar Matrix','dose',36.8,'unit','mg','role','')
        ),
        jsonb_build_array('TIER 3'),
        '[]'::jsonb,
        '{}'::jsonb,
        false,
        true
    )
    ON CONFLICT (sku) DO NOTHING
    RETURNING id INTO v_neuroaxis_id;

    IF v_neuroaxis_id IS NOT NULL THEN
        v_inserted_count := v_inserted_count + 1;
    END IF;

    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_g_canonical_orphan_products',
        'products',
        sku,
        id,
        jsonb_build_object(
            'method', 'orphan_canonical_insert',
            'category_slug', category_slug,
            'ingredient_count', jsonb_array_length(ingredients),
            'tier_3_applied', status_tags ? 'TIER 3',
            'pending_review', jsonb_build_array(
                'price_msrp_admin_csv',
                'image_url_manual_upload',
                'description_marshall_validation_hannah_agent'
            ),
            'product_name', name
        )
    FROM public.products
    WHERE sku IN ('FC-APTIGEN-001', 'FC-NEUROAXIS-001');

    RAISE NOTICE 'Phase G canonical orphan products: inserted=% / 2 expected; run_id=%',
        v_inserted_count, v_run_id;
END $$;
