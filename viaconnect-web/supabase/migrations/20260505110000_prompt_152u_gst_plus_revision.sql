-- Prompt #152u: GST+ Cellular Detox PDP rev2 structured Lane-2 reconciled.
--
-- SPEC DRIFT: spec authored as INSERT for "net-new product" but live
-- database already has GST+ Cellular Detox at slug gst-plus-cellular-
-- detox (id 78932d11-9764-4ad4-aa09-5d4b1948e4b5, SKU FC-GST-001). Live
-- row has the full 12-ingredient / 757.0 mg authoritative formulation
-- matching spec exactly (PERFECT MATCH per spec FORMULATION
-- RECONCILIATION section). Spec INSERT premise incorrect against live.
-- Per Gary 2026-05-06 standing precedent set in 152q + 152r + 152s +
-- 152t (option A): convert spec INSERT to UPDATE. Fifth consecutive
-- 152x net-new spec to hit live-row drift; pattern is now firmly
-- standing precedent.
--
-- Drift notes (verified live 2026-05-06):
--   * Slug gst-plus-cellular-detox confirmed live (matches first spec
--     candidate).
--   * SKU FC-GST-001 (canonical FC-prefix; no SKU mismatch).
--   * Live name "GST+ Cellular Detox" matches spec H1 verbatim; no
--     Lane 2 H1 capitalization correction required.
--   * Live format 'capsule'; pricing_tier L1; price_msrp $118.88 ends
--     in .88 per Via Cura convention; master_sku '39'; status_tags []
--     (TIER not yet assigned); category_slug 'methylation-snp';
--     image_urls populated to supplement-photos/Methylation SNP
--     Support/gst-plus-cellular-detox.png; active true; product_type
--     'supplement'.
--   * Live ingredient count 12, total 757.0 mg per serving:
--       1. Liposomal Glutathione (Reduced) 150 mg
--       2. Liposomal N-Acetylcysteine (NAC) 100 mg
--       3. Liposomal Alpha-Lipoic Acid (R-ALA) 100 mg
--       4. Selenium (L-Selenomethionine) 0.2 mg
--       5. Methylated Vitamin B2 (Riboflavin-5-Phosphate) 25 mg
--       6. Liposomal Vitamin B6 (Pyridoxal-5-Phosphate) 25 mg
--       7. Liposomal Methyl Folate (5-MTHF) 0.8 mg
--       8. Liposomal Vitamin B12 (Methylcobalamin + Hydroxocobalamin) 1 mg
--       9. Liposomal Broccoli Seed Extract (Sulforaphane-rich) 150 mg
--      10. Liposomal Curcumin (95% Curcuminoids) 100 mg
--      11. Liposomal Quercetin 100 mg
--      12. Micellar Bioperine® (Black Pepper Extract) 5 mg
--   * Live JSONB B12 bullet uses literal "+" connector between two B12
--     forms (Methylcobalamin + Hydroxocobalamin) vs spec "and";
--     bullet header matches live verbatim per match-live precedent.
--   * Live JSONB has ® on Bioperine; preserved in bullet 12 header
--     and on first inline prose mention per 152q match-live precedent
--     overriding spec drop-R rule.
--   * Existing summary + description are 83-char placeholder
--     ("Glutathione S-transferase support with Liposomal Glutathione,
--     NAC, and Sulforaphane"); 152u replaces with rev2 structured copy.
--
-- Bioavailability claim posture (per spec Standing Rules + 152n/o/s
-- precedent for whole-formula encapsulation):
--   - Near-full encapsulation pattern: 11 of 12 ingredients in advanced
--     carrier forms (9 liposomal + 1 micellar Bioperine + 1 active
--     phosphorylated B2 form Riboflavin-5-Phosphate). Only Selenium
--     (L-Selenomethionine) is uncoated, but L-Selenomethionine is
--     itself a high-bioavailability food-source selenium form using
--     methionine transporter absorption.
--   - "10x to 28x" multiplier APPLIES at whole-formula level. Same
--     near-full-encapsulation pattern as 152n DAO+ (12/12 full),
--     152o DESIRE+ (15/16 near-full), 152s FLEX+ (8/9 near-full).
--   - Auto-remediators (Michelangelo reviewer.ts:190 + Jeffery
--     guardrails.ts:83) only block 5-27x patterns; "10x to 28x" passes
--     both. Whole-formula anchor application is the canonical pattern
--     here, not partial-encapsulation pattern of 152q + 152t.
--   - Reconciled prose framing: "11 of 12 ingredients use liposomal,
--     micellar, or active phosphorylated forms achieving 10x to 28x
--     bioavailability versus standard formulations."
--
-- Marshall dictionary scan: zero hits in unapproved_peptides.ts. All 12
-- ingredients are: glutathione network amino acids/peptides
-- (Glutathione tripeptide, NAC), antioxidant cofactors (R-ALA, Selenium,
-- Quercetin), methylated B-cofactors (R5P B2, P5P B6, 5-MTHF folate,
-- methyl/hydroxocobalamin B12), Nrf2-inducing botanicals (Sulforaphane,
-- Curcumin), and bioavailability enhancer (Bioperine). Glutathione is a
-- naturally-occurring tripeptide (Glu-Cys-Gly), NOT a peptide drug; not
-- on Marshall list. NAC is a digestive amino acid derivative, not a
-- peptide drug. No SNP/SKU/cron internals on public-facing copy.
--
-- Disease-term posture: "elevated environmental toxin exposure",
-- "elevated oxidative stress markers", "GST or methylation
-- polymorphisms", "GSTM1 null + GSTT1 null + GSTP1 polymorphisms",
-- "MTHFR polymorphisms", "exercise-induced oxidative stress" all in
-- noun-phrase form following verb constructions ("Adults with...",
-- "individuals with...", "athletes with..."), riding the verb-pair
-- loophole pattern from 152e/152g/152q/152s/152t established precedent.
-- "active heavy metal toxicity, chronic Lyme disease, mold biotoxin
-- illness, active gallbladder disease, active peptic ulcer disease,
-- active liver disease, active autoimmune flare, active chemotherapy,
-- bipolar disorder with mania history" all in CONTRAINDICATION /
-- PRACTITIONER-COORDINATION context (appropriate medical safety
-- disclosure for glutathione network and Phase II detox product).
--
-- Comprehensive contraindications list per spec body (medical safety
-- disclosure for glutathione network + Phase II detox product with
-- multiple antiplatelet ingredients + Bioperine CYP3A4 inhibition +
-- selenium UL approach):
--   - Sulfur sensitivity: high-dose sulfur substrates (Glutathione +
--     NAC + ALA combined ~350 mg) may worsen H2S production in CBS
--     upregulation polymorphism carriers.
--   - Heavy metal mobilization: ALA chelation activity can mobilize
--     metals without proper binders; not for active heavy metal
--     toxicity without practitioner-directed binding agent protocol.
--   - Bleeding risk: NAC mild + Curcumin/Quercetin stronger
--     antiplatelet activity; anticoagulants (warfarin, apixaban,
--     rivaroxaban, dabigatran), antiplatelets (aspirin, clopidogrel),
--     NSAIDs, pre-surgical 14-day discontinuation.
--   - GI/hepatic: active gallbladder disease (curcumin gallbladder
--     contraction), active peptic ulcer disease, active liver disease.
--   - Reproductive: pregnancy, lactation.
--   - Other: active autoimmune flare, active chemotherapy without
--     oncologist consultation, bipolar disorder with mania history
--     (rare NAC-induced mania case reports), individuals under 18.
--   - Selenium UL: dose at 2 caps approaches daily Upper Limit;
--     avoid concurrent selenium-containing supplements.
--   - Bioperine CYP3A4 inhibition: review medication list for CYP3A4
--     substrates (statins, calcium channel blockers, immunosuppressants,
--     HIV protease inhibitors, anticonvulsants, antifungals).
--
-- Cross-product reference: closing differentiation paragraph notes
-- practitioner-coordination for active heavy metal toxicity / chronic
-- Lyme disease / mold biotoxin illness; not a chelation therapy
-- positioning preserved per spec (NOT positioned as replacement for
-- functional medicine practitioner detoxification protocols).
--
-- Three-pillar Detox | Defend | Methylate positioning preserved
-- verbatim (already in optimal action-led verb form per spec). Catalog
-- summary leads with the three-pillar nouns: "Cellular detoxification,
-- antioxidant defense, and methylation pathway support in a single
-- capsule."
--
-- Source-doc legacy artifacts NOT carried forward (per spec
-- Source-Document Corrections): no "FarmCeutica Inc.", no "FarmCeutica
-- Wellness Ltd.", no "Building Performance Through Science" tagline,
-- no TM symbols on GST+, no "evidence suggests this multifaceted
-- approach may bolster GST function" hedging, no "It seems likely to
-- benefit most adults" hedging. Manufacturer is FarmCeutica Wellness
-- LLC; tagline is Built For Your Biology (rendered separately via
-- #152a brand-footer caption beneath description, not embedded in this
-- prose).
--
-- Positioning: GLUTATHIONE NETWORK + Nrf2 PATHWAY + METHYLATION
-- COFACTOR MATRIX SUPPORT, NOT a chelation therapy. Selenium UL
-- awareness explicitly framed in Who-benefits contraindications.
-- Bioperine CYP3A4 inhibition explicitly framed with medication
-- interaction list. MTHFR polymorphism awareness (~50% of population)
-- + 5-MTHF differentiation versus synthetic folic acid framed in
-- What-makes-it-different.
--
-- Hyphens preserved in compound modifiers (anti-inflammatory,
-- pro-inflammatory, blood-brain barrier, three-tier, three-mechanism,
-- single-mechanism, single-pathway, store-replenishment, food-source,
-- electrophilic, gamma-glutamyl, gamma-glutamylcysteine, dihydrolipoic,
-- N-Acetylcysteine, Alpha-Lipoic, R-ALA, R5P, P5P, 5-MTHF, B12, B6,
-- B2, NAC, GST, GSTM1, GSTT1, GSTP1, MTHFR, C677T, A1298C, HO-1,
-- NQO1, GPx, Nrf2, Keap1, NF-kB, CYP3A4, UGT, H2S). No em-dashes, no
-- en-dashes, no parenthetical " - " asides.
--
-- Lane 2 micro-corrections (3 corrections vs spec text):
--   1. Migration shape: INSERT -> UPDATE (live row exists with
--      placeholder copy; same as 152q + 152r + 152s + 152t + 152o
--      pattern; fifth consecutive net-new spec to hit drift).
--   2. Bullet 8 ingredient name: "Liposomal Vitamin B12 (Methylcobalamin
--      and Hydroxocobalamin)" -> "Liposomal Vitamin B12
--      (Methylcobalamin + Hydroxocobalamin)" (match live JSONB literal
--      "+" connector verbatim per match-live precedent; prose body
--      retains natural "and"/"with" connectors for English readability,
--      same as 152s where bullet header used "&" but prose used "plus").
--   3. Bullet 12 ingredient name: "Micellar Bioperine (Black Pepper
--      Extract)" -> "Micellar Bioperine® (Black Pepper Extract)"
--      (preserve registered mark per live JSONB name; overrides spec
--      drop-R rule per 152q match-live precedent for branded
--      ingredients still in formulation). First inline prose mention
--      ("all unified by Bioperine®") also preserves ® per 152s
--      consistency precedent; subsequent prose mention drops ® per
--      common trademark notation convention.
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
    v_new_summary text := 'Cellular detoxification, antioxidant defense, and methylation pathway support in a single capsule.';
    v_new_description text := E'## What does GST+ Cellular Detox do?\n\nGST+ Cellular Detox supports cellular detoxification, oxidative stress management, and methylation pathway function through three interconnected pillars: detox through three-tier glutathione network architecture (Glutathione, NAC, ALA) plus selenium for selenoprotein support, defend through three-mechanism Nrf2 pathway activation (Sulforaphane, Curcumin, Quercetin) producing sustained endogenous antioxidant enzyme upregulation, and methylate through complete methylated B-cofactor matrix (R5P B2, P5P B6, 5-MTHF folate, Methylcobalamin and Hydroxocobalamin B12) supporting one-carbon metabolism and homocysteine clearance. The 12-ingredient liposomal and micellar capsule pairs three glutathione network ingredients (350 mg combined) with three Nrf2 inducers (350 mg combined) plus the methylated B-cofactor matrix plus selenium for selenoprotein activation, all unified by Bioperine® for absorption synergy. 11 of 12 ingredients use liposomal, micellar, or active phosphorylated forms achieving 10x to 28x bioavailability versus standard formulations. Designed for adults with elevated environmental toxin exposure, GST or methylation polymorphisms, oxidative stress markers, or Phase II detoxification support needs.\n\n## Ingredient breakdown\n\n- **Liposomal Glutathione (Reduced):** Provides direct master cellular antioxidant substrate for glutathione-S-transferase (GST) Phase II conjugation reactions, with the liposomal carrier protecting glutathione from intestinal degradation by gamma-glutamyl-transpeptidase that limits uncoated glutathione absorption.\n- **Liposomal N-Acetylcysteine (NAC):** Supplies the rate-limiting cysteine amino acid for endogenous glutathione synthesis through gamma-glutamylcysteine synthetase, with the acetylated form crossing cell membranes where uncoated cysteine cannot.\n- **Liposomal Alpha-Lipoic Acid (R-ALA):** Regenerates oxidized glutathione (GSSG) back to active reduced glutathione (GSH) through dihydrolipoic acid recycling, supporting sustained antioxidant capacity beyond direct substrate provision in the natural R-isomer form.\n- **Selenium (as L-Selenomethionine):** Provides selenium through methionine transporter absorption for incorporation into over twenty-five selenoproteins including glutathione peroxidases (GPx), thioredoxin reductases, and iodothyronine deiodinases, in the most bioavailable food-source selenium form.\n- **Methylated Vitamin B2 (Riboflavin-5-Phosphate):** Provides FAD (flavin adenine dinucleotide) cofactor for the MTHFR enzyme that activates folate to 5-MTHF, partially compensating for reduced MTHFR activity in C677T or A1298C polymorphism carriers.\n- **Liposomal Vitamin B6 (Pyridoxal-5-Phosphate):** Cofactors the cystathionine beta-synthase and cystathionine gamma-lyase enzymes that constitute the transsulfuration pathway converting homocysteine to cysteine for glutathione synthesis, in the active P5P form bypassing pyridoxine conversion.\n- **Liposomal Methyl Folate (5-MTHF):** Delivers active 5-methyltetrahydrofolate that crosses the blood-brain barrier and works directly without MTHFR enzymatic conversion, the form preferred for women with MTHFR polymorphisms over synthetic folic acid.\n- **Liposomal Vitamin B12 (Methylcobalamin + Hydroxocobalamin):** Combines immediate methyl donor activity from methylcobalamin with sustained B12 store-replenishment from hydroxocobalamin, providing nitric oxide and cyanide binding capacity in a sophisticated dual-form B12 architecture.\n- **Liposomal Broccoli Seed Extract (Sulforaphane-rich):** Activates the Nrf2 transcription factor through electrophilic modification of Keap1 cysteine residues, upregulating endogenous antioxidant enzymes (HO-1, NQO1, GST, glutathione peroxidase, superoxide dismutase) as the most potent natural Nrf2 activator known.\n- **Liposomal Curcumin (95% Curcuminoids):** Activates Nrf2 through Keap1 cysteine modification while inhibiting NF-kB inflammatory transcription, providing dual anti-inflammatory and antioxidant pathway modulation through curcuminoid mechanisms.\n- **Liposomal Quercetin:** Activates Nrf2 through flavonoid-specific mechanisms while providing direct ROS scavenging through hydroxyl groups and mast cell stabilization through phospholipase A2 inhibition.\n- **Micellar Bioperine® (Black Pepper Extract):** Inhibits CYP3A4 and UGT enzymes in the gut wall and liver, extending systemic circulation time of liposomal actives for enhanced therapeutic effect through documented bioavailability synergy.\n\n## Who benefits and what makes this different\n\n**Who benefits:** Adults with elevated environmental toxin exposure (urban air pollution, occupational chemical exposure, heavy metal exposure history, mold exposure), individuals with genetic variants affecting GST function (GSTM1 null, GSTT1 null, GSTP1 polymorphisms), adults with MTHFR polymorphisms requiring active 5-MTHF folate, individuals with documented elevated oxidative stress markers, adults pursuing liver Phase II detoxification support, athletes with elevated exercise-induced oxidative stress, and individuals whose ViaConnect Bio Optimization Score flags weakness in detoxification, oxidative stress, or methylation domains. Important contraindications: not for use with sulfur sensitivity or CBS upregulation polymorphisms (high-dose sulfur substrates may worsen H2S production); not for use with active heavy metal toxicity without practitioner-directed binding agent protocol (ALA can mobilize metals without proper binders); not for use on anticoagulants (warfarin, apixaban, rivaroxaban, dabigatran), antiplatelets (aspirin, clopidogrel), or NSAIDs without practitioner supervision (combined antiplatelet activity); discontinue 14 days before any planned surgery; not for use with active gallbladder disease (curcumin gallbladder contraction risk), active peptic ulcer disease, active liver disease, pregnancy, lactation, active autoimmune flare, active chemotherapy without oncologist consultation, bipolar disorder with mania history (rare NAC-induced mania), or for individuals under 18; avoid concurrent selenium-containing supplements (the GST+ selenium dose at 2 capsules approaches the daily Upper Limit); review medication list for CYP3A4 substrates (statins, calcium channel blockers, immunosuppressants, HIV protease inhibitors, anticonvulsants, antifungals) given Bioperine inhibition.\n\n**What makes it different:** What separates GST+ from generic glutathione supplements and single-pathway antioxidants is the convergence of three-tier glutathione network architecture (immediate substrate via Glutathione, sustained synthesis substrate via NAC, regenerative cycling via ALA) with three-mechanism Nrf2 pathway activation (Sulforaphane, Curcumin, Quercetin) plus complete methylated B-cofactor matrix (R5P B2, P5P B6, 5-MTHF folate, Methylcobalamin and Hydroxocobalamin B12) plus selenium for selenoprotein activation. Sulforaphane in liposomal form is the most potent natural Nrf2 activator known. The methylated B-cofactor forms matter substantially for the approximately 50% of the population with MTHFR polymorphisms who have reduced ability to convert synthetic folic acid to active 5-MTHF. The methylcobalamin and hydroxocobalamin B12 combination provides immediate methylation cycle activity AND sustained B12 store-replenishment with nitric oxide and cyanide binding capacity. GST+ is positioned as a glutathione network and Phase II detoxification support product, NOT as a chelation therapy; adults with active heavy metal toxicity, chronic Lyme disease, or mold biotoxin illness should coordinate use with a functional medicine practitioner experienced in detoxification protocols.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'gst-plus-cellular-detox'
      AND p.sku = 'FC-GST-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152u GST+ Cellular Detox update skipped: row not found at slug gst-plus-cellular-detox / SKU FC-GST-001';
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
        '152u_gst_plus_cellular_detox_revision',
        'products',
        'FC-GST-001',
        v_product_id,
        jsonb_build_object(
            'method', 'rev2_structured_description_lane2_reconciled_per_152p_canonical_INSERT_to_UPDATE_conversion',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'rev2_structured_pdp_152p_canonical_lane2',
            'authority', 'Gary canonical 2026-05-06 Prompt #152u (Lane A directive: convert spec INSERT to UPDATE; live row already exists with PERFECT MATCH 12-ingredient 757.0 mg authoritative formulation per spec FORMULATION RECONCILIATION section)',
            'spec_premise_drift_correction', 'Spec authored as INSERT for net-new product. Live row already at authoritative 12/757.0 formulation matching spec PERFECT MATCH posture. Spec INSERT premise incorrect against live data (fifth consecutive 152x net-new spec to hit live-row drift after 152q + 152r + 152s + 152t). Migration converted to UPDATE Lane 2 reconciliation.',
            'marshall_scan', 'human_review_pass; zero hits; all 12 ingredients are glutathione network amino acids/peptides + antioxidant cofactors + methylated B-cofactors + Nrf2-inducing botanicals + Bioperine; Glutathione tripeptide and NAC are not peptide drugs',
            'bioavailability_format', '10x to 28x APPLIES at whole-formula level (11/12 advanced carrier forms: 9 liposomal + 1 micellar Bioperine + 1 active phosphorylated B2 R5P; only Selenium uncoated as L-Selenomethionine high-bioavailability food-source form with methionine transporter absorption); near-full-encapsulation pattern matching 152n DAO+ (12/12), 152o DESIRE+ (15/16), 152s FLEX+ (8/9). Prose framing: "11 of 12 ingredients use liposomal, micellar, or active phosphorylated forms achieving 10x to 28x bioavailability versus standard formulations."',
            'sku_verify_outcome', 'FC-GST-001 canonical FC-prefix; same as 152o-rev2 + 152e-rev2 + 152q + 152r + 152s + 152t patterns',
            'lane2_corrections', jsonb_build_array(
                'Migration shape: INSERT -> UPDATE (live row exists with placeholder copy, same as 152q + 152r + 152s + 152t + 152o pattern; fifth consecutive net-new spec to hit drift)',
                'No H1 capitalization correction needed (live name "GST+ Cellular Detox" matches spec H1 verbatim; cleanest match in 152x series)',
                'No prose product-abbreviation correction needed (live "GST+" matches spec)',
                'Bullet 8 ingredient name: "(Methylcobalamin and Hydroxocobalamin)" -> "(Methylcobalamin + Hydroxocobalamin)" (match live JSONB literal "+" connector per match-live precedent; prose body retains natural "and"/"with" connectors for English readability per 152s precedent)',
                'Bullet 12 ingredient name: "Micellar Bioperine (Black Pepper Extract)" -> "Micellar Bioperine® (Black Pepper Extract)" (preserve registered mark per live JSONB name; overrides spec drop-R rule per 152q match-live precedent)',
                'First inline prose mention of Bioperine in opening paragraph also preserves ® per 152s consistency precedent ("all unified by Bioperine® for absorption synergy"); subsequent prose mention drops ® per common trademark notation convention',
                'Zero apostrophes in description body; no SQL escape needed (cleanest 152x in series alongside 152t)',
                'No em/en-dashes, no parenthetical " - " asides, all compound modifiers use ASCII hyphen-minus per feedback_no_dashes.md compliance'
            ),
            'product_name', 'GST+ Cellular Detox',
            'three_pillar_positioning', 'Detox | Defend | Methylate',
            'live_ingredient_total_mg', 757.0,
            'live_ingredient_count', 12,
            'live_format', 'capsule',
            'live_status_tag', 'NONE (TIER not assigned in live status_tags)',
            'live_category_slug', 'methylation-snp',
            'live_carrier_breakdown', '9 liposomal (Glutathione, NAC, R-ALA, B6 P5P, 5-MTHF, B12 dual-form, Broccoli Seed Sulforaphane, Curcumin, Quercetin) + 1 micellar (Bioperine®) + 1 active phosphorylated (B2 R5P, technically not liposomal but active form provides inherent bioavailability) + 1 high-bioavailability mineral form (Selenium L-Selenomethionine, methionine transporter absorption) = 11/12 advanced-carrier-or-active-form pattern; whole-formula 10x to 28x anchor APPLIES',
            'cross_product_reference', 'Practitioner-coordination framing for active heavy metal toxicity / chronic Lyme disease / mold biotoxin illness; NOT a chelation therapy positioning preserved; functional medicine practitioner referral pattern',
            'spec_source_doc_legacy_artifacts_dropped', 'FarmCeutica Inc + FarmCeutica Wellness Ltd + Building Performance Through Science tagline + TM symbols on GST+ + "evidence suggests this multifaceted approach may bolster GST function" hedging + "It seems likely to benefit most adults" hedging all NOT in reconciled copy',
            'rev2_canonical_pattern', 'feedback_152p_canonical_for_all_formulation_updates',
            'twelfth_152x_rev2_under_standing_rule', 'true (after 152e/f/i/k/l/n/o-rev2 + 152q + 152r + 152s + 152t)',
            'positioning_disclosure', 'GLUTATHIONE NETWORK + Nrf2 PATHWAY + METHYLATION COFACTOR MATRIX SUPPORT, NOT a chelation therapy; selenium UL awareness explicitly framed; Bioperine CYP3A4 inhibition explicitly framed with medication interaction list; MTHFR polymorphism awareness (~50% of population) + 5-MTHF differentiation framed in What-makes-it-different',
            'comprehensive_contraindications', 'SULFUR SENSITIVITY (CBS upregulation polymorphisms; H2S production), HEAVY METAL MOBILIZATION (ALA chelation activity; not without practitioner-directed binding agent protocol), BLEEDING RISK (NAC mild + Curcumin/Quercetin antiplatelet activity; anticoagulants warfarin/apixaban/rivaroxaban/dabigatran + antiplatelets aspirin/clopidogrel + NSAIDs + pre-surgical 14-day discontinuation), GI/HEPATIC (active gallbladder disease + active PUD + active liver disease), REPRODUCTIVE (pregnancy + lactation), OTHER (active autoimmune flare + active chemotherapy + bipolar disorder with mania history + individuals under 18 + concurrent selenium supplement avoidance + Bioperine CYP3A4 substrate review)',
            'soft_clinical_flags', jsonb_build_array(
                'SOFT FLAG 1 (SELENIUM): Live JSONB Selenium 0.2 mg per cap. Spec assumes elemental interpretation (200 mcg per cap × 2 caps = 400 mcg/day, AT pregnancy UL of 400 mcg/day). Compound L-Selenomethionine interpretation (~40% Se) would yield ~80 mcg elemental per cap × 2 caps = ~160 mcg/day (~3X RDA, well below UL). PDP copy includes UL awareness and recommendation to avoid concurrent selenium-containing supplements; works under either interpretation. Verification with formulator recommended but NOT production-blocking.',
                'SOFT FLAG 2 (B12 RATIO): Methylcobalamin:Hydroxocobalamin ratio not specified in live JSONB or spec; typical ratios 50:50, 60:40, 70:30. Verification with formulator recommended for label artwork specification but NOT production-blocking.',
                'SOFT FLAG 3 (CURCUMIN BRANDED FORM): Live JSONB lists "Liposomal Curcumin (95% Curcuminoids)" generically rather than naming specific branded ingredient (CurcuWIN, BCM-95, Theracurmin, Meriva). PDP copy frames bioavailability through liposomal carrier mechanism without claiming brand-specific multipliers. Verification with formulator recommended but NOT production-blocking.'
            )
        )
    );

    RAISE NOTICE '#152u GST+ Cellular Detox update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
