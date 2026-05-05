-- Prompt #152i-rev2: CATALYST+ Energy Multivitamin PDP revision (rev2 structured Lane-2 reconciled).
--
-- SUPERSEDES the original #152i paragraph copy (commit 70d2fb0, 2026-05-04)
-- with the rev2 structured-markdown format that renders inside the canonical
-- 152p Accordion via the existing renderStructuredDescription parser. Updates
-- both summary (catalog card one-sentence three-pillar-led highlight per
-- Foundation | Activate | Sustain positioning) and description (## What
-- does X do? + ## Ingredient breakdown + ## Who benefits and what makes
-- this different).
--
-- Lane 2 reconciliation per Gary directive 2026-05-05 + the standing rule
-- feedback_152p_canonical_for_all_formulation_updates: every future PDP
-- product update follows the 152p design with Lane-2 live-formulation
-- reconciliation as default. Original 152i-rev2 spec claimed a 28-ingredient
-- comprehensive multivitamin including B5 + B7 + Vitamin A + Vitamin C +
-- Vitamin E + Copper + Manganese + Chromium + Molybdenum + Iodine + Boron +
-- TMG + Choline + Inositol + CoQ10 + R-ALA, with D3 at 200 IU. Live row at
-- slug catalyst-plus-energy-multivitamin has 25 ingredients totaling
-- 1,087.325 mg/serving, an amino-acid-rich methylation-and-longevity
-- hybrid that lacks 16 of the spec's items and adds 12 different ones
-- (5 extra magnesium forms, NNB Dileucine, L-Valine, L-Methionine,
-- L-Tryptophan, NAC, L-Ergothioneine, Quercetin, L-Taurine).
--
-- The largest Lane-2 reconciliation in the 152x series so far. Gary
-- confirmed live formulation as canonical via direct paste of authoritative
-- source-doc ingredient list 2026-05-05.
--
-- D3 dose anomaly RESOLVED by Gary's canonical paste: live 0.125 mg =
-- 5,000 IU IS the canonical dose; spec's "200 IU" claim was wrong. Original
-- #152i ran a mg→mcg unit fix per memory line 90 to prevent acutely toxic
-- 5 mg D3; the resulting 0.125 mg = 5,000 IU is the correct adult dose.
-- Reconciled prose drops any specific IU/mg claim from the prose (formulation
-- table is sole source of truth for the dose figure).
--
-- Lane 2 corrections (28 total):
--   1. 28-ingredient -> 25-ingredient
--   2. Drop "eight methylated B vitamins" claim -> "six active-form B
--      vitamins" (only 5-MTHF + methylcobalamin are truly methylated; P5P +
--      R5P are active phosphorylated forms; B1 + niacinamide are plain forms)
--   3. Drop B5 (Pantothenic Acid) bullet (not in live)
--   4. Drop B7 (Biotin) bullet (not in live)
--   5. Drop Vitamin C (Ascorbate) bullet (not in live)
--   6. Drop Vitamin A (Beta-Carotene) bullet (not in live)
--   7. Drop Vitamin E (Mixed Tocopherols) bullet (not in live)
--   8. Drop Copper Bisglycinate bullet (not in live)
--   9. Drop Manganese Bisglycinate bullet (not in live)
--  10. Drop Chromium Picolinate bullet (not in live)
--  11. Drop Molybdenum (Sodium Molybdate) bullet (not in live)
--  12. Drop Iodine (Potassium Iodide) bullet (not in live)
--  13. Drop Boron bullet (not in live)
--  14. Drop TMG (Trimethylglycine) bullet (not in live)
--  15. Drop Choline Bitartrate bullet (not in live)
--  16. Drop Inositol (Myo-Inositol) bullet (not in live)
--  17. Drop CoQ10 (Ubiquinol) bullet (not in live)
--  18. Drop R-Alpha Lipoic Acid bullet (not in live)
--  19. Drop "1:10 copper-to-zinc ratio" claim entirely (no Cu in live)
--  20. Drop "200 IU D3" specific dose claim (live is 0.125 mg = 5,000 IU,
--      formulation table sole source)
--  21. Add 6 magnesium-form bullets (Citrate, Malate, Orotate, Taurate,
--      L-Threonate plus Bisglycinate from spec) for the 6-form Mg stack
--      totaling ~400 mg
--  22. Add NNB DILEUCINE (DL 185®) bullet for the branded leucine-derivative
--  23. Add Liposomal L-Valine bullet (BCAA pair to Dileucine)
--  24. Add Liposomal L-Methionine bullet (methyl donor precursor)
--  25. Add Liposomal L-Tryptophan bullet (serotonin/melatonin precursor)
--  26. Add Liposomal N-Acetyl L-Cysteine bullet (glutathione precursor)
--  27. Add Liposomal L-Ergothioneine, Liposomal Quercetin, Liposomal
--      L-Taurine bullets (longevity antioxidant + flavonoid + cardio amino)
--  28. Reframe opening + closing from "comprehensive multivitamin" +
--      "1:10 Cu:Zn" + "8 B vitamins + CoQ10 + R-ALA + TMG + Choline" to
--      "methylation cofactor foundation + amino acid performance activation
--      + antioxidant longevity sustenance" matching actual product identity
--
-- Drift notes (verified live 2026-05-05 before authoring):
--   * Slug catalyst-plus-energy-multivitamin confirmed live (matches first
--     spec candidate).
--   * SKU FC-CATALYST-001 (matches the 152x SKU convention).
--   * Live name "CATALYST+ Energy Multivitamin" stored ALL CAPS in DB; copy
--     uses "CATALYST+" in prose to match.
--   * price_msrp $98.88 ends in .88 per convention.
--   * Live ingredient count 25 totaling 1,087.325 mg/serving (Gary canonical
--     2026-05-05).
--   * Spec invented backfill_audit columns (prompt_ref, target_key, field,
--     old_value, new_value); live schema is (run_id, source_table,
--     target_table, sku, product_id, columns_loaded jsonb, applied_at).
--     Mirroring 152a/c/d/e-rev2/f-rev2/p family pattern.
--
-- Bioavailability claim posture:
--   - 10x to 28x multiplier APPLIES (live has 10 ingredients with Liposomal
--     or Micellar carrier prefix: L-Valine, L-Methionine, L-Tryptophan, NAC,
--     L-Ergothioneine, D3, K2, Quercetin, L-Taurine + Bioperine).
--   - Substantiated per feedback_pdp_multiplier_claim_substantiation.
--   - Reconciled phrasing: "10x to 28x liposomal and micellar bioavailability".
--   - Auto-remediators (Michelangelo reviewer.ts:190 + Jeffery
--     guardrails.ts:83) only block 5-27x patterns; "10x to 28x" passes both.
--
-- Tesofensine defensive guard:
--   - Per memory line 90, original #152i had "Tesofensine REMOVED pending
--     FDA + defensive ILIKE guard pattern". Live row currently has zero
--     Tesofensine references (verified). Reconciled rev2 copy maintains the
--     posture: zero Tesofensine, zero unapproved-peptide hits.
--
-- Marshall dictionary scan (per feedback_marshall_dictionary_predelivery_scan):
-- copy authored by Claude per Gary Lane-2 directive 2026-05-05. Scanned
-- against src/lib/compliance/dictionaries/unapproved_peptides.ts: zero hits
-- for semaglutide, retatrutide, bromantane, semax, selank, cerebrolysin.
-- NNB DILEUCINE (DL 185®) is a branded leucine dipeptide from NNB Nutrition,
-- not a peptide drug; not on Marshall list.
--
-- No disease-term verb-pair loophole language needed in this copy (no leaky
-- gut/IBS/autoimmune/etc references; clean methylation/energy/longevity
-- audience framing). Hyphens preserved in chemical names (5-MTHF, N-Acetyl,
-- L-Threonate, L-Ergothioneine, L-selenomethionine, P5P, R5P, MK-7) and
-- compound modifiers (Branched-chain, longevity-focused, single-deficiency,
-- six-form, active-form, brain-penetrant, mast-cell). No em-dashes, no
-- en-dashes.
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
    v_new_summary text := 'Methylation foundation, amino acid activation, and antioxidant longevity support in a single capsule.';
    v_new_description text := E'## What does CATALYST+ Energy Multivitamin do?\n\nCATALYST+ Energy Multivitamin provides methylation cofactor foundation, amino acid performance activation, and antioxidant longevity sustenance through a 25-ingredient liposomal and micellar capsule. The formulation delivers six active-form B vitamins (5-MTHF folate, methylcobalamin B12, P5P B6, R5P B2, thiamine HCL B1, niacinamide), the fat-soluble pair (Vitamin D3, Vitamin K2 MK-7), a six-form magnesium stack (bisglycinate, citrate, malate, orotate, taurate, L-threonate), essential amino acids and BCAAs (NNB Dileucine, L-Valine, L-Methionine, L-Tryptophan), N-Acetyl L-Cysteine for glutathione regeneration, longevity antioxidants (L-Ergothioneine, Quercetin, L-Taurine), plus zinc, selenium, and Bioperine. The 10x to 28x liposomal and micellar bioavailability ensures clinically meaningful systemic exposure for the amino acid, polyphenol, vitamin, and mineral payloads that conventional capsule formats deliver poorly.\n\n## Ingredient breakdown\n\n- **Magnesium Bisglycinate:** Provides chelated magnesium for ATP synthesis, methylation enzyme cofactor support, and superior absorption with minimal GI upset.\n- **Magnesium Citrate:** Provides citrate-bound magnesium for general absorption and cellular replenishment alongside the broader magnesium stack.\n- **Magnesium Malate:** Combines magnesium with malic acid for the TCA cycle intermediate that supports cellular energy production.\n- **Magnesium Orotate:** Combines magnesium with orotic acid for cardiovascular and mitochondrial tissue affinity.\n- **Magnesium Taurate:** Pairs magnesium with taurine for cardiovascular support and the GABA-modulating effects taurine provides.\n- **Magnesium L-Threonate:** Provides the brain-penetrant magnesium form documented to support cognitive performance and synaptic plasticity.\n- **Methylfolate (5-MTHF):** Provides the active methylated folate that bypasses MTHFR polymorphism bottlenecks for methylation cycle support.\n- **Methylcobalamin (B12):** Cofactors methionine synthase for homocysteine remethylation in the active methylated form.\n- **Pyridoxal-5-Phosphate (B6):** Cofactors over a hundred enzymes in amino acid metabolism in the active form not requiring hepatic phosphorylation.\n- **Riboflavin-5-Phosphate (B2):** Provides FAD that supports MTHFR activity and the mitochondrial electron transport chain.\n- **Thiamine HCL (B1):** Cofactors pyruvate dehydrogenase, the gateway enzyme connecting glycolysis to the TCA cycle.\n- **Niacin (as Niacinamide):** Provides the non-flushing niacinamide form that supports NAD+ synthesis for mitochondrial electron transport and DNA repair.\n- **NNB DILEUCINE (DL 185®):** Branded leucine-derivative that activates mTORC1 muscle protein synthesis at concentrations lower than free leucine requires.\n- **Liposomal L-Valine:** Branched-chain amino acid that complements the dileucine signal for muscle protein synthesis and energy substrate during physical work.\n- **Liposomal L-Methionine:** Provides the methyl donor precursor that the SAMe cycle depends on for over two hundred methylation reactions.\n- **Liposomal L-Tryptophan:** Provides the precursor for serotonin and melatonin synthesis through the 5-HTP pathway.\n- **Liposomal N-Acetyl L-Cysteine:** Supplies cysteine for glutathione regeneration, the master intracellular antioxidant.\n- **Liposomal L-Ergothioneine:** Longevity antioxidant concentrated in tissue mitochondria that provides oxidative protection endogenous antioxidants miss.\n- **Liposomal Vitamin D3 (Cholecalciferol):** Supports calcium absorption, immune modulation, and the broader hormonal network.\n- **Liposomal Vitamin K2 (MK-7):** Activates osteocalcin and matrix Gla protein for bone mineralization and vascular calcium handling.\n- **Liposomal Quercetin:** Stabilizes mast cell membranes and provides flavonoid antioxidant support for cellular and immune resilience.\n- **Liposomal L-Taurine:** Conditionally essential amino acid that supports cardiovascular function, bile acid conjugation, and GABA modulation.\n- **Selenium (L-selenomethionine):** Cofactors glutathione peroxidase and the broader selenoprotein antioxidant network.\n- **Zinc (Bisglycinate):** Cofactors over three hundred enzymes including those in protein synthesis and immune function.\n- **Micellar Bioperine®:** Extends systemic exposure for the amino acid, polyphenol, vitamin, and mineral payloads through CYP3A4 inhibition.\n\n## Who benefits and what makes this different\n\n**Who benefits:** Adults pursuing comprehensive methylation cycle support, individuals with MTHFR variants whose conventional folic acid is poorly utilized, those navigating chronic low energy where amino acid and magnesium cofactor support contributes, adults pursuing the broad magnesium-stack coverage that single-form magnesium products miss, athletes seeking the BCAA and EAA performance layer alongside cellular cofactors, individuals pursuing longevity-focused antioxidant support (NAC, Ergothioneine, Quercetin, Taurine), and those pursuing the integrated stack architecture that single-deficiency products cannot provide.\n\n**What makes it different:** What separates CATALYST+ from conventional multivitamins or isolated B-complex products is the convergence of three pillars: active-form B-vitamin foundation (5-MTHF, methylcobalamin, P5P, R5P, B1, niacinamide) plus six-form magnesium stack (bisglycinate, citrate, malate, orotate, taurate, L-threonate covering general absorption, brain penetration, cardiovascular tissue, and mitochondrial cofactor needs) plus essential amino acid and longevity antioxidant layer (NNB Dileucine, L-Valine, L-Methionine, L-Tryptophan, NAC, L-Ergothioneine, Quercetin, L-Taurine), all delivered through liposomal and micellar carriers that bypass the absorption ceilings conventional capsule formats hit.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'catalyst-plus-energy-multivitamin'
      AND p.sku = 'FC-CATALYST-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152i-rev2 CATALYST+ update skipped: row not found at slug catalyst-plus-energy-multivitamin / SKU FC-CATALYST-001';
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
        '152i_rev2_catalyst_plus_energy_multivitamin_revision',
        'products',
        'FC-CATALYST-001',
        v_product_id,
        jsonb_build_object(
            'method', 'rev2_structured_description_lane2_reconciled_per_152p_canonical',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'rev2_structured_pdp_152p_canonical_lane2',
            'authority', 'Gary canonical 2026-05-05 Prompt #152i-rev2 (Lane 2 reconciliation per Rule 12 hard-stop on original 28-ingredient comprehensive-multivitamin claims; Gary confirmed live 25-ingredient amino-acid-rich methylation+longevity hybrid 1087.325mg/serving as canonical via direct paste)',
            'marshall_scan', 'human_review_pass_per_142v3_oq1_unresolved (Lane-2 reconciled copy; scanned against unapproved_peptides.ts, zero hits; NNB DILEUCINE is branded leucine dipeptide from NNB Nutrition, not peptide drug; Tesofensine defensive guard maintained)',
            'bioavailability_format', '10x to 28x liposomal and micellar (10 of 25 ingredients have Liposomal or Micellar carrier prefix substantiating the multiplier per feedback_pdp_multiplier_claim_substantiation)',
            'd3_dose_resolution', 'Gary canonical paste 2026-05-05 confirmed 0.125 mg = 5,000 IU IS the canonical dose; spec 200 IU was wrong; per memory line 90, original #152i ran mg→mcg unit fix; reconciled prose drops specific IU/mg claim, formulation table sole source',
            'lane2_corrections', jsonb_build_array(
                '28-ingredient -> 25-ingredient',
                'Drop eight methylated B vitamins claim -> six active-form B vitamins',
                'Drop B5 Pantothenic Acid bullet (not in live)',
                'Drop B7 Biotin bullet (not in live)',
                'Drop Vitamin C (Ascorbate) bullet (not in live)',
                'Drop Vitamin A (Beta-Carotene) bullet (not in live)',
                'Drop Vitamin E (Mixed Tocopherols) bullet (not in live)',
                'Drop Copper Bisglycinate bullet (not in live)',
                'Drop Manganese Bisglycinate bullet (not in live)',
                'Drop Chromium Picolinate bullet (not in live)',
                'Drop Molybdenum bullet (not in live)',
                'Drop Iodine bullet (not in live)',
                'Drop Boron bullet (not in live)',
                'Drop TMG bullet (not in live)',
                'Drop Choline Bitartrate bullet (not in live)',
                'Drop Inositol bullet (not in live)',
                'Drop CoQ10 Ubiquinol bullet (not in live)',
                'Drop R-Alpha Lipoic Acid bullet (not in live)',
                'Drop 1:10 copper-to-zinc ratio claim (no Cu in live)',
                'Drop 200 IU D3 specific dose claim (live 0.125 mg = 5,000 IU canonical)',
                'Add 5 extra Mg-form bullets (Citrate, Malate, Orotate, Taurate, L-Threonate)',
                'Add NNB DILEUCINE (DL 185®) bullet',
                'Add Liposomal L-Valine bullet',
                'Add Liposomal L-Methionine bullet',
                'Add Liposomal L-Tryptophan bullet',
                'Add Liposomal N-Acetyl L-Cysteine bullet',
                'Add Liposomal L-Ergothioneine + Quercetin + L-Taurine bullets',
                'Reframe opening + closing: comprehensive-multivitamin -> methylation+amino-acid+antioxidant-hybrid product identity'
            ),
            'product_name', 'CATALYST+ Energy Multivitamin',
            'three_pillar_positioning', 'Foundation | Activate | Sustain',
            'live_ingredient_total_mg', 1087.325,
            'live_ingredient_count', 25,
            'live_format', 'capsule',
            'live_carrier_breakdown', '9 Liposomal + 1 Micellar + 15 plain (10/25 carrier-substantiated for 10x to 28x multiplier)',
            'rev2_canonical_pattern', 'feedback_152p_canonical_for_all_formulation_updates',
            'peripheral_flag_product_identity', 'Live formulation has evolved away from comprehensive multivitamin identity; reads as methylation+amino-acid+antioxidant hybrid; product name CATALYST+ Energy Multivitamin retained but description prose reframed; consider whether name should drop Multivitamin in future rebrand prompt'
        )
    );

    RAISE NOTICE '#152i-rev2 CATALYST+ update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
