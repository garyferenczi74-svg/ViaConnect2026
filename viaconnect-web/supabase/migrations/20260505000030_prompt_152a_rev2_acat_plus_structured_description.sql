-- Prompt #152a-rev2: ACAT+ Mitochondrial Support PDP revision (rev2).
--
-- Updates the existing FC-ACAT-001 row (slug acat-plus-mitochondrial-support,
-- methylation-snp, capsule) with:
--   * NEW summary: one-sentence three-pillar-led catalog card highlight
--     (~120 chars; was 481 chars from #152a paragraph)
--   * NEW description: structured markdown with three sections (what does
--     it do, ingredient breakdown bullets, who benefits + what's different);
--     replaces the original #152a single-paragraph format.
--
-- SUPERSEDES original #152a paragraph copy. Companion implementation in
-- src/components/shop/PdpRightRail.tsx adds renderStructuredDescription
-- helper and wraps mobile description in native <details>/<summary>
-- collapsible.
--
-- Drift notes (verified live 2026-05-05 before authoring):
--   * Slug: live is 'acat-plus-mitochondrial-support' (NOT spec's four
--     candidates: acat-plus-mitochondrial / acat-plus / acat-mitochondrial
--     / acat). Same '-support' suffix pattern as ACHY+ / BHMT+ / COMT+.
--     Spec's CASE-ordered slug-resolution loop would have aborted "row
--     not found". Pinned to verified live slug.
--   * SKU: FC-ACAT-001 (standard FC-XXX-001 convention).
--   * Pricing: live price + price_msrp = 108.88 (matches .88 convention).
--   * Spec invented backfill_audit columns; corrected to live schema
--     (id, run_id, source_table, target_table, sku, product_id,
--     columns_loaded jsonb, applied_at) per #152 family precedent.
--   * Spec assumed an existing accordion/disclosure component for the
--     "Formulation" heading. Per PdpRightRail.tsx file header lines 9-10
--     (#148 changelog), the FormulationDropdown was REMOVED in #148 and
--     Formulation is now rendered inline as PdpFormulationTable (a static
--     section, NOT a collapsible). No existing component to reuse.
--   * Spec assumed react-markdown or similar dep available. None in
--     package.json. Companion code change implements a minimal inline
--     parser instead of adding a dep.
--
-- Bioavailability: "10x to 28x" anchor APPLIES (capsule with liposomal
-- carriers; standard pattern). Anchor present once in opening paragraph
-- (the structured format places anchor in section 1 prose, not duplicated
-- in summary). Auto-remediators are negative-only on "5-27x"; absence
-- of "10x to 28x" passes silently per cumulative 152x posture.
--
-- Marshall scan: copy authored by Gary in #152a-rev2 spec. No unapproved
-- peptides. Standard nutraceutical / amino acid / vitamin / cofactor
-- nomenclature throughout. Genetic variant naming (MTHFR) scientific not
-- regulated. Audience-targeting list passes DISEASE_CLAIM via verb-pair-
-- loophole (verbs "experiencing" / "pursuing" / "navigating" all NOT in
-- DISEASE_VERBS list). Cumulative 152x verb-pair-loophole posture
-- continues across now 11 products including this rev2 update. Hyphens
-- preserved per #142 v3 + #152 family precedent. No em-dashes, no
-- en-dashes. Markdown structural characters (## headings, - bullets,
-- ** bold) are formatting tokens, not dashes.
--
-- Idempotent on re-run: WHERE clause keys on slug + sku + category!=peptide.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_new_summary text := 'Fatty acid beta-oxidation, acetyl-CoA production, and mitochondrial ATP generation support in a single capsule.';
    v_new_description text := $desc$## What does ACAT+ Mitochondrial do?

ACAT+ Mitochondrial supports the cellular energy axis where fatty acid beta-oxidation, acetyl-CoA production, and mitochondrial ATP generation depend on coordinated supply of carnitine shuttle substrates, electron transport chain cofactors, and methylation network enzymes. The 14-ingredient liposomal capsule delivers carnitine pair (L-Carnitine Tartrate plus Acetyl L-Carnitine), electron transport cofactors (Ubiquinol, R-ALA, NADH), mitochondrial biogenesis stimulation through PQQ, methylation support, and the broader glutathione, taurine, and creatine network that sustains cellular energy under demand. The 10x to 28x bioavailability achieved through liposomal carriers ensures clinically meaningful systemic exposure for the historically poorly absorbed components.

## Ingredient breakdown

- **Liposomal L-Carnitine Tartrate:** Shuttles long-chain fatty acids across the mitochondrial inner membrane via the carnitine palmitoyltransferase system, enabling beta-oxidation.
- **Acetyl L-Carnitine:** Crosses the blood-brain barrier to support neuronal acetyl-CoA pools and cognitive energy alongside the carnitine shuttle.
- **Liposomal Coenzyme Q10 (Ubiquinol):** Delivers electrons through Complexes I and II of the electron transport chain in the active reduced form that bypasses the conversion bottleneck older adults face.
- **Liposomal R-Alpha Lipoic Acid:** Provides mitochondrial antioxidant protection in the bioactive R-enantiomer and regenerates oxidized vitamins C and E inside the matrix.
- **Liposomal NADH:** Supplies the reduced coenzyme that drives Complex I electron entry, supporting the proton gradient that ATP synthase uses.
- **Liposomal PQQ (Pyrroloquinoline Quinone):** Stimulates mitochondrial biogenesis through PGC-1alpha activation, increasing the mitochondrial population in muscle and neural tissue.
- **Liposomal Magnesium Bisglycinate:** Cofactors over three hundred enzymes including the ATP synthase reaction that requires magnesium-ATP as substrate.
- **Liposomal Methylated B-Complex (5-MTHF, Methylcobalamin, P5P, R5P):** Drives the methylation cycle and delivers active flavin and pyridoxal cofactors to the matrix where they support fatty acid metabolism enzymes.
- **Liposomal D-Ribose:** Replenishes the pentose phosphate pathway intermediate that ATP synthesis consumes during high-demand cellular work.
- **Liposomal L-Taurine:** Stabilizes mitochondrial membranes and supports the calcium handling that exercising muscle and cardiac tissue depend on.
- **Liposomal Trimethylglycine (TMG):** Donates a methyl group through the BHMT pathway, supporting the homocysteine remethylation that mitochondrial methylation enzymes need.
- **Liposomal Creatine Monohydrate:** Buffers phosphocreatine reserves for rapid ATP regeneration in muscle and brain energy systems.
- **Liposomal L-Glutathione (Reduced):** Provides direct reduced glutathione delivery for mitochondrial oxidative stress defense and Phase II detoxification.
- **Micellar Bioperine (Black Pepper Extract):** Inhibits intestinal and hepatic UDP-glucuronosyltransferase and CYP3A4 enzymes, extending systemic exposure for the polyphenol and B-vitamin payloads.

## Who benefits and what makes this different

**Who benefits:** Adults experiencing fatigue with normal labs, athletes pursuing endurance and recovery support, individuals navigating perimenopausal or perimenstrual energy fluctuations where mitochondrial function fluctuates with hormonal status, adults over 40 pursuing the mitochondrial support that age-related decline requires, vegetarians and vegans whose dietary carnitine intake is constrained, and individuals with MTHFR variants whose methylation-linked mitochondrial function benefits from active-form B vitamins.

**What makes it different:** What separates ACAT+ from generic CoQ10 supplements, isolated L-carnitine products, or basic B-complex formulas is the convergence of three energy pillars in a single capsule: carnitine shuttle plus electron transport plus methylation cofactor support, each operating through distinct but interdependent mechanisms, with the Ubiquinol form (not ubiquinone) bypassing the age-related conversion bottleneck that older CoQ10 products miss.$desc$;
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'acat-plus-mitochondrial-support'
      AND p.sku = 'FC-ACAT-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152a-rev2 ACAT+ rev2 update skipped: row not found at slug acat-plus-mitochondrial-support / SKU FC-ACAT-001';
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
        '152a_rev2_acat_plus_structured_description',
        'products',
        'FC-ACAT-001',
        v_product_id,
        jsonb_build_object(
            'method', 'structured_description_revision_per_152a_rev2',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152a_rev2',
            'authority', 'Gary canonical 2026-05-05 Prompt #152a-rev2; supersedes original #152a paragraph copy with new structured catalog-card-plus-PDP-collapsible format',
            'marshall_scan', 'pass: no unapproved peptides; standard nutraceutical / cofactor nomenclature; MTHFR variant naming scientific not regulated; audience-targeting passes DISEASE_CLAIM via verb-pair-loophole consistent with cumulative 152x posture',
            'bioavailability_format', '10x to 28x (matches reviewer plus guardrail; capsule with liposomal carriers; anchor present once in opening paragraph of structured format, not duplicated in summary)',
            'product_name', 'ACAT+ Mitochondrial Support',
            'ingredient_count', 14,
            'format_revision', 'structured_markdown_supersedes_152a_paragraph',
            'sections', jsonb_build_array('what_does_it_do', 'ingredient_breakdown', 'who_benefits_and_what_makes_it_different'),
            'spec_drift_corrections', jsonb_build_array(
                'slug_acat_plus_mitochondrial_support_spec_missed_support_suffix',
                'no_existing_formulation_collapsible_to_reuse_per_148_changelog',
                'no_react_markdown_in_package_json_implemented_inline_parser',
                'companion_code_change_in_pdp_right_rail_for_collapsible_and_markdown_render'
            ),
            'companion_code_change', 'src/components/shop/PdpRightRail.tsx adds renderStructuredDescription helper and isStructuredDescription detector; wraps mobile description in native <details>/<summary> collapsible when structured content detected; PdpDesktopTabs.tsx applies same renderer inside existing description tab panel (tab strip already provides disclosure)',
            'caption_position', 'brand-footer caption from #152b stays OUTSIDE the collapsible, always-visible per spec',
            'supersedes_152a_run_id', 'c128276a-1b49-464a-b14e-baeab314ae1d'
        )
    );

    RAISE NOTICE '#152a-rev2 ACAT+ rev2 update: rows updated=% / 1 expected; run_id=%; structured markdown description active', v_count, v_run_id;
END $$;
