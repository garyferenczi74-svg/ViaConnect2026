-- Prompt #152f-rev2: BHB Ketone Salts PDP revision (rev2 structured Lane-1-collapsed-to-Lane-2 reconciled).
--
-- SUPERSEDES the original #152f paragraph copy (commit 2e88997, 2026-05-04)
-- with the rev2 structured-markdown format that renders inside the canonical
-- 152p Accordion via the existing renderStructuredDescription parser. Updates
-- both summary (catalog card one-sentence three-pillar-led highlight per
-- Fuel | Focus | Endure positioning) and description (## What does X do? +
-- ## Ingredient breakdown + ## Who benefits and what makes this different).
--
-- Lane reconciliation per Gary directive 2026-05-05 (the new standing rule
-- feedback_152p_canonical_for_all_formulation_updates: every future PDP
-- product update follows the 152p design with Lane-2 live-formulation
-- reconciliation as default). Original 152f-rev2 spec claimed 7-ingredient
-- four-mineral salt matrix totaling 3,210 mg per serving including Potassium
-- BHB + L-Leucine + Bioperine + MCT C8 powder + "without liposomal
-- carriers" framing. Live row at slug bhb-ketone-salts has 4 ingredients
-- totaling 170 mg per serving with three-mineral matrix (calcium, magnesium,
-- sodium) and Liposomal Organic MCT carrier. Gary picked Lane 1 (reformulate
-- first), but the canonical formulation Gary then pasted MATCHES the live
-- row exactly, collapsing Lane 1 to Lane 2 outcome (live IS canonical;
-- no ingredients-update migration required). This single migration
-- reconciles the rev2 description copy to the live formulation.
--
-- Lane-1-collapsed-to-Lane-2 corrections (15 total):
--   1. 7-ingredient -> 4-ingredient
--   2. four-mineral salt matrix -> three-mineral salt matrix
--   3. Drop Potassium BHB bullet (not in live)
--   4. Drop L-Leucine bullet (not in live)
--   5. Drop Bioperine bullet (not in live)
--   6. MCT bullet: "MCT Powder (C8 Caprylic Acid)" -> "Liposomal Organic MCT"
--      matching live ingredient name verbatim
--   7. Opening paragraph: drop "3,210 mg of pharmaceutical-grade actives per
--      serving" claim (live total 170 mg, 19x lower; omitted from prose,
--      lives in formulation table)
--   8. Opening paragraph: drop "without requiring liposomal carriers" claim
--      (live MCT IS liposomal; the spec's own tablet-no-carrier framing was
--      contradicted by the live formulation)
--   9. Opening paragraph: drop "L-leucine for mTOR muscle preservation"
--      reference (no L-Leucine in live)
--  10. Opening paragraph: drop "Bioperine for absorption support" reference
--      (no Bioperine in live)
--  11. Opening paragraph: drop "potassium-bound BHB" reference (no Potassium
--      BHB in live)
--  12. Opening paragraph: drop "MCT C8 powder for endogenous ketogenesis
--      support" -> "Liposomal Organic MCT for endogenous ketogenesis support"
--      matching live carrier
--  13. Closing paragraph: drop "four-mineral" + Potassium reference;
--      "three-mineral salt matrix (calcium, magnesium, sodium)"
--  14. Closing paragraph: drop "MCT C8 inclusion for endogenous ketogenesis"
--      -> "Liposomal Organic MCT inclusion for endogenous ketogenesis"
--  15. Closing paragraph: drop "L-leucine addition for muscle preservation
--      during ketosis" reference + drop "second non-capsule format in the
--      152 series and the first tablet format" series-meta reference
--      (consumer-PDP should not reference internal series numbering).
--
-- Drift notes (verified live 2026-05-05 before authoring):
--   * Slug bhb-ketone-salts confirmed live (matches first spec candidate).
--   * SKU FC-BHB-001 (matches the 152x SKU convention).
--   * Live ingredient count 4 totaling 170mg/serving (Gary canonical
--     2026-05-05: matches Supabase row 1:1, NOT the spec's 3,210 mg /
--     7-ingredient framing).
--   * price_msrp $68.88 ends in .88 per convention.
--   * Format: tablet (NOT capsule, NOT liposomal CAPSULE; one ingredient
--     uses Liposomal carrier but the format is still tablet).
--   * Spec invented backfill_audit columns (prompt_ref, target_key, field,
--     old_value, new_value); live schema is (run_id, source_table,
--     target_table, sku, product_id, columns_loaded jsonb, applied_at).
--     Mirroring 152a/c/d/e-rev2/p family pattern.
--
-- Bioavailability claim posture:
--   - 10x to 28x multiplier INTENTIONALLY ABSENT per spec's tablet format-
--     deviation note + auto-remediator exemption.
--   - Even though live MCT carries a Liposomal prefix (which would normally
--     trigger feedback_pdp_multiplier_claim_substantiation eligibility on
--     other products), the spec waives the multiplier for this product.
--   - Reconciled prose uses "directly bioavailable" + "rapidly bioavailable"
--     + "pharmaceutical-grade" delivery-form claims instead of a numeric
--     multiplier. No "5-27x", no "up to 90%", no quantitative bioavailability
--     comparison.
--
-- Marshall dictionary scan (per feedback_marshall_dictionary_predelivery_scan):
-- copy authored by Claude per Gary Lane-1/2 directive 2026-05-05. Scanned
-- against src/lib/compliance/dictionaries/unapproved_peptides.ts: zero hits
-- for semaglutide, retatrutide, bromantane, semax, selank, cerebrolysin.
-- No disease-term verb-pair loophole language needed (no leaky gut / IBS /
-- autoimmune references in this copy). Hyphens preserved in chemical names
-- (Beta-Hydroxybutyrate, BHB-related compounds) and compound modifiers
-- (calcium-bound, ketone-based, single-salt, three-mineral, single-mechanism).
-- No em-dashes, no en-dashes.
--
-- Idempotent on re-run: WHERE clause keys on slug AND sku AND
-- category != peptide; UPDATE re-applies the canonical strings even if a
-- future hand-edit drifts. backfill_audit gets a new row each run.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_new_summary text := 'Beta-hydroxybutyrate energy, ketogenic metabolic support, and neuroprotective fuel support in a single tablet.';
    v_new_description text := E'## What does BHB Ketone Salts do?\n\nBHB Ketone Salts deliver beta-hydroxybutyrate energy, ketogenic metabolic support, and neuroprotective fuel through a three-mineral BHB salt matrix in tablet form. The 4-ingredient formulation provides calcium, magnesium, and sodium-bound BHB for direct ketone availability alongside Liposomal Organic MCT for endogenous ketogenesis support. BHB salts are inherently water-soluble and rapidly bioavailable; the tablet format delivers pharmaceutical-grade actives directly through gastric dissolution.\n\n## Ingredient breakdown\n\n- **Calcium Beta-Hydroxybutyrate:** Provides directly bioavailable BHB ketone bodies that cells oxidize for ATP without requiring carbohydrate, paired with calcium for electrolyte balance during ketogenic adaptation.\n- **Magnesium Beta-Hydroxybutyrate:** Adds magnesium-bound BHB for the magnesium replenishment that ketogenic states often require alongside ketone substrate delivery.\n- **Sodium Beta-Hydroxybutyrate:** Pairs sodium electrolyte support with directly bioavailable BHB for the sodium balance ketogenic adaptation depletes.\n- **Liposomal Organic MCT:** Provides medium-chain triglycerides in a liposomal carrier that the liver rapidly converts to endogenous ketones, supporting the BHB salt baseline.\n\n## Who benefits and what makes this different\n\n**Who benefits:** Adults pursuing ketogenic dietary support without strict carbohydrate restriction, athletes seeking ketone-based fuel for endurance work, individuals with cognitive performance demands where BHB neuroprotective effects matter, adults navigating intermittent fasting protocols where exogenous ketones support fasted-state energy, those pursuing the mitochondrial efficiency that ketone metabolism provides, and individuals with metabolic flexibility goals where dual carbohydrate and ketone capability is desired.\n\n**What makes it different:** What separates BHB Ketone Salts from single-salt BHB products or generic exogenous ketone supplements is the three-mineral salt matrix (calcium, magnesium, sodium) that prevents the electrolyte imbalance single-salt BHB causes, plus the Liposomal Organic MCT inclusion for endogenous ketogenesis support that complements the directly delivered BHB salts.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'bhb-ketone-salts'
      AND p.sku = 'FC-BHB-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152f-rev2 BHB Ketone Salts update skipped: row not found at slug bhb-ketone-salts / SKU FC-BHB-001';
        RETURN;
    END IF;

    UPDATE public.products
    SET
        summary = v_new_summary,
        description = v_new_description
    WHERE id = v_product_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    SELECT to_jsonb(p) INTO v_post_row FROM public.products p WHERE p.id = v_product_id;

    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    VALUES (
        v_run_id,
        '152f_rev2_bhb_ketone_salts_revision',
        'products',
        'FC-BHB-001',
        v_product_id,
        jsonb_build_object(
            'method', 'rev2_structured_description_lane1_collapsed_to_lane2_per_152p_canonical',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'rev2_structured_pdp_152p_canonical_lane1_collapsed_lane2',
            'authority', 'Gary canonical 2026-05-05 Prompt #152f-rev2 (Lane 1 reformulate-first picked but canonical formulation matched live row exactly, collapsing to Lane 2 outcome; live 4-ingredient three-mineral 170mg/serving formulation confirmed canonical)',
            'marshall_scan', 'human_review_pass_per_142v3_oq1_unresolved (Lane-1/2 reconciled copy; scanned against unapproved_peptides.ts, zero hits)',
            'bioavailability_format', 'NONE (10x to 28x multiplier INTENTIONALLY ABSENT per spec tablet format-deviation note + auto-remediator exemption; even though live MCT has Liposomal carrier, the spec waives the multiplier for this product; reconciled prose uses directly bioavailable + rapidly bioavailable + pharmaceutical-grade delivery-form claims instead)',
            'lane_corrections', jsonb_build_array(
                '7-ingredient -> 4-ingredient',
                'four-mineral salt matrix -> three-mineral salt matrix (drop Potassium reference)',
                'Drop Potassium BHB bullet (not in live)',
                'Drop L-Leucine bullet (not in live)',
                'Drop Bioperine bullet (not in live)',
                'MCT bullet: MCT Powder (C8 Caprylic Acid) -> Liposomal Organic MCT matching live name',
                'Drop 3210 mg pharmaceutical-grade actives per serving claim (live 170mg, 19x lower; omitted from prose, formulation table sole source)',
                'Drop without requiring liposomal carriers claim (live MCT IS Liposomal)',
                'Drop L-leucine for mTOR muscle preservation reference',
                'Drop Bioperine for absorption support reference',
                'Drop potassium-bound BHB reference',
                'Closing: four-mineral -> three-mineral matrix',
                'Closing: MCT C8 inclusion -> Liposomal Organic MCT inclusion',
                'Closing: drop L-leucine muscle preservation reference',
                'Closing: drop second non-capsule format / first tablet format series-meta reference (consumer-PDP should not reference internal series numbering)'
            ),
            'product_name', 'BHB Ketone Salts',
            'three_pillar_positioning', 'Fuel | Focus | Endure',
            'live_ingredient_total_mg', 170,
            'live_ingredient_count', 4,
            'live_format', 'tablet',
            'live_mineral_matrix', '3-mineral (calcium, magnesium, sodium)',
            'rev2_canonical_pattern', 'feedback_152p_canonical_for_all_formulation_updates',
            'peripheral_flag', '170 mg total is unusually low for a BHB tablet product (typical exogenous-ketone delivery 5-12 g/serving); separate formulator review recommended OUTSIDE 152f-rev2 scope'
        )
    );

    RAISE NOTICE '#152f-rev2 BHB Ketone Salts update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
