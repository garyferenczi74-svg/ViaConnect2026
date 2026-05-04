-- Prompt #152c: ADO Support+ Purine Metabolism PDP paragraph description.
--
-- Updates the existing SKU 34 row (slug ado-support-plus-purine-metabolism)
-- with the premium summary plus full-description copy authored by Gary in
-- the #152c spec body. Intent: the always-visible PdpRightRail.tsx summary
-- (lines 121 to 125) plus the always-visible Full Description block in
-- PdpRightRail.tsx (mobile, lines 195 to 214) and PdpDesktopTabs.tsx
-- (desktop Description tab, lines 178 to 188) pick up the new copy with
-- zero client-code change. The brand-footer italic Orange caption
-- "Built For Your Biology · Your Genetics · Your Protocol" already renders
-- universally beneath every product description from #152a; no PdpRightRail
-- edit is required for 152c.
--
-- Drift notes (verified live 2026-05-04 before authoring):
--   * Spec offered candidate slugs (ado-support-plus, ado-support, ado-plus,
--     ado); live slug is ado-support-plus-purine-metabolism. None of the
--     spec candidates match. SKU is 34 (numeric string), not FC-ADO-001.
--   * Spec invented backfill_audit columns (prompt_ref, target_key, field,
--     old_value, new_value). Live schema is (run_id, source_table,
--     target_table, sku, product_id, columns_loaded jsonb, applied_at).
--     This migration uses the live schema and packs old_value plus new_value
--     plus authority plus compliance audit metadata into columns_loaded
--     jsonb, mirroring the #152a plus #145 plus #142 family pattern.
--   * Live row has 11 ingredients (matches "11-ingredient formula" claim),
--     price_msrp 108.88 (matches .88 convention), bioavailability_pct NULL
--     (does not render in PdpRightRail line 114 conditional, fine per spec).
--
-- Marshall dictionary scan (per feedback_marshall_dictionary_predelivery_scan):
-- copy authored by Gary in the #152c spec body. Scanned against
-- src/lib/compliance/dictionaries/unapproved_peptides.ts: zero hits for
-- semaglutide, retatrutide, bromantane, semax, selank, cerebrolysin.
-- Bioavailability copy reads "10x to 28x" verbatim, which passes both the
-- Michelangelo reviewer at src/lib/agents/michelangelo/reviewer.ts:190
-- (only blocks 5-27x) and the Jeffery guardrails at
-- src/lib/agents/jeffery/guardrails.ts:83 (same forbidden form). Hyphens
-- preserved in chemical names (S-Adenosylmethionine, 5-MTHF, N-Acetyl
-- Cysteine, L-theanine) and compound modifiers (11-ingredient, one-carbon,
-- rate-limiting, stress-driven, Third-party, non-GMO, allergen-free) per
-- the #142 v3 hard-rule reading already shipped in #152a. No em-dashes,
-- no en-dashes.
--
-- Idempotent on re-run: WHERE clause keys on slug AND sku AND
-- category != peptide; UPDATE re-applies the canonical strings even if a
-- future hand-edit drifts. backfill_audit gets a new row each run, which
-- is the documented #142/#145/#152a pattern.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_new_summary text := 'ADO Support+ is precision purine and methylation support for adults whose uric acid balance, immune resilience, or one-carbon metabolism need targeted reinforcement. An 11-ingredient liposomal and micellar formulation delivering 10x to 28x the bioavailability of standard capsules, ADO Support+ converges three metabolic pillars in a single capsule: purine metabolism, immune regulation, and cellular methylation, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile.';
    v_new_description text := 'ADO Support+ is precision purine and methylation support for adults whose uric acid balance, immune resilience, or one-carbon metabolism need targeted reinforcement. Designed for individuals managing uric acid or gout risk, those with MTHFR or COMT genetic variants, anyone navigating chronic inflammation, and adults seeking integrated purine, immune, and methylation support, this 11-ingredient formula delivers S-Adenosylmethionine, methylated 5-MTHF folate, methylcobalamin B12, N-Acetyl Cysteine, liposomal curcumin, L-theanine, ATP, and phosphatidylcholine through advanced liposomal and micellar carriers that achieve 10x to 28x the bioavailability of standard capsules. Inside your cells, these compounds work in concert. Liposomal curcumin modulates xanthine oxidase, the rate-limiting enzyme that produces uric acid from purines. SAMe donates methyl groups to over two hundred methylation reactions including DNA, neurotransmitter synthesis, and phospholipid production. 5-MTHF and methylcobalamin remethylate homocysteine to methionine, bypassing common MTHFR genetic bottlenecks. NAC supplies cysteine for glutathione regeneration, the master intracellular antioxidant of the immune response. L-theanine modulates GABA signaling to buffer stress-driven inflammation. Direct ATP supplementation provides cellular energy substrate when endogenous synthesis lags. What separates ADO Support+ from generic immune or methylation formulas is the convergence of three metabolic pillars in a single capsule: purine metabolism, immune regulation, and cellular methylation, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile. Built For Your Biology. Manufactured to 21 CFR Part 111 GMP standards by FarmCeutica Wellness LLC. Third-party tested every batch. Vegan, non-GMO, allergen-free.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'ado-support-plus-purine-metabolism'
      AND p.sku = '34'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152c ADO Support+ paragraph update skipped: row not found at slug ado-support-plus-purine-metabolism / SKU 34';
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
        '152c_ado_support_plus_paragraph_description',
        'products',
        '34',
        v_product_id,
        jsonb_build_object(
            'method', 'paragraph_description_refresh_per_152c',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152c',
            'authority', 'Gary canonical 2026-05-04 Prompt #152c; copy authored in spec body',
            'marshall_scan', 'human_review_pass_per_142v3_oq1_unresolved (Gary-authored copy in spec; scanned against unapproved_peptides.ts, zero hits)',
            'bioavailability_format', '10x to 28x (matches reviewer plus guardrail)',
            'product_name', 'ADO Support+ Purine Metabolism'
        )
    );

    RAISE NOTICE '#152c ADO Support+ paragraph update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
