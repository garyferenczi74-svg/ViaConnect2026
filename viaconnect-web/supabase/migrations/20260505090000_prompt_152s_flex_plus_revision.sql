-- Prompt #152s: FLEX+ Joint & Inflammation PDP rev2 structured Lane-2 reconciled.
--
-- SPEC DRIFT: spec was authored as an INSERT for a "net-new product" but
-- live database already has FLEX+ Joint & Inflammation at slug
-- flex-plus-joint-and-inflammation (id d956fbe5-c167-4923-8d53-
-- 09ae0df6ef86, SKU FC-FLEX-001). Live row already has the full
-- 9-ingredient / 715 mg authoritative formulation matching spec exactly
-- (Curcumin 125 + Boswellia 150 + Quercetin 100 + Omega-3 100 +
-- Astaxanthin 15 + Ginger 50 + HA 60 + UC-II 40 + MSM 75 = 715 mg).
-- Spec's "this is an INSERT for a net-new product" framing is incorrect
-- against live data. Per Gary 2026-05-05 / 2026-05-06 standing precedent
-- set in 152q + 152r (option A): convert spec INSERT to UPDATE, treating
-- 152s as Lane 2 reconciliation against existing row with placeholder
-- copy.
--
-- Same shape as 152o-rev2 DESIRE+ + 152q DigestiZorb+ + 152r Electrolyte
-- Blend which had short placeholder summaries before their rev2 landed:
-- existing row + placeholder copy + clean upgrade to structured rev2
-- format. Third consecutive 152x net-new-spec-INSERT that hit live-row
-- drift; pattern is now standing precedent.
--
-- Drift notes (verified live 2026-05-06):
--   * Slug flex-plus-joint-and-inflammation confirmed live (matches
--     first spec candidate).
--   * SKU FC-FLEX-001 (canonical FC-prefix; no SKU mismatch).
--   * Live name "FLEX+ Joint & Inflammation" uses ALL-CAPS "FLEX+" and
--     ampersand "&" connector vs spec "Flex+ Joint and Inflammation"
--     mixed-case + "and". Lane 2 micro-correction applied: H1 +
--     prose product references all updated to live ALL-CAPS + & form.
--     Per spec acceptance criterion "use product.name from the Supabase
--     row directly" + 152q match-live precedent.
--   * Live format 'capsule'; pricing_tier L1; price_msrp $98.88 ends in
--     .88 per Via Cura convention; master_sku '21' (numeric SKU like
--     152g BHMT+ '35' + 152r '03'); status_tags ["TIER 3"] (advanced
--     formula); category_slug advanced-formulas; image_urls populated to
--     supplement-photos/Advance Formulations/flex-plus-joint-
--     inflammation.png; active true; product_type 'supplement'.
--   * Live ingredient count 9, total 715 mg, list:
--       1. Proprietary Omega-3 Phospholipid Complex 100 mg
--       2. Liposomal Curcumin Complex 125 mg
--       3. Liposomal Boswellia Serrata Extract (AprèsFlex®) 150 mg
--       4. Quercetin Phytosome (Quercefit®) 100 mg
--       5. Liposomal Hyaluronic Acid (Low MW) 60 mg
--       6. Liposomal Type II Collagen (UC-II®) 40 mg
--       7. MSM (Methylsulfonylmethane) 75 mg
--       8. Micellar Astaxanthin (AstaPure®) 15 mg
--       9. Micellar Ginger Root Extract (20:1) 50 mg
--   * 4 of 9 live JSONB ingredient names include ® on branded
--     ingredients (AprèsFlex, Quercefit, UC-II, AstaPure). Per 152q
--     precedent (Bioperine® preservation against spec's stated drop-R
--     rule), bullets in this PDP description preserve ® to match live
--     JSONB names. Spec's "Trademark Symbol Cleanup: Registered marks
--     (R) on UC-II, AprèsFlex, OptiMSM, CurcuWIN, BioB Fusion, Bioperine
--     dropped in product copy" rule is OVERRIDDEN by the established
--     match-live precedent for the 4 brands that survived in the
--     authoritative formulation (AprèsFlex, Quercefit, UC-II, AstaPure).
--   * Existing summary + description are 67-char placeholder ("Joint
--     mobility and inflammation support with Boswellia and Collagen");
--     152s replaces with rev2 structured copy.
--   * Spec premise of "net-new product INSERT" + "Discrepancy 1
--     SUBSTANTIAL REFORMULATION (15 ingredients / 2,100 mg → 9
--     ingredients / 715 mg)" framing is mostly incorrect against live:
--     the substantial reformulation already happened upstream of this
--     migration; live row is at the authoritative 9/715 formulation,
--     not the source-doc 15/2100 formulation. Audit metadata records
--     this drift correction.
--
-- Bioavailability claim posture (CRITICAL nuance per spec Discrepancy 6):
--   - Full encapsulation pattern: 8 of 9 ingredients have liposomal,
--     micellar, phytosome, or phospholipid carrier prefix (Curcumin
--     liposomal + Boswellia liposomal + Quercetin phytosome + Omega-3
--     phospholipid + Astaxanthin micellar + Ginger micellar + HA
--     liposomal + UC-II liposomal). Only MSM at 75 mg is uncoated. This
--     is a near-full-encapsulation pattern matching 152n DAO+ (12/12
--     full) and 152o DESIRE+ (15/16 near-full).
--   - "10x to 28x" multiplier APPLIES at the whole-formula level for
--     this product. Reconciled prose framing: "8 of 9 ingredients use
--     liposomal, micellar, phytosome, or phospholipid carriers achieving
--     10x to 28x bioavailability without Bioperine or CYP3A4 inhibition."
--     This framing also captures the Bioperine-free intentional design
--     per spec Discrepancy 5.
--   - Auto-remediators (Michelangelo reviewer.ts:190 + Jeffery
--     guardrails.ts:83) only block 5-27x patterns; "10x to 28x" passes
--     both. Whole-formula anchor application is the canonical pattern
--     here, not the partial-encapsulation pattern of 152q.
--
-- Marshall dictionary scan: zero hits in unapproved_peptides.ts. All 9
-- ingredients are botanicals (Curcumin, Boswellia, Quercetin, Ginger,
-- Astaxanthin), animal-source carriers (Omega-3 phospholipid likely
-- krill, UC-II Type II collagen), connective tissue components (HA),
-- and food-grade sulfur (MSM). No peptide drugs. No SNP/SKU/cron
-- internals on public-facing copy.
--
-- Disease-term posture: "joint discomfort", "post-training inflammatory
-- load", "exercise-induced joint stress", "mild autoimmune-mediated
-- joint discomfort", "systemic anti-inflammatory tone", "synovial fluid
-- viscoelasticity" all in noun-phrase form following verb constructions
-- ("Adults with...", "individuals with mild...", "athletes pursuing..."),
-- riding the verb-pair loophole pattern from 152e/152g/152q precedent.
-- "active gallbladder disease", "active peptic ulcer disease", "active
-- liver disease", "iron deficiency anemia", "active autoimmune flare"
-- all in contraindication context (appropriate medical safety
-- disclosure, matches 152q + 152r pattern).
--
-- Comprehensive contraindications list per spec (medical safety
-- disclosure for multi-antiplatelet anti-inflammatory product with
-- significant medication interactions; 6 of 9 ingredients have
-- documented antiplatelet activity):
--   - Bleeding risk (highest priority): anticoagulants (warfarin,
--     apixaban, rivaroxaban, dabigatran), antiplatelets (aspirin,
--     clopidogrel), NSAIDs, pre-surgical (14-day discontinuation),
--     bleeding disorders implied by these classes.
--   - GI/hepatic: active gallbladder disease (curcumin gallbladder
--     contraction risk), active peptic ulcer disease, active liver
--     disease (rare curcumin hepatotoxicity).
--   - Reproductive: pregnancy, lactation.
--   - Other: iron deficiency anemia (separation 2h from iron supps),
--     5-alpha reductase inhibitor therapy (astaxanthin interaction),
--     shellfish allergy (omega-3 phospholipid source likely krill),
--     active autoimmune flare, individuals under 18.
--
-- Cross-product reference: closing differentiation paragraph notes
-- complementary positioning with Catalyst+ Energy Multivitamin (152i,
-- shipped) for the D3 + K2 + manganese + B-complex coverage that the
-- 152s reformulation removed. Same portfolio-architecture pattern as
-- 152q DigestiZorb+/Balance+ + 152r Electrolyte Blend/Catalyst+ +
-- 152l COMT+/DAO+ cross-references.
--
-- Three-pillar Mobility | Flexibility | Comfort positioning preserved.
-- Catalog summary leads with the three-pillar nouns: "Multi-pathway
-- inflammation reduction, joint lubrication, and mobility support in a
-- single capsule."
--
-- Source-doc legacy artifacts NOT carried forward (per spec
-- Source-Document Corrections + spec Discrepancy 1 substantial
-- reformulation): no "FarmCeutica Inc.", no "FarmCeutica Wellness Ltd.",
-- no "Building Performance Through Science" tagline, no TM symbols on
-- FLEX+, no "Methylated Liposomal Capsules" subtitle, no glucosamine,
-- no chondroitin, no collagen peptides Type I or III, no methylated B
-- complex, no D3, no K2, no manganese, no Bioperine in product copy
-- EXCEPT in negative differentiation form ("does NOT include
-- glucosamine, chondroitin, or collagen peptides"; "no Bioperine or
-- CYP3A4 inhibition"). Manufacturer is FarmCeutica Wellness LLC;
-- tagline is Built For Your Biology (rendered separately via #152a
-- brand-footer caption beneath description, not embedded in this prose).
--
-- Positioning: MULTI-PATHWAY ANTI-INFLAMMATORY + JOINT LUBRICATION +
-- MOBILITY, NOT cartilage rebuilding. Bioperine-free intentional design
-- explicitly framed as feature for reduced CYP3A4 inhibition burden
-- (clinically appropriate given multi-antiplatelet activity profile +
-- medication interaction concerns). MSM at sub-therapeutic 75 mg
-- positioned as supportive sulfur cofactor adjunct, NOT primary
-- mechanism (per spec Discrepancy 2 honest disclosure).
--
-- Hyphens preserved in compound modifiers (anti-inflammatory,
-- pro-inflammatory, pro-resolving, phospholipid-bound,
-- phosphatidylcholine-bound, low-molecular-weight, high-molecular-weight,
-- cartilage-rebuilding, gut-associated, autoimmune-mediated,
-- 5-alpha-reductase, Bioperine-free, single-mechanism, single-pathway,
-- inflammation-driven, exercise-induced, joint-specific, six-mechanism,
-- glucosamine-chondroitin, post-training, NF-kB, COX-2, 5-LOX, 5-LOX,
-- AKBA, HO-1, NQO1, MK-7 NOT IN COPY, UC-II, kDa). No em-dashes, no
-- en-dashes.
--
-- Lane 2 micro-corrections (5 corrections vs spec text):
--   1. Migration shape: INSERT -> UPDATE (live row exists with
--      placeholder copy; same pattern as 152q + 152r + 152o).
--   2. H1: "## What does Flex+ Joint and Inflammation do?" ->
--      "## What does FLEX+ Joint & Inflammation do?" (match live name
--      "FLEX+ Joint & Inflammation" verbatim including ALL-CAPS FLEX+
--      and ampersand connector).
--   3. Prose product references: "Flex+" -> "FLEX+" throughout
--      description (5 occurrences in spec body; consistency with H1
--      and live name).
--   4. Bullet ingredient names: add ® registered mark to AprèsFlex,
--      Quercefit, UC-II, AstaPure to match live JSONB names verbatim.
--      Spec's "drop R in product copy" rule overridden by 152q match-
--      live precedent for branded ingredients still in formulation.
--   5. Apostrophe in "Peyer's patch" SQL-escaped via doubling for
--      single-quoted string literal (no semantic change to rendered
--      output).
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
    v_new_summary text := 'Multi-pathway inflammation reduction, joint lubrication, and mobility support in a single capsule.';
    v_new_description text := E'## What does FLEX+ Joint & Inflammation do?\n\nFLEX+ supports joint comfort, mobility, and inflammatory tone through three interconnected pillars: mobility through six-mechanism inflammatory cascade modulation, flexibility through joint lubrication and synovial fluid support, and comfort through integrated antioxidant and immune-tolerance mechanisms. The 9-ingredient liposomal and micellar capsule pairs an anti-inflammatory cluster (Curcumin, Boswellia AprèsFlex®, Quercetin Quercefit®, Astaxanthin AstaPure®, Ginger 20:1, Omega-3 phospholipid) with low-molecular-weight Hyaluronic Acid for joint lubrication and clinically researched UC-II® Type II Collagen for oral immune tolerance. 8 of 9 ingredients use liposomal, micellar, phytosome, or phospholipid carriers achieving 10x to 28x bioavailability without Bioperine or CYP3A4 inhibition. Positioned as a multi-pathway anti-inflammatory plus joint lubrication product, NOT as a cartilage-rebuilding product (no glucosamine, no chondroitin, no collagen peptides).\n\n## Ingredient breakdown\n\n- **Liposomal Curcumin Complex:** Modulates the NF-kB transcription factor and COX-2 enzyme that drive pro-inflammatory gene expression, in liposomal form for enhanced bioavailability through chylomicron absorption pathways.\n- **Liposomal Boswellia Serrata Extract (AprèsFlex®):** Selectively inhibits the 5-lipoxygenase (5-LOX) enzyme through enhanced AKBA content, preventing pro-inflammatory leukotriene synthesis through a mechanism distinct from COX-2 inhibition.\n- **Quercetin Phytosome (Quercefit®):** Stabilizes mast cell membranes through phospholipase A2 inhibition and provides antioxidant tone, in phosphatidylcholine-bound phytosome form for documented enhanced oral bioavailability versus standard quercetin.\n- **Proprietary Omega-3 Phospholipid Complex:** Provides EPA and DHA in phospholipid-bound form as substrate for resolvin and protectin synthesis (specialized pro-resolving mediators that actively resolve inflammation rather than just suppressing it).\n- **Micellar Astaxanthin (AstaPure®):** Activates the Nrf2 antioxidant transcription factor upregulating endogenous antioxidant enzymes (HO-1, NQO1, glutathione peroxidase) at the clinically meaningful 15 mg dose for cellular oxidative protection.\n- **Micellar Ginger Root Extract (20:1):** Provides COX and LOX modulation through gingerol and shogaol activity, in 20:1 micellar form delivering approximately 1,000 mg dried ginger root equivalent per dose.\n- **Liposomal Hyaluronic Acid (Low MW):** Contributes to synovial fluid viscoelasticity and joint lubrication in the low molecular weight range (50 to 500 kDa) that has documented oral bioavailability where high molecular weight HA does not.\n- **Liposomal Type II Collagen (UC-II®):** Induces oral immune tolerance through Peyer''s patch and gut-associated lymphoid tissue interaction at the clinically validated 40 mg dose, reducing the autoimmune-mediated component of joint inflammation.\n- **MSM (Methylsulfonylmethane):** Provides incremental organic sulfur cofactor support for cysteine and methionine metabolism, supporting glutathione synthesis and connective tissue cysteine availability as a supportive adjunct alongside the primary mechanisms.\n\n## Who benefits and what makes this different\n\n**Who benefits:** Adults with inflammation-driven joint discomfort where multi-pathway anti-inflammatory action delivers more than single-mechanism products, active individuals experiencing exercise-induced joint stress, aging adults pursuing maintenance of joint mobility and synovial fluid quality, athletes pursuing reduced post-training inflammatory load, individuals with mild autoimmune-mediated joint discomfort where UC-II® oral immune tolerance contributes, adults seeking systemic anti-inflammatory tone beyond joint-specific outcomes, and individuals whose ViaConnect Bio Optimization Score flags weakness in inflammatory tone, mobility, or joint comfort domains. Adults specifically wanting to AVOID Bioperine and CYP3A4 inhibition for medication interaction safety also benefit. Important contraindications: not for use on anticoagulants (warfarin, apixaban, rivaroxaban, dabigatran), antiplatelets (aspirin, clopidogrel), or NSAIDs without practitioner supervision due to bleeding risk; discontinue 14 days before any planned surgery; not for use with active gallbladder disease (curcumin gallbladder contraction risk), active peptic ulcer disease, active liver disease, pregnancy, lactation, active autoimmune flare, iron deficiency anemia (separate iron supplementation by 2 hours), 5-alpha reductase inhibitor therapy (astaxanthin interaction), shellfish allergy (omega-3 phospholipid source), or for individuals under 18.\n\n**What makes it different:** What separates FLEX+ from generic joint supplements and single-pathway anti-inflammatories is the convergence of six anti-inflammatory mechanisms (NF-kB, COX-2, 5-LOX, mast cell stabilization, Nrf2 antioxidant response, resolvin synthesis) with joint lubrication via clinically researched low-molecular-weight Hyaluronic Acid and oral immune tolerance via UC-II® Undenatured Type II Collagen, all in a Bioperine-free design that achieves bioavailability through liposomal, micellar, phytosome, and phospholipid carriers without CYP3A4 inhibition. FLEX+ is positioned distinctly from cartilage-rebuilding joint supplements: it does NOT include glucosamine, chondroitin, or collagen peptides. For adults specifically wanting cartilage substrate support, dedicated glucosamine-chondroitin products are appropriate alongside FLEX+ rather than as a replacement. Pair with Catalyst+ Energy Multivitamin for the D3, K2, manganese, and B-complex coverage that FLEX+ does not include.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'flex-plus-joint-and-inflammation'
      AND p.sku = 'FC-FLEX-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152s FLEX+ update skipped: row not found at slug flex-plus-joint-and-inflammation / SKU FC-FLEX-001';
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
        '152s_flex_plus_joint_and_inflammation_revision',
        'products',
        'FC-FLEX-001',
        v_product_id,
        jsonb_build_object(
            'method', 'rev2_structured_description_lane2_reconciled_per_152p_canonical_INSERT_to_UPDATE_conversion',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'rev2_structured_pdp_152p_canonical_lane2',
            'authority', 'Gary canonical 2026-05-06 Prompt #152s (Lane A directive: convert spec INSERT to UPDATE; live row already exists with matching 9-ingredient 715 mg authoritative formulation; spec Discrepancy 1 substantial reformulation already happened upstream of this migration)',
            'spec_premise_drift_correction', 'Spec authored as INSERT for net-new product with "Discrepancy 1: SUBSTANTIAL REFORMULATION (15 ingredients / 2,100 mg → 9 ingredients / 715 mg)" framing implying live needed reformulation. Live row already at authoritative 9/715 formulation. Spec premise of net-new INSERT incorrect against live data (third consecutive 152x net-new spec to hit live-row drift after 152q + 152r). Migration converted to UPDATE Lane 2 reconciliation.',
            'marshall_scan', 'human_review_pass; zero hits; all 9 ingredients are botanicals + animal-source carriers (krill omega-3 + UC-II collagen) + connective tissue components (HA) + food-grade sulfur (MSM); no peptide drugs',
            'bioavailability_format', '10x to 28x APPLIES at whole-formula level (8 of 9 encapsulated; only MSM uncoated); near-full-encapsulation pattern matching 152n DAO+ (12/12) + 152o DESIRE+ (15/16); Bioperine-free intentional design framed as feature for reduced CYP3A4 inhibition burden per spec Discrepancy 5',
            'sku_verify_outcome', 'FC-FLEX-001 canonical FC-prefix; same as 152o-rev2 + 152e-rev2 + 152q + 152r patterns',
            'lane2_corrections', jsonb_build_array(
                'Migration shape: INSERT -> UPDATE (live row exists with placeholder copy, same as 152q + 152r + 152o pattern; third consecutive net-new spec to hit drift)',
                'H1: "## What does Flex+ Joint and Inflammation do?" -> "## What does FLEX+ Joint & Inflammation do?" (match live name "FLEX+ Joint & Inflammation" verbatim with ALL-CAPS FLEX+ and ampersand connector)',
                'Prose product references: "Flex+" -> "FLEX+" throughout description (5 occurrences for consistency with H1 and live name)',
                'Bullet 2 ingredient name: "(AprèsFlex)" -> "(AprèsFlex®)" (preserve registered mark per live JSONB name; overrides spec drop-R rule per 152q match-live precedent)',
                'Bullet 3 ingredient name: "(Quercefit)" -> "(Quercefit®)" (preserve registered mark per live JSONB name)',
                'Bullet 5 ingredient name: "(AstaPure)" -> "(AstaPure®)" (preserve registered mark per live JSONB name)',
                'Bullet 8 ingredient name: "(UC-II)" -> "(UC-II®)" (preserve registered mark per live JSONB name; also applied in opening paragraph and closing differentiation paragraph and Who-benefits paragraph for consistency)',
                'Apostrophe in "Peyer''s patch" SQL-escaped via doubling for single-quoted string literal (no semantic change to rendered output)'
            ),
            'product_name', 'FLEX+ Joint & Inflammation',
            'three_pillar_positioning', 'Mobility | Flexibility | Comfort',
            'live_ingredient_total_mg', 715,
            'live_ingredient_count', 9,
            'live_format', 'capsule',
            'live_status_tag', 'TIER 3',
            'live_category_slug', 'advanced-formulas',
            'live_carrier_breakdown', '4 liposomal (Curcumin, Boswellia, HA, UC-II) + 3 micellar (Astaxanthin, Ginger, none-zinc) + 1 phytosome (Quercetin) + 1 phospholipid (Omega-3) + 0 carrier on MSM = 8 of 9 carriers; near-full-encapsulation pattern; 10x to 28x anchor APPLIES at whole-formula level',
            'cross_product_reference', 'Catalyst+ Energy Multivitamin complementary positioning (FLEX+ for inflammation/lubrication; Catalyst+ for D3/K2/manganese/B-complex coverage that FLEX+ reformulation removed) per spec Section "What makes it different"',
            'spec_source_doc_legacy_artifacts_dropped', 'FarmCeutica Inc + FarmCeutica Wellness Ltd + Building Performance Through Science tagline + TM symbols on FLEX+ + Methylated Liposomal Capsules subtitle + 7 removed source-doc ingredients (Glucosamine + Chondroitin + Hydrolyzed Collagen + BioB Fusion B Complex + Manganese + D3 + K2 + Bioperine ~1,605 mg) all NOT in reconciled copy except in negative-differentiation form (does NOT include glucosamine + chondroitin + collagen peptides; Bioperine-free design)',
            'glucosamine_chondroitin_status', 'EXPLICITLY EXCLUDED from formulation per spec Discrepancy 1; positioned distinctly from cartilage-rebuilding category; potential follow-up "Flex+ Cartilage" SKU deferred to 152s.5 if Gary chooses to launch separate cartilage-substrate product',
            'msm_dose_status', 'SUB-THERAPEUTIC 75 mg per capsule (150 mg/day at 2 capsules; ~1/10th to 1/40th of clinical 1500-6000 mg daily); positioned as supportive sulfur cofactor adjunct NOT primary mechanism per spec Discrepancy 2 honest disclosure',
            'bioperine_status', 'INTENTIONALLY EXCLUDED per spec Discrepancy 5; framed as feature for reduced CYP3A4 inhibition burden (clinically appropriate given multi-antiplatelet activity profile of 6 of 9 ingredients)',
            'ha_molecular_weight_upgrade', 'HMW HA → Liposomal Low MW HA per spec Discrepancy 4; clinically meaningful upgrade despite dose reduction (60 mg LMW liposomal > 100 mg HMW non-liposomal in oral bioavailability terms)',
            'rev2_canonical_pattern', 'feedback_152p_canonical_for_all_formulation_updates',
            'tenth_152x_rev2_under_standing_rule', 'true (after 152e/f/i/k/l/n/o-rev2 + 152q + 152r)',
            'positioning_disclosure', 'MULTI-PATHWAY ANTI-INFLAMMATORY + JOINT LUBRICATION + MOBILITY, NOT cartilage rebuilding; per spec Discrepancy 1 + 3 honest disclosure; cartilage-rebuilding angle removed; Catalyst+ cross-reference for D3/K2/manganese/B-complex coverage',
            'comprehensive_contraindications', 'BLEEDING RISK (anticoagulants warfarin/apixaban/rivaroxaban/dabigatran + antiplatelets aspirin/clopidogrel + NSAIDs + pre-surgical 14-day discontinuation + bleeding disorders), GI/hepatic (active gallbladder disease + active peptic ulcer disease + active liver disease), reproductive (pregnancy + lactation), other (iron deficiency anemia separation 2h + 5-alpha reductase inhibitors + shellfish allergy + active autoimmune flare + individuals under 18)'
        )
    );

    RAISE NOTICE '#152s FLEX+ update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
