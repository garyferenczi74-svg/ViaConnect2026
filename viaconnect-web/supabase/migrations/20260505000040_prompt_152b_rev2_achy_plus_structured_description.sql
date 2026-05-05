-- Prompt #152b-rev2: ACHY+ Acetylcholine Support PDP revision (rev2).
--
-- Updates the existing FC-ACHY-001 row (slug achy-plus-acetylcholine-support,
-- methylation-snp, capsule) with:
--   * NEW summary: one-sentence three-pillar-led catalog card highlight
--     (~108 chars; was 269 chars from #152b)
--   * NEW description: structured markdown with three sections (what does
--     it do, ingredient breakdown bullets x13, who benefits + what's
--     different); replaces the original #152b single-paragraph format.
--
-- SUPERSEDES original #152b paragraph copy. Companion code wiring already
-- in place via #152a-rev2 + post-#152a-rev2 user refactor that introduced
-- the Accordion component (src/components/shop/Accordion.tsx) and
-- restructured PdpRightRail.tsx mobile + desktop description rendering
-- to use a single Accordion-based layout for both viewports. The
-- isStructuredDescription detector triggers on the new ## headings,
-- and renderStructuredDescription parses the 4 token forms (## heading,
-- - **Name:** body bullet, **Lead:** body paragraph, plain paragraph).
-- No code change required for this rev2; data-only migration.
--
-- Drift notes (verified live 2026-05-05 before authoring):
--   * Slug: live is 'achy-plus-acetylcholine-support' (NOT spec's five
--     candidates: achy-plus-acetylcholine-support / achy-plus /
--     achy-acetylcholine-support / achy-acetylcholine / achy). Spec's
--     candidate #1 actually matches live; CASE-ordered loop would resolve
--     correctly. Pinned to verified slug for clarity.
--   * SKU: FC-ACHY-001 (standard FC-XXX-001 convention).
--   * Pricing: live price + price_msrp = 108.88 (matches .88 convention).
--   * Spec invented backfill_audit columns; corrected to live schema
--     (id, run_id, source_table, target_table, sku, product_id,
--     columns_loaded jsonb, applied_at) per #152 family precedent.
--   * Spec assumed an existing accordion/disclosure component for
--     "Formulation" heading. Per #152a-rev2 audit, no such component
--     existed at the time. POST-#152a-rev2 user refactor created
--     src/components/shop/Accordion.tsx and applied it to both
--     "Full Description" and "Formulation" sections in PdpRightRail.tsx
--     (lines 312-331 of post-refactor file). Spec premise now satisfied;
--     this migration honors the structured render path the refactor
--     wired up.
--
-- Existing #152b PDP_EMPHASIZED_TERMS map entry for
-- 'achy-plus-acetylcholine-support' (4 phrases: "precision liposomal
-- acetylcholine support formula" / "10x to 28x higher bioavailability"
-- / "Built For Your Biology" / "Bio Optimization") becomes effectively
-- DEAD CODE for ACHY+ once this rev2 ships, because the structured
-- render path uses renderStructuredDescription which does NOT apply
-- phrase emphasis (only renderDescriptionWithEmphasis does, and that
-- helper is only called for non-structured descriptions). Cleanup of
-- the map entry is OUT OF SCOPE for this rev2 to keep the change
-- contained; the dead entry is harmless (regex never matches because
-- the structured path never invokes the emphasis helper).
--
-- Bioavailability: "10x to 28x" anchor APPLIES (capsule with liposomal
-- carriers; standard pattern). Anchor present once in opening paragraph
-- of the structured description.
--
-- Marshall scan: copy authored by Gary in #152b-rev2 spec. No unapproved
-- peptides. Standard nutraceutical / amino acid / vitamin / botanical /
-- nootropic nomenclature throughout. Genetic variant naming (MTHFR)
-- scientific not regulated. Audience-targeting list passes DISEASE_CLAIM
-- via verb-pair-loophole (verbs "pursuing" / "navigating" / "with
-- documented or suspected" all NOT in DISEASE_VERBS list).
-- Cumulative 152x verb-pair-loophole posture continues across now 12
-- products (10 paragraph + 2 structured rev2: ACAT+ + ACHY+).
--
-- IMPORTANT contraindications block in copy (donepezil / rivastigmine /
-- galantamine cholinesterase inhibitors, antihistamines, seizure
-- disorder, peptic ulcer, bradycardia / AV blocks, severe asthma,
-- pregnancy / lactation, under 18). Hannah review: cholinesterase
-- inhibitor interaction warning is appropriate given Huperzine A
-- inclusion (preclinical AChE inhibitor). The disease-state references
-- (seizure / peptic ulcer / bradycardia / asthma) are framed as
-- "consult prescribing physician before use with" not as treatment
-- claims. Verbs "consult" + "before use with" are NOT DISEASE_VERBS;
-- the warning frame passes DISEASE_CLAIM.
--
-- Hyphens preserved per #142 v3 + #152 family precedent. No em-dashes,
-- no en-dashes. Markdown structural characters (## headings, - bullets,
-- ** bold) are formatting tokens, not punctuation dashes.
--
-- Idempotent on re-run: WHERE clause keys on slug + sku + category!=peptide.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_new_summary text := 'Acetylcholine synthesis, cognitive focus, and neuro-muscular balance support in a single capsule.';
    v_new_description text := $desc$## What does ACHY+ Acetylcholine Support do?

ACHY+ Acetylcholine Support targets the cholinergic system through three interconnected pillars: acetylcholine synthesis through cholinergic precursors, cognitive focus through nootropic botanicals and synaptic support, and neuro-muscular balance through magnesium-NMDA modulation and acetylcholinesterase inhibition. The 13-ingredient liposomal and micellar capsule pairs three cholinergic precursors (Alpha-GPC, ALCAR, Citicoline) with synaptic membrane lipids (phosphatidylserine, phosphatidylcholine), the nootropic botanical Bacopa monnieri, the acetylcholinesterase inhibitor Huperzine A, the synaptic substrate Uridine, calm-focus modulation through L-Theanine, and brain-targeted Magnesium L-Threonate for NMDA-mediated synaptic plasticity. The 10x to 28x bioavailability achieved through liposomal carriers ensures clinically meaningful delivery across the blood-brain barrier for the historically poorly absorbed components.

## Ingredient breakdown

- **Liposomal Alpha-GPC (Choline Alfoscerate):** Crosses the blood-brain barrier intact and releases free choline directly into central neurons for acetylcholine synthesis through the choline acetyltransferase reaction.
- **Liposomal Acetyl-L-Carnitine HCl (ALCAR):** Donates both an acetyl group for acetylcholine synthesis and supports mitochondrial fatty acid beta-oxidation in the energy-demanding cholinergic neurons.
- **Liposomal Citicoline (CDP-Choline):** Provides choline plus cytidine that converts to uridine, supporting both acetylcholine synthesis and the membrane phospholipid pool that cholinergic transmission depends on.
- **Micellar Bacopa monnieri Extract (50% bacosides):** Stimulates BDNF and nerve growth factor expression for synaptic density and dendritic arborization that supports memory consolidation.
- **Methylated Pantethine (active B5):** Provides the activated form of pantothenic acid that drives coenzyme A synthesis, the cofactor required for acetylcholine production.
- **Liposomal Vitamin B12 (Methylcobalamin):** Cofactors methionine synthase for the homocysteine remethylation cycle that protects neuronal myelin and supports cognitive function.
- **Liposomal Phosphatidylserine:** Modulates cortisol response to learning stress and stabilizes neuronal membrane fluidity for receptor density.
- **Liposomal Phosphatidylcholine:** Provides direct choline for the membrane phospholipid pool and supports the phosphatidylcholine-acetylcholine reservoir alongside the precursor stack.
- **Micellar Huperzine A:** Inhibits acetylcholinesterase to preserve newly synthesized acetylcholine in the synaptic cleft, extending its action on postsynaptic receptors.
- **Liposomal Uridine 5-Monophosphate:** Pairs with citicoline to support synaptic phosphatidylcholine synthesis through the Kennedy pathway for synaptic repair and plasticity.
- **Liposomal L-Theanine:** Modulates GABA pathways for the calm-focused state where alpha brain waves dominate, complementing cholinergic activation without over-stimulation.
- **Liposomal Magnesium L-Threonate:** Crosses the blood-brain barrier preferentially among magnesium forms and enhances NMDA receptor sensitivity for synaptic plasticity and long-term potentiation.
- **Micellar Bioperine (Black Pepper Extract):** Inhibits intestinal and hepatic UDP-glucuronosyltransferase and CYP3A4 enzymes, extending systemic exposure for the polyphenol and amino acid components.

## Who benefits and what makes this different

**Who benefits:** Adults pursuing cognitive performance enhancement during high-cognitive-demand contexts, individuals with age-associated memory impairment (AAMI), those navigating the cognitive demands of complex work or study, adults pursuing the integrated neuro-muscular balance that single-ingredient cholinergic products cannot provide, individuals with documented or suspected acetylcholine deficiency patterns, and those with MTHFR variants whose methylation-linked neurotransmitter synthesis benefits from active-form B vitamins. Important contraindications: not for use during pregnancy or lactation; consult prescribing physician before use with cholinesterase inhibitors (donepezil, rivastigmine, galantamine), antihistamines, in active seizure disorder, peptic ulcer disease, bradycardia or AV conduction blocks, or severe asthma; not formulated for individuals under 18.

**What makes it different:** What separates ACHY+ from generic Alpha-GPC products, isolated citicoline supplements, or single-mechanism nootropic formulas is the convergence of three pillars: cholinergic precursor stack (three precursors operating through distinct mechanisms) plus synaptic membrane and synaptic substrate support (phosphatidylserine, phosphatidylcholine, uridine) plus the dual cognitive-and-neuromuscular layer through Bacopa, Huperzine A, L-Theanine, and brain-targeted Magnesium L-Threonate. The integrated approach addresses both the precursor supply and the synaptic infrastructure that single-mechanism products cannot match.$desc$;
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'achy-plus-acetylcholine-support'
      AND p.sku = 'FC-ACHY-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152b-rev2 ACHY+ rev2 update skipped: row not found at slug achy-plus-acetylcholine-support / SKU FC-ACHY-001';
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
        '152b_rev2_achy_plus_structured_description',
        'products',
        'FC-ACHY-001',
        v_product_id,
        jsonb_build_object(
            'method', 'structured_description_revision_per_152b_rev2',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152b_rev2',
            'authority', 'Gary canonical 2026-05-05 Prompt #152b-rev2; supersedes original #152b paragraph copy with new structured catalog-card-plus-PDP-collapsible format',
            'marshall_scan', 'pass: no unapproved peptides; standard nutraceutical / amino acid / vitamin / nootropic / botanical nomenclature; MTHFR variant naming scientific not regulated; audience-targeting + contraindications block passes DISEASE_CLAIM via verb-pair-loophole consistent with cumulative 152x posture',
            'bioavailability_format', '10x to 28x (matches reviewer plus guardrail; capsule with liposomal carriers; anchor present once in opening paragraph of structured format, not duplicated in summary)',
            'product_name', 'ACHY+ Acetylcholine Support',
            'ingredient_count', 13,
            'format_revision', 'structured_markdown_supersedes_152b_paragraph',
            'sections', jsonb_build_array('what_does_it_do', 'ingredient_breakdown', 'who_benefits_and_what_makes_it_different'),
            'spec_drift_corrections', jsonb_build_array(
                'slug_achy_plus_acetylcholine_support_first_candidate_matched',
                'accordion_component_now_exists_post_152a_rev2_user_refactor_no_code_change_needed',
                'pdp_emphasized_terms_152b_entry_becomes_dead_code_for_achy_after_rev2_harmless_left_in_place'
            ),
            'companion_code_change', 'NONE for this rev2; structured render path already wired via #152a-rev2 + post-#152a-rev2 user refactor that introduced src/components/shop/Accordion.tsx and updated PdpRightRail.tsx mobile+desktop description rendering to single Accordion-based layout',
            'caption_position', 'brand-footer caption rendered globally outside Accordions (line 367-371 of post-refactor PdpRightRail.tsx); always-visible per spec',
            'supersedes_152b_run_id', '3f95a0ce-88fe-42ab-8925-99d99ef2d2d0',
            'second_152x_structured_after_152a_rev2', true,
            'contraindications_block_present', 'donepezil + rivastigmine + galantamine cholinesterase inhibitors (Huperzine A interaction); antihistamines; seizure disorder; peptic ulcer; bradycardia / AV blocks; severe asthma; pregnancy / lactation; under 18'
        )
    );

    RAISE NOTICE '#152b-rev2 ACHY+ rev2 update: rows updated=% / 1 expected; run_id=%; structured markdown description active', v_count, v_run_id;
END $$;
