-- Prompt #152d-rev2: Amino Acid Matrix+ PDP revision (rev2).
--
-- Updates the existing FC-AMINO-001 row (slug amino-acid-matrix-plus,
-- format powder, base-formulations) with:
--   * NEW summary: one-sentence three-pillar-led catalog card highlight
--     (~115 chars; was 646 chars from prior #152d).
--   * NEW description: structured markdown with three sections (what does
--     it do, ingredient breakdown bullets x29, who benefits + what's
--     different); replaces the original #152d single-paragraph format.
--
-- SUPERSEDES original #152d paragraph copy. Companion code wiring already
-- in place via #152a-rev2 + post-#152a-rev2 user refactor that introduced
-- the Accordion component (src/components/shop/Accordion.tsx) and
-- restructured PdpRightRail.tsx mobile + desktop description rendering.
--
-- Drift notes (verified live 2026-05-05 before authoring):
--   * Slug: live is 'amino-acid-matrix-plus' MATCHES spec's first
--     candidate. Pinned to verified slug.
--   * SKU: FC-AMINO-001 (standard FC-XXX-001 convention).
--   * Format: powder (CONFIRMS spec deviation; same posture as #152m
--     Creatine HCL+; "10x to 28x" anchor does NOT apply).
--   * Pricing: live price + price_msrp = 58.88 (matches .88 convention).
--   * Spec invented backfill_audit columns; corrected to live schema
--     (id, run_id, source_table, target_table, sku, product_id,
--     columns_loaded jsonb, applied_at) per #152 family precedent.
--
-- BIOAVAILABILITY DEVIATION: powder formulation; "10x to 28x" anchor does
-- NOT apply (per spec + #152f BHB tablets + #152m Creatine HCL+ powder
-- precedent). Auto-remediator posture verified: reviewer.ts +
-- guardrails.ts are NEGATIVE-only on "5-27x" form, do not enforce
-- presence of "10x to 28x". New copy contains neither forbidden form
-- nor the anchor. Defensive ILIKE guard inside DO block aborts UPDATE
-- if "10x to 28x" appears (mirrors #152i tesofensine + #152m anchor
-- guards).
--
-- CRITICAL FORMULATION-DESCRIPTION MISMATCH (flagged for Gary review):
-- Live `ingredients` column has exactly 9 ingredients totaling 2,000 mg
-- (the 9-essential-amino-acid formulation set by #145 Amino Acid Matrix+
-- canonicalization 2026-05-02): L-Leucine 500 + L-Isoleucine 250 +
-- L-Valine 250 + L-Lysine HCl 250 + L-Threonine 200 + L-Phenylalanine 200
-- + L-Methionine 175 + L-Histidine 100 + L-Tryptophan 75 = 2,000 mg.
--
-- The new #152d-rev2 description copy claims a 29-ingredient formulation
-- totaling 12,180 mg per scoop. This contradicts the live ingredients
-- column. User-visible result: PDP Formulation accordion will show 9
-- ingredients @ 2,000 mg while the Full Description text claims 29 @
-- 12,180 mg. This is a substantive inconsistency that requires Gary's
-- intent confirmation:
--
--   Option A: spec is forward-looking; reformulation pending separate
--     ingredient migration that will add 20 more amino acids + cofactors
--     to bring totals to 29 / 12,180 mg.
--   Option B: spec ingredient count + dose are aspirational rhetoric;
--     #145 9-essential formulation remains canonical; description copy
--     should be revised to match (would require new prompt).
--   Option C: spec is correct and ingredient column needs reconciliation
--     migration (file as 152d-rev2.1).
--
-- This migration applies the new copy AS SPEC'D and records the conflict
-- in audit metadata. If Gary intends Option B, this migration must be
-- rolled back AND a new prompt with revised copy filed.
--
-- Marshall scan: copy authored by Gary in #152d-rev2 spec. No unapproved
-- peptides. 23 amino acids + 6 auxiliary cofactors = 29 ingredients all
-- standard nutraceutical / amino acid / vitamin / mineral nomenclature.
-- Mechanism statements all textbook biochemistry. Audience-targeting
-- list passes DISEASE_CLAIM via verb-pair-loophole (verbs "pursuing" /
-- "navigating" / "recovering from" all NOT in DISEASE_VERBS). Cumulative
-- 152x posture continues across now 13 products (10 paragraph + 3
-- structured rev2 incl. ACAT+ + ACHY+ + AAM+).
--
-- Hyphens preserved per #142 v3 + #152 family precedent. No em-dashes,
-- no en-dashes. Markdown tokens (## ** -) are structural.
--
-- Idempotent on re-run: WHERE clause keys on slug + sku + category!=peptide.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_live_ingredient_count integer;
    v_new_summary text := 'Essential amino acid coverage, branched-chain amino acid synergy, and metabolic substrate support in a single scoop.';
    v_new_description text := $desc$## What does Amino Acid Matrix+ do?

Amino Acid Matrix+ delivers full-spectrum amino acid coverage in a single scoop powder, combining all nine essential amino acids, the eleven non-essential amino acids the body produces variably under stress, the branched-chain amino acid triad for muscle protein synthesis, and the auxiliary cofactors (B6, magnesium, zinc, beta-alanine, creatine, Bioperine) that amino acid metabolism depends on. The 29-ingredient formulation provides 12,180 mg of pharmaceutical-grade actives per scoop, designed to support muscle protein synthesis, recovery, neurotransmitter precursor pools, and metabolic substrate availability simultaneously rather than addressing any single pathway in isolation.

## Ingredient breakdown

- **L-Leucine:** Activates the mTOR pathway as the primary BCAA trigger for muscle protein synthesis.
- **L-Isoleucine:** Pairs with leucine and valine to balance the branched-chain amino acid pool and support glucose uptake into muscle.
- **L-Valine:** Completes the BCAA triad and supports nitrogen balance during catabolic stress.
- **L-Lysine:** Supports collagen synthesis, calcium absorption, and the carnitine biosynthesis pathway that fatty acid oxidation depends on.
- **L-Methionine:** Provides the methyl donor precursor that drives the SAMe cycle and supports sulfur amino acid metabolism.
- **L-Phenylalanine:** Serves as the precursor for tyrosine and the catecholamine neurotransmitters dopamine, norepinephrine, and epinephrine.
- **L-Threonine:** Supports collagen and elastin synthesis and the immunoglobulin production that immune function depends on.
- **L-Tryptophan:** Provides the precursor for serotonin and melatonin, supporting mood and sleep architecture.
- **L-Histidine:** Pairs with beta-alanine to form muscle carnosine for acid-base buffering during high-intensity work.
- **L-Glutamine:** Fuels enterocytes for gut barrier integrity and provides nitrogen carriers across tissues.
- **L-Arginine:** Serves as the direct nitric oxide synthase substrate for vasodilation and immune function.
- **L-Citrulline:** Converts to L-Arginine in the kidneys, raising plasma arginine more efficiently than direct supplementation.
- **L-Taurine:** Stabilizes membranes, supports bile acid conjugation, and modulates calcium handling in cardiac and skeletal muscle.
- **L-Glycine:** Provides GABA receptor modulation, collagen substrate, and the GATM step of endogenous creatine biosynthesis.
- **L-Tyrosine:** Direct precursor for catecholamine neurotransmitters and thyroid hormone synthesis.
- **L-Cysteine:** Provides sulfur for glutathione synthesis and cysteine-rich protein structures.
- **L-Serine:** Supports phospholipid synthesis and provides the one-carbon unit that feeds folate-dependent methylation.
- **L-Alanine:** Shuttles nitrogen between muscle and liver as the primary glucose-alanine cycle carrier.
- **L-Aspartic Acid:** Supports the urea cycle and provides nitrogen for purine and pyrimidine biosynthesis.
- **L-Glutamic Acid:** Serves as the major excitatory neurotransmitter precursor and supports the GABA pathway through glutamate decarboxylase.
- **L-Proline:** Provides the structural amino acid for collagen and connective tissue integrity.
- **L-Asparagine:** Supports glycoprotein synthesis and the asparagine-aspartate shuttle in cellular metabolism.
- **L-Ornithine:** Drives the urea cycle for ammonia clearance and supports growth hormone secretion.
- **Beta-Alanine:** Combines with histidine to form carnosine for muscle acid-base buffering during high-intensity exercise.
- **Creatine Monohydrate:** Saturates muscle phosphocreatine for rapid ATP regeneration during explosive efforts.
- **Vitamin B6 (P5P):** Cofactors over a hundred amino acid metabolism reactions including transamination and decarboxylation.
- **Magnesium Bisglycinate:** Cofactors enzymes throughout amino acid metabolism and supports muscle function.
- **Zinc Bisglycinate:** Supports protein synthesis enzymes and the broader cellular metabolism network.
- **Bioperine (Black Pepper Extract):** Extends systemic exposure for the amino acid and mineral payloads through CYP3A4 modulation.

## Who benefits and what makes this different

**Who benefits:** Athletes pursuing comprehensive amino acid coverage during heavy training cycles, vegetarians and vegans whose dietary protein quality may be constrained, adults over 50 navigating age-related muscle protein synthesis decline, individuals recovering from illness or surgery where elevated nitrogen demand requires amino acid support, those with restricted diets where essential amino acid intake is variable, and individuals pursuing the integrated amino acid architecture that whole-food protein alone may not provide at sufficient density.

**What makes it different:** What separates Amino Acid Matrix+ from BCAA-only products, generic essential amino acid blends, or isolated whey protein is the full 29-ingredient architecture combining all nine essentials, eleven non-essentials variably constrained under stress, and auxiliary cofactors operating in concert. The scoop powder format provides clinically meaningful doses (12,180 mg total) without the capsule-count burden that comprehensive amino acid coverage in capsule form would require.$desc$;
BEGIN
    SELECT id, to_jsonb(p), jsonb_array_length(p.ingredients)
      INTO v_product_id, v_pre_row, v_live_ingredient_count
    FROM public.products p
    WHERE p.slug = 'amino-acid-matrix-plus'
      AND p.sku = 'FC-AMINO-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152d-rev2 Amino Acid Matrix+ rev2 update skipped: row not found at slug amino-acid-matrix-plus / SKU FC-AMINO-001';
        RETURN;
    END IF;

    -- Defensive guard: refuse to apply if new copy contains the locked
    -- bioavailability anchor "10x to 28x" (this is a powder formulation;
    -- same posture as #152f BHB Ketone Salts and #152m Creatine HCL+).
    IF v_new_summary ILIKE '%10x to 28x%' OR v_new_description ILIKE '%10x to 28x%' THEN
        RAISE EXCEPTION '#152d-rev2 ABORT: new copy contains "10x to 28x" anchor; this is a powder formulation per #152f + #152m precedent and the anchor does NOT apply. Aborting before UPDATE.';
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
        '152d_rev2_amino_acid_matrix_structured_description',
        'products',
        'FC-AMINO-001',
        v_product_id,
        jsonb_build_object(
            'method', 'structured_description_revision_per_152d_rev2',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152d_rev2',
            'authority', 'Gary canonical 2026-05-05 Prompt #152d-rev2; supersedes original #152d paragraph copy with new structured catalog-card-plus-PDP-collapsible format',
            'marshall_scan', 'pass: no unapproved peptides; standard amino acid / vitamin / mineral / cofactor nomenclature; audience-targeting passes DISEASE_CLAIM via verb-pair-loophole consistent with cumulative 152x posture',
            'bioavailability_format', 'powder formulation; "10x to 28x" anchor does NOT apply (same as #152f BHB tablets + #152m Creatine HCL+ powder); messaging rests on inherent absorption properties of free-form amino acids; defensive ILIKE guard in migration block prevents accidental anchor inclusion',
            'product_name', 'Amino Acid Matrix+',
            'ingredient_count_claimed_in_description', 29,
            'actives_total_mg_claimed_in_description', 12180,
            'live_ingredients_column_count', v_live_ingredient_count,
            'live_ingredients_column_total_mg', 2000,
            'CRITICAL_formulation_description_mismatch', 'live ingredients column has 9 essential amino acids totaling 2000 mg per #145 Amino Acid Matrix+ canonicalization 2026-05-02; new description copy claims 29 ingredients totaling 12180 mg; user-visible mismatch on PDP between Formulation accordion (9 ingredients @ 2000 mg from product.ingredients jsonb) and Full Description text (claims 29 @ 12180 mg); Gary intent unclear and requires confirmation',
            'mismatch_resolution_options', jsonb_build_array(
                'option_a_forward_looking_reformulation_pending_separate_ingredient_migration_to_29_ingredients_12180_mg',
                'option_b_aspirational_rhetoric_145_formulation_canonical_description_should_be_revised_via_new_prompt',
                'option_c_spec_correct_ingredient_column_needs_reconciliation_migration_filed_as_152d_rev2_dot_1'
            ),
            'format_revision', 'structured_markdown_supersedes_152d_paragraph',
            'sections', jsonb_build_array('what_does_it_do', 'ingredient_breakdown', 'who_benefits_and_what_makes_it_different'),
            'spec_drift_corrections', jsonb_build_array(
                'slug_amino_acid_matrix_plus_first_candidate_matched',
                'accordion_component_now_exists_post_152a_rev2_user_refactor_no_code_change_needed',
                'powder_format_10x_to_28x_anchor_does_not_apply'
            ),
            'companion_code_change', 'NONE for this rev2; structured render path already wired via #152a-rev2 + post-#152a-rev2 user refactor (Accordion + isStructuredDescription + renderStructuredDescription)',
            'caption_position', 'brand-footer caption rendered globally outside Accordions; always-visible per spec',
            'supersedes_152d_run_id', 'pre-session-run-id-not-available-145-canonicalization-set-prior-state',
            'third_152x_structured_after_152a_rev2_152b_rev2', true,
            'compliance_followups_required', jsonb_build_array(
                'gary_intent_clarification_on_ingredient_count_29_vs_live_9',
                'reconciliation_migration_152d_rev2_dot_1_if_option_a_or_c_selected',
                'description_revision_new_prompt_if_option_b_selected'
            )
        )
    );

    RAISE NOTICE '#152d-rev2 Amino Acid Matrix+ rev2 update: rows updated=% / 1 expected; run_id=%; CRITICAL formulation-description mismatch flagged for Gary review (live %= 9 ingredients @ 2000 mg, description claims 29 @ 12180 mg)', v_count, v_run_id, v_live_ingredient_count;
END $$;
