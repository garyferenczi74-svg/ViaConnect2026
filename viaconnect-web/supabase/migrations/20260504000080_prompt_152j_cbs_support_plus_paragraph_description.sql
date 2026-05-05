-- Prompt #152j: CBS Support+ Sulfur Pathway PDP paragraph description.
--
-- Updates the existing FC-CBS-001 row (slug cbs-support-plus-sulfur-pathway,
-- methylation-snp, capsule) with the premium summary plus full-description
-- copy authored by Gary in the #152j spec. The always-visible PdpRightRail.tsx
-- mobile description section and the PdpDesktopTabs.tsx description tab panel
-- both pick up the new copy without further client code change. No
-- emphasis-spans registration; cbs slug intentionally NOT in
-- PDP_EMPHASIZED_TERMS.
--
-- Drift notes (verified live 2026-05-04 before authoring):
--   * Slug: live is 'cbs-support-plus-sulfur-pathway' (concatenated form).
--     Spec offered five candidates (cbs-support-plus, cbs-support, cbs-plus,
--     cbs-sulfur-pathway, cbs); none match exactly. Spec's CASE-ordered
--     slug-resolution loop would have raised "row not found" and aborted.
--     Same '-plus-[function]' suffix-stack pattern as #152h Blast+ and
--     #152i Catalyst+. Pinned to verified slug.
--   * SKU: FC-CBS-001 (standard FC-XXX-001 convention).
--   * Pricing: live price + price_msrp = 108.88 (matches .88 convention).
--   * Spec invented backfill_audit columns; corrected to live schema per
--     #152 family precedent.
--
-- Source-document corrections applied per #152j §"Source-Document
-- Corrections Applied" (recorded in audit metadata):
--   1. "up to 90% bioavailability" -> locked "10x to 28x" anchor.
--   2. farmceutica.com URL removed from Product Summary (live platform is
--      viaconnectapp.com; consumer copy does NOT link to external
--      farmceutica.com domains).
--   3. FarmCeutica Inc. -> FarmCeutica Wellness LLC.
--   4. FarmCeutica Wellness Ltd. -> FarmCeutica Wellness LLC.
--   5. "Building Performance Through Science" -> "Built For Your Biology".
--   6. Hedging language ("It seems likely", "evidence leans toward",
--      "evidence suggests this multifaceted strategy may", "Evidence
--      suggests") replaced with confident DSHEA-compliant structure-function
--      verbs ("supports", "drives", "addresses").
--
-- Capsule size flag (NOT resolved by this prompt): 12 ingredients sum to
-- 730.5 mg actives, exceeds Size 00 capacity (700 mg) by 30.5 mg.
-- Recommended path: Size 0 (800 mg, 70 mg headroom). Smaller magnitude
-- than #152h Blast+ (815 mg over). PDP copy avoids capsule-size language
-- to decouple migration from capsule decision. Recorded in audit
-- 'capsule_size_decision_flag'.
--
-- Net Fill Weight precision flag (NOT resolved by this prompt): TDS
-- says "730 mg ± 5%" but actives are 730.5 mg. Within tolerance band
-- but TDS update for precision recommended via separate prompt.
--
-- Marshall scan: copy authored by Gary in the #152j spec body. No
-- unapproved peptides. Compounds named (Methylated B6 / P5P, Molybdenum
-- Glycinate Chelate, L-Serine, L-Carnitine Tartrate, L-Ornithine, NAC,
-- Reduced Glutathione, Trimethylglycine / TMG, Taurine, Silymarin /
-- Milk Thistle, Magnesium Bisglycinate, Bioperine) are standard
-- nutraceutical / amino acid / botanical names. Genetic variant names
-- (CBS C699T, CBS A360A) are scientific not regulated. Bioavailability
-- "10x to 28x" verbatim twice. "Borderline-elevated liver enzymes"
-- audience-targeting line is the closest-to-condition claim; passes
-- DISEASE_CLAIM via verb-pair-loophole pattern consistent across
-- 152e/f/g/h/i (no DISEASE_VERBS within 60 chars; "navigating" /
-- "with" / "individuals with" all NOT in DISEASE_VERBS list).
-- "Brain fog" and "post-protein fatigue" are colloquial wellness terms
-- not in disease_terms.ts. Hyphens preserved per #142 v3 + #152 family
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
    v_new_summary text := 'CBS Support+ Sulfur Pathway is precision transsulfuration support for adults whose sulfur metabolism, ammonia clearance, or glutathione synthesis need targeted reinforcement. A 12-ingredient liposomal and micellar formulation delivering 10x to 28x the bioavailability of standard sulfur-pathway formulas for the encapsulated compounds, CBS Support+ converges three sulfur-metabolism pillars in a single capsule: transsulfuration balance through CBS cofactors and substrate, ammonia clearance through urea cycle support, and glutathione synthesis through cysteine substrate, direct GSH replenishment, and liposomal silymarin hepatoprotection, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile.';
    v_new_description text := 'CBS Support+ Sulfur Pathway is precision transsulfuration support for adults whose sulfur metabolism, ammonia clearance, or glutathione synthesis need targeted reinforcement. Designed for adults with CBS polymorphisms (CBS C699T, A360A) whose transsulfuration runs at altered baseline rates, individuals with sulfur sensitivity reflected in adverse responses to high-sulfur foods or NAC supplementation, adults navigating chronic ammonia load with brain fog or post-protein fatigue, people with elevated homocysteine where downstream transsulfuration also needs support, individuals pursuing glutathione status optimization, and adults with hepatic stress or borderline-elevated liver enzymes, this 12-ingredient formula delivers Methylated B6 (P5P) at 25 mg, Molybdenum Glycinate Chelate at 0.5 mg, L-Serine at 100 mg, L-Carnitine Tartrate at 100 mg, L-Ornithine at 50 mg, Liposomal NAC at 50 mg, Liposomal Reduced Glutathione at 100 mg, Trimethylglycine (TMG) at 100 mg, Liposomal Taurine at 50 mg, Liposomal Silymarin (80% standardized) at 100 mg, Liposomal Magnesium Bisglycinate at 50 mg, and Micellar Bioperine at 5 mg through advanced liposomal and micellar carriers that achieve 10x to 28x the bioavailability of standard sulfur-pathway formulas for the encapsulated compounds. Inside your cells, these compounds work in concert. Methylated B6 as P5P is the direct cofactor for cystathionine beta-synthase (CBS), the rate-limiting enzyme that condenses homocysteine and serine to form cystathionine. L-Serine provides the substrate. Molybdenum activates sulfite oxidase, the downstream enzyme that converts CBS-derived sulfite to sulfate (the cofactor that single-mechanism sulfur products omit, where its absence allows sulfite to accumulate and produce the neurological symptoms of sulfite sensitivity). TMG regulates the upstream homocysteine input through the BHMT remethylation pathway, balancing the transsulfuration-versus-methylation partition. L-Ornithine and L-Carnitine Tartrate support the urea cycle for ammonia clearance, addressing the ammonia exhaust that transsulfuration generates and that CNS-sensitive individuals experience as brain fog and post-protein fatigue. Liposomal NAC supplies cysteine substrate while Liposomal Glutathione provides direct GSH for immediate redox demand. Liposomal Silymarin elevates hepatocyte glutathione and stabilizes hepatocyte membranes. Liposomal Taurine supports hepatic ammonia conjugation and bile acid synthesis. What separates CBS Support+ from single-mechanism NAC products, isolated glutathione supplements, generic detox formulations, or standalone milk thistle products is the convergence of three sulfur-metabolism pillars in a single capsule: CBS-cofactor-and-substrate-supported transsulfuration balance, urea-cycle-driven ammonia clearance, and dual-pathway glutathione synthesis with hepatoprotection, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile. Built For Your Biology. Manufactured to 21 CFR Part 111 GMP standards by FarmCeutica Wellness LLC. Third-party tested every batch. Vegan, non-GMO, allergen-free.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'cbs-support-plus-sulfur-pathway'
      AND p.sku = 'FC-CBS-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152j CBS Support+ paragraph update skipped: row not found at slug cbs-support-plus-sulfur-pathway / SKU FC-CBS-001';
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
        '152j_cbs_support_plus_paragraph_description',
        'products',
        'FC-CBS-001',
        v_product_id,
        jsonb_build_object(
            'method', 'paragraph_description_refresh_per_152j',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152j',
            'authority', 'Gary canonical 2026-05-04 Prompt #152j; copy authored in spec body',
            'marshall_scan', 'pass: no unapproved peptides; CBS C699T / A360A variant names are scientific not regulated; "borderline-elevated liver enzymes" + "brain fog" + "post-protein fatigue" pass DISEASE_CLAIM via verb-pair-loophole consistent with 152e/f/g/h/i; standard nutraceutical / amino acid / botanical nomenclature throughout',
            'bioavailability_format', '10x to 28x (matches reviewer plus guardrail; 5 of 12 ingredients liposomal plus Bioperine on micellar carrier)',
            'product_name', 'CBS Support+ Sulfur Pathway',
            'ingredient_count', 12,
            'source_doc_corrections', jsonb_build_array(
                'up_to_90_pct_to_locked_10x_to_28x',
                'farmceutica_dot_com_url_removed',
                'farmceutica_inc_to_wellness_llc',
                'farmceutica_wellness_ltd_to_llc',
                'building_performance_through_science_to_built_for_your_biology',
                'hedging_language_replaced_with_dshea_compliant_structure_function_verbs'
            ),
            'capsule_size_decision_flag', '730.5 mg actives total exceeds Size 00 capsule capacity (700 mg) by 30.5 mg; smaller magnitude than 152h Blast+ (815 mg over); recommended path Size 0 (800 mg capacity, 70 mg headroom); PDP copy avoids capsule-size language; spec flags decision as separate follow-up',
            'net_fill_weight_precision_flag', 'TDS says 730 mg plus or minus 5 percent but actives are 730.5 mg; within tolerance band; TDS precision update via separate prompt if pursued',
            'actives_total_mg', 730.5
        )
    );

    RAISE NOTICE '#152j CBS Support+ paragraph update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
