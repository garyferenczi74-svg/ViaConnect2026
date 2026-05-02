-- Prompt #145: Amino Acid Matrix+ canonicalization per Gary 2026-05-02.
--
-- Spec intent was INSERT new SKU but FC-AMINO-001 with slug
-- amino-acid-matrix-plus already existed in production from the #142a
-- load with ingredients=[] and stale description ("Complete amino acid
-- stack with BCAAs, Glutamine, Lysine, Arginine, and Taurine") that
-- references ingredients NOT in the new spec formulation. Gary chose
-- Option A 2026-05-02: UPDATE the existing row with the full spec
-- data rather than INSERT new SKU. This waives #145 §0 hard rule 1
-- (do not touch existing product rows) for this single intentional
-- canonicalization.
--
-- Updates per #145 spec:
--   name              AMINO ACID MATRIX+ -> Amino Acid Matrix+ (proper case)
--   short_name        same as name
--   summary           §4.1 short blurb (50 words / 312 chars, Marshall-reviewed)
--   description       §4.2 long-form (290 words, Marshall-reviewed)
--   ingredients       9 essential amino acids per §2 (2000mg total)
--   price             44.99 -> 58.88 (Base Formulations price band align)
--   price_msrp        44.99 -> 58.88
--   pricing_tier      L1 -> L2 (Base Formulations tier convention)
--   status_tags       [] -> ["NEW"] (60-day window per #142 v3 §6.8)
--
-- Held columns (already correct, no change):
--   slug              amino-acid-matrix-plus
--   category          supplement
--   category_slug     base-formulations
--   format            powder
--   active            true
--   image_urls        [] (deferred to #145a image pinning)
--   testing_meta      {} (n/a for non-genex360)
--   snp_targets       [] (n/a for non-methylation)
--   bioavailability_pct  NULL (admin CSV, deferred)
--   requires_practitioner_order  false
--
-- Marshall scan: scanner not script-invocable per #142 v3 OQ1; Gary's
-- authoring of the §4.1 + §4.2 drafts in the spec body constitutes the
-- human-review fallback per spec §4.3. Review record at
-- scripts/145/marshall_scan_log.txt and copy at scripts/145/copy_drafts.md.
--
-- Audit trail: full to_jsonb of pre-update row in old_value plus
-- post-update row in new_value plus method update_existing_stub_per_145
-- plus rule_applied new_sku_145 plus authority Gary Option A 2026-05-02.
--
-- Idempotent: WHERE pricing_tier IS DISTINCT FROM 'L2' OR ingredients
-- jsonb_array_length 0 ensures re-runs are no-ops once values match
-- canonical. The status_tags NEW will auto-clear via #142 v3 §6.8 trigger
-- when created_at exceeds 60 days; not handled here since created_at is
-- preserved from the original #142a load.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.sku = 'FC-AMINO-001'
      AND p.slug = 'amino-acid-matrix-plus'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#145 Amino Acid Matrix+ update skipped: row not found at FC-AMINO-001 + slug amino-acid-matrix-plus';
        RETURN;
    END IF;

    UPDATE public.products
    SET
        name = 'Amino Acid Matrix+',
        short_name = 'Amino Acid Matrix+',
        summary = 'A complete profile of nine essential amino acids in a single scoop. Leucine-forward 2:1:1 BCAA ratio supports muscle synthesis and recovery, paired with the full essential amino acid spectrum your body cannot produce on its own. 2000mg per scoop, daily-use foundational support for active adults.',
        description = E'Amino acids are the building blocks of every protein your body makes. Of the twenty proteinogenic amino acids, nine are classified as essential because the human body cannot synthesize them and must obtain them through diet or supplementation. Amino Acid Matrix+ delivers all nine in a single 2000mg scoop, formulated with the dose ratios and forms that clinical research consistently associates with optimal absorption and downstream utilization.\n\nThe leucine-forward 2:1:1 ratio of branched-chain amino acids (leucine, isoleucine, valine) reflects a body of mTOR signaling research showing that leucine in particular acts as a primary trigger for muscle protein synthesis. The 500mg leucine dose per scoop sits within the range that has been shown to acutely stimulate the muscle-building pathway in healthy adults.\n\nBeyond the BCAAs, the formulation includes L-Lysine, L-Threonine, L-Phenylalanine, L-Methionine, L-Histidine, and L-Tryptophan to round out the complete essential amino acid profile. L-Lysine appears in HCl form for improved water solubility, which matters in a powder format intended to dissolve cleanly.\n\nAmino Acid Matrix+ is foundational daily-use support, not a peri-workout sports formula. The 2000mg per scoop is calibrated for a daily protein-quality top-up rather than the larger 5 to 10 gram doses typical of pre or post training products. Mix one scoop in 8 to 12 ounces of water and consume any time of day. Taste is naturally mild; combines well with Electrolyte Blend or any flavored beverage.\n\nFormulated for active adults, plant-forward eaters, and anyone whose dietary protein intake may not consistently include all nine essential amino acids in optimal ratios. Made with third-party tested raw materials in a GMP-certified facility.',
        ingredients = jsonb_build_array(
            jsonb_build_object('name','L-Leucine','dose',500,'unit','mg','role',''),
            jsonb_build_object('name','L-Isoleucine','dose',250,'unit','mg','role',''),
            jsonb_build_object('name','L-Valine','dose',250,'unit','mg','role',''),
            jsonb_build_object('name','L-Lysine HCl','dose',250,'unit','mg','role',''),
            jsonb_build_object('name','L-Threonine','dose',200,'unit','mg','role',''),
            jsonb_build_object('name','L-Phenylalanine','dose',200,'unit','mg','role',''),
            jsonb_build_object('name','L-Methionine','dose',175,'unit','mg','role',''),
            jsonb_build_object('name','L-Histidine','dose',100,'unit','mg','role',''),
            jsonb_build_object('name','L-Tryptophan','dose',75,'unit','mg','role','')
        ),
        price = 58.88,
        price_msrp = 58.88,
        pricing_tier = 'L2',
        status_tags = jsonb_build_array('NEW')
    WHERE id = v_product_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    SELECT to_jsonb(p) INTO v_post_row FROM public.products p WHERE p.id = v_product_id;

    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    VALUES (
        v_run_id,
        '145_amino_acid_matrix_plus_update',
        'products',
        'FC-AMINO-001',
        v_product_id,
        jsonb_build_object(
            'method', 'update_existing_stub_per_145_gary_option_a',
            'columns', jsonb_build_array('name','short_name','summary','description','ingredients','price','price_msrp','pricing_tier','status_tags'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'new_sku_145',
            'audit_mode', 'force_update_existing_stub_row',
            'authority', 'Gary canonical 2026-05-02 Prompt #145 Option A waive hard rule 1 for this intentional canonicalization',
            'marshall_scan', 'human_review_fallback_per_142v3_oq1_unresolved',
            'product_name', 'Amino Acid Matrix+'
        )
    );

    RAISE NOTICE '#145 Amino Acid Matrix+ update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
