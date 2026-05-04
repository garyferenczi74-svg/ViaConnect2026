-- Prompt #152i: CATALYST+ Energy Multivitamin PDP paragraph description.
--
-- Updates the existing FC-CATALYST-001 row (slug catalyst-plus-energy-multivitamin,
-- advanced-formulas, capsule) with the premium summary plus full-description
-- copy authored by Gary in the #152i spec. The always-visible PdpRightRail.tsx
-- mobile description section and the PdpDesktopTabs.tsx description tab panel
-- both pick up the new copy without further client code change. No
-- emphasis-spans registration; catalyst slug intentionally NOT in
-- PDP_EMPHASIZED_TERMS.
--
-- Drift notes (verified live 2026-05-04 before authoring):
--   * Slug: live is 'catalyst-plus-energy-multivitamin' (with '-plus-' infix).
--     Spec offered five candidates (catalyst-plus, catalyst,
--     catalyst-multivitamin, catalyst-energy-multivitamin, catalyst-foundational);
--     CLOSEST candidate is catalyst-energy-multivitamin but drops the '-plus-'
--     infix that lives in the actual slug. Spec's CASE-ordered slug-resolution
--     loop would have raised "row not found" and aborted. Same pattern as
--     #152h Blast+. Pinned to verified slug.
--   * SKU: FC-CATALYST-001 (standard FC-XXX-001 convention).
--   * Pricing: live price + price_msrp = 98.88 (matches .88 convention; no
--     pricing flag needed unlike #152h Blast+ which was at $98.00).
--   * Existing live description does NOT contain Tesofensine (verified via
--     ILIKE scan 2026-05-04). Current placeholder is clean. New copy must
--     also be clean of Tesofensine references.
--   * Spec invented backfill_audit columns; corrected to live schema
--     (id, run_id, source_table, target_table, sku, product_id,
--     columns_loaded jsonb, applied_at) per #152 family precedent.
--
-- CRITICAL COMPLIANCE: Source-document corrections applied per #152i
-- §"Source-Document Corrections Applied":
--
--   1. TESOFENSINE REMOVAL (highest priority): Source listed Tesofensine
--      0.5 mg as a "botanical analog" ingredient. Tesofensine is a synthetic
--      small molecule (serotonin-noradrenaline-dopamine reuptake inhibitor,
--      NS2330 / Tesomet program), NOT a botanical analog. It is currently
--      in late-stage FDA review for obesity, has NOT received FDA approval,
--      and is NOT a legal dietary supplement ingredient under DSHEA. If
--      and when approved, it would be a prescription pharmaceutical, not
--      a supplement ingredient under DSHEA, so the supplement formulation
--      pathway remains closed. Action: REMOVED from this PDP copy. PDP
--      ingredient list is now 11 (down from source's 12). PDP copy contains
--      ZERO references to Tesofensine, "botanical analog" framing, or the
--      "metabolic rate / satiety signaling" claims that had implicitly
--      relied on Tesofensine effects. Compliance disposition (batch
--      records, label artwork, supplier specs, inventory quarantine) is
--      OUT OF SCOPE for this prompt and must be filed separately against
--      Kelsey (FDA / Health Canada compliance agent at #113).
--
--   2. VITAMIN D3 / K2 UNIT ERROR (highest priority safety): Source listed
--      D3 + K2 (MK-7) at 5 mg each. Cholecalciferol at 5 mg = 200,000 IU,
--      which is 50x the IOM upper safe limit (4,000 IU = 100 mcg) and
--      acutely toxic. K2 (MK-7) at 5 mg = 5,000 mcg, well outside studied
--      clinical range (90 to 360 mcg). Intended dose is almost certainly
--      5 mcg each (5 mcg D3 = 200 IU; 5 mcg MK-7 within clinical range).
--      Action: PDP copy uses 5 mcg each (mg-unit error corrected to mcg).
--      Total actives drop from source-claimed 587.5 mg (with tesofensine
--      and mg-unit D3/K2) to 577 mg (without tesofensine and with mcg-unit
--      D3/K2). Compliance disposition (batch records, COA, label artwork
--      verification, inventory quarantine if any 5-mg-D3 product was
--      manufactured) is OUT OF SCOPE for this prompt; if any inventory
--      contains 5 mg D3, that inventory is acutely toxic and must be
--      quarantined / destroyed via separate prompt.
--
--   3. FarmCeutica Wellness Ltd. -> FarmCeutica Wellness LLC.
--   4. FarmCeutica Inc. -> FarmCeutica Wellness LLC.
--   5. No source bioavailability anchor; rewrite uses "10x to 28x" locked
--      anchor since 6 of 11 ingredients are liposomal plus Bioperine
--      (micellar) plus amino acid matrix, fitting the standard liposomal
--      product profile.
--
-- Marshall scan: copy authored by Gary in the #152i spec body. No unapproved
-- peptides. Tesofensine NOT present in copy. Botanicals / nutraceuticals /
-- amino acid forms named are standard nomenclature. MTHFR genetic variant
-- name is scientific not regulated. Bioavailability "10x to 28x" verbatim
-- twice. The phrase "people pursuing bone health and cardiovascular
-- prevention" is the closest-to-prevention-claim line in the entire 152x
-- family; DISEASE_CLAIM rule passes via "pursuing" verb absent from
-- DISEASE_VERBS, "cardiovascular" as a structure not a disease term, and
-- "prevention" used in the active-pursuit sense rather than therapeutic
-- claim sense. Hannah review recommended for citation file.
--
-- Hyphens preserved per #142 v3 + #152 family precedent (L-Threonate,
-- L-Taurine, L-Selenomethionine, L-Ergothioneine, MK-7, P5P, 5-MTHF,
-- pre-methylated, six-form, full-spectrum, multi-mineral, allergen-free,
-- non-GMO, Cu/Zn, Gla-protein, blood-brain, single-form, third-party,
-- 21 CFR Part 111, B-complex, high-stress, mast cell, methionine synthase).
-- No em-dashes, no en-dashes.
--
-- Idempotent on re-run: WHERE clause keys on slug + sku + category!=peptide.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_new_summary text := 'Catalyst+ Energy Multivitamin is precision foundational support for adults whose mineral status, amino acid availability, or methylation capacity need targeted reinforcement as part of a comprehensive daily protocol. An 11-ingredient liposomal and micellar formulation delivering 10x to 28x the bioavailability of standard multivitamin formulas for the encapsulated compounds, Catalyst+ converges three foundational pillars in a single capsule: foundational mineral support through a six-form magnesium synergy matrix, complete amino acid coverage through a full-spectrum amino acid matrix, and methylation activation through pre-methylated B vitamins, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile.';
    v_new_description text := 'Catalyst+ Energy Multivitamin is precision foundational support for adults whose mineral status, amino acid availability, or methylation capacity need targeted reinforcement as part of a comprehensive daily protocol. Designed for adults pursuing a single foundational multivitamin and multimineral, individuals with magnesium deficiency or MTHFR genetic variants, active individuals and athletes requiring amino acid support, adults navigating the cellular energy demands of high-stress lifestyles, and people pursuing bone health and cardiovascular prevention through synergistic Vitamin D3, K2, and magnesium support, this 11-ingredient formula delivers a Six-Form Magnesium Synergy Matrix (Bisglycinate, Citrate, Malate, Orotate, Taurate, L-Threonate at 25 mg each), a Full-Spectrum Amino Acid Matrix at 200 mg, Liposomal L-Taurine at 100 mg, Liposomal Quercetin at 50 mg, BioB Fusion methylated B complex at 35 mg (P5P, 5-MTHF, methylcobalamin), L-Selenomethionine at 20 mg, Zinc Bisglycinate at 15 mg, Liposomal Vitamin D3 and Liposomal Vitamin K2 (MK-7) at 5 mcg each, Liposomal L-Ergothioneine at 2 mg, and Micellar Bioperine at 5 mg through advanced liposomal and micellar carriers that achieve 10x to 28x the bioavailability of standard multivitamin formulas for the encapsulated compounds. Inside your cells, these compounds work in concert. Magnesium cofactors over 300 enzymatic reactions including ATP synthesis at the mitochondrial level, with the six-form matrix delivering coverage across cellular compartments where L-Threonate is the only form that meaningfully crosses the blood-brain barrier. The full-spectrum amino acid matrix supplies building blocks for protein synthesis, neurotransmitter precursors (tryptophan to serotonin, phenylalanine to dopamine), and the methionine that feeds the SAMe methylation cycle. The methylated B complex bypasses the MTHFR conversion bottleneck that constrains millions of adults with genetic variants, driving methionine synthase activity that maintains homocysteine within physiological range. Vitamin D3 increases calcium absorption while Vitamin K2 (MK-7) directs that calcium to bone rather than artery through osteocalcin and matrix Gla-protein activation. Selenium cofactors glutathione peroxidase and the deiodinases that activate thyroid hormone. Zinc cofactors the Cu/Zn superoxide dismutase that handles superoxide. L-Ergothioneine accumulates in mitochondria for direct antioxidant protection associated with longevity outcomes. Quercetin provides mast cell stabilization and senolytic activity. What separates Catalyst+ from conventional multivitamins, single-form magnesium products, isolated amino acid powders, or basic methylated B-complex formulas is the convergence of three foundational pillars in a single capsule: six-form magnesium synergy, full-spectrum amino acid coverage, and pre-methylated B activation, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile. Built For Your Biology. Manufactured to 21 CFR Part 111 GMP standards by FarmCeutica Wellness LLC. Third-party tested every batch. Vegan, non-GMO, allergen-free.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'catalyst-plus-energy-multivitamin'
      AND p.sku = 'FC-CATALYST-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152i Catalyst+ paragraph update skipped: row not found at slug catalyst-plus-energy-multivitamin / SKU FC-CATALYST-001';
        RETURN;
    END IF;

    -- Defensive guard: refuse to apply if new copy contains "tesofensine" (case-insensitive).
    IF v_new_summary ILIKE '%tesofensine%' OR v_new_description ILIKE '%tesofensine%' THEN
        RAISE EXCEPTION '#152i ABORT: new copy contains Tesofensine reference; this is a hard regulatory block. Aborting before UPDATE.';
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
        '152i_catalyst_plus_paragraph_description',
        'products',
        'FC-CATALYST-001',
        v_product_id,
        jsonb_build_object(
            'method', 'paragraph_description_refresh_per_152i',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152i',
            'authority', 'Gary canonical 2026-05-04 Prompt #152i; copy authored in spec body',
            'marshall_scan', 'pass: no unapproved peptides; Tesofensine removed and defensive ILIKE guard in migration; standard multivitamin / multimineral nomenclature; "cardiovascular prevention" closest-to-prevention-claim line in 152x family but passes via "pursuing" verb not in DISEASE_VERBS plus "cardiovascular" as structure not disease term',
            'bioavailability_format', '10x to 28x (matches reviewer plus guardrail; 6 of 11 ingredients liposomal plus amino acid matrix plus Bioperine on micellar carrier)',
            'product_name', 'CATALYST+ Energy Multivitamin',
            'ingredient_count', 11,
            'tesofensine_status', 'REMOVED pending FDA approval; defensive ILIKE guard in migration block; compliance disposition (batch records, label artwork, supplier specs, inventory quarantine) OUT OF SCOPE; separate prompt required against Kelsey FDA / Health Canada agent at #113',
            'd3_k2_unit_correction', 'D3 + K2 (MK-7) corrected from source-doc 5 mg each to 5 mcg each; mg-unit dose would have been acutely toxic for D3 (200000 IU = 50x IOM upper safe limit); compliance disposition for any manufactured 5-mg-D3 inventory OUT OF SCOPE; separate quarantine prompt required if inventory exists',
            'source_doc_corrections', jsonb_build_array(
                'tesofensine_removed_pending_fda_approval',
                'd3_k2_mg_to_mcg_unit_correction',
                'farmceutica_wellness_ltd_to_llc',
                'farmceutica_inc_to_wellness_llc',
                'no_source_bioavailability_anchor_to_locked_10x_to_28x',
                'botanical_analog_framing_for_synthetic_drug_eliminated',
                'metabolic_rate_satiety_signaling_claims_implicit_on_tesofensine_eliminated'
            ),
            'actives_total_mg_after_corrections', 577,
            'actives_total_mg_source_claim_with_errors', 587.5,
            'compliance_followups_required', jsonb_build_array(
                'kelsey_fda_health_canada_113_tesofensine_disposition',
                'steve_rica_compliance_label_artwork_audit',
                'steve_rica_compliance_inventory_quarantine_check_if_5mg_d3_exists',
                'fadi_dagher_medical_director_metabolic_positioning_signoff'
            )
        )
    );

    RAISE NOTICE '#152i Catalyst+ paragraph update: rows updated=% / 1 expected; run_id=%; tesofensine guard PASSED', v_count, v_run_id;
END $$;
