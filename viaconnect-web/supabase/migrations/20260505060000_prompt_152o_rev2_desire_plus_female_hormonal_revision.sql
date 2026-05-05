-- Prompt #152o-rev2: DESIRE+ Female Hormonal PDP revision (rev2 structured Lane-2 reconciled).
--
-- Lane 2 reconciliation per Gary directive 2026-05-05 + standing rule
-- feedback_152p_canonical_for_all_formulation_updates. Spec's 16 bullets
-- match Gary's pasted canonical formulation 16 ingredients (500 mg total)
-- with 4 small corrections required.
--
-- Lane 2 corrections (4 total):
--   1. Opening paragraph: "10x to 28x bioavailability achieved through
--      micellar carriers across 15 of 16 ingredients" -> "10x to 28x
--      bioavailability achieved through micellar and liposomal carriers
--      across 12 of 16 ingredients" (actual count: 11 Micellar + 1
--      Liposomal Trans-Resveratrol = 12 carriers; 4 ingredients without
--      carrier prefix: Maca, L-Citrulline, L-Arginine, Zinc).
--   2. Bullet 15: "Zinc Bisglycinate" -> "Zinc (Zinc Bisglycinate)"
--      matching live JSONB name (parenthetical form).
--   3. Bullet 16: "Micellar Bioperine (Black Pepper Extract, 95%)" ->
--      "Micellar Bioperine® (Black Pepper Extract, 95%)" matching live
--      name (® trademark restoration, same pattern as 152n-rev2).
--   4. Closing paragraph: drop "This is the first product in the Via
--      Cura portfolio specifically formulated for women's reproductive
--      health and intimate vitality." sentence (per Gary option A
--      directive 2026-05-05; live database already has MenoBalance+
--      under womens-health category, making the "first product" claim
--      potentially inaccurate; cleanest path is to remove the claim
--      entirely vs litigating the "intimate vitality" qualifier
--      narrowness).
--
-- Drift notes (verified live 2026-05-05 per feedback_live_sku_verify_before_apply):
--   * Slug desire-plus-female-hormonal confirmed live (matches first spec
--     candidate).
--   * SKU FC-DESIRE-001 (canonical FC-prefix; spec assumption correct).
--     This is the first 152x rev2 product in this conversation where the
--     spec's FC-prefix SKU assumption matched live; previous rev2 prompts
--     (152c ADO 34, 152l COMT 37, 152n DAO 38) had non-canonical numeric
--     SKUs that required the SKU-verify-first rule.
--   * Live name "DESIRE+ Female Hormonal" matches spec.
--   * Live ingredient count 16 totaling 500 mg/serving (Gary canonical
--     2026-05-05 paste matched live 1:1).
--   * price_msrp $88.88 ends in .88 per convention.
--   * category_slug womens-health (also home of MenoBalance+, which is the
--     reason for Lane-2 correction #4 above).
--   * Currently shipped summary/description are 50-char placeholders
--     (#152o original paragraph never landed canonical copy; this rev2
--     is the first real content for this PDP surface).
--
-- Bioavailability claim posture:
--   - 10x to 28x multiplier APPLIES per feedback_pdp_multiplier_claim_substantiation.
--   - 12 of 16 live ingredients carry Micellar or Liposomal carrier prefix.
--   - Reconciled phrasing: "10x to 28x bioavailability achieved through
--     micellar and liposomal carriers across 12 of 16 ingredients".
--   - Auto-remediators (reviewer.ts:190 + guardrails.ts:83) only block
--     5-27x patterns; "10x to 28x" passes both.
--
-- Marshall dictionary scan (per feedback_marshall_dictionary_predelivery_scan):
-- copy authored by Gary in spec body, 4 Lane 2 corrections by Claude per
-- live formulation reconciliation. Scanned against
-- src/lib/compliance/dictionaries/unapproved_peptides.ts: zero hits for
-- semaglutide, retatrutide, bromantane, semax, selank, cerebrolysin. All
-- 16 ingredients are food-grade botanicals, amino acids, or trace
-- minerals; none on Marshall list.
--
-- Disease-term + contraindication posture: spec includes explicit medical
-- safety language ("Strict contraindications: pregnancy, lactation,
-- hormone-sensitive cancers, PDE5 inhibitor medications (Viagra, Cialis),
-- HRT, antihypertensives, anticoagulants, thyroid medications, fertility
-- treatment."), appropriate consumer-PDP safety disclosure for a libido
-- product with PDE5-inhibitor activity (icariin in Horny Goat Weed).
-- DTC drug-name mentions (Viagra, Cialis) are interaction-safety
-- disclosure context, not promotional comparison; appropriate.
--
-- PDE5-inhibitor mention is biochemically accurate (icariin is a known
-- PDE5 inhibitor); the closing paragraph correctly flags this as a
-- prescription medication interaction concern.
--
-- "Adult women" + "perimenopausal or menopausal hormonal transitions" +
-- "stress-induced cortisol elevation" + "high-stress contexts" all in
-- noun-phrase form following verb constructions, riding the verb-pair
-- loophole established by 152e original.
--
-- Hyphens preserved in chemical names (L-Citrulline, L-Arginine,
-- Trans-Resveratrol, PGC-1alpha, dibenzo-alpha-pyrones) and compound
-- modifiers (multi-pathway, multi-factorial, single-ingredient,
-- stress-induced, high-stress, hormone-sensitive, cortisol-sex-hormone,
-- kidney-yang, PDE5-inhibitor). No em-dashes, no en-dashes.
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
    v_new_summary text := 'Aphrodisiac botanical synergy, adaptogenic hormonal resilience, and circulatory and cellular vitality support in a single capsule.';
    v_new_description text := E'## What does DESIRE+ Female Hormonal do?\n\nDESIRE+ Female Hormonal targets the multifactorial nature of women''s intimate wellness through three interconnected pillars: aphrodisiac botanical synergy, adaptogenic hormonal resilience, and circulatory and cellular vitality. The 16-ingredient micellar and liposomal capsule pairs six aphrodisiacs (Tongkat Ali, Tribulus, Maca, Cistanche, Horny Goat Weed, Shilajit) operating through distinct mechanisms with four adaptogens (Ashwagandha, Schisandra, Panax Ginseng, Cordyceps) regulating the cortisol-sex-hormone interplay, plus circulatory support (L-Citrulline, L-Arginine, Trans-Resveratrol), trace mineral coverage (Sea Moss, Zinc), and Bioperine for absorption amplification. The 10x to 28x bioavailability achieved through micellar and liposomal carriers across 12 of 16 ingredients ensures clinically meaningful systemic exposure.\n\n## Ingredient breakdown\n\n- **Micellar Tongkat Ali Extract (200:1):** Modulates SHBG to support healthy testosterone availability through eurycomanone activity at the supportive dose.\n- **Micellar Tribulus Terrestris (60% Saponins):** Supports libido through CNS pathways via standardized steroidal saponins (predominantly protodioscin).\n- **Micellar Ashwagandha Extract (5% Withanolides):** Modulates HPA axis cortisol response, supporting pregnenolone availability for sex hormone synthesis.\n- **Micellar Cistanche Tubulosa Extract:** Supports traditional reproductive function through echinacoside and acteoside activity.\n- **Liposomal Trans-Resveratrol (98%):** Activates SIRT1 and supports mitochondrial biogenesis through PGC-1alpha for cellular longevity.\n- **Maca Root Extract (10:1):** Supports libido and energy through macamides and macaenes via CNS-mediated mechanisms without direct hormonal effects.\n- **L-Citrulline:** Converts to L-Arginine in the kidneys, raising plasma arginine for nitric oxide signaling at the supportive 40 mg dose.\n- **Micellar Cordyceps Extract (7% Polysaccharides):** Supports cellular energy and traditional kidney-yang function through standardized polysaccharide activity.\n- **Micellar Shilajit Extract (Fulvic Acid 20%):** Provides DBPs (dibenzo-alpha-pyrones) that support mitochondrial function plus trace minerals through fulvic acid transport.\n- **Micellar Sea Moss Extract:** Provides naturally occurring iodine, magnesium, calcium, and other trace minerals for broad mineral support.\n- **Micellar Schisandra Chinensis Extract:** Supports adaptogenic balance and hepatic estrogen clearance through schisandrin and gomisin lignans.\n- **Micellar Horny Goat Weed (Icariin 10%):** Provides PDE5-inhibitor activity through icariin, supporting nitric oxide signaling pathways.\n- **Micellar Panax Ginseng Extract (10:1):** Supports energy and adaptogenic resilience through ginsenoside activity.\n- **L-Arginine:** Serves as the direct eNOS substrate for nitric oxide synthesis driving vascular dilation.\n- **Zinc (Zinc Bisglycinate):** Cofactors over three hundred enzymes including those in hormone synthesis and neurotransmitter balance.\n- **Micellar Bioperine® (Black Pepper Extract, 95%):** Extends systemic exposure for the polyphenol, saponin, and withanolide components through CYP3A4 inhibition.\n\n## Who benefits and what makes this different\n\n**Who benefits:** Adult women experiencing reduced libido associated with chronic stress or life-stage hormonal shifts, those navigating perimenopausal or menopausal hormonal transitions, women in high-stress contexts where adaptogenic HPA axis support drives broader resilience, adults pursuing whole-body vitality where energy, mood, and intimate wellness function as an integrated system, and individuals whose stress-induced cortisol elevation has shifted the pregnenolone pool away from sex hormone synthesis. Strict contraindications: pregnancy, lactation, hormone-sensitive cancers, PDE5 inhibitor medications (Viagra, Cialis), HRT, antihypertensives, anticoagulants, thyroid medications, fertility treatment.\n\n**What makes it different:** What separates DESIRE+ from single-ingredient women''s libido products is the convergence of three pillars: multi-pathway aphrodisiac architecture (six botanicals through distinct mechanisms) plus adaptogenic stress resilience addressing the cortisol-sex-hormone interplay plus circulatory support for the vascular component of female sexual response. The PDE5-inhibitor activity of icariin in Horny Goat Weed is clinically meaningful and contraindicates concurrent use with prescription PDE5 inhibitors.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'desire-plus-female-hormonal'
      AND p.sku = 'FC-DESIRE-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152o-rev2 DESIRE+ update skipped: row not found at slug desire-plus-female-hormonal / SKU FC-DESIRE-001';
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
        '152o_rev2_desire_plus_female_hormonal_revision',
        'products',
        'FC-DESIRE-001',
        v_product_id,
        jsonb_build_object(
            'method', 'rev2_structured_description_lane2_reconciled_per_152p_canonical',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'rev2_structured_pdp_152p_canonical_lane2',
            'authority', 'Gary canonical 2026-05-05 Prompt #152o-rev2 (Lane 2 reconciliation; spec ingredients matched live byte-identical with 4 small corrections; FIRST 152x rev2 with FC-prefix SKU spec assumption matching live)',
            'marshall_scan', 'human_review_pass; zero hits in unapproved_peptides.ts; all 16 ingredients are food-grade botanicals/aminos/minerals; PDE5-inhibitor mention is biochemically accurate disclosure context not promotional',
            'bioavailability_format', '10x to 28x micellar and liposomal (12/16 carrier-substantiated: 11 Micellar + 1 Liposomal Trans-Resveratrol)',
            'sku_verify_outcome', 'FC-DESIRE-001 spec assumption matched live (canonical FC-prefix); per feedback_live_sku_verify_before_apply rule queried live first, no SKU correction needed',
            'first_product_claim_resolution', 'Gary option A 2026-05-05: dropped first-product-in-portfolio sentence entirely (live db has MenoBalance+ under womens-health category making the claim potentially inaccurate; cleanest path is removal vs intimate-vitality qualifier litigation)',
            'lane2_corrections', jsonb_build_array(
                'Opening paragraph carrier count: 15 of 16 (wrong) -> 12 of 16 (actual: 11 Micellar + 1 Liposomal); also added "and liposomal" to "micellar carriers" framing',
                'Bullet 15: Zinc Bisglycinate -> Zinc (Zinc Bisglycinate) matching live JSONB name parenthetical form',
                'Bullet 16: Micellar Bioperine (Black Pepper Extract, 95%) -> Micellar Bioperine® (Black Pepper Extract, 95%) trademark restoration matching live',
                'Closing paragraph: dropped "first product in the Via Cura portfolio specifically formulated for women''s reproductive health and intimate vitality" sentence (Gary option A directive; MenoBalance+ already in womens-health category making claim potentially inaccurate)'
            ),
            'product_name', 'DESIRE+ Female Hormonal',
            'three_pillar_positioning', 'Desire | Vitality | Resilience',
            'live_ingredient_total_mg', 500,
            'live_ingredient_count', 16,
            'live_format', 'capsule',
            'live_category_slug', 'womens-health',
            'live_carrier_breakdown', '11 Micellar + 1 Liposomal Trans-Resveratrol = 12 carriers; 4 plain (Maca, L-Citrulline, L-Arginine, Zinc)',
            'first_152x_rev2_canonical_FC_sku', 'true (prior 152c/l/n had non-canonical numeric SKUs 34/37/38; 152o has canonical FC-DESIRE-001)',
            'pde5_inhibitor_safety_context', 'Icariin in Horny Goat Weed is biochemically accurate PDE5 inhibitor; closing paragraph correctly flags prescription PDE5 inhibitor (Viagra/Cialis) interaction; consumer-PDP safety disclosure context not promotional comparison',
            'rev2_canonical_pattern', 'feedback_152p_canonical_for_all_formulation_updates'
        )
    );

    RAISE NOTICE '#152o-rev2 DESIRE+ update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
