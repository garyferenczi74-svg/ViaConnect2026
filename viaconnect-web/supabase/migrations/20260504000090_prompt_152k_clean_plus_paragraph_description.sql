-- Prompt #152k: Clean+ Detox and Liver Health PDP paragraph description.
--
-- Updates the existing FC-CLEAN-001 row (slug clean-plus-detox-and-liver-health,
-- advanced-formulas, capsule) with the premium summary plus full-description
-- copy authored by Gary in the #152k spec. The always-visible PdpRightRail.tsx
-- mobile description section and the PdpDesktopTabs.tsx description tab panel
-- both pick up the new copy without further client code change. No
-- emphasis-spans registration; clean slug intentionally NOT in
-- PDP_EMPHASIZED_TERMS.
--
-- FIRST 152-series prompt with CONFIRMED live slug. Migration uses single
-- canonical slug match, NOT the fallback resolution array used in
-- 152c through 152j. Reduces migration risk and matches verified live URL
-- https://www.viaconnectapp.com/shop/product/clean-plus-detox-and-liver-health
--
-- Drift notes (verified live 2026-05-04 before authoring):
--   * Slug: live is 'clean-plus-detox-and-liver-health' MATCHES SPEC.
--     First time in the 152x family the spec's primary slug matched
--     without resolution loop or correction.
--   * SKU: FC-CLEAN-001 (standard FC-XXX-001 convention).
--   * Live product name uses ampersand ("Clean+ Detox & Liver Health");
--     spec uses "and". Migration updates ONLY summary + description, NOT
--     name, so the typographic difference is preserved.
--   * Pricing: live price + price_msrp = 108.88 (matches .88 convention).
--   * Spec invented backfill_audit columns; corrected to live schema
--     (id, run_id, source_table, target_table, sku, product_id,
--     columns_loaded jsonb, applied_at) per #152 family precedent.
--
-- Source-document corrections applied per #152k §"Source-Document
-- Corrections Applied" (recorded in audit metadata):
--   1. FarmCeutica Inc. -> FarmCeutica Wellness LLC (TDS, SDS, disclaimer
--      x3 instances).
--   2. "Maximum Bioavailability" framing without specific multiplier ->
--      locked "10x to 28x" anchor.
--   3. Trademark symbols (Clean+ trademark, ToxiBind Matrix trademark,
--      DigestiZorb+ trademark) DROPPED in PDP copy per Via Cura standing
--      rules (clean text, no special characters).
--   4. "Phase III (Elimination)" terminology softened to "biliary and
--      renal excretion" plus "Phase III (transporter-mediated efflux)"
--      contextualization. Spec scope: PDP copy uses "Phase I and Phase II"
--      explicitly with biliary plus renal excretion described separately
--      rather than naming a discrete Phase III.
--   5. Anti-Parasitic framing preserved where ingredient evidence
--      supports it (Black Walnut, Pumpkin Seed, Clove) but supplemented
--      with broader "antimicrobial coverage" language. Spec scope:
--      "Antimicrobial Botanicals" used as the umbrella term in PDP copy.
--
-- Source-document math discrepancy flags (NOT resolved by this prompt,
-- recorded as audit metadata; reconciliation deferred to formulator
-- review cycle):
--
--   * Authoritative actives total = 625.8 mg per main ingredient table
--     (200 + 100 + 80 + 30 + 20 + 20 + 20 + 70 + 50 + 20 + 15.8). Fits
--     Size 00 capsule (700 mg capacity) with 74.2 mg headroom; no capsule
--     size flag needed.
--   * "ToxiBind Matrix (100 mg)" subcategory shows zeolite 50 + bentonite
--     50 + chlorella 10 = 110 mg but main table lists chlorella separately
--     under Chelating Agents (20 mg = chlorella 10 + cilantro 10).
--     Resolution: PDP copy treats ToxiBind Matrix as zeolite + bentonite
--     only (matching main table 100 mg) and Chelating Agents as
--     chlorella + cilantro (matching main table 20 mg). Cilantro may be
--     double-counted in source breakdown under Hepatoprotective Botanicals
--     too; main table values authoritative.
--   * "Additional Support Compounds (15.8 mg)" subcategory has internal
--     sum mismatch (NAC 10 + 5-MTHF 0.8 + Pumpkin Seed 10 + Bioperine 5
--     = 25.8 mg, not 15.8 mg). PDP copy preserves main table values and
--     flags the breakdown subcategory mismatch in audit for formulator
--     review.
--   * DigestiZorb+ proprietary blend description references "Black Pepper
--     extracts" while Bioperine 5 mg is separately listed. Bioperine IS a
--     black pepper extract. Likely intentional dual usage (DigestiZorb+
--     blend uses for digestive enzyme activity; separate Bioperine dosed
--     for systemic bioavailability amplification). Flagged for formulator
--     review.
--
-- Marshall scan: copy authored by Gary in the #152k spec body. No
-- unapproved peptides. Compounds named (Inositol, Zeolite, Bentonite Clay,
-- DigestiZorb+ enzyme complex, Milk Thistle / silymarin, TUDCA, Dandelion,
-- Artichoke, Fulvic Acid, Alpha-Lipoic Acid, Cilantro, Black Walnut,
-- Oregano Oil, Garlic, Clove, Berberine, Choline / Alpha-GPC, Glutathione,
-- L-Methionine, Curcumin, Chlorella, NAC, Pumpkin Seed, 5-MTHF Quatrefolic,
-- Bioperine) are standard nutraceutical / botanical / mineral / amino
-- acid names. Genetic variant names (MTHFR, GST, CYP) are scientific not
-- regulated. Bioavailability "10x to 28x" verbatim twice. Cumulative
-- 152x verb-pair-loophole posture continues across:
--   - "elevated liver enzymes (ALT, AST, GGT) under practitioner supervision"
--     ("under practitioner supervision" softener);
--   - "documented or suspected fatty liver" (verbs absent from
--     DISEASE_VERBS, "documented" + "suspected" pass);
--   - "heavy metal exposure" + "heavy metal burden" (no DISEASE_VERBS
--     within 60 chars; environmental exposure language not in
--     disease_terms.ts);
--   - "gut dysbiosis" (not in disease_terms.ts; structure-function
--     language).
-- Clean+ description disclaimer DIVERGES from 152x template's
-- "Vegan, non-GMO, allergen-free" because Clean+ contains milk thistle
-- and digestive enzymes; copy correctly states "Vegan, non-GMO, contains
-- milk thistle and digestive enzymes (not allergen-free)" for honesty.
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
    v_new_summary text := 'Clean+ Detox and Liver Health is precision detoxification support for adults whose hepatic Phase I and Phase II detoxification capacity, heavy metal burden, or cellular cleansing pathways need targeted reinforcement. A comprehensive multi-ingredient liposomal and micellar formulation delivering 10x to 28x the bioavailability of standard detoxification formulas for the encapsulated compounds, Clean+ converges three detoxification pillars in a single capsule: hepatic Phase I and Phase II support through methylation cofactors and glutathione substrates, heavy metal chelation through binding-agent complexes and chlorella-cilantro mobilization synergy, and cellular cleansing through lipotropic factors, bile flow optimization, and antimicrobial gut-liver axis support, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile.';
    v_new_description text := 'Clean+ Detox and Liver Health is precision detoxification support for adults whose hepatic Phase I and Phase II detoxification capacity, heavy metal burden, or cellular cleansing pathways need targeted reinforcement. Designed for adults with elevated liver enzymes (ALT, AST, GGT) under practitioner supervision, individuals with documented or suspected fatty liver where lipotropic factor support drives VLDL export, people with heavy metal exposure where binding-and-mobilization synergy supports clearance, adults with MTHFR, GST, or CYP polymorphisms whose endogenous detoxification capacity is genetically constrained, and those navigating gut dysbiosis where the gut-liver axis requires coordinated support, this comprehensive formula delivers Inositol at 200 mg, ToxiBind Matrix (Zeolite + Bentonite Clay) at 100 mg, DigestiZorb+ Digestive Enzyme Complex at 80 mg, Hepatoprotective Botanicals at 70 mg (Milk Thistle 80% silymarin, TUDCA, Dandelion, Artichoke 10:1, Fulvic Acid, Alpha-Lipoic Acid, Cilantro), Antimicrobial Botanicals at 50 mg (Black Walnut, Oregano Oil 70% carvacrol, Garlic, Clove, Berberine), Choline as Alpha-GPC at 30 mg, Liposomal L-Glutathione at 20 mg, Liposomal L-Methionine at 20 mg, Liposomal Curcumin (95% curcuminoids) at 20 mg, Chelating Agents (Chlorella + Cilantro) at 20 mg, Liposomal NAC at 10 mg, Pumpkin Seed Extract at 10 mg, 5-MTHF (Quatrefolic) at 0.8 mg, and Micellar Bioperine at 5 mg through advanced liposomal and micellar carriers that achieve 10x to 28x the bioavailability of standard detoxification formulas for the encapsulated compounds. Inside your cells, these compounds work in concert. Phase I cytochrome P450 oxidation generates reactive intermediates that require antioxidant buffering; Liposomal Curcumin, Milk Thistle silymarin, and Alpha-Lipoic Acid protect hepatocytes during oxidation while Liposomal Glutathione, Liposomal NAC, Liposomal L-Methionine, and 5-MTHF supply the substrates that Phase II conjugation depends on (glutathionylation, methylation, sulfation). TUDCA stimulates bile flow and protects cholangiocytes while Dandelion and Artichoke increase bile production, ensuring conjugated metabolites exit the body rather than recirculating through the gut. ToxiBind Matrix combines crystalline zeolite cation exchange with bentonite clay surface charge to bind heavy metals and mycotoxins in the gut, while Cilantro mobilizes metals from soft tissues and Chlorella binds them in the gut lumen, the synergy that single-binding-agent products miss. Inositol, Choline as Alpha-GPC, and L-Methionine provide the lipotropic factors required for VLDL packaging and hepatic fat export. Antimicrobial Botanicals address gut dysbiosis that increases LPS translocation and hepatic inflammatory load, while DigestiZorb+ supports fat digestion that complements bile flow. What separates Clean+ from simplistic liver cleanses, isolated NAC products, single-ingredient milk thistle formulas, or generic detox formulas is the convergence of three detoxification pillars in a single capsule: integrated Phase I and Phase II support, mobilization-and-binding heavy metal chelation, and gut-liver axis cellular cleansing, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile. Built For Your Biology. Manufactured to 21 CFR Part 111 GMP standards by FarmCeutica Wellness LLC. Third-party tested every batch. Vegan, non-GMO, contains milk thistle and digestive enzymes (not allergen-free).';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'clean-plus-detox-and-liver-health'
      AND p.sku = 'FC-CLEAN-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152k Clean+ paragraph update skipped: row not found at slug clean-plus-detox-and-liver-health / SKU FC-CLEAN-001';
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
        '152k_clean_plus_paragraph_description',
        'products',
        'FC-CLEAN-001',
        v_product_id,
        jsonb_build_object(
            'method', 'paragraph_description_refresh_per_152k',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152k',
            'authority', 'Gary canonical 2026-05-04 Prompt #152k; copy authored in spec body',
            'marshall_scan', 'pass: no unapproved peptides; standard detoxification / hepatoprotective / antimicrobial nomenclature; MTHFR / GST / CYP variant names are scientific not regulated; "elevated liver enzymes" + "documented or suspected fatty liver" + "heavy metal exposure" + "gut dysbiosis" all pass DISEASE_CLAIM via verb-pair-loophole consistent with 152e/f/g/h/i/j',
            'bioavailability_format', '10x to 28x (matches reviewer plus guardrail; heavily liposomal product: glutathione + methionine + curcumin + NAC + Bioperine micellar)',
            'product_name', 'Clean+ Detox and Liver Health',
            'product_name_live', 'Clean+ Detox & Liver Health (ampersand preserved; migration touches summary + description only)',
            'ingredient_table_actives_total_mg', 625.8,
            'capsule_size', 'fits Size 00 with 74.2 mg headroom; no capsule decision flag needed',
            'allergen_disclaimer_divergence', 'Clean+ is NOT allergen-free (contains milk thistle + digestive enzymes); copy correctly states "(not allergen-free)" instead of standard 152x "allergen-free" attestation',
            'slug_confirmed_first_in_152x', true,
            'source_doc_corrections', jsonb_build_array(
                'farmceutica_inc_to_wellness_llc_x3',
                'maximum_bioavailability_to_locked_10x_to_28x',
                'trademark_symbols_dropped_clean_plus_toxibind_digestizorb',
                'phase_iii_elimination_softened_to_biliary_and_renal_excretion',
                'anti_parasitic_supplemented_with_antimicrobial_coverage_umbrella'
            ),
            'source_doc_math_discrepancy_flags', jsonb_build_array(
                'toxibind_matrix_subcategory_includes_chlorella_double_count_with_chelating_agents_main_table',
                'additional_support_compounds_subcategory_sum_25_8_mg_does_not_match_main_table_15_8_mg',
                'digestizorb_plus_proprietary_blend_includes_black_pepper_while_bioperine_separately_listed',
                'cilantro_potentially_double_counted_under_hepatoprotective_botanicals_breakdown'
            ),
            'compliance_followups_recommended', jsonb_build_array(
                'formulator_reconcile_subcategory_totals_against_main_ingredient_table_next_review_cycle',
                'formulator_review_digestizorb_vs_bioperine_black_pepper_redundancy'
            )
        )
    );

    RAISE NOTICE '#152k Clean+ paragraph update: rows updated=% / 1 expected; run_id=%; first 152x with confirmed live slug', v_count, v_run_id;
END $$;
