-- Prompt #152g: BHMT+ Methylation Support PDP paragraph description.
--
-- Updates the existing SKU 35 row (slug bhmt-plus-methylation-support,
-- methylation-snp, capsule) with the premium summary plus full-description
-- copy authored by Gary in the #152g spec. The always-visible
-- PdpRightRail.tsx mobile description section and the PdpDesktopTabs.tsx
-- description tab panel both pick up the new copy without further client
-- code change. No emphasis-spans registration in this prompt; bhmt slug
-- intentionally NOT in PDP_EMPHASIZED_TERMS.
--
-- Drift notes (verified live 2026-05-04 before authoring):
--   * Slug: live is 'bhmt-plus-methylation-support' (NOT any of the spec's
--     five candidates: bhmt-plus, bhmt, bhmt-methylation, bhmt-homocysteine,
--     bhmt-plus-methylation). Same '-support' suffix pattern as
--     acat-plus-mitochondrial-support and achy-plus-acetylcholine-support.
--     Spec's CASE-ordered slug resolution loop would have raised "row not
--     found" since no candidate matched. Pinning to the verified slug.
--   * SKU is numeric string '35', not the FC-XXX-001 convention.
--   * Spec invented backfill_audit columns (run_id, prompt_ref, target_table,
--     target_key, field, old_value, new_value, applied_at). Live schema is
--     (id, run_id, source_table, target_table, sku, product_id,
--     columns_loaded jsonb, applied_at). Migration uses live schema and
--     packs audit metadata into columns_loaded jsonb per
--     #152a + #152b + #152e + #152f.
--
-- Marshall scan: copy authored by Gary in the #152g spec body. No
-- unapproved peptides (semaglutide / retatrutide / cognitive stimulants
-- absent). Compounds named (Betaine Anhydrous, TMG HCl, DMG, Alpha-GPC,
-- 5-MTHF, methylcobalamin, NAC, zinc bisglycinate, magnesium L-threonate,
-- L-taurine, Bioperine) are standard supplement nomenclature. Genetic
-- variant names (MTHFR, BHMT, COMT) are scientifically descriptive, not
-- regulated. Bioavailability copy reads "10x to 28x" verbatim, passes
-- Michelangelo + Jeffery guardrails. Hyphens preserved in chemical /
-- compound-modifier names (5-MTHF, Alpha-GPC, L-threonate, L-taurine,
-- folate-B12, single-pathway, parallel-pathway, hepatic-targeted,
-- alternative-pathway, choline dehydrogenase, third-party, allergen-free,
-- non-GMO). No em-dashes, no en-dashes.
--
-- Idempotent on re-run: WHERE clause keys on slug + sku; UPDATE re-applies
-- the canonical strings. backfill_audit gets a new row each run.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_new_summary text := 'BHMT+ is precision alternative-pathway methylation support for adults whose homocysteine handling, liver function, or methylation reserves need targeted reinforcement, particularly when MTHFR variants compromise the primary folate-B12 pathway. An 11-ingredient liposomal and micellar formulation delivering 10x to 28x the bioavailability of standard methylation supplements for the encapsulated compounds, BHMT+ converges three pillars in a single capsule: alternative-pathway methylation through the BHMT enzyme route, liver function through hepatic-targeted antioxidant cofactors, and homocysteine reduction through complementary remethylation substrates, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile.';
    v_new_description text := 'BHMT+ is precision alternative-pathway methylation support for adults whose homocysteine handling, liver function, or methylation reserves need targeted reinforcement, particularly when MTHFR variants compromise the primary folate-B12 pathway. Designed for individuals with elevated homocysteine, adults with MTHFR or BHMT genetic variants, those navigating fatty liver or hepatic detox load, individuals with COMT variants whose methylation demand outpaces methyl donor supply, and adults pursuing methylation-supported mood, cognitive, or metabolic optimization, this 11-ingredient formula delivers Betaine Anhydrous, TMG HCl, DMG, liposomal Alpha-GPC, methylated 5-MTHF folate, methylcobalamin B12, liposomal NAC, zinc bisglycinate, liposomal magnesium L-threonate, liposomal L-taurine, and micellar Bioperine through advanced liposomal and micellar carriers that achieve 10x to 28x the bioavailability of standard methylation supplements for the encapsulated compounds. Inside your cells, these compounds work in concert. Betaine donates a methyl group to homocysteine through the BHMT enzyme, regenerating methionine and producing dimethylglycine as a byproduct. This pathway runs in parallel to the methionine synthase route used by 5-MTHF and methylcobalamin, providing a critical backup when MTHFR variants compromise the primary folate-B12 pathway. Alpha-GPC supplies choline that feeds endogenous betaine production through the choline dehydrogenase pathway, providing recursive substrate support for BHMT. NAC supplies cysteine for hepatic glutathione synthesis, the master antioxidant of phase II detoxification. Taurine protects hepatocytes from homocysteine-induced oxidative stress and supports bile acid conjugation. Zinc supplies the metalloenzyme cofactor that BHMT activity directly depends on. Magnesium L-threonate crosses the blood-brain barrier and supports central nervous system methyltransferase function for the cognitive and mood dimensions of methylation status. What separates BHMT+ from single-pathway B-complex products, standalone TMG powders, or generic methylation blends is the convergence of three pillars in a single capsule: alternative-pathway methylation, hepatic detoxification support, and parallel-pathway homocysteine reduction, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile. Built For Your Biology. Manufactured to 21 CFR Part 111 GMP standards by FarmCeutica Wellness LLC. Third-party tested every batch. Vegan, non-GMO, allergen-free.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'bhmt-plus-methylation-support'
      AND p.sku = '35'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152g BHMT+ paragraph update skipped: row not found at slug bhmt-plus-methylation-support / SKU 35';
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
        '152g_bhmt_plus_paragraph_description',
        'products',
        '35',
        v_product_id,
        jsonb_build_object(
            'method', 'paragraph_description_refresh_per_152g',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152g',
            'authority', 'Gary canonical 2026-05-04 Prompt #152g; copy authored in spec body',
            'marshall_scan', 'pass: no unapproved peptides; standard methylation supplement nomenclature; MTHFR / BHMT / COMT genetic variant names are scientific not regulated',
            'bioavailability_format', '10x to 28x (matches reviewer plus guardrail)',
            'product_name', 'BHMT+ Methylation Support',
            'ingredient_count', 11,
            'source_doc_corrections', jsonb_build_array('up_to_90_pct_to_10x_to_28x', 'farmceutica_inc_to_wellness_llc', 'farmceutica_wellness_ltd_to_llc', 'building_performance_through_science_to_built_for_your_biology', 'farmceutica_dot_com_url_removed')
        )
    );

    RAISE NOTICE '#152g BHMT+ paragraph update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
