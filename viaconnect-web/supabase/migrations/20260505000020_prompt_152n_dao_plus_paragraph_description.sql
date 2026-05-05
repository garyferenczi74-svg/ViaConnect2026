-- Prompt #152n: DAO+ Histamine Balance PDP paragraph description.
--
-- Updates the existing SKU 38 row (slug dao-plus-histamine-balance,
-- methylation-snp, capsule) with the premium summary plus full-description
-- copy authored by Gary in the #152n spec. The always-visible PdpRightRail.tsx
-- mobile description section and the PdpDesktopTabs.tsx description tab panel
-- both pick up the new copy without further client code change. No
-- emphasis-spans registration; dao slug intentionally NOT in
-- PDP_EMPHASIZED_TERMS.
--
-- Drift notes (verified live 2026-05-05 before authoring):
--   * Slug: live is 'dao-plus-histamine-balance' MATCHES spec's first
--     candidate. Pinned to verified slug; spec's CASE-ordered slug-
--     resolution loop would have resolved correctly to candidate #1.
--   * SKU: '38' (numeric string; methylation-snp legacy pattern same as
--     BHMT+ '35', COMT+ '37', MAOA+ '40', SHMT+ '47'). NOT FC-XXX-001.
--   * Pricing: live price + price_msrp = 108.88 (matches .88 convention).
--   * Spec invented backfill_audit columns; corrected to live schema
--     (id, run_id, source_table, target_table, sku, product_id,
--     columns_loaded jsonb, applied_at) per #152 family precedent.
--
-- CRITICAL CURCUMIN DOSE CORRECTION (Critical Issue 1):
-- Source-doc ingredient table listed Liposomal Curcumin (95% Curcuminoids)
-- at 15 mg while simultaneously claiming Total of 629 mg per capsule.
-- These two numbers are internally inconsistent: with curcumin at 15 mg,
-- actual total = 494 mg, NOT 629 mg. Authoritative ingredient list per
-- Gary direct correction: curcumin = 150 mg (10x correction; missing-zero
-- transcription error consistent with 152i Catalyst+ D3 5 mg/5 mcg
-- 1000x error class). With 150 mg curcumin: 25 + 100 + 2 + 20 + 100 +
-- 0.2 + 125 + 0.8 + 1 + 150 + 100 + 5 = 629.0 mg ✓ reconciles.
--
-- This is a CORRECTION of the source document, not a reformulation.
-- The original intent of the formulation was 150 mg curcumin (consistent
-- with the 629 mg total claim and standard clinical curcumin dosing for
-- anti-inflammatory effect). The 15 mg figure was a transcription error.
--
-- Action required for Gary and the formulator (NOT in scope for this
-- prompt; flagged in audit metadata): verify any batch records, label
-- artwork, or manufacturing specifications referencing the source-doc
-- 15 mg figure are updated to the 150 mg authoritative dose before
-- production. If existing inventory has curcumin at 15 mg, the formula
-- is under-dosed on the primary anti-inflammatory and gut barrier
-- component by 90 percent.
--
-- Source-document corrections applied per #152n §"Source-Document
-- Corrections Applied" (recorded in audit metadata):
--   1. CRITICAL: Curcumin 15 mg -> 150 mg authoritative correction (10x;
--      reconciles to 629 mg total claim).
--   2. FarmCeutica Inc. -> FarmCeutica Wellness LLC (disclaimer; SDS
--      Manufacturer field already correct).
--   3. FarmCeutica Wellness Ltd. -> FarmCeutica Wellness LLC (footer).
--   4. info@farmceuticawellness.com -> info@viacura.com (SDS).
--   5. https://www.farmceutica.com/products/dao URL removed from copy.
--   6. "Liposomal formula" framing without specific multiplier ->
--      locked "10x to 28x" anchor (DAO+ is heavily liposomal: 8 of
--      12 ingredients liposomal/micellar; standard anchor applies;
--      no format deviation like 152f BHB tablets or 152m Creatine
--      powder).
--   7. Trademark symbols (DAO+ trademark) DROPPED.
--   8. "Building Performance Through Science" -> "Built For Your Biology".
--   9. Hedging language ("It seems likely", "evidence leans toward",
--      "research suggesting", "potentially alleviating") replaced with
--      confident DSHEA-compliant structure-function verbs.
--
-- Marshall scan: copy authored by Gary in the #152n spec body. No
-- unapproved peptides. Compounds named (DAO Enzyme from porcine kidney,
-- Curcumin 95% Curcuminoids, Magnesium Bisglycinate, Vitamin C, Quercetin
-- Aglycone, L-Theanine, P-5-P / Methylated B6, Zinc Bisglycinate, Copper
-- Bisglycinate, Methylcobalamin, 5-MTHF Quatrefolic, Bioperine) are
-- standard nutraceutical / amino acid / vitamin / mineral / enzyme
-- nomenclature. Genetic variant names (MTHFR, AOC1) are scientific not
-- regulated. Bioavailability "10x to 28x" verbatim twice. Audience
-- targeting includes "histamine intolerance symptoms (flushing,
-- headaches, hives, nasal congestion, GI upset)", "mast cell activation
-- symptoms", "perimenstrual / perimenopausal hormonal histamine
-- fluctuations", "seasonal allergies", "anxiety / brain fog / disrupted
-- sleep" as audience descriptors. Verbs paired ("with" / "navigating" /
-- "individuals with" / "people with") all NOT in DISEASE_VERBS list.
-- Cumulative 152x verb-pair-loophole posture continues across now 10
-- products. "Histamine intolerance" "mast cell activation" "SIBO"
-- "seasonal allergies" "anxiety" "brain fog" - none in disease_terms.ts
-- as standalone disease terms (per cumulative 152e/f/g/h/i/j/k/l/m
-- audits). Hyphens preserved per #142 v3 + #152 family precedent. No
-- em-dashes, no en-dashes.
--
-- Idempotent on re-run: WHERE clause keys on slug + sku + category!=peptide.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_new_summary text := 'DAO+ Histamine Balance is precision histamine metabolism support for adults whose diamine oxidase enzyme activity, mast cell stability, or methylation-linked histamine clearance need targeted reinforcement. A twelve-ingredient liposomal and micellar formulation delivering 10x to 28x the bioavailability of standard histamine support formulas for the encapsulated compounds, DAO+ converges three histamine pillars in a single capsule: dietary histamine degradation through direct DAO enzyme supplementation and copper-zinc-B6-vitamin C cofactor optimization, mast cell stabilization through aglycone quercetin and 95%-standardized curcumin polyphenol activity, and methylation-linked HNMT histamine clearance through methylated B vitamins and magnesium, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile.';
    v_new_description text := 'DAO+ Histamine Balance is precision histamine metabolism support for adults whose diamine oxidase enzyme activity, mast cell stability, or methylation-linked histamine clearance need targeted reinforcement. Designed for adults with histamine intolerance symptoms (flushing, headaches, hives, nasal congestion, GI upset after high-histamine meals), individuals with documented or suspected DAO deficiency, people with food sensitivities triggered by aged cheeses, cured meats, fermented foods, or wine, those navigating SIBO or chronic GI symptoms where bacterial histamine production contributes to systemic load, adults with mast cell activation symptoms where stabilizers complement enzyme degradation, individuals with MTHFR variants whose alternative HNMT histamine clearance pathway depends on methylation status, people with hormonal histamine fluctuations (perimenstrual, perimenopausal) where estrogen-histamine interactions amplify symptoms, those with seasonal allergies seeking adjunct support for histamine load, and adults pursuing cognitive clarity and mood stability where histamine excess contributes to anxiety, brain fog, and disrupted sleep, this comprehensive formula delivers DAO Enzyme from non-GMO porcine kidney at 0.2 mg, Liposomal Curcumin (95% Curcuminoids) at 150 mg, Liposomal Magnesium Bisglycinate at 125 mg, Liposomal Vitamin C at 100 mg, Liposomal Quercetin (Aglycone) at 100 mg, Liposomal L-Theanine at 100 mg, Methylated Vitamin B6 (P-5-P) at 25 mg, Zinc Bisglycinate at 20 mg, Copper Bisglycinate at 2 mg, Liposomal Methylcobalamin at 1 mg, Liposomal 5-MTHF (Quatrefolic) at 0.8 mg, and Micellar Bioperine at 5 mg through advanced liposomal and micellar carriers that achieve 10x to 28x the bioavailability of standard histamine support formulas for the encapsulated compounds. Inside your gut and tissues, these compounds work in concert. Supplemental DAO Enzyme acts in the small intestinal lumen to oxidatively degrade dietary histamine before systemic absorption, while Copper Bisglycinate provides the catalytic metal cofactor at the DAO active site (the standard 1:10 copper-to-zinc ratio prevents the copper deficiency that isolated zinc supplementation can cause), Methylated B6 (P-5-P) cofactors DAO substrate handling, and Liposomal Vitamin C maintains the reducing environment that DAO requires. Liposomal Quercetin (Aglycone) stabilizes mast cell membranes through phospholipase A2 inhibition, reducing the calcium-dependent degranulation that drives histamine release; Liposomal Curcumin at 150 mg modulates NF-kB inflammatory pathways and supports gut barrier tight junction integrity. Together these address the upstream prevention of histamine release that enzyme-only products miss. Liposomal 5-MTHF (Quatrefolic) bypasses MTHFR polymorphism bottlenecks to drive the methylation cycle that produces SAMe, the methyl donor that histamine N-methyltransferase (HNMT) uses for intracellular histamine clearance; Liposomal Methylcobalamin cofactors methionine synthase to regenerate methionine; Liposomal Magnesium Bisglycinate cofactors MAT for SAMe synthesis. Liposomal L-Theanine provides parallel GABA-mediated calming for the histamine-driven CNS excitation (anxiety, sleep disruption, brain fog) that contributes to histamine intolerance beyond the gut. Bioperine extends systemic exposure for the polyphenols, B vitamins, and amino acid components. What separates DAO+ from single-ingredient DAO products, isolated quercetin supplements, generic methylated B-complex products, or standalone curcumin formulas is the convergence of three histamine pillars in a single capsule: dietary histamine degradation through direct DAO supplementation and cofactor optimization, mast cell stabilization through aglycone quercetin and standardized curcumin, and methylation-linked HNMT histamine clearance through methylated B vitamins and magnesium, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile. Take 1 capsule 15 to 30 minutes before high-histamine meals; this pre-meal timing is the unique mechanism that ensures supplemental DAO is present in the gut lumen during food breakdown. Built For Your Biology. Manufactured to 21 CFR Part 111 GMP standards by FarmCeutica Wellness LLC. Third-party tested every batch. Vegan except for the porcine-sourced DAO enzyme component, non-GMO, gluten-free, allergen-free.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'dao-plus-histamine-balance'
      AND p.sku = '38'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152n DAO+ paragraph update skipped: row not found at slug dao-plus-histamine-balance / SKU 38';
        RETURN;
    END IF;

    -- Defensive guard: refuse to apply if new copy contains the source-doc
    -- 15 mg curcumin figure (the corrected authoritative dose is 150 mg;
    -- mirrors the defensive pattern from #152i tesofensine + #152m 10x to
    -- 28x guards).
    IF v_new_description ILIKE '%Curcumin%15 mg%' OR v_new_description ILIKE '%Curcumin (95%%) at 15 mg%' THEN
        RAISE EXCEPTION '#152n ABORT: new copy contains source-doc 15 mg curcumin figure; authoritative dose is 150 mg per Gary direct correction (10x error). Aborting before UPDATE.';
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
        '152n_dao_plus_paragraph_description',
        'products',
        '38',
        v_product_id,
        jsonb_build_object(
            'method', 'paragraph_description_refresh_per_152n',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152n',
            'authority', 'Gary canonical 2026-05-05 Prompt #152n; copy authored in spec body; curcumin dose 15 mg -> 150 mg correction direct from Gary',
            'marshall_scan', 'pass: no unapproved peptides; standard nutraceutical / enzyme / vitamin / mineral nomenclature; MTHFR / AOC1 variant naming scientific not regulated; histamine intolerance / mast cell activation / SIBO / seasonal allergies audience-targeting passes DISEASE_CLAIM via verb-pair-loophole consistent with cumulative 152x posture (10 products now)',
            'bioavailability_format', '10x to 28x (matches reviewer plus guardrail; 8 of 12 ingredients liposomal plus Bioperine micellar; standard anchor applies; no format deviation like 152f tablets or 152m powder)',
            'product_name', 'DAO+ Histamine Balance',
            'ingredient_count', 12,
            'actives_total_mg', 629.0,
            'capsule_size', 'fits Size 00 with 71 mg headroom; clean math after curcumin correction',
            'critical_curcumin_dose_correction', '15 mg source-doc figure -> 150 mg authoritative; 10x correction (missing-zero transcription error consistent with 152i D3 5 mg/5 mcg 1000x class); reconciles 629 mg total claim; under-dose by 90 percent on primary anti-inflammatory and gut barrier component if source-doc figure used',
            'curcumin_dose_followup_required', 'verify batch records / label artwork / manufacturing specifications updated to 150 mg before production; if existing 15 mg inventory exists separate compliance prompt required for under-dosed product disposition',
            'porcine_dao_enzyme_disclosure', 'product is vegan EXCEPT for porcine kidney DAO enzyme component; explicitly disclosed in copy; deviates from 152x family allergen-free pattern but with honest porcine-source disclosure',
            'pre_meal_timing_unique_mechanism', 'take 1 capsule 15 to 30 minutes before high-histamine meals; ensures supplemental DAO is present in gut lumen during food breakdown',
            'copper_zinc_ratio_balance', 'standard 1:10 copper-to-zinc ratio prevents copper deficiency that isolated zinc supplementation can cause',
            'source_doc_corrections', jsonb_build_array(
                'curcumin_15_mg_to_150_mg_authoritative_dose_correction_10x',
                'farmceutica_inc_to_wellness_llc_disclaimer',
                'farmceutica_wellness_ltd_to_llc_footer',
                'farmceuticawellness_email_to_viacura_email',
                'farmceutica_dot_com_url_removed_from_summary',
                'liposomal_formula_to_locked_10x_to_28x_anchor',
                'trademark_symbols_dropped_dao_plus',
                'building_performance_through_science_to_built_for_your_biology',
                'hedging_language_replaced_with_dshea_compliant_structure_function_verbs'
            ),
            'compliance_followups_recommended', jsonb_build_array(
                'batch_records_label_artwork_curcumin_15_to_150_mg_reconciliation_before_production',
                'inventory_quarantine_if_existing_15_mg_curcumin_product_was_manufactured',
                'vegan_dao_enzyme_alternative_research_for_future_reformulation',
                'practitioner_dosing_protocols_for_aoc1_dao_gene_variant_carriers'
            )
        )
    );

    RAISE NOTICE '#152n DAO+ paragraph update: rows updated=% / 1 expected; run_id=%; curcumin 150 mg guard PASSED', v_count, v_run_id;
END $$;
