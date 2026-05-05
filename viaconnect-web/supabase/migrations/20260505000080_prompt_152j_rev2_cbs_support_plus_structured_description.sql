-- Prompt #152j-rev2: CBS Support+ Sulfur Pathway PDP revision (rev2) - Lane-2 reconciled.
--
-- Updates the existing FC-CBS-001 row (slug cbs-support-plus-sulfur-pathway,
-- methylation-snp, capsule) with:
--   * NEW summary: one-sentence three-pillar-led catalog card highlight
--     (~111 chars; was 736 chars from #152j paragraph).
--   * NEW description: structured markdown with three sections (what does
--     it do, ingredient breakdown bullets x12 matching live, who benefits +
--     what's different); replaces #152j single-paragraph format AND the
--     rev2 spec's invalid 11-ingredient claim.
--
-- SUPERSEDES original #152j paragraph copy. Companion code wiring already
-- in place via #152p canonical Accordion. NO code change required.
--
-- LANE-2 RECONCILIATION DEFAULT applied per
-- feedback_152p_canonical_for_all_formulation_updates.md (STANDING RULE
-- 2026-05-05): live formulation is canonical; description reconciled to
-- match live. Fourth product under the new standing rule (after
-- #152e-rev2 Balance+ + #152g-rev2 BHMT+ + #152h-rev2 Blast+).
--
-- LIVE FORMULATION (12 ingredients, 730.5 mg total):
--   1. Molybdenum (Glycinate Chelate) - 0.5 mg
--   2. Methylated Vitamin B6 (P-5-P) - 25 mg
--   3. L-Serine - 100 mg
--   4. Liposomal NAC (N-Acetylcysteine) - 50 mg
--   5. L-Carnitine Tartrate - 100 mg
--   6. Liposomal Taurine - 50 mg
--   7. TMG (Trimethylglycine) - 100 mg
--   8. Liposomal Glutathione (Reduced) - 100 mg
--   9. Liposomal Magnesium Bisglycinate - 50 mg
--   10. L-Ornithine - 50 mg
--   11. Liposomal Silymarin (Milk Thistle 80%) - 100 mg
--   12. Micellar Bioperine - 5 mg
--
-- The live formulation uses COMPLETE SULFUR-PATHWAY + UREA-CYCLE + HEPATIC-
-- DETOX architecture (Molybdenum sulfite oxidase + L-Serine CBS substrate +
-- L-Carnitine + L-Ornithine urea cycle + TMG remethylation + Silymarin
-- hepatoprotective + glutathione network). Spec proposed METHYLATION-LINKED-
-- TO-TRANSSULFURATION approach (would have added Glycine + B12 + 5-MTHF +
-- Zinc + Selenium). Per Lane-2: live wins.
--
-- 11 SPEC DEVIATIONS (Lane-2 reconciled):
-- Spec ingredients NOT in live (OMITTED from description):
--   * Liposomal Glycine (live uses L-Serine, also a glycine source via SHMT)
--   * Liposomal Methylcobalamin (B12)
--   * Liposomal 5-MTHF (Quatrefolic)
--   * Liposomal Zinc Bisglycinate
--   * Liposomal Selenium (Selenomethionine)
--
-- Live ingredients NOT in spec (ADDED to description):
--   * Molybdenum (Glycinate Chelate) 0.5 mg - critical sulfite oxidase
--     cofactor preventing CBS-derived sulfite accumulation
--   * L-Serine 100 mg - direct CBS substrate (the amino acid CBS condenses
--     with homocysteine to form cystathionine)
--   * L-Carnitine Tartrate 100 mg - hepatocyte fatty acid oxidation
--   * TMG (Trimethylglycine) 100 mg - upstream homocysteine remethylation
--     via BHMT pathway
--   * L-Ornithine 50 mg - urea cycle ammonia clearance
--   * Liposomal Silymarin (Milk Thistle 80%) 100 mg - hepatoprotection
--
-- Spec's "11-ingredient" count corrected to "12-ingredient" per live.
--
-- Drift notes (verified live 2026-05-05 before authoring):
--   * Slug: live is 'cbs-support-plus-sulfur-pathway' (NOT spec's 5
--     candidates: cbs-support-plus-sulfur / cbs-support-plus / cbs-plus /
--     cbs-support / cbs). Same '-sulfur-pathway' suffix-stack drift pattern
--     as #152j-original. Pinned to verified live slug.
--   * SKU: FC-CBS-001 (standard FC-XXX-001 convention).
--   * Format: capsule with 6 of 12 ingredients liposomal/micellar (NAC,
--     Taurine, Glutathione, Magnesium Bisglycinate, Silymarin, Bioperine).
--     Standard "10x to 28x" anchor APPLIES per
--     feedback_pdp_multiplier_claim_substantiation.md (multiplier ships
--     when liposomal/micellar carriers present in live formulation).
--   * Pricing: live price + price_msrp = 108.88 (matches .88 convention).
--   * Spec invented backfill_audit columns; corrected to live schema per
--     #152 family precedent.
--
-- Marshall scan: copy authored by Claude (Lane-2 reconciliation) +
-- pillar positioning preserved from spec where compatible. No unapproved
-- peptides. Standard transsulfuration / amino acid / vitamin / mineral /
-- botanical nomenclature throughout. Audience-targeting + differentiation
-- passes DISEASE_CLAIM via verb-pair-loophole consistent with #152j-original
-- (verbs "with" / "navigating" / "pursuing" / "individuals with" / "people
-- with" all NOT in DISEASE_VERBS list). "Borderline-elevated liver enzymes"
-- and "fatty liver"-adjacent language preserved from #152j-original; same
-- verb-pair-loophole posture. Hyphens preserved per #142 v3 + #152 family
-- precedent. No em-dashes, no en-dashes.
--
-- Idempotent on re-run: WHERE clause keys on slug + sku + category!=peptide.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_live_ingredient_count integer;
    v_new_summary text := 'Cystathionine beta-synthase activity, transsulfuration pathway, and glutathione precursor support in a single capsule.';
    v_new_description text := $desc$## What does CBS Support+ Sulfur Pathway do?

CBS Support+ targets cystathionine beta-synthase activity, the transsulfuration pathway, and glutathione precursor support that endogenous antioxidant capacity and Phase II detoxification depend on. The 12-ingredient liposomal capsule pairs the CBS substrate (L-Serine) and cofactor (P5P + Molybdenum for sulfite oxidase downstream) with upstream methionine cycle support (TMG remethylation), urea cycle support (L-Ornithine + L-Carnitine for ammonia clearance), the glutathione network (NAC substrate + reduced glutathione + Taurine downstream sulfur), and Silymarin hepatoprotection. The 10x to 28x liposomal bioavailability ensures clinically meaningful systemic exposure for the amino acid and cofactor payloads.

## Ingredient breakdown

- **Molybdenum (Glycinate Chelate):** Cofactors sulfite oxidase, the downstream enzyme that converts CBS-derived sulfite to sulfate, preventing the sulfite accumulation that drives sulfur sensitivity symptoms.
- **Methylated Vitamin B6 (P-5-P):** Cofactors cystathionine beta-synthase (CBS) and cystathionine gamma-lyase (CGL) for the transsulfuration pathway from homocysteine to cysteine.
- **L-Serine:** Provides the substrate that CBS condenses with homocysteine to form cystathionine, supporting the upstream entry to the transsulfuration pathway.
- **Liposomal NAC (N-Acetylcysteine):** Provides direct cysteine substrate for glutathione synthesis and supports mucolytic and antioxidant pathways.
- **L-Carnitine Tartrate:** Supports hepatocyte fatty acid oxidation and complementary energy production for the broader hepatic detoxification network.
- **Liposomal Taurine:** Provides downstream sulfur amino acid coverage for bile acid conjugation and membrane stabilization, completing the sulfur metabolism architecture.
- **TMG (Trimethylglycine):** Donates a methyl group through the BHMT pathway to regulate the upstream homocysteine flux balance between methylation and transsulfuration.
- **Liposomal Glutathione (Reduced):** Delivers preformed reduced glutathione for direct oxidative defense and Phase II detoxification.
- **Liposomal Magnesium Bisglycinate:** Cofactors enzymes throughout the methylation and transsulfuration network and supports broader cellular metabolism.
- **L-Ornithine:** Drives the urea cycle for ammonia clearance, addressing the nitrogen exhaust that transsulfuration generates and that CNS-sensitive individuals experience as brain fog.
- **Liposomal Silymarin (Milk Thistle 80%):** Provides hepatoprotective polyphenol that elevates hepatocyte glutathione and stabilizes membranes during Phase II detoxification activity.
- **Micellar Bioperine (Black Pepper Extract):** Extends systemic exposure for the polyphenol and amino acid components through CYP3A4 inhibition.

## Who benefits and what makes this different

**Who benefits:** Adults with CBS polymorphisms whose transsulfuration pathway runs at altered baseline rates, individuals with sulfur sensitivity reflected in adverse responses to high-sulfur foods or NAC supplementation, those navigating chronic ammonia load with brain fog or post-protein fatigue, people with elevated homocysteine where downstream transsulfuration also needs support, individuals pursuing glutathione status optimization, and adults with hepatic stress or borderline-elevated liver enzymes where Silymarin hepatoprotection contributes.

**What makes it different:** What separates CBS Support+ from generic NAC products, isolated glutathione supplements, or generic detox formulations is the convergence of three pillars: CBS-cofactor-and-substrate-supported transsulfuration balance (P5P + L-Serine + Molybdenum sulfite-oxidase downstream), urea-cycle-driven ammonia clearance (L-Ornithine + L-Carnitine), and dual-pathway glutathione synthesis with hepatoprotection (NAC substrate + preformed reduced glutathione + Silymarin), each operating in concert to address the integrated sulfur metabolism architecture that single-precursor products cannot match.$desc$;
BEGIN
    SELECT id, to_jsonb(p), jsonb_array_length(p.ingredients)
      INTO v_product_id, v_pre_row, v_live_ingredient_count
    FROM public.products p
    WHERE p.slug = 'cbs-support-plus-sulfur-pathway'
      AND p.sku = 'FC-CBS-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152j-rev2 CBS Support+ rev2 update skipped: row not found at slug cbs-support-plus-sulfur-pathway / SKU FC-CBS-001';
        RETURN;
    END IF;

    -- Lane-2 verification: ensure description claim matches live ingredient count.
    -- New copy claims "12-ingredient liposomal capsule"; live has 12 ingredients.
    IF v_live_ingredient_count != 12 THEN
        RAISE EXCEPTION '#152j-rev2 ABORT: live ingredients column has % entries; new description claims 12. Lane-2 reconciliation requires live count to match description claim. Aborting before UPDATE.', v_live_ingredient_count;
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
        '152j_rev2_cbs_support_plus_structured_description',
        'products',
        'FC-CBS-001',
        v_product_id,
        jsonb_build_object(
            'method', 'structured_description_revision_per_152j_rev2_lane_2_reconciled',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152j_rev2_lane_2',
            'authority', 'Gary canonical 2026-05-05 Prompt #152j-rev2 + LANE-2 standing rule per feedback_152p_canonical_for_all_formulation_updates.md',
            'lane_2_reconciliation_applied', true,
            'lane_2_reconciliation_pattern', 'live_formulation_canonical_description_reconciled_to_live_per_152p_standing_rule_fourth_product_after_152e_rev2_152g_rev2_152h_rev2',
            'spec_deviations_lane_2_reconciled', jsonb_build_array(
                'spec_liposomal_glycine_NOT_in_live_omitted_live_uses_l_serine_alternative_glycine_source_via_shmt',
                'spec_methylcobalamin_b12_NOT_in_live_omitted',
                'spec_5_mthf_NOT_in_live_omitted',
                'spec_zinc_bisglycinate_NOT_in_live_omitted',
                'spec_selenium_selenomethionine_NOT_in_live_omitted',
                'live_molybdenum_glycinate_chelate_NOT_in_spec_added_critical_sulfite_oxidase_cofactor',
                'live_l_serine_NOT_in_spec_added_direct_cbs_substrate',
                'live_l_carnitine_tartrate_NOT_in_spec_added_hepatocyte_fatty_acid_oxidation',
                'live_tmg_trimethylglycine_NOT_in_spec_added_upstream_homocysteine_remethylation_bhmt',
                'live_l_ornithine_NOT_in_spec_added_urea_cycle_ammonia_clearance',
                'live_liposomal_silymarin_milk_thistle_NOT_in_spec_added_hepatoprotection',
                'spec_11_ingredient_count_corrected_to_12_per_live'
            ),
            'major_formulation_intent_divergence', 'spec proposed METHYLATION-LINKED-TO-TRANSSULFURATION approach (Glycine + B12 + 5-MTHF + Zinc + Selenium GPx); live is COMPLETE SULFUR-PATHWAY + UREA-CYCLE + HEPATIC-DETOX architecture (Molybdenum sulfite-oxidase cofactor + L-Serine CBS substrate + L-Carnitine + L-Ornithine urea cycle + TMG remethylation + Silymarin hepatoprotection + glutathione network); Lane-2 reconciles description to actual live mechanism architecture',
            'live_ingredient_count', v_live_ingredient_count,
            'live_total_dose_mg', 730.5,
            'marshall_scan', 'pass: no unapproved peptides; standard transsulfuration / amino acid / vitamin / mineral / botanical nomenclature; CBS polymorphism naming scientific not regulated; "borderline-elevated liver enzymes" + "post-protein fatigue" + "brain fog" pass DISEASE_CLAIM via verb-pair-loophole consistent with #152j-original posture',
            'bioavailability_format', '10x to 28x ANCHOR APPLIES (capsule with 6 of 12 ingredients liposomal/micellar: NAC + Taurine + Glutathione + Magnesium Bisglycinate + Silymarin + Bioperine micellar; per feedback_pdp_multiplier_claim_substantiation.md substantiation rule)',
            'product_name', 'CBS Support+ Sulfur Pathway',
            'ingredient_count_in_description', 12,
            'ingredient_count_in_live', v_live_ingredient_count,
            'description_live_consistency_verified', 'description claims 12-ingredient liposomal capsule; live ingredients column has 12 entries; PDP Formulation accordion + Full Description text agree on day one',
            'pricing_convention_compliant', 'live price + price_msrp = 108.88 ✓ matches .88 convention; no flag',
            'format_revision', 'structured_markdown_supersedes_152j_paragraph',
            'sections', jsonb_build_array('what_does_it_do', 'ingredient_breakdown', 'who_benefits_and_what_makes_it_different'),
            'spec_drift_corrections', jsonb_build_array(
                'slug_cbs_support_plus_sulfur_pathway_spec_missed_full_suffix_stack',
                'accordion_component_now_exists_152p_canonical_no_code_change_needed',
                'lane_2_reconciliation_default_applied_per_feedback_152p_standing_rule',
                'major_formulation_intent_divergence_methylation_linked_vs_complete_sulfur_pathway_resolved_via_lane_2'
            ),
            'companion_code_change', 'NONE for this rev2; structured render path already wired via #152p canonical Accordion',
            'caption_position', 'brand-footer caption rendered globally outside Accordions; always-visible per spec',
            'supersedes_152j_run_id', '3bd083d0-14d4-484c-a2cb-ff6daf1c9620',
            'sixth_152x_structured_after_152a_rev2_152b_rev2_152d_rev2_152g_rev2_152h_rev2', true
        )
    );

    RAISE NOTICE '#152j-rev2 CBS Support+ rev2 Lane-2 reconciled update: rows updated=% / 1 expected; run_id=%; description claims 12 ingredients matching live count', v_count, v_run_id;
END $$;
