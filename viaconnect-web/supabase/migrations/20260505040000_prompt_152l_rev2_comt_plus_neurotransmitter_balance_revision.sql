-- Prompt #152l-rev2: COMT+ Neurotransmitter Balance PDP revision (rev2 structured Lane-2 reconciled).
--
-- SUPERSEDES the original #152l paragraph copy (commit cbc5fa0, 2026-05-04)
-- with the rev2 structured-markdown format that renders inside the canonical
-- 152p Accordion via the existing renderStructuredDescription parser.
-- Updates both summary (catalog card one-sentence three-pillar-led highlight
-- per Balance | Detox | Harmonize positioning) and description.
--
-- Lane 2 reconciliation per Gary directive 2026-05-05 + standing rule
-- feedback_152p_canonical_for_all_formulation_updates. Original 152l-rev2
-- spec claimed 11-ingredient formulation including TMG with magnesium at
-- "approximately 65 mg per capsule". Live row at slug
-- comt-plus-neurotransmitter-balance has 12 ingredients totaling 579.3
-- mg/serving (NOT including TMG; mg of Mg Bisglycinate is 100 mg of chelate
-- which equates to ~10 mg elemental Mg, NOT 65 mg). Live formulation also
-- includes Liposomal Quercetin + Liposomal Glutathione (Reduced) absent
-- from spec, and several carrier-prefix differences. Gary confirmed live
-- formulation as canonical via direct paste of authoritative source-doc
-- 2026-05-05.
--
-- Lane 2 corrections (16 total):
--   1. 11-ingredient -> 12-ingredient
--   2. Drop "approximately 65 mg per capsule" magnesium claim (wrong;
--      live 100 mg chelate ≈ 10 mg elemental, NOT 65 mg)
--   3. Drop TMG bullet (not in live)
--   4. Drop "TMG for the alternative methylation pathway" opening reference
--   5. Drop "alternative methylation backup via TMG" closing reference
--   6. Add Liposomal Quercetin bullet (in live, not in spec)
--   7. Add Liposomal Glutathione (Reduced) bullet (in live, not in spec)
--   8. SAMe bullet: drop "Liposomal" prefix (live name "SAMe (S-Adenosylmethionine)")
--   9. 5-MTHF bullet: "Quatrefolic" -> "Calcium Salt" (live brand)
--  10. B12 bullet: "Methylcobalamin" -> "Methylcobalamin + Adenosylcobalamin"
--      (live dual-form)
--  11. P5P bullet: "Liposomal Pyridoxal-5-Phosphate" -> "Methylated Vitamin
--      B6 (P-5-P)" (live name)
--  12. R5P bullet: "Liposomal Riboflavin-5-Phosphate" -> "Methylated Vitamin
--      B2 (Riboflavin-5-Phosphate)" (live name)
--  13. Lithium Orotate: drop "Liposomal" prefix (live no carrier)
--  14. DIM: drop "Liposomal" prefix (live no carrier; live name
--      "Diindolylmethane (DIM)")
--  15. Catalog summary: revised to make Balance | Detox | Harmonize
--      three-pillar explicit ("Catecholamine balance, catecholestrogen
--      detoxification, and methylation cycle harmonization")
--  16. Closing differentiation: replace TMG pillar with Quercetin +
--      Glutathione downstream antioxidant + Phase II detox pillar
--
-- Lithium Orotate dose-framing PRESERVED from #152l original (memory line 93
-- pattern): 2.5 mg lithium orotate ≈ 0.125 mg elemental lithium ≈ 1000-fold
-- below pharmaceutical lithium. Calculation: lithium orotate is ~5%
-- elemental lithium by mass; 2.5 mg × 5% = 0.125 mg elemental.
--
-- Bioavailability claim posture:
--   - 10x to 28x multiplier APPLIES per feedback_pdp_multiplier_claim_substantiation.
--   - 7 of 12 live ingredients carry Liposomal or Micellar prefix
--     (Mg Bisglycinate, Folate 5-MTHF, B12, L-Theanine, Quercetin,
--     Glutathione, Bioperine).
--   - Reconciled phrasing: "10x to 28x liposomal and micellar bioavailability".
--
-- Drift notes (verified live 2026-05-05 before authoring):
--   * Slug comt-plus-neurotransmitter-balance confirmed live (single
--     canonical match per spec).
--   * SKU '37' (numeric string, NOT FC-COMT-001 as spec assumed; same
--     non-canonical SKU pattern as 152c ADO Support+ row '34').
--   * Live name "COMT+ Neurotransmitter Balance" (NOT "COMT+™" with
--     trademark; Gary canonical paste had ™ but live JSONB stores no ™
--     on product.name; matched live for byte-identical PDP rendering).
--   * Live ingredient count 12 totaling 579.3 mg/serving (Gary canonical
--     2026-05-05 paste matched live 1:1).
--
-- Marshall dictionary scan (per feedback_marshall_dictionary_predelivery_scan):
-- copy authored by Claude per Gary Lane-2 directive. Scanned against
-- src/lib/compliance/dictionaries/unapproved_peptides.ts: zero hits for
-- semaglutide, retatrutide, bromantane, semax, selank, cerebrolysin.
--
-- Disease-term posture: COMT Val158Met (gene-name level), anxiety/racing
-- thoughts/sleep disruption (symptom phrases following verb constructions),
-- estrogen dominance + perimenopausal (in noun-phrase form following
-- "women with..." / "adults navigating..."). All ride the verb-pair
-- loophole established by 152e original.
--
-- Hyphens preserved in chemical names (5-MTHF, P-5-P, P5P, R5P,
-- N-Acetyl, L-Theanine, MK-7) and compound modifiers (active-form,
-- catecholamine-driven, single-cofactor, dual-form, Phase II,
-- catecholamine-balance, catecholestrogen-clearance). No em-dashes,
-- no en-dashes.
--
-- Idempotent on re-run: WHERE clause keys on slug AND sku AND
-- category != peptide; UPDATE re-applies the canonical strings.
-- backfill_audit gets a new row each run.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_new_summary text := 'Catecholamine balance, catecholestrogen detoxification, and methylation cycle harmonization support in a single capsule.';
    v_new_description text := E'## What does COMT+ Neurotransmitter Balance do?\n\nCOMT+ Neurotransmitter Balance targets the catechol-O-methyltransferase enzyme that catabolizes catecholamines (dopamine, norepinephrine, epinephrine) and catecholestrogens (2-hydroxyestrone, 4-hydroxyestrone). The 12-ingredient liposomal and micellar capsule pairs direct SAMe (the methyl donor COMT uses) with Liposomal Magnesium Bisglycinate (the essential COMT metal cofactor), the methylation cycle active-form B vitamins (5-MTHF folate, methylcobalamin and adenosylcobalamin B12, P5P B6, R5P B2) for SAMe regeneration, Lithium Orotate at trace dose for mood and cellular signaling, L-Theanine for parallel GABA calming, DIM for upstream estrogen 2-hydroxylation, plus Quercetin and reduced Glutathione for downstream antioxidant and Phase II detoxification support. The 10x to 28x liposomal and micellar bioavailability ensures clinically meaningful systemic exposure for the methyl donor and active-form B vitamin payloads conventional capsule formats deliver poorly.\n\n## Ingredient breakdown\n\n- **Liposomal Magnesium Bisglycinate:** Cofactors COMT enzyme directly; magnesium is the essential metal cofactor at the COMT active site for catecholamine and catecholestrogen methylation.\n- **SAMe (S-Adenosylmethionine):** Provides the universal methyl donor that COMT uses to methylate catecholamines and catecholestrogens, supporting over two hundred methyltransferase reactions.\n- **Methylated Vitamin B2 (Riboflavin-5-Phosphate):** Provides FAD that supports MTHFR activity for the SAMe regeneration upstream of COMT.\n- **Methylated Vitamin B6 (P-5-P):** Cofactors over a hundred enzymes including those in catecholamine and tryptophan metabolism.\n- **Liposomal Folate (5-MTHF Calcium Salt):** Drives methylation cycle SAMe regeneration through methionine synthase support and bypasses MTHFR polymorphism bottlenecks.\n- **Liposomal Vitamin B12 (Methylcobalamin + Adenosylcobalamin):** Dual-form B12 cofactor for methionine synthase (homocysteine remethylation) and methylmalonyl-CoA mutase (mitochondrial branched-chain catabolism).\n- **Lithium Orotate:** Provides trace lithium at approximately 0.125 mg elemental lithium per dose, around 1000-fold below pharmaceutical lithium, supporting mood and cellular signaling.\n- **Liposomal L-Theanine:** Provides GABA-mediated calming for the catecholamine-driven CNS arousal that COMT activity modulates.\n- **Diindolylmethane (DIM):** Supports estrogen 2-hydroxylation upstream of COMT, balancing the catecholestrogen substrate flow into the methylation pathway.\n- **Liposomal Quercetin:** Provides flavonoid antioxidant support and mast cell membrane stabilization, complementing the catecholamine-balance pillar.\n- **Liposomal Glutathione (Reduced):** Delivers preformed reduced glutathione for direct oxidative defense and Phase II detoxification, supporting the catecholestrogen clearance arc.\n- **Micellar Bioperine® (Black Pepper Extract):** Extends systemic exposure for the methylated B vitamins and amino acid components through CYP3A4 inhibition.\n\n## Who benefits and what makes this different\n\n**Who benefits:** Adults with COMT Val158Met (slow COMT) polymorphisms experiencing elevated catecholamine symptoms (anxiety, racing thoughts, sleep disruption), women with estrogen dominance where catecholestrogen clearance is compromised, individuals on stimulant medications where COMT activity affects metabolism, adults navigating perimenopausal hormonal fluctuations where COMT substrate burden increases, those with documented elevated dopamine or norepinephrine on neurotransmitter panels, and individuals pursuing the integrated COMT-axis support that single-cofactor products cannot provide.\n\n**What makes it different:** What separates COMT+ from isolated SAMe or generic methylated B-complex is the convergence of three pillars: direct SAMe substrate plus the magnesium metal cofactor that COMT requires plus the upstream estrogen 2-hydroxylation through DIM plus the parallel calming via L-Theanine plus downstream antioxidant and Phase II detoxification support via Quercetin and reduced Glutathione, all delivered through liposomal and micellar carriers. The Lithium Orotate at approximately 0.125 mg elemental lithium per dose is approximately 1000-fold below pharmaceutical lithium, providing the trace nutritional dose for mood and signaling without the monitoring requirements of pharmaceutical lithium.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'comt-plus-neurotransmitter-balance'
      AND p.sku = '37'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152l-rev2 COMT+ update skipped: row not found at slug comt-plus-neurotransmitter-balance / SKU 37';
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
        '152l_rev2_comt_plus_neurotransmitter_balance_revision',
        'products',
        '37',
        v_product_id,
        jsonb_build_object(
            'method', 'rev2_structured_description_lane2_reconciled_per_152p_canonical',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'rev2_structured_pdp_152p_canonical_lane2',
            'authority', 'Gary canonical 2026-05-05 Prompt #152l-rev2 (Lane 2 reconciliation; Gary confirmed live 12-ingredient 579.3mg/serving formulation as canonical via direct paste in spec message)',
            'marshall_scan', 'human_review_pass; zero hits in unapproved_peptides.ts; disease terms (Val158Met, estrogen dominance, perimenopausal) ride 152e verb-pair loophole',
            'bioavailability_format', '10x to 28x liposomal and micellar (7/12 carrier-substantiated: Mg Bisglycinate, Folate 5-MTHF, B12, L-Theanine, Quercetin, Glutathione, Bioperine)',
            'lithium_orotate_dose_framing_preserved', '2.5 mg LiOro ≈ 0.125 mg elemental Li ≈ 1000-fold below pharmaceutical (per #152l original memory line 93 pattern)',
            'magnesium_dose_correction', 'Spec claimed 65 mg elemental Mg per capsule; live 100 mg Mg Bisglycinate chelate ≈ 10 mg elemental Mg; reconciled drops specific mg claim, structure-function framing only',
            'lane2_corrections', jsonb_build_array(
                '11-ingredient -> 12-ingredient',
                'Drop 65 mg magnesium claim (wrong: live 100mg chelate ≈ 10mg elemental, not 65mg)',
                'Drop TMG bullet (not in live)',
                'Drop TMG for alternative methylation pathway opening reference',
                'Drop alternative methylation backup via TMG closing reference',
                'Add Liposomal Quercetin bullet',
                'Add Liposomal Glutathione (Reduced) bullet',
                'SAMe bullet: drop Liposomal prefix (live name SAMe S-Adenosylmethionine)',
                '5-MTHF bullet: Quatrefolic -> Calcium Salt (live brand)',
                'B12 bullet: Methylcobalamin -> Methylcobalamin + Adenosylcobalamin (live dual-form)',
                'P5P bullet: Liposomal Pyridoxal-5-Phosphate -> Methylated Vitamin B6 (P-5-P) live name',
                'R5P bullet: Liposomal Riboflavin-5-Phosphate -> Methylated Vitamin B2 (Riboflavin-5-Phosphate) live name',
                'Lithium Orotate: drop Liposomal prefix (live no carrier)',
                'DIM: drop Liposomal prefix (live name Diindolylmethane DIM no carrier)',
                'Catalog summary revised: explicit Balance | Detox | Harmonize three-pillar',
                'Closing differentiation: replace TMG pillar with Quercetin + Glutathione downstream antioxidant + Phase II detox pillar'
            ),
            'product_name', 'COMT+ Neurotransmitter Balance',
            'three_pillar_positioning', 'Balance | Detox | Harmonize',
            'live_ingredient_total_mg', 579.3,
            'live_ingredient_count', 12,
            'live_format', 'capsule',
            'rev2_canonical_pattern', 'feedback_152p_canonical_for_all_formulation_updates',
            'predecessor_pattern_preserved', '#152l original Lithium Orotate dose-framing pattern (per memory line 93)'
        )
    );

    RAISE NOTICE '#152l-rev2 COMT+ update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
