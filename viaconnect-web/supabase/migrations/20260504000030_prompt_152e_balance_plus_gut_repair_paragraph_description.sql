-- Prompt #152e: Balance+ Gut Repair PDP paragraph description.
--
-- Updates the existing FC-BALANCE-001 row (slug balance-plus-gut-repair)
-- with the premium summary plus full-description copy authored by Gary in
-- the #152e spec. The always-visible PdpRightRail.tsx mobile description
-- section and the PdpDesktopTabs.tsx description tab panel both pick up
-- the new copy without further client code change. No emphasis-spans
-- registration in this prompt; Balance+ slug is not in PDP_EMPHASIZED_TERMS.
--
-- Drift notes (verified live 2026-05-04 before authoring):
--   * Slug confirmed: balance-plus-gut-repair (FC-BALANCE-001, advanced-formulas).
--     First #152x prompt where the spec slug matches live without correction.
--   * Spec invented backfill_audit columns (run_id, prompt_ref, target_table,
--     target_key, field, old_value, new_value, applied_at). Live schema is
--     (id, run_id, source_table, target_table, sku, product_id,
--     columns_loaded jsonb, applied_at). This migration uses the live schema
--     and packs old_value plus new_value plus authority plus compliance audit
--     metadata into columns_loaded jsonb, mirroring #152a + #152b precedent.
--   * Spec describes the brand-footer caption as the orange #152a caption
--     "Built For Your Biology · Your Genetics · Your Protocol". That caption
--     was REPLACED in #152b with "Via Cura | Built For Your Biology" in
--     white/60 italic. The verification step's expected appearance is now
--     out of date; the actual rendered caption matches #152b.
--
-- Marshall dictionary scan (verified against
-- src/lib/compliance/dictionaries/unapproved_peptides.ts 2026-05-04):
-- BPC-157 is NOT on the prohibited / injectable-only / monotherapy /
-- age-restricted lists. The blocklist only enumerates semaglutide
-- (PROHIBITED), retatrutide (INJECTABLE_ONLY + MONOTHERAPY), and four
-- cognitive stimulants (AGE_RESTRICTED). BPC-157 in oral / liposomal form
-- on a public consumer surface clears the dictionary, but is a peptide
-- compound with FDA categorization history that warrants Gary awareness;
-- flagged in audit for visibility, not a hard block. Bioavailability
-- copy reads "10x to 28x" verbatim, passes Michelangelo + Jeffery.
-- Hyphens preserved in chemical / compound-modifier names (BPC-157,
-- L-Glutamine, N-Acetyl Glucosamine, NF-kappaB, etc.) per #142 v3 +
-- #152a + #152b precedent. No em-dashes, no en-dashes.
--
-- Idempotent on re-run: WHERE clause keys on slug plus sku; UPDATE re-applies
-- the canonical strings. backfill_audit gets a new row each run.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_new_summary text := 'Balance+ Gut Repair is precision intestinal barrier and microbiome support for adults whose gut lining integrity, digestive function, or immune balance need targeted reinforcement. A 15-ingredient liposomal and micellar formulation delivering 10x to 28x the bioavailability of conventional gut formulas for the encapsulated compounds, Balance+ converges three pillars in a single capsule: barrier repair through liposomal BPC-157 and L-Glutamine, microbiome restoration through a 10 billion CFU multi-strain probiotic blend with Saccharomyces boulardii, and immune balance through liposomal curcumin, quercetin, and the BioB Fusion methylated B-complex, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile.';
    v_new_description text := 'Balance+ Gut Repair is precision intestinal barrier and microbiome support for adults whose gut lining integrity, digestive function, or immune balance need targeted reinforcement. Designed for individuals with leaky gut, IBS or IBD remission maintenance, post-antibiotic dysbiosis, food sensitivities or histamine reactivity, athletes managing exercise-induced gut permeability, and adults whose ViaConnect Bio Optimization Score flags barrier or microbiome weakness, this 15-ingredient formula delivers liposomal BPC-157, L-Glutamine, N-Acetyl Glucosamine, Zinc Carnosine PepZin GI, sodium butyrate, the BioB Fusion methylated B-complex, the DigestiZorb+ enzyme matrix, a 10 billion CFU proprietary probiotic blend with Christensenella minuta keystone species, liposomal Saccharomyces boulardii, liposomal curcumin and quercetin, and three micellar mucilaginous botanicals (aloe vera, ginger, marshmallow root), all through advanced liposomal and micellar carriers that achieve 10x to 28x the bioavailability of conventional gut formulas for the encapsulated compounds. Inside your gut, these compounds work in concert. Liposomal BPC-157 upregulates the tight junction proteins occludin, claudin-1, and ZO-1 that seal the intestinal barrier. L-Glutamine fuels enterocytes, the cells that line the small intestine and depend on glutamine as their primary metabolic substrate. Sodium butyrate fuels colonocytes in the colon and strengthens colonic tight junctions. Zinc carnosine binds directly to mucosal damage sites and accelerates epithelial healing. The 10 billion CFU multi-strain probiotic blend reseeds beneficial flora across the small and large intestine while Saccharomyces boulardii competitively excludes Candida and pathogenic bacteria. Liposomal curcumin and quercetin modulate NF-kappaB signaling and stabilize mast cells to dampen the inflammatory cascade that drives leaky gut. Micellar aloe, ginger, and marshmallow root coat and soothe inflamed mucosa. The BioB Fusion methylated B-complex supplies pre-activated folate, B12, B6, and B2 for the methylation cycle that regulates immune cell differentiation and inflammatory tone. What separates Balance+ from generic probiotics or single-mechanism gut formulas is the convergence of three pillars in a single capsule: gut barrier repair, microbiome restoration, and immune balance, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile. Built For Your Biology. Manufactured to 21 CFR Part 111 GMP standards by FarmCeutica Wellness LLC. Third-party tested every batch. Vegan, non-GMO, allergen-free.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'balance-plus-gut-repair'
      AND p.sku = 'FC-BALANCE-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152e Balance+ paragraph update skipped: row not found at slug balance-plus-gut-repair / SKU FC-BALANCE-001';
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
        '152e_balance_plus_gut_repair_paragraph_description',
        'products',
        'FC-BALANCE-001',
        v_product_id,
        jsonb_build_object(
            'method', 'paragraph_description_refresh_per_152e',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152e',
            'authority', 'Gary canonical 2026-05-04 Prompt #152e; copy authored in spec body',
            'marshall_scan', 'pass: BPC-157 not on unapproved_peptides dictionary blocklist (semaglutide / retatrutide / age-restricted only); Hannah review flag for peptide visibility',
            'bioavailability_format', '10x to 28x (matches reviewer plus guardrail)',
            'product_name', 'Balance+ Gut Repair',
            'ingredient_count', 15,
            'peptide_compound_present', 'BPC-157 (oral / liposomal form, not on Marshall blocklist)'
        )
    );

    RAISE NOTICE '#152e Balance+ paragraph update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
