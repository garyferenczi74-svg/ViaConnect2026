-- Prompt #152d: Amino Acid Matrix+ PDP paragraph description (Lane 2 revised).
--
-- Updates the existing FC-AMINO-001 row (slug amino-acid-matrix-plus) with
-- the Lane-2 reconciled premium summary plus full-description copy. Intent:
-- the always-visible PdpRightRail.tsx summary plus the always-visible
-- Full Description block (PdpRightRail mobile + PdpDesktopTabs desktop)
-- pick up the revised copy without any client code change. The brand-footer
-- italic Orange caption "Built For Your Biology · Your Genetics · Your
-- Protocol" already renders universally beneath every product description
-- from #152a; no PdpRightRail edit is required for 152d.
--
-- Lane 2 reconciliation reasoning (per Gary directive 2026-05-04):
-- Original 152d spec copy claimed an 11-amino-acid formula including
-- N-Acetyl Cysteine and Glycine, with "selective liposomal carriers ...
-- 10x to 28x bioavailability". Live row at slug amino-acid-matrix-plus is
-- a 9-essential-amino-acid free-form plain powder per #145 canonical
-- (no NAC, no Glycine, no liposomal designations, format=powder). Shipping
-- the original 152d copy would have failed Pre-Delivery Rule 12
-- (Compliance claims match reality) and created a direct visible mismatch
-- with the formulation table on the same PDP. Lane 2 corrections:
--   * 11-amino-acid    -> 9-essential-amino-acid
--   * Add NAC + Glycine to ingredient sentence -> remove
--   * "selective liposomal carriers ... 10x to 28x" -> dropped, replaced
--     with "free-form pharmaceutical-grade powder format engineered for
--     rapid absorption" (delivery-form claim, not multiplier claim)
--   * NAC -> glutathione mechanism block -> removed (NAC not in formula)
--   * Glycine -> NMDA / collagen / betaine block -> removed (Glycine not
--     in formula)
--   * mTORC1 / Phe-tyrosine-dopamine / Trp-5-HTP-serotonin / Met-SAMe /
--     His-carnosine-histamine mechanism blocks -> kept (each tied to a
--     live ingredient)
--
-- Drift notes (verified live 2026-05-04 before authoring):
--   * Slug amino-acid-matrix-plus confirmed live; SKU FC-AMINO-001 (does
--     match spec convention; #152c row by contrast had numeric SKU 34).
--   * Live ingredient count 9; live ingredients L-Leucine 500mg /
--     L-Isoleucine 250mg / L-Valine 250mg / L-Lysine HCl 250mg /
--     L-Threonine 200mg / L-Phenylalanine 200mg / L-Methionine 175mg /
--     L-Histidine 100mg / L-Tryptophan 75mg = 2000mg total.
--   * Spec invented backfill_audit columns (prompt_ref, target_key, field,
--     old_value, new_value). Live schema is (run_id, source_table,
--     target_table, sku, product_id, columns_loaded jsonb, applied_at).
--     This migration uses the live schema and packs old_value plus
--     new_value plus authority plus compliance audit metadata into
--     columns_loaded jsonb, mirroring the #152a + #152c + #145 + #142
--     family pattern.
--   * Spec stated PdpRightRail.tsx line 116 + line 188; actual lines are
--     ~122 (summary), ~199 (description mobile),
--     PdpDesktopTabs.tsx ~180 (desktop).
--
-- Marshall dictionary scan (per feedback_marshall_dictionary_predelivery_scan):
-- copy authored by Gary in the #152d spec body and Lane-2 reconciled by
-- Claude per Gary directive. Scanned against
-- src/lib/compliance/dictionaries/unapproved_peptides.ts: zero hits for
-- semaglutide, retatrutide, bromantane, semax, selank, cerebrolysin. The
-- revised copy contains no bioavailability multiplier claim (10x to 28x
-- removed entirely) so the Michelangelo reviewer (reviewer.ts:190 blocks
-- 5-27x only) and Jeffery guardrails (guardrails.ts:83 blocks 5-to-27 only)
-- pass cleanly. Hyphens preserved in chemical names (L-Leucine, 5-HTP,
-- L-Isoleucine, etc.) and compound modifiers (9-essential-amino-acid,
-- branched-chain, BCAA-only, rapid-absorption, methionine-driven,
-- Third-party, non-GMO, allergen-free) per the #142 v3 hard-rule reading
-- already shipped in #152a + #152c. No em-dashes, no en-dashes.
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
    v_new_summary text := 'Amino Acid Matrix+ is precision essential amino acid support for adults whose protein synthesis, neurotransmitter balance, or metabolic recovery need targeted reinforcement. A 9-essential-amino-acid free-form matrix delivering pharmaceutical-grade amino acids in rapid-absorption powder format, Amino Acid Matrix+ converges three metabolic pillars in a single formulation: protein synthesis through mTOR activation, neurotransmitter balance through dopamine and serotonin precursor supply, and metabolic recovery through methionine-driven methylation, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile.';
    v_new_description text := 'Amino Acid Matrix+ is precision essential amino acid support for adults whose protein synthesis, neurotransmitter balance, or metabolic recovery need targeted reinforcement. Designed for athletes pursuing muscle recovery and anabolic response, aging adults navigating sarcopenia, vegan and vegetarian adults with dietary protein gaps, those balancing mood and sleep through neurotransmitter precursor supply, and individuals optimizing methionine-driven methylation status, this 9-essential-amino-acid formula delivers L-Leucine, L-Isoleucine, L-Valine, L-Lysine, L-Threonine, L-Histidine, L-Phenylalanine, L-Methionine, and L-Tryptophan in a free-form pharmaceutical-grade powder format engineered for rapid absorption. Inside your cells, these compounds work in concert. The branched-chain amino acids leucine, isoleucine, and valine activate mTORC1, the master switch for muscle protein synthesis. Phenylalanine feeds the tyrosine pathway that produces dopamine, norepinephrine, and epinephrine for focus and motivation. Tryptophan converts through 5-HTP to serotonin and onward to melatonin for mood balance and sleep architecture. Methionine donates methyl groups through SAMe to over two hundred methylation reactions including DNA methylation, neurotransmitter synthesis, and phosphatidylcholine production. Histidine builds carnosine for muscle pH buffering and histamine for immune function. What separates Amino Acid Matrix+ from BCAA-only blends or single-amino formulas is the convergence of three metabolic pillars in a single formulation: protein synthesis, neurotransmitter balance, and metabolic recovery, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile. Built For Your Biology. Manufactured to 21 CFR Part 111 GMP standards by FarmCeutica Wellness LLC. Third-party tested every batch. Vegan, non-GMO, allergen-free.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'amino-acid-matrix-plus'
      AND p.sku = 'FC-AMINO-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152d Amino Acid Matrix+ paragraph update skipped: row not found at slug amino-acid-matrix-plus / SKU FC-AMINO-001';
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
        '152d_amino_acid_matrix_plus_paragraph_description',
        'products',
        'FC-AMINO-001',
        v_product_id,
        jsonb_build_object(
            'method', 'paragraph_description_refresh_per_152d_lane2',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152d_lane2_compliance_reconciled',
            'authority', 'Gary canonical 2026-05-04 Prompt #152d (Lane 2 reconciliation per Gary directive after compliance Rule 12 hard-stop on original 11-ingredient + liposomal claims)',
            'marshall_scan', 'human_review_pass_per_142v3_oq1_unresolved (Lane-2 reconciled copy; scanned against unapproved_peptides.ts, zero hits)',
            'bioavailability_format', 'NONE (multiplier claim removed; replaced with delivery-form claim free-form pharmaceutical-grade rapid-absorption powder)',
            'lane2_corrections', jsonb_build_array(
                '11-amino-acid changed to 9-essential-amino-acid',
                'NAC + Glycine removed from ingredient sentence',
                '10x to 28x liposomal claim dropped; substituted free-form pharmaceutical-grade powder claim',
                'NAC->glutathione mechanism block removed',
                'Glycine->NMDA + collagen + betaine block removed',
                'methylation + glutathione status changed to methionine-driven methylation status',
                'BCAA->mTORC1 + Phe->tyrosine->dopamine + Trp->5-HTP->serotonin + Met->SAMe + His->carnosine+histamine mechanism blocks preserved (all tied to live ingredients)'
            ),
            'product_name', 'Amino Acid Matrix+'
        )
    );

    RAISE NOTICE '#152d Amino Acid Matrix+ paragraph update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
