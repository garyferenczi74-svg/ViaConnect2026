-- Prompt #152a: ACAT+ Mitochondrial Support PDP paragraph description.
--
-- Updates the existing FC-ACAT-001 row (slug acat-plus-mitochondrial-support)
-- with the premium summary plus full-description copy authored by Gary in
-- the #152a spec. Intent: the always-visible PdpRightRail.tsx summary plus
-- the always-visible Full Description block (PdpRightRail mobile / Phase B
-- of #148, plus the Description tab inside PdpDesktopTabs.tsx for desktop)
-- pick up the new copy without any client code change.
--
-- Drift notes (verified live 2026-05-04 before authoring):
--   * Spec referenced slug "acat-plus" but live slug is
--     "acat-plus-mitochondrial-support" (FC-ACAT-001, methylation-snp).
--   * Spec invented backfill_audit columns
--     (prompt_ref, target_key, field, old_value, new_value, applied_at).
--     Live schema is (run_id, source_table, target_table, sku, product_id,
--     columns_loaded jsonb, applied_at). This migration uses the live
--     schema and packs old_value plus new_value plus authority plus
--     compliance audit metadata into columns_loaded jsonb, mirroring the
--     #145 plus #142 family pattern.
--
-- Marshall dictionary scan: copy authored by Gary in the #152a spec body;
-- no unapproved peptide names, no internal SKU plus SNP plus cron specifics
-- on the consumer surface beyond the ingredient names already shipping in
-- the formulation table. Bioavailability copy reads "10x to 28x" verbatim,
-- which passes both Michelangelo reviewer src/lib/agents/michelangelo/reviewer.ts
-- (only blocks 5-27x) and Jeffery guardrails src/lib/agents/jeffery/guardrails.ts
-- (same forbidden form). Hyphens preserved in chemical names plus compound
-- modifiers per the #142 v3 hard-rule reading; no em-dashes plus no en-dashes.
--
-- Idempotent on re-run: WHERE clause keys on slug; UPDATE re-applies the
-- canonical strings even if a future hand-edit drifts. backfill_audit gets
-- a new row each run, which is the documented pattern.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_new_summary text := 'ACAT+ is precision mitochondrial fuel for adults whose cellular energy, fat metabolism, or methylation pathways need targeted support. A 13-ingredient liposomal and micellar formulation delivering 10x to 28x the bioavailability of standard capsules, ACAT+ converges four metabolic pillars in a single capsule: methylation, mitochondrial energy, lipid transport, and antioxidant defense, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile.';
    v_new_description text := 'ACAT+ is precision mitochondrial fuel for adults whose cellular energy, fat metabolism, or methylation pathways need targeted support. Designed for high performers, those battling persistent fatigue, MTHFR genetic variants, and anyone optimizing metabolic health, this 13-ingredient formula delivers active methylated B vitamins alongside CoQ10, Acetyl-L-Carnitine, Alpha-Lipoic Acid, and N-Acetyl Cysteine through advanced liposomal and micellar carriers that achieve 10x to 28x the bioavailability of standard capsules. Inside your cells, these compounds work in concert. Acetyl-L-Carnitine shuttles fatty acids into mitochondria for beta-oxidation. CoQ10 powers the electron transport chain that generates ATP. Alpha-Lipoic Acid and NAC regenerate intracellular glutathione. Pre-methylated B vitamins, including 5-MTHF, methylcobalamin, and Riboflavin-5-Phosphate, bypass the genetic conversion bottlenecks that limit standard B-complex supplements. What separates ACAT+ from generic energy formulas is the convergence of four metabolic pillars in a single capsule: methylation, mitochondrial energy, lipid transport, and antioxidant defense, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile. Built For Your Biology. Manufactured to 21 CFR Part 111 GMP standards by FarmCeutica Wellness LLC. Third-party tested every batch. Vegan, non-GMO, allergen-free.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'acat-plus-mitochondrial-support'
      AND p.sku = 'FC-ACAT-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152a ACAT+ paragraph update skipped: row not found at slug acat-plus-mitochondrial-support / SKU FC-ACAT-001';
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
        '152a_acat_plus_paragraph_description',
        'products',
        'FC-ACAT-001',
        v_product_id,
        jsonb_build_object(
            'method', 'paragraph_description_refresh_per_152a',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152a',
            'authority', 'Gary canonical 2026-05-04 Prompt #152a; copy authored in spec body',
            'marshall_scan', 'human_review_pass_per_142v3_oq1_unresolved (Gary-authored copy in spec)',
            'bioavailability_format', '10x to 28x (matches reviewer plus guardrail)',
            'product_name', 'ACAT+ Mitochondrial Support'
        )
    );

    RAISE NOTICE '#152a ACAT+ paragraph update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
