-- Prompt #152h: BLAST+ Nitric Oxide Stack PDP paragraph description.
--
-- Updates the existing FC-BLAST-001 row (slug blast-plus-nitric-oxide-stack,
-- advanced-formulas, capsule) with the premium summary plus full-description
-- copy authored by Gary in the #152h spec. The always-visible PdpRightRail.tsx
-- mobile description section and the PdpDesktopTabs.tsx description tab panel
-- both pick up the new copy without further client code change. No
-- emphasis-spans registration; blast slug intentionally NOT in
-- PDP_EMPHASIZED_TERMS.
--
-- Drift notes (verified live 2026-05-04 before authoring):
--   * Slug: live is 'blast-plus-nitric-oxide-stack' (NOT any of the spec's
--     five candidates: blast-plus / blast-nitric-oxide-stack /
--     blast-nitric-oxide / nitric-oxide-stack / blast). Spec's CASE-ordered
--     slug-resolution loop would have aborted. Same '-plus-[function]-stack'
--     suffix pattern as bhb-ketone-salts and other 152x products. Pinned to
--     verified slug.
--   * SKU: FC-BLAST-001 (standard FC-XXX-001 convention).
--   * Pricing flag: live price + price_msrp = 98.00, NOT ending in .88 per
--     standing convention. Spec Step 5 explicitly says "do NOT modify pricing"
--     so this migration leaves price untouched. Flagged for Gary's separate
--     pricing decision in audit metadata field 'pricing_convention_flag'.
--   * Spec invented backfill_audit columns (run_id, prompt_ref, target_table,
--     target_key, field, old_value, new_value, applied_at). Live schema is
--     (id, run_id, source_table, target_table, sku, product_id,
--     columns_loaded jsonb, applied_at). Migration uses live schema, packs
--     audit metadata into columns_loaded jsonb per #152a/b/e/f/g.
--
-- Source-document corrections applied per #152h §"Source-Document Corrections
-- Applied" (recorded in audit metadata source_doc_corrections array):
--   1. Math error: source claimed 717 mg total; actual sum is 815 mg. PDP
--      copy carefully avoids stating an exact total mg figure (uses
--      "18-ingredient formula" framing instead) so the migration is decoupled
--      from the capsule-size decision (Size 00 = 700 mg vs. 815 mg actives).
--      Capsule-size decision is OUT OF SCOPE for this prompt; flagged
--      separately for Gary.
--   2. SDS Section 1 product use: "central nervous system support" -> "nitric
--      oxide generation, endothelial function, and vascular performance
--      support" (corrected at SDS layer, not in PDP copy; PDP copy uses the
--      vascular framing exclusively).
--   3. FarmCeutica Inc. -> FarmCeutica Wellness LLC (correct legal entity).
--   4. FarmCeutica Wellness Ltd. -> FarmCeutica Wellness LLC.
--   5. "Balance+" copy-paste error in differentiation section -> "Blast+".
--   6. "10x bioavailability" hardcoded -> "10x to 28x" locked anchor.
--   7. "Building Performance Through Science" -> "Built For Your Biology".
--   8. Duplicate "Pairs well with Cardio+" line deduplicated (not in PDP
--      copy at all; not part of summary or description).
--   9. BioB Fusion: source mechanism description claimed "5-MTHF, Methyl B12,
--      SAMe" but ingredient label is "B6 (P5P) + B9 (5-MTHF) + B12
--      (methylcobalamin)". Rewrite uses the ingredient-label nomenclature.
--      SAMe is NOT in Blast+; that role belongs to ADO Support+.
--
-- Marshall scan: copy authored by Gary in the #152h spec body. No unapproved
-- peptides. Compounds named (Beetroot Extract, L-Citrulline Malate, Arginine
-- Silicate / Nitrosigine, Agmatine Sulfate, L-Norvaline, Trans-Resveratrol,
-- Pterostilbene, Green Tea EGCG, Glutathione, NAC, Ubiquinol, Vitamin C,
-- Pine Bark Extract, Betaine Anhydrous, BioB Fusion B-complex, Copper
-- Bisglycinate, Green Coffee Bean Extract, Bioperine) are standard
-- nutraceutical / botanical names. Genetic variant names (eNOS, GTPCH,
-- MTHFR) are scientific not regulated. Bioavailability "10x to 28x" verbatim
-- twice. Hyphens preserved per #142 v3 + #152 family precedent. No em / en
-- dashes. Audience targeting includes "managing borderline-elevated blood
-- pressure under practitioner supervision" — flagged for Hannah review;
-- DISEASE_CLAIM rule passes via "managing" verb absent from DISEASE_VERBS
-- and "under practitioner supervision" use-context softener.
--
-- Idempotent on re-run: WHERE clause keys on slug + sku + category!=peptide.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_new_summary text := 'Blast+ Nitric Oxide Stack is precision dual-pathway vascular support for adults whose nitric oxide production, endothelial function, or circulatory performance need targeted reinforcement. An 18-ingredient liposomal and micellar formulation delivering 10x to 28x the bioavailability of standard NO formulations for the encapsulated compounds, Blast+ converges three vascular pillars in a single capsule: nitric oxide generation through dual-pathway synthesis, endothelial protection through nine-ingredient polyphenol antioxidant coverage, and circulatory performance through arginase inhibition and BH4 cofactor recycling, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile.';
    v_new_description text := 'Blast+ Nitric Oxide Stack is precision dual-pathway vascular support for adults whose nitric oxide production, endothelial function, or circulatory performance need targeted reinforcement. Designed for athletes pursuing vascular flow and exercise endurance, adults with eNOS, GTPCH, or MTHFR genetic variants whose endogenous NO production is genetically constrained, individuals managing borderline-elevated blood pressure under practitioner supervision, knowledge workers seeking cerebrovascular performance, and adults navigating age-related decline in endothelial function, this 18-ingredient formula delivers Micellar Beetroot Extract, Liposomal L-Citrulline Malate, Arginine Silicate as Nitrosigine, Agmatine Sulfate, L-Norvaline, Liposomal Trans-Resveratrol, Liposomal Pterostilbene, Liposomal Green Tea EGCG, Liposomal Glutathione, Liposomal NAC, Liposomal Ubiquinol, Liposomal Vitamin C, Pine Bark Extract, Betaine Anhydrous, BioB Fusion methylated B complex, Copper Bisglycinate, Micellar Green Coffee Bean Extract, and Micellar Bioperine through advanced liposomal and micellar carriers that achieve 10x to 28x the bioavailability of standard NO formulations for the encapsulated compounds. Inside your cells, these compounds work in concert. Beetroot extract supplies dietary nitrates that drive the alternate nitrate-nitrite-NO pathway through oral bacterial reduction and tissue enzymatic conversion, providing NO independent of the eNOS pathway. L-Citrulline raises plasma arginine more reliably than direct arginine supplementation by bypassing first-pass arginase metabolism. Nitrosigine provides 6-hour sustained arginine elevation. Agmatine and L-Norvaline competitively inhibit arginase, preserving the arginine pool for NO synthesis rather than urea cycle catabolism. The methylated B complex and Liposomal Vitamin C support BH4 recycling, the essential eNOS cofactor whose depletion uncouples eNOS into a superoxide-producing enzyme. Trans-resveratrol, pterostilbene, EGCG, pine bark proanthocyanidins, glutathione, NAC, ubiquinol, vitamin C, and green coffee bean extract collectively provide nine-mechanism antioxidant protection that preserves NO bioavailability against superoxide-mediated degradation. Copper Bisglycinate cofactors superoxide dismutase. Betaine reduces homocysteine through the BHMT pathway, protecting endothelium from homocysteine-driven dysfunction. What separates Blast+ from single-mechanism arginine pre-workouts, isolated beetroot powders, or generic NO boosters is the convergence of three vascular pillars in a single capsule: dual-pathway NO generation, multi-mechanism endothelial protection, and arginase-inhibited circulatory performance, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile. Built For Your Biology. Manufactured to 21 CFR Part 111 GMP standards by FarmCeutica Wellness LLC. Third-party tested every batch. Vegan, non-GMO, allergen-free.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'blast-plus-nitric-oxide-stack'
      AND p.sku = 'FC-BLAST-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152h Blast+ paragraph update skipped: row not found at slug blast-plus-nitric-oxide-stack / SKU FC-BLAST-001';
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
        '152h_blast_plus_paragraph_description',
        'products',
        'FC-BLAST-001',
        v_product_id,
        jsonb_build_object(
            'method', 'paragraph_description_refresh_per_152h',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152h',
            'authority', 'Gary canonical 2026-05-04 Prompt #152h; copy authored in spec body',
            'marshall_scan', 'pass: no unapproved peptides; standard nutraceutical / botanical nomenclature; eNOS / GTPCH / MTHFR variant names are scientific not regulated; "borderline-elevated blood pressure" phrase passes DISEASE_CLAIM via "managing" not in DISEASE_VERBS plus "under practitioner supervision" softener',
            'bioavailability_format', '10x to 28x (matches reviewer plus guardrail; no deviation needed; 13 of 18 ingredients liposomal or micellar)',
            'product_name', 'BLAST+ Nitric Oxide Stack',
            'ingredient_count', 18,
            'source_doc_corrections', jsonb_build_array(
                'math_error_717mg_to_815mg_capsule_size_decision_separate',
                'sds_central_nervous_system_to_nitric_oxide_generation',
                'farmceutica_inc_to_wellness_llc',
                'farmceutica_wellness_ltd_to_llc',
                'balance_plus_copy_paste_to_blast_plus',
                'hardcoded_10x_to_locked_10x_to_28x',
                'building_performance_through_science_to_built_for_your_biology',
                'duplicate_pairs_with_cardio_plus_deduplicated',
                'biob_fusion_same_to_b6_b9_b12_label_authoritative'
            ),
            'pricing_convention_flag', 'price + price_msrp = 98.00 does NOT end in .88; spec Step 5 says do NOT modify pricing; flagged for Gary separate pricing decision',
            'capsule_size_decision_flag', '815 mg actives total exceeds Size 00 capsule capacity (700 mg) by 115 mg; PDP copy avoids capsule-size language to decouple from this decision; spec Step 4 flags as separate follow-up (Size 0 / Size 00el migration vs. reformulation file as 152h.1)'
        )
    );

    RAISE NOTICE '#152h Blast+ paragraph update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
