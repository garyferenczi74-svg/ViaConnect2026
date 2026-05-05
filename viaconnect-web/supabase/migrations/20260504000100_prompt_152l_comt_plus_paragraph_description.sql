-- Prompt #152l: COMT+ Neurotransmitter Balance PDP paragraph description.
--
-- Updates the existing SKU 37 row (slug comt-plus-neurotransmitter-balance,
-- methylation-snp, capsule) with the premium summary plus full-description
-- copy authored by Gary in the #152l spec. The always-visible PdpRightRail.tsx
-- mobile description section and the PdpDesktopTabs.tsx description tab panel
-- both pick up the new copy without further client code change. No
-- emphasis-spans registration; comt slug intentionally NOT in
-- PDP_EMPHASIZED_TERMS.
--
-- SECOND 152-series prompt with CONFIRMED live slug (after #152k Clean+).
-- Continues the single-canonical-slug pattern; no fallback resolution
-- array. Reduces migration risk and matches verified live URL
-- https://www.viaconnectapp.com/shop/product/comt-plus-neurotransmitter-balance
--
-- Drift notes (verified live 2026-05-04 before authoring):
--   * Slug: live is 'comt-plus-neurotransmitter-balance' MATCHES SPEC.
--   * SKU: '37' (numeric string; methylation-snp legacy pattern same as
--     BHMT+ '35', DAO+ '38', MAOA+ '40', SHMT+ '47'). NOT the FC-XXX-001
--     convention used by the advanced-formulas family.
--   * Pricing: live price + price_msrp = 108.88 (matches .88 convention).
--   * Spec invented backfill_audit columns; corrected to live schema
--     (id, run_id, source_table, target_table, sku, product_id,
--     columns_loaded jsonb, applied_at) per #152 family precedent.
--
-- Source-document corrections applied per #152l §"Source-Document
-- Corrections Applied" (recorded in audit metadata):
--   1. FarmCeutica Inc. -> FarmCeutica Wellness LLC (disclaimer; TDS
--      Manufacturer field already correct in source).
--   2. FarmCeutica Wellness Ltd. -> FarmCeutica Wellness LLC (footer).
--   3. info@farmceuticawellness.com -> info@viacura.com (SDS Section 1
--      Emergency Contact, brand-canonical email).
--   4. "Enhanced bioavailability" framing without specific multiplier ->
--      locked "10x to 28x" anchor.
--   5. https://www.farmceutica.com/products/comt URL removed from Product
--      Summary (live platform is viaconnectapp.com).
--   6. Trademark symbols (COMT+ trademark) DROPPED in PDP copy per Via
--      Cura standing rules.
--   7. "Building Performance Through Science" -> "Built For Your Biology".
--   8. Hedging language ("It seems likely", "evidence leans toward",
--      "Evidence suggests this approach may", "potentially easing
--      anxiety") replaced with confident DSHEA-compliant structure-
--      function verbs ("supports", "drives", "modulates").
--
-- Source-document math: CONFIRMED CLEAN. 12 ingredients sum to 579.3 mg
-- (100 + 20 + 25 + 25 + 0.8 + 1 + 2.5 + 100 + 100 + 100 + 100 + 5).
-- All subcategory totals reconcile internally (Mineral Cofactor 100,
-- Methyl Donors 20, Methylated B Vitamins 51.8, Neuro Support 102.5,
-- Estrogen Detox 200, Antioxidant Detox 100, Bioavailability 5 = 579.3).
-- First time since #152d Amino Acid Matrix+ that source has zero math
-- discrepancies. Fits Size 00 (700 mg, 120.7 mg headroom). NO capsule
-- size flag.
--
-- Lithium Orotate clinical-precision framing per #152l (NEW for the 152x
-- family, recorded in audit 'lithium_orotate_framing'):
--   * Dose: 2.5 mg lithium orotate = ~0.125 mg elemental lithium (5%
--     elemental by mass).
--   * Pharmaceutical comparison: bipolar disorder uses 600-1800 mg
--     lithium carbonate / day = 115-340 mg elemental Li. The 2.5 mg
--     orotate dose is ~1,000-fold below pharmaceutical doses, well
--     within nutritional range (1-5 mg orotate typical).
--   * Copy framing: "low-dose nutritional lithium for COMT modulation"
--     to clearly distinguish from pharmaceutical lithium therapy.
--   * Contraindications PRESERVED: bipolar disorder history, prescription
--     lithium therapy, MAOI antidepressants, NSAIDs, ACE inhibitors
--     (which can affect lithium handling).
--   * International distribution: Lithium-containing supplements regulated
--     under DSHEA in US but restricted/prescription-only in some Canadian
--     provinces and parts of EU. International gating recorded as
--     compliance follow-up.
--
-- Quercetin mechanism refinement: source conflated SULT inhibition with
-- "aiding conjugation". Rewrite uses the more accurate description: "modulates
-- SULT1E1 substrate competition (shifting estrogens toward methylation
-- rather than sulfation when methylation capacity is adequate)" plus
-- flavonoid antioxidant protection during catechol-estrogen metabolism.
--
-- Cross-product portfolio reference: copy ends with "COMT+ occupies the
-- consumer-of-methyl-groups position in the Via Cura methylation
-- portfolio, completing the architecture alongside the methyl-donor
-- products (ADO Support+, BHMT+, Catalyst+) and the disposal-pathway
-- products (CBS Support+, Clean+)." This positions COMT+ uniquely in
-- the methylation portfolio. Recorded in audit
-- 'cross_product_portfolio_reference' = true.
--
-- Marshall scan: copy authored by Gary in the #152l spec body. No
-- unapproved peptides. Compounds named (Magnesium Bisglycinate, SAMe,
-- R5P, P5P, 5-MTHF, Methylcobalamin, Adenosylcobalamin, Lithium Orotate,
-- L-Theanine, DIM, Quercetin, Glutathione, Bioperine) are standard
-- nutraceutical / amino acid / vitamin / mineral nomenclature. Genetic
-- variant name (COMT Val158Met polymorphism, "Met/Met worrier phenotype")
-- is scientific not regulated. Bioavailability "10x to 28x" verbatim
-- twice. Audience-targeting includes:
--   - "stress sensitivity or post-task crash patterns" — colloquial,
--     not in disease_terms.ts;
--   - "PMS or premenstrual mood symptoms" — PMS appears in
--     disease_terms.ts but verbs paired ("women with") are not in
--     DISEASE_VERBS;
--   - "elevated estradiol or estrogen-to-testosterone ratio concerns" —
--     biomarker reference, "elevated" is not paired with disease verb;
--   - "elevated homocysteine" — biomarker reference;
--   - "histamine sensitivity" — colloquial, not in disease_terms.ts.
-- Verb-pair-loophole continues per 152e/f/g/h/i/j/k cumulative pattern.
-- Hyphens preserved per #142 v3 + #152 family precedent. No em-dashes,
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
    v_new_summary text := 'COMT+ Neurotransmitter Balance is precision catechol-O-methyltransferase support for adults whose catecholamine balance, estrogen metabolism, or methylation cycle need targeted reinforcement. A 12-ingredient liposomal and micellar formulation delivering 10x to 28x the bioavailability of standard COMT-support formulas for the encapsulated compounds, COMT+ converges three methylation pillars in a single capsule: catecholamine clearance through SAMe and methylated B-vitamin cofactor supply for COMT-mediated dopamine and norepinephrine breakdown, estrogen detoxification through DIM-driven 2-hydroxyestrogen pathway promotion and quercetin-mediated metabolism modulation, and methylation harmony through the integrated cofactor matrix that supports SAMe regeneration and homocysteine handling, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile.';
    v_new_description text := 'COMT+ Neurotransmitter Balance is precision catechol-O-methyltransferase support for adults whose catecholamine balance, estrogen metabolism, or methylation cycle need targeted reinforcement. Designed for adults with the COMT Val158Met polymorphism (especially Met/Met "worrier" phenotype) whose endogenous catecholamine clearance is genetically modulated, individuals navigating stress sensitivity or post-task crash patterns where sluggish catecholamine clearance shows up as racing thoughts and difficulty winding down, women with PMS or premenstrual mood symptoms where 2-hydroxyestrogen pathway support contributes to hormonal balance, men with elevated estradiol or estrogen-to-testosterone ratio concerns, adults with elevated homocysteine where the integrated methyl-donor matrix supports remethylation alongside the catechol-methylation purpose, and individuals managing histamine sensitivity where COMT-mediated histamine and catecholamine breakdown share methylation cofactor demand, this 12-ingredient formula delivers Liposomal Magnesium Bisglycinate at 100 mg, SAMe at 20 mg, Methylated Vitamin B2 (R5P) at 25 mg, Methylated Vitamin B6 (P5P) at 25 mg, Liposomal Folate (5-MTHF Calcium Salt) at 0.8 mg, Liposomal Vitamin B12 (Methylcobalamin and Adenosylcobalamin) at 1 mg, Lithium Orotate at 2.5 mg (low-dose nutritional, approximately 0.125 mg elemental lithium), Liposomal L-Theanine at 100 mg, DIM at 100 mg, Liposomal Quercetin at 100 mg, Liposomal Glutathione at 100 mg, and Micellar Bioperine at 5 mg through advanced liposomal and micellar carriers that achieve 10x to 28x the bioavailability of standard COMT-support formulas for the encapsulated compounds. Inside your cells, these compounds work in concert. SAMe is the universal methyl donor that COMT uses to methylate dopamine, norepinephrine, epinephrine, and catechol-estrogens; magnesium is the direct enzyme cofactor; the methylated B-vitamin matrix (R5P, P5P, 5-MTHF, methylcobalamin) sustains the SAMe pool through methionine synthase and supports catecholamine biosynthesis upstream. DIM at 100 mg promotes the favorable 2-hydroxylation pathway in estrogen metabolism through CYP1A1 induction, and the resulting 2-hydroxyestrogens are then methylated by COMT to inactive 2-methoxyestrogens for excretion. Liposomal Quercetin modulates SULT1E1 substrate competition (shifting estrogens toward methylation rather than sulfation when methylation capacity is adequate) and provides flavonoid antioxidant protection during catechol-estrogen metabolism. Liposomal Glutathione neutralizes the catechol-estrogen quinone intermediates that the 4-hydroxylation pathway can produce. Lithium Orotate at 2.5 mg supports COMT expression and B12 transport into neurons at sub-pharmacological doses approximately 1,000-fold below pharmaceutical lithium for bipolar disorder. Liposomal L-Theanine modulates GABA, glutamate, and serotonin signaling, providing parallel neurotransmitter-balance support that complements catecholamine clearance. What separates COMT+ from conventional methylation formulas, isolated SAMe products, single-ingredient DIM supplements, or generic neurotransmitter-balance formulas is the convergence of three pathways in a single capsule: cofactor-and-substrate-supported COMT activation, DIM-and-quercetin-driven estrogen detoxification, and the integrated cofactor matrix that supports SAMe regeneration, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile. COMT+ occupies the consumer-of-methyl-groups position in the Via Cura methylation portfolio, completing the architecture alongside the methyl-donor products (ADO Support+, BHMT+, Catalyst+) and the disposal-pathway products (CBS Support+, Clean+). Built For Your Biology. Manufactured to 21 CFR Part 111 GMP standards by FarmCeutica Wellness LLC. Third-party tested every batch. Vegan, non-GMO, allergen-free.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'comt-plus-neurotransmitter-balance'
      AND p.sku = '37'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152l COMT+ paragraph update skipped: row not found at slug comt-plus-neurotransmitter-balance / SKU 37';
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
        '152l_comt_plus_paragraph_description',
        'products',
        '37',
        v_product_id,
        jsonb_build_object(
            'method', 'paragraph_description_refresh_per_152l',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152l',
            'authority', 'Gary canonical 2026-05-04 Prompt #152l; copy authored in spec body',
            'marshall_scan', 'pass: no unapproved peptides; standard nutraceutical / amino acid / vitamin / mineral nomenclature; COMT Val158Met / Met/Met worrier phenotype is scientific genetic naming; PMS in DISEASE_TERMS but verb-pair-loophole holds (paired with "women with" not in DISEASE_VERBS); cumulative 152x verb-pair-loophole posture continues',
            'bioavailability_format', '10x to 28x (matches reviewer plus guardrail; 6 of 12 ingredients liposomal plus Bioperine micellar)',
            'product_name', 'COMT+ Neurotransmitter Balance',
            'ingredient_count', 12,
            'actives_total_mg', 579.3,
            'capsule_size', 'fits Size 00 with 120.7 mg headroom; clean math; no capsule decision flag',
            'slug_confirmed_second_in_152x', true,
            'lithium_orotate_framing', '2.5 mg lithium orotate = approximately 0.125 mg elemental lithium (5 percent by mass); approximately 1000-fold below pharmaceutical lithium carbonate dosing for bipolar disorder (600-1800 mg / day); copy frames as "low-dose nutritional" and explicitly distinguishes from pharmaceutical lithium therapy; contraindications preserved (bipolar history, prescription lithium, MAOIs, NSAIDs, ACE inhibitors)',
            'cross_product_portfolio_reference', true,
            'methylation_portfolio_position', 'consumer-of-methyl-groups; completes architecture alongside methyl-donor (ADO Support+ / BHMT+ / Catalyst+) and disposal-pathway (CBS Support+ / Clean+) products',
            'source_doc_corrections', jsonb_build_array(
                'farmceutica_inc_to_wellness_llc_disclaimer',
                'farmceutica_wellness_ltd_to_llc_footer',
                'farmceuticawellness_email_to_viacura_email',
                'enhanced_bioavailability_to_locked_10x_to_28x',
                'farmceutica_dot_com_url_removed_from_summary',
                'trademark_symbols_dropped_comt_plus',
                'building_performance_through_science_to_built_for_your_biology',
                'hedging_language_replaced_with_dshea_compliant_structure_function_verbs',
                'quercetin_mechanism_refined_from_aids_conjugation_to_sult1e1_substrate_competition'
            ),
            'compliance_followups_recommended', jsonb_build_array(
                'international_distribution_gating_for_lithium_canada_eu_restrictions',
                'comt_inhibitor_medication_interaction_warning_for_pdp_users_on_prescription_comt_drugs'
            )
        )
    );

    RAISE NOTICE '#152l COMT+ paragraph update: rows updated=% / 1 expected; run_id=%; second 152x with confirmed live slug', v_count, v_run_id;
END $$;
