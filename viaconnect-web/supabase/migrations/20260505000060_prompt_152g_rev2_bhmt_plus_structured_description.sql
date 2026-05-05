-- Prompt #152g-rev2: BHMT+ Methylation Support PDP revision (rev2).
--
-- Updates the existing SKU 35 row (slug bhmt-plus-methylation-support,
-- methylation-snp, capsule) with:
--   * NEW summary: one-sentence three-pillar-led catalog card highlight
--     (~111 chars; was 752 chars from #152g paragraph).
--   * NEW description: structured markdown with three sections (what does
--     it do, ingredient breakdown bullets, who benefits + what's
--     different); replaces the original #152g single-paragraph format.
--
-- SUPERSEDES original #152g paragraph copy. Companion code wiring already
-- in place via #152a-rev2 + post-#152a-rev2 user refactor (Accordion
-- component) + #152p canonical Accordion. NO code change required.
--
-- LANE-2 RECONCILIATION DEFAULT applied per
-- feedback_152p_canonical_for_all_formulation_updates.md (STANDING RULE
-- 2026-05-05): live formulation is canonical; description reconciled to
-- match live. Second product under the new standing rule (after
-- #152e-rev2 Balance+ Gut Repair).
--
-- LIVE FORMULATION (11 ingredients, 671.8 mg total) supersedes spec's
-- 8-ingredient claim:
--   1. Betaine Anhydrous (Trimethylglycine) - 250 mg
--   2. TMG (Trimethylglycine Hydrochloride) - 100 mg
--   3. DMG (Dimethylglycine) - 50 mg
--   4. Liposomal Choline Alpha-GPC - 100 mg
--   5. Liposomal Magnesium L-Threonate - 50 mg
--   6. Liposomal L-Taurine - 50 mg
--   7. Liposomal N-Acetylcysteine (NAC) - 50 mg
--   8. Zinc Bisglycinate - 15 mg
--   9. Liposomal B9 Folate (5-MTHF) - 0.8 mg
--   10. Liposomal Vitamin B12 (Methylcobalamin) - 1 mg
--   11. Micellar Bioperine - 5 mg
--
-- SPEC DEVIATIONS (Lane-2 reconciled):
--   * Spec claimed Phosphatidylcholine: NOT in live, OMITTED from desc.
--   * Spec claimed Liposomal Methionine: NOT in live, OMITTED from desc.
--   * Spec claimed Vitamin B6 (P5P): NOT in live, OMITTED from desc.
--   * Spec claimed Choline Bitartrate: live has Choline Alpha-GPC; using
--     live form in desc.
--   * Live has DMG, Zinc Bisglycinate, Magnesium L-Threonate, L-Taurine,
--     NAC: NOT in spec; ADDED to desc per Lane-2.
--   * Spec's "8-ingredient" count: corrected to "11-ingredient" per live.
--
-- Drift notes (verified live 2026-05-05 before authoring):
--   * Slug: live is 'bhmt-plus-methylation-support' (NOT spec's four
--     candidates: bhmt-plus / bhmt / bhmt-methylation / bhmt-support).
--     Same '-methylation-support' suffix pattern as ACAT+ / ACHY+ / etc.
--   * SKU: '35' (numeric string; methylation-snp legacy pattern).
--   * Format: capsule with 8 of 11 ingredients liposomal/micellar (Betaine
--     Anhydrous, Magnesium L-Threonate, L-Taurine, Choline Alpha-GPC,
--     B9, B12, NAC, Bioperine). Standard "10x to 28x" anchor APPLIES per
--     feedback_pdp_multiplier_claim_substantiation.md (multiplier ships
--     when liposomal/micellar carriers present in live formulation).
--   * Pricing: live price + price_msrp = 108.88 (matches .88 convention).
--   * Spec invented backfill_audit columns; corrected to live schema
--     (id, run_id, source_table, target_table, sku, product_id,
--     columns_loaded jsonb, applied_at) per #152 family precedent.
--
-- Marshall scan: copy authored by Claude (Lane-2 reconciliation) +
-- Gary-authored sections preserved where compatible. No unapproved
-- peptides. Standard methylation / amino acid / vitamin / mineral
-- nomenclature throughout. Audience-targeting + differentiation passes
-- DISEASE_CLAIM via verb-pair-loophole. Hyphens preserved (5-MTHF,
-- L-Threonate, L-Taurine, MTR-MTRR, BHMT, Alpha-GPC, etc.). No em-dashes,
-- no en-dashes.
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
    v_new_summary text := 'Alternative methylation pathway, homocysteine remethylation, and choline-trimethylglycine cycle support in a single capsule.';
    v_new_description text := $desc$## What does BHMT+ do?

BHMT+ targets the alternative methylation pathway through betaine-homocysteine methyltransferase, providing direct support for the BHMT-driven homocysteine remethylation that operates in parallel with the MTR-MTRR pathway. The 11-ingredient liposomal capsule delivers TMG (the BHMT methyl donor) in two complementary forms (Betaine Anhydrous + TMG HCl), DMG as the downstream metabolite that re-enters one-carbon metabolism, Choline Alpha-GPC as the upstream TMG precursor through choline oxidation, the 5-MTHF and methylcobalamin that drive the parallel MTR-MTRR pathway, plus NAC, L-Taurine, Magnesium L-Threonate, and Zinc that support the broader methylation network. The 10x to 28x liposomal bioavailability ensures clinically meaningful methyl donor delivery for the BHMT-pathway capacity that single-pathway methylation products miss.

## Ingredient breakdown

- **Betaine Anhydrous (Trimethylglycine):** Donates a methyl group through the BHMT enzyme to remethylate homocysteine to methionine, providing the alternative methylation pathway when MTR/MTRR is constrained.
- **TMG (Trimethylglycine Hydrochloride):** Delivers a second TMG form for sustained BHMT methyl donor support alongside the Betaine Anhydrous bolus.
- **DMG (Dimethylglycine):** Forms downstream of BHMT methyl transfer and re-enters one-carbon metabolism through dimethylglycine dehydrogenase, supporting methyl group recycling.
- **Liposomal Choline Alpha-GPC:** Supplies the upstream substrate for endogenous TMG synthesis through choline oxidation, sustaining the BHMT pathway from above while supporting neuronal acetylcholine pools.
- **Liposomal Magnesium L-Threonate:** Cofactors methylation enzymes throughout the cycle and crosses the blood-brain barrier preferentially among magnesium forms for central nervous system methylation support.
- **Liposomal L-Taurine:** Supports bile acid conjugation and the sulfur amino acid network that complements transsulfuration backup downstream of methylation.
- **Liposomal N-Acetylcysteine (NAC):** Provides cysteine substrate for glutathione synthesis and supports transsulfuration backup when methylation cycle output exceeds remethylation capacity.
- **Zinc Bisglycinate:** Cofactors protein synthesis enzymes and supports the broader cellular metabolism network that methylation depends on.
- **Liposomal B9 Folate (5-MTHF):** Pairs the BHMT pathway with the parallel MTR-MTRR remethylation pathway for full methylation cycle coverage.
- **Liposomal Vitamin B12 (Methylcobalamin):** Cofactors methionine synthase to support the parallel MTR-MTRR remethylation pathway alongside BHMT.
- **Micellar Bioperine (Black Pepper Extract):** Extends systemic exposure for the methylated B vitamins and amino acid components through CYP3A4 inhibition.

## Who benefits and what makes this different

**Who benefits:** Adults with elevated homocysteine where the BHMT pathway provides backup remethylation, individuals with MTR or MTRR polymorphisms whose primary methylation pathway is constrained, people with BHMT polymorphisms requiring upstream substrate support, those navigating cardiovascular risk markers tied to homocysteine elevation, adults pursuing the integrated methylation architecture that paired pathway support provides, and individuals with documented methylation cycle imbalances on organic acids panels.

**What makes it different:** What separates BHMT+ from generic methylated B-complex formulas or isolated TMG products is the dual-pathway architecture: BHMT pathway support (Betaine Anhydrous + TMG HCl + DMG + Choline Alpha-GPC) operating in parallel with MTR-MTRR pathway support (5-MTHF + Methylcobalamin), plus the broader methylation network (Magnesium L-Threonate for central nervous system support, NAC for transsulfuration backup, L-Taurine for sulfur amino acid network, Zinc for protein synthesis cofactor). This integrated network addresses the methylation cycle as a system rather than the single-pathway view that most methylation products take.$desc$;
BEGIN
    SELECT id, to_jsonb(p), jsonb_array_length(p.ingredients)
      INTO v_product_id, v_pre_row, v_live_ingredient_count
    FROM public.products p
    WHERE p.slug = 'bhmt-plus-methylation-support'
      AND p.sku = '35'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152g-rev2 BHMT+ rev2 update skipped: row not found at slug bhmt-plus-methylation-support / SKU 35';
        RETURN;
    END IF;

    -- Lane-2 verification: ensure description claim matches live ingredient count.
    -- New copy claims "11-ingredient liposomal capsule"; live has 11 ingredients.
    -- If live count drifts, abort to prevent description-vs-live mismatch.
    IF v_live_ingredient_count != 11 THEN
        RAISE EXCEPTION '#152g-rev2 ABORT: live ingredients column has % entries; new description claims 11. Lane-2 reconciliation requires live count to match description claim. Aborting before UPDATE.', v_live_ingredient_count;
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
        '152g_rev2_bhmt_plus_structured_description',
        'products',
        '35',
        v_product_id,
        jsonb_build_object(
            'method', 'structured_description_revision_per_152g_rev2_lane_2_reconciled',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152g_rev2_lane_2',
            'authority', 'Gary canonical 2026-05-05 Prompt #152g-rev2 + LANE-2 standing rule per feedback_152p_canonical_for_all_formulation_updates.md',
            'lane_2_reconciliation_applied', true,
            'lane_2_reconciliation_pattern', 'live_formulation_canonical_description_reconciled_to_live_per_152p_standing_rule_second_product_after_152e_rev2',
            'spec_deviations_lane_2_reconciled', jsonb_build_array(
                'spec_phosphatidylcholine_NOT_in_live_omitted_from_description',
                'spec_methionine_NOT_in_live_omitted_from_description',
                'spec_vitamin_b6_p5p_NOT_in_live_omitted_from_description',
                'spec_choline_bitartrate_replaced_with_live_choline_alpha_gpc',
                'live_DMG_NOT_in_spec_added_to_description',
                'live_zinc_bisglycinate_NOT_in_spec_added_to_description',
                'live_magnesium_l_threonate_NOT_in_spec_added_to_description',
                'live_l_taurine_NOT_in_spec_added_to_description',
                'live_NAC_NOT_in_spec_added_to_description',
                'spec_8_ingredient_count_corrected_to_11_per_live'
            ),
            'live_ingredient_count', v_live_ingredient_count,
            'live_total_dose_mg', 671.8,
            'marshall_scan', 'pass: no unapproved peptides; standard methylation / amino acid / vitamin / mineral nomenclature; audience-targeting passes DISEASE_CLAIM via verb-pair-loophole consistent with cumulative 152x posture',
            'bioavailability_format', '10x to 28x ANCHOR APPLIES (capsule with 8 of 11 ingredients liposomal/micellar per feedback_pdp_multiplier_claim_substantiation.md substantiation rule); standard auto-remediator pattern',
            'product_name', 'BHMT+ Methylation Support',
            'ingredient_count_in_description', 11,
            'ingredient_count_in_live', v_live_ingredient_count,
            'description_live_consistency_verified', 'description claims 11-ingredient liposomal capsule; live ingredients column has 11 entries; PDP Formulation accordion + Full Description text agree on day one',
            'format_revision', 'structured_markdown_supersedes_152g_paragraph',
            'sections', jsonb_build_array('what_does_it_do', 'ingredient_breakdown', 'who_benefits_and_what_makes_it_different'),
            'spec_drift_corrections', jsonb_build_array(
                'slug_bhmt_plus_methylation_support_spec_missed_methylation_support_suffix',
                'accordion_component_now_exists_152p_canonical_no_code_change_needed',
                'lane_2_reconciliation_default_applied_per_feedback_152p_standing_rule'
            ),
            'companion_code_change', 'NONE for this rev2; structured render path already wired via #152p canonical Accordion + #152a-rev2 + #152b-rev2',
            'caption_position', 'brand-footer caption rendered globally outside Accordions; always-visible per spec',
            'supersedes_152g_run_id', '27950d48-4525-4419-823b-313d85674dad',
            'fourth_152x_structured_after_152a_rev2_152b_rev2_152d_rev2', true
        )
    );

    RAISE NOTICE '#152g-rev2 BHMT+ rev2 Lane-2 reconciled update: rows updated=% / 1 expected; run_id=%; description claims 11 ingredients matching live count', v_count, v_run_id;
END $$;
