-- Prompt #152n-rev2: DAO+ Histamine Balance PDP revision (rev2 structured Lane-2 reconciled).
--
-- SUPERSEDES the original #152n paragraph copy (commit e30600a, 2026-05-05)
-- with the rev2 structured-markdown format that renders inside the canonical
-- 152p Accordion via the existing renderStructuredDescription parser.
-- Updates both summary (catalog card one-sentence three-pillar-led highlight
-- per Balance | Fortify | Optimize positioning) and description.
--
-- CLEANEST 152x rev2 alignment so far: spec's 12 bullets match Gary's
-- pasted canonical formulation 12 ingredients EXACTLY (including the
-- curcumin 150 mg correction memorialized in #152n original via memory
-- line 95 "missing-zero error class"). Only 2 micro-corrections needed:
-- both ® trademark symbol additions on Quatrefolic + Bioperine to match
-- live JSONB names byte-identical.
--
-- Lane 2 corrections (2 total, micro-corrections only):
--   1. Bullet 8: "Liposomal 5-MTHF (Quatrefolic)" -> "Liposomal 5-MTHF
--      (Quatrefolic®)" matching live name
--   2. Bullet 12: "Micellar Bioperine (Black Pepper Extract)" -> "Micellar
--      Bioperine® (Black Pepper Extract)" matching live name
--
-- Bioavailability claim posture:
--   - Spec text opening + closing paragraphs both OMIT the 10x to 28x
--     multiplier (deliberate per Gary's spec authorship: applicable rule
--     authorizes use but spec text didn't include it).
--   - Reconciled prose ships spec verbatim (no multiplier added) per Gary's
--     'go' confirmation. Substantiation IS available (7 of 12 live
--     ingredients carry Liposomal or Micellar prefix: Vit C, Quercetin, Mg,
--     5-MTHF, B12, Curcumin, L-Theanine, Bioperine) but the spec authorship
--     chose to omit the explicit multiplier sentence.
--   - Auto-remediators (Michelangelo reviewer.ts:190 + Jeffery
--     guardrails.ts:83) only block 5-27x patterns; absence of "10x to 28x"
--     is not a violation.
--
-- Drift notes (verified live 2026-05-05 before authoring per
-- feedback_live_sku_verify_before_apply standing rule):
--   * Slug dao-plus-histamine-balance confirmed live (matches first spec
--     candidate).
--   * SKU '38' (numeric string, NOT FC-DAO-001 as spec assumed; same non-
--     canonical SKU pattern as 152c ADO Support+ '34' and 152l-rev2 COMT+
--     '37'). Migration WHERE clause uses live SKU '38' from the start to
--     avoid the RAISE NOTICE silent-skip path that hit 152l-rev2 first
--     attempt.
--   * Live name "DAO+ Histamine Balance" (NOT "DAO+™" with ™ as Gary's
--     source-doc paste; live JSONB stores no ™ on product.name; matched
--     live for byte-identical PDP rendering).
--   * Live ingredient count 12 totaling 629 mg/serving (Gary canonical
--     2026-05-05 paste matched live 1:1).
--   * Live curcumin 150 mg confirms #152n original's "missing-zero error
--     class" correction held (memory line 95).
--   * price_msrp $108.88.
--
-- Marshall dictionary scan (per feedback_marshall_dictionary_predelivery_scan):
-- copy authored by Gary in spec body, 2 micro-® corrections by Claude per
-- spec/live byte-identical match. Scanned against
-- src/lib/compliance/dictionaries/unapproved_peptides.ts: zero hits for
-- semaglutide, retatrutide, bromantane, semax, selank, cerebrolysin. DAO
-- enzyme from porcine kidney is a food-grade enzyme, not a peptide drug;
-- not on Marshall list. Allergen-aware disclosure preserved: "non-GMO
-- porcine kidney" appears in opening paragraph + bullet name.
--
-- Disease-term posture: histamine intolerance, DAO deficiency, mast cell
-- activation, MTHFR variants, hormonal histamine fluctuations, seasonal
-- allergies, all in noun-phrase form following verb constructions
-- ("Adults with...", "individuals with...", "people with...", "those with..."),
-- riding the same verb-pair loophole established by 152e original.
-- "1:10 copper-to-zinc ratio" claim verified accurate (live Cu 2 mg + Zn
-- 20 mg = exactly 1:10 ratio).
--
-- Hyphens preserved in chemical names (5-MTHF, P-5-P, MK-7, L-Theanine,
-- N-Acetyl) and compound modifiers (non-GMO, histamine-driven, histamine-
-- gut, GABA-mediated, single-ingredient, estrogen-histamine, pre-meal,
-- copper-to-zinc, methylation-linked). No em-dashes, no en-dashes.
--
-- Idempotent on re-run: WHERE clause keys on slug AND sku AND
-- category != peptide; UPDATE re-applies the canonical strings.
-- backfill_audit gets a new row each run.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_new_summary text := 'Diamine oxidase enzyme activity, mast cell stabilization, and methylation-linked histamine clearance support in a single capsule.';
    v_new_description text := E'## What does DAO+ Histamine Balance do?\n\nDAO+ Histamine Balance targets the dual histamine clearance system: dietary histamine degradation through supplemental DAO enzyme and HNMT-mediated intracellular histamine methylation. The 12-ingredient liposomal capsule pairs direct DAO enzyme (from non-GMO porcine kidney) with the cofactors DAO requires (copper at the catalytic active site, B6 for substrate handling, vitamin C for reducing environment, magnesium and zinc for broader cofactor and immune modulation), mast cell stabilizers (aglycone quercetin, curcumin), and the methylated B vitamins (5-MTHF, methylcobalamin) that sustain the SAMe pool HNMT uses. L-Theanine provides parallel CNS calming for the histamine-driven excitation that contributes to anxiety and disrupted sleep.\n\n## Ingredient breakdown\n\n- **Methylated Vitamin B6 (P-5-P):** Cofactors DAO substrate handling and supports the broader amino acid metabolism histamine biosynthesis interacts with.\n- **Liposomal Vitamin C (Ascorbate):** Maintains the reducing environment DAO requires and contributes additional histamine-degrading activity.\n- **Copper (Bisglycinate):** Provides the catalytic metal cofactor at the DAO enzyme active site at the standard 1:10 copper-to-zinc ratio.\n- **Zinc (Bisglycinate):** Inhibits histamine release from mast cells and supports the broader copper-zinc balance for DAO activity.\n- **Liposomal Quercetin (Aglycone):** Stabilizes mast cell membranes through phospholipase A2 inhibition, preventing the calcium-dependent degranulation that drives histamine release.\n- **DAO Enzyme (from Non-GMO Porcine Kidney):** Provides direct supplemental DAO that acts in the small intestinal lumen to degrade dietary histamine before systemic absorption.\n- **Liposomal Magnesium (Bisglycinate):** Cofactors DAO and the broader methylation network that drives HNMT histamine clearance.\n- **Liposomal 5-MTHF (Quatrefolic®):** Drives methylation cycle SAMe regeneration that HNMT uses for intracellular histamine methylation.\n- **Liposomal Methylcobalamin (B12):** Cofactors methionine synthase for the homocysteine remethylation that sustains the SAMe pool.\n- **Liposomal Curcumin (95% Curcuminoids):** Modulates NF-kB inflammatory pathways and supports gut barrier tight junction integrity for the histamine-gut axis.\n- **Liposomal L-Theanine:** Provides GABA-mediated calming for the histamine-driven CNS excitation that contributes to anxiety and disrupted sleep.\n- **Micellar Bioperine® (Black Pepper Extract):** Extends systemic exposure for the polyphenol, methylated B vitamin, and amino acid components through CYP3A4 inhibition.\n\n## Who benefits and what makes this different\n\n**Who benefits:** Adults with histamine intolerance symptoms (flushing, headaches, hives, GI upset after high-histamine meals), individuals with DAO deficiency, people with food sensitivities triggered by aged cheeses, cured meats, fermented foods, or wine, those with mast cell activation symptoms where stabilizers complement enzyme degradation, individuals with MTHFR variants whose alternative HNMT histamine clearance pathway depends on methylation status, women with hormonal histamine fluctuations where estrogen-histamine interactions amplify symptoms, and those with seasonal allergies seeking adjunct support.\n\n**What makes it different:** What separates DAO+ from single-ingredient DAO products or isolated quercetin supplements is the convergence of three pillars: direct DAO enzyme plus cofactor optimization for endogenous DAO activity, mast cell stabilization through aglycone quercetin and standardized curcumin, and methylation-linked HNMT histamine clearance through methylated B vitamins and magnesium. The 1:10 copper-to-zinc ratio prevents the copper deficiency that isolated zinc supplementation can cause; the pre-meal timing protocol (15 to 30 minutes before meals) ensures supplemental DAO is present in the gut lumen during food breakdown.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'dao-plus-histamine-balance'
      AND p.sku = '38'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152n-rev2 DAO+ update skipped: row not found at slug dao-plus-histamine-balance / SKU 38';
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
        '152n_rev2_dao_plus_histamine_balance_revision',
        'products',
        '38',
        v_product_id,
        jsonb_build_object(
            'method', 'rev2_structured_description_lane2_reconciled_per_152p_canonical',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'rev2_structured_pdp_152p_canonical_lane2',
            'authority', 'Gary canonical 2026-05-05 Prompt #152n-rev2 (Lane 2 reconciliation; spec ingredients matched live exactly; only 2 micro-® corrections; first migration to apply feedback_live_sku_verify_before_apply rule preemptively, binding to live SKU 38 not spec FC-DAO-001)',
            'marshall_scan', 'human_review_pass; zero hits in unapproved_peptides.ts; DAO enzyme from porcine kidney is food-grade enzyme not peptide drug; allergen disclosure preserved (non-GMO porcine kidney in opening + bullet)',
            'bioavailability_format', 'Spec OMITTED 10x to 28x multiplier from prose; substantiation available (7/12 carrier-prefixed) but Gary chose to ship spec verbatim without multiplier sentence',
            'sku_correction_preemptive', 'Spec assumed FC-DAO-001; live SKU is 38 (numeric); per feedback_live_sku_verify_before_apply rule established by 152l-rev2 SKU-mismatch silent-skip incident, this migration uses live SKU 38 from the start to avoid RAISE NOTICE skip path',
            'lane2_corrections', jsonb_build_array(
                'Bullet 8: Liposomal 5-MTHF (Quatrefolic) -> Liposomal 5-MTHF (Quatrefolic®) matching live name',
                'Bullet 12: Micellar Bioperine (Black Pepper Extract) -> Micellar Bioperine® (Black Pepper Extract) matching live name'
            ),
            'product_name', 'DAO+ Histamine Balance',
            'three_pillar_positioning', 'Balance | Fortify | Optimize',
            'live_ingredient_total_mg', 629,
            'live_ingredient_count', 12,
            'live_format', 'capsule',
            'live_sku_pattern', 'Numeric 38 (non-canonical, same as ADO 34 + COMT 37)',
            'curcumin_dose_corrected_in_152n_original', '150 mg confirmed live (per memory line 95 missing-zero error class fix)',
            'rev2_canonical_pattern', 'feedback_152p_canonical_for_all_formulation_updates',
            'spec_alignment_quality', 'CLEANEST 152x rev2 alignment so far; only 2 micro-® corrections vs Lane-2 average 12-28 corrections in prior products'
        )
    );

    RAISE NOTICE '#152n-rev2 DAO+ update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
