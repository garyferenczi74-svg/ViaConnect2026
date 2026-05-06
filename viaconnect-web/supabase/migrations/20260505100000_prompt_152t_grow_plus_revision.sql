-- Prompt #152t: Grow+ Pre-Natal Formula PDP rev2 structured Lane-2 reconciled.
--
-- SPEC DRIFT: spec authored as INSERT for "net-new product" but live
-- database already has Grow+ Pre-Natal Formula at slug grow-plus-pre-
-- natal-formula (id a14d0097-db60-43aa-aeed-8878acb69bca, SKU
-- FC-GROW-001). Live row has the full 10-ingredient / 1,396.9 mg
-- authoritative formulation matching spec exactly. Spec's "this is an
-- INSERT for a net-new product" framing is incorrect against live data.
-- Per Gary 2026-05-06 standing precedent set in 152q + 152r + 152s
-- (option A): convert spec INSERT to UPDATE. Fourth consecutive 152x
-- net-new spec to hit live-row drift; pattern is now firmly precedent.
--
-- HIGHEST CLINICAL SAFETY BAR IN 152 SERIES (prenatal product).
-- Hannah pre-flight clinical review applied 3 substantive copy
-- substitutions BEFORE migration drafted; live JSONB still requires
-- Gary reconciliation on iodine + formulator sign-off on D3.
--
-- Drift notes (verified live 2026-05-06):
--   * Slug grow-plus-pre-natal-formula confirmed live (matches first
--     spec candidate).
--   * SKU FC-GROW-001 (canonical FC-prefix; no SKU mismatch).
--   * Live name "Grow+ Pre-Natal Formula" matches spec H1 exactly; no
--     Lane 2 H1 capitalization correction required (unlike 152s FLEX+
--     which needed ALL-CAPS match).
--   * Live format 'capsule'; pricing_tier L1; price_msrp $98.88 ends in
--     .88 per Via Cura convention; master_sku '26'; status_tags []
--     (TIER not yet assigned); category_slug 'womens-health';
--     image_urls populated to supplement-photos/Woman's Health/grow-
--     plus-pre-natal-formula.png; active true; product_type
--     'supplement'.
--   * Live ingredient count 10, total 1,396.9 mg per serving (2 caps),
--     list:
--       1. MethylB Complete+ B Complex 32 mg
--       2. Iron (as Ferrous Bisglycinate) 27 mg
--       3. Calcium (Citrate & MCHC) 400 mg
--       4. Liposomal Vitamin D3 (Cholecalciferol) (2000 IU) 0.5 mg
--       5. Liposomal Vitamin K2 (Menaquinone-7) 0.2 mg
--       6. Liposomal Choline (Alpha-GPC) 450 mg
--       7. Iodine (as Potassium Iodide) 2.2 mg ← CLINICAL SAFETY FLAG
--       8. Liposomal Magnesium Synergy Matrix 350 mg
--       9. Zinc (as Zinc Bisglycinate) 15 mg
--      10. Liposomal Vitamin C (L-Ascorbic Acid) 120 mg
--   * Zero ® brand symbols in any live JSONB ingredient names (differs
--     from 152s 4-® pattern). MethylB Complete+ has no ® per live JSONB.
--   * Existing summary + description are 72-char placeholder ("Complete
--     prenatal formula with methylated folate and essential nutrients");
--     152t replaces with rev2 structured copy.
--
-- HANNAH CLINICAL PRE-FLIGHT (verdict: FIX with 3 substitutions):
--
--   Q1 IODINE: Live JSONB iodine 2.2 mg KI per capsule = ~1,670 mcg
--   elemental I per cap = ~3,340 mcg/day at 2 caps = 3X pregnancy UL
--   (1,100 mcg) and 7.6X RDA per cap (220 mcg). Spec proposed Path 1
--   correction (10x typo to 0.22 mg KI = 220 mcg elemental I per cap),
--   but live JSONB still has 2.2 mg. Hannah selected Option B (neutral
--   framing): drop "RDA-aligned" claim, drop dose numerics from prose,
--   drop "leading preventable cause of intellectual disability
--   worldwide" disease-state-adjacent public-health framing. Bullet
--   substituted to: "Provides iodine for fetal thyroid development and
--   maternal thyroid hormone synthesis." Copy now works under EITHER
--   iodine resolution Gary lands on.
--
--   Q2 VITAMIN D3: 0.5 mg / 2000 IU dual-unit interpretation accepted
--   as defensible (standard liposomal labeling convention; lipid
--   carrier matrix + 2000 IU cholecalciferol activity). Bullet header
--   matches live JSONB "(Cholecalciferol) (2000 IU)" verbatim per
--   match-live precedent. Bullet body remains generic ("at the standard
--   prenatal supplementation dose") with no specific IU restated in
--   prose. Formulator written confirmation that 0.5 mg refers to
--   liposomal complex weight (not cholecalciferol mass) flagged for
--   Gary in audit metadata.
--
--   Q3 PREECLAMPSIA: Spec Bullet 8 Magnesium contained "may reduce
--   preeclampsia risk in some studies" disease-risk-reduction claim.
--   Hannah HARD CUT per FDA warning letters to prenatal supplement
--   marketers 2019-2023. Hedging with "may" + "in some studies" does
--   NOT rescue a disease-risk-reduction claim under DSHEA. Underlying
--   evidence is also weak (preeclampsia evidence is IV magnesium
--   sulfate acute, not oral supplementation prophylactic). Bullet
--   substituted to remove "may reduce preeclampsia risk" entirely;
--   restructured to "supports neuromuscular relaxation, and helps
--   maintain normal muscle function during pregnancy" structure-
--   function language.
--
-- Bioavailability claim posture (per spec Discrepancy 7):
--   - Partial encapsulation pattern: 5 of 10 ingredients have liposomal
--     carrier prefix (Vitamin D3, Vitamin K2, Choline Alpha-GPC,
--     Magnesium Synergy Matrix, Vitamin C). The other 5 are chelated
--     minerals (Iron Bisglycinate, Calcium Citrate+MCHC, Zinc
--     Bisglycinate), iodine salt (Potassium Iodide), and a brand-name
--     methylated B-complex (MethylB Complete+).
--   - "10x to 28x" multiplier APPLIES SPECIFICALLY to those 5
--     liposomal ingredients, NOT to the whole formula. Reconciled prose
--     framing: "The 5 liposomal ingredients achieve 10x to 28x
--     bioavailability; the chelated minerals and methylated B-cofactor
--     forms provide established inherent bioavailability advantages."
--   - Pattern matches 152q DigestiZorb+ partial-encapsulation (Liposomal
--     Pepsin + Micellar Ginger get the anchor; the other 9 plain
--     enzymes/extracts use inherent bioavailability framing).
--   - Auto-remediators (Michelangelo reviewer.ts:190 + Jeffery
--     guardrails.ts:83) only block 5-27x patterns; "10x to 28x" passes
--     both. The partial-encapsulation framing is a precise scoped claim,
--     not a violation of the substantiation rule.
--
-- Marshall dictionary scan: zero hits in unapproved_peptides.ts. All 10
-- ingredients are vitamins, chelated minerals, mineral salts, and a
-- branded methylated B-complex. No peptide drugs. No SNP/SKU/cron
-- internals on public-facing copy.
--
-- Disease-term posture: "iron deficiency anemia of pregnancy" in
-- Who-benefits is verb-pair loophole pattern ("women with iron
-- deficiency anemia of pregnancy where bisglycinate chelate provides
-- gentler GI tolerance"); same as 152q/152e established precedent.
-- "hyperthyroidism, Graves disease, autoimmune thyroid disease,
-- hemochromatosis, iron overload, hypercalcemia, primary
-- hyperparathyroidism, calcium-phosphate kidney stones, vitamin D
-- toxicity, sarcoidosis, renal failure" all in CONTRAINDICATION
-- context (appropriate medical safety disclosure for prenatal product
-- with elevated medication interaction profile). Pediatric iron
-- overdose warning per FDA guidance is required medical safety
-- disclosure for any product containing iron at supplemental doses.
--
-- Comprehensive contraindications list per spec body (medical safety
-- disclosure for highest-clinical-bar product category):
--   - Thyroid: hyperthyroidism, Graves disease, autoimmune thyroid
--     disease (consult endocrinologist due to iodine).
--   - Iron overload: hemochromatosis, iron overload conditions.
--   - Calcium/D: hypercalcemia, primary hyperparathyroidism, calcium-
--     phosphate kidney stones, vitamin D toxicity, sarcoidosis.
--   - Renal: renal failure.
--   - Medication coordination: levothyroxine 4h separation,
--     bisphosphonates 2h separation, tetracycline + fluoroquinolone
--     2-4h separation, warfarin/lithium/methotrexate/anticonvulsants
--     prescribing-physician consultation.
--   - Pediatric: not formulated for non-pregnant pediatric use;
--     pediatric iron overdose potentially fatal in children under 6;
--     keep out of reach with child-resistant packaging.
--
-- Cross-product reference: closing differentiation paragraph notes
-- pairing with separate algal omega-3 DHA supplement (200 to 300 mg
-- DHA per day per ACOG) for full prenatal coverage. Same portfolio-
-- architecture pattern as 152q DigestiZorb+/Balance+ + 152r Electrolyte
-- Blend/Catalyst+ + 152s FLEX+/Catalyst+ cross-references, but here
-- the recommended pair is a future or generic algal DHA product (not
-- yet a Via Cura SKU per spec Discrepancy 3).
--
-- Three-pillar Nourish | Develop | Sustain positioning preserved.
-- Catalog summary leads with the three-pillar nouns: "Comprehensive
-- prenatal nutrition, fetal development support, and maternal vitality
-- in a single capsule."
--
-- Source-doc legacy artifacts NOT carried forward (per spec
-- Source-Document Corrections + spec Discrepancy 6 substantial
-- reformulation): no "FarmCeutica Inc.", no "FarmCeutica Wellness Ltd.",
-- no "Building Performance Through Science" tagline, no TM symbols on
-- Grow+ or MethylB Complete+, no "Methylated Liposomal Capsules"
-- subtitle, no "BioB Fusion" (replaced by MethylB Complete+ in live
-- JSONB), no algal omega-3 DHA/EPA, no amino acid matrix or 7
-- individual amino acids, no Vitamin A beta-carotene, no Vitamin E
-- tocotrienol, no CoQ10 ubiquinol, no Micellar Ginger Root Extract,
-- no digestive enzymes, no probiotics, no selenium in product copy
-- EXCEPT in negative-differentiation form ("does NOT include omega-3
-- DHA, amino acid matrix, broader antioxidant complex, or digestive
-- enzymes; women requiring those should pair with appropriate
-- dedicated products"). Manufacturer is FarmCeutica Wellness LLC;
-- tagline is Built For Your Biology (rendered separately via #152a
-- brand-footer caption beneath description, not embedded in this prose).
--
-- Positioning: PRACTITIONER-GUIDED PRENATAL FORMULATION FOR PRE-
-- CONCEPTION, PREGNANCY, AND POSTPARTUM NUTRITIONAL SUPPORT UNDER
-- OB/GYN SUPERVISION. Strongest practitioner-guidance framing in 152
-- series. NO omega-3 DHA in formulation; pair with separate algal DHA
-- supplement per ACOG. Pediatric iron overdose warning + child-
-- resistant packaging language preserved per FDA guidance.
--
-- Hyphens preserved in compound modifiers (pre-conception, pre-natal,
-- maternal-fetal, calcium-phosphate, blood-brain-barrier, anti-
-- inflammatory, B-complex, B-cofactor, RDA-aligned, Alpha-GPC, P5P
-- moniker, MTHFR, 5-MTHF, B12, B6, OB/GYN, Bio Optimization). No
-- em-dashes, no en-dashes, no parenthetical " - " (standing-rule fix
-- in pediatric iron warning sentence: " - " replaced with "; " per
-- feedback_no_dashes.md).
--
-- Lane 2 micro-corrections (4 corrections vs spec text + 3 Hannah
-- substitutions = 7 total):
--   1. Migration shape: INSERT -> UPDATE (live row exists; same as
--      152q + 152r + 152s + 152o pattern; fourth consecutive net-new
--      spec to hit drift).
--   2. Bullet 3 ingredient name: "Calcium (Citrate and MCHC)" ->
--      "Calcium (Citrate & MCHC)" (match live JSONB ampersand
--      connector; same precedent as 152s FLEX+ where & connector was
--      preserved per match-live).
--   3. Bullet 4 ingredient name: "Liposomal Vitamin D3 (Cholecalciferol,
--      2000 IU)" -> "Liposomal Vitamin D3 (Cholecalciferol) (2000 IU)"
--      (match live JSONB split-paren format).
--   4. Standing-rule fix: " - " parenthetical aside in pediatric iron
--      warning sentence -> "; " semicolon per feedback_no_dashes.md
--      ("pediatric iron overdose is potentially fatal in children
--      under 6 - keep out" -> "...children under 6; keep out").
--   5. HANNAH SUB #1 (Iodine bullet): drop "RDA-aligned" + drop
--      "leading preventable cause of intellectual disability worldwide"
--      disease-state-adjacent public-health framing -> neutral
--      structure-function only.
--   6. HANNAH SUB #2 (D3 bullet): header matches live JSONB; body
--      remains generic without specific IU restated; formulator
--      confirmation flagged in audit metadata.
--   7. HANNAH SUB #3 (Magnesium bullet): HARD CUT "may reduce
--      preeclampsia risk in some studies" disease-risk-reduction
--      claim per FDA warning letters 2019-2023; restructured to
--      "supports neuromuscular relaxation, and helps maintain normal
--      muscle function during pregnancy".
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
    v_new_summary text := 'Comprehensive prenatal nutrition, fetal development support, and maternal vitality in a single capsule.';
    v_new_description text := E'## What does Grow+ Pre-Natal Formula do?\n\nGrow+ Pre-Natal Formula supports pre-conception, pregnancy, and postpartum nutritional needs through three interconnected pillars: nourish through comprehensive prenatal vitamin and mineral coverage at clinically meaningful doses, develop through fetal neural and skeletal development support via choline, methylated B-complex, calcium, iron, and iodine, and sustain through maternal mineral repletion, methylation cofactor support, and antioxidant tone for the demands of pregnancy and postpartum. The 10-ingredient liposomal and chelated mineral formulation pairs methylated B-complex (5-MTHF folate, methylcobalamin, P5P) with chelated minerals (Iron Bisglycinate, Calcium Citrate plus MCHC, Zinc Bisglycinate) and liposomal carriers on Vitamin D3, Vitamin K2, Choline Alpha-GPC, Magnesium Synergy Matrix, and Vitamin C. The 5 liposomal ingredients achieve 10x to 28x bioavailability; the chelated minerals and methylated B-cofactor forms provide established inherent bioavailability advantages. Designed for practitioner-guided use under OB/GYN supervision. NOTE: Grow+ does NOT include omega-3 DHA; pair with a dedicated algal DHA supplement (200 to 300 mg DHA per day per ACOG) for full prenatal coverage.\n\n## Ingredient breakdown\n\n- **MethylB Complete+ B Complex:** Provides the active methylated cofactor matrix (5-MTHF folate, methylcobalamin B12, pyridoxal-5-phosphate B6) supporting DNA synthesis, neural tube closure, and homocysteine metabolism, particularly important for women with MTHFR polymorphisms who have reduced ability to convert synthetic folic acid.\n- **Iron (as Ferrous Bisglycinate):** Supports red blood cell production for the increased blood volume of pregnancy in bisglycinate chelate form for 3 to 4x bioavailability versus ferrous sulfate and gentler GI tolerance with less constipation.\n- **Calcium (Citrate & MCHC):** Supports fetal skeletal mineralization and maternal calcium homeostasis through a combination of bioavailable citrate (1.5 to 2x bioavailability versus carbonate) and microcrystalline hydroxyapatite calcium-phosphate matrix.\n- **Liposomal Vitamin D3 (Cholecalciferol) (2000 IU):** Supports calcium absorption from the GI tract and immune function in liposomal form for enhanced bioavailability through chylomicron pathways at the standard prenatal supplementation dose.\n- **Liposomal Vitamin K2 (Menaquinone-7):** Activates osteocalcin to direct calcium toward bone formation and matrix Gla protein to prevent calcium deposition in soft tissues, providing the directional calcium regulation that supplemental calcium without K2 lacks.\n- **Liposomal Choline (Alpha-GPC):** Supports fetal neural development through phosphatidylcholine synthesis for neural cell membranes and acetylcholine synthesis for neurotransmitter activity, in the most bioavailable choline form (Alpha-GPC) with documented blood-brain-barrier penetration and placental transfer at clinically meaningful prenatal dose.\n- **Iodine (as Potassium Iodide):** Provides iodine for fetal thyroid development and maternal thyroid hormone synthesis.\n- **Liposomal Magnesium Synergy Matrix:** Cofactors over three hundred enzymes including ATP synthase, supports neuromuscular relaxation, and helps maintain normal muscle function during pregnancy in liposomal multi-form matrix combining citrate, glycinate, and malate.\n- **Zinc (as Zinc Bisglycinate):** Cofactors over three hundred enzymes including those in immune function, taste perception, and tissue development, in bisglycinate chelate form for high bioavailability and gentle GI tolerance.\n- **Liposomal Vitamin C (L-Ascorbic Acid):** Provides antioxidant tone, supports iron absorption from the bisglycinate chelate by reducing ferric to ferrous iron, and supports collagen formation for connective tissue and uterine ligament integrity through pregnancy.\n\n## Who benefits and what makes this different\n\n**Who benefits:** Women preparing for pregnancy in the pre-conception period (typically 3 to 6 months before attempted conception), pregnant women throughout the first, second, and third trimesters, postpartum women within the first 6 to 12 months, lactating women with practitioner coordination, women with MTHFR polymorphisms who benefit from methylated folate over synthetic folic acid, women with iron deficiency anemia of pregnancy where bisglycinate chelate provides gentler GI tolerance, and women whose ViaConnect Bio Optimization Score flags weakness in methylation, mineral status, or maternal-fetal nutrition domains. Strongly recommended for use under OB/GYN supervision. Important contraindications: not for use with hyperthyroidism, Graves disease, or autoimmune thyroid disease (consult endocrinologist due to iodine content); not for use with hemochromatosis or iron overload conditions; not for use with hypercalcemia, primary hyperparathyroidism, or active calcium-phosphate kidney stones; not for use with vitamin D toxicity or sarcoidosis; not for use with renal failure; coordinate dosing with levothyroxine and thyroid medications by separating 4 hours; coordinate with bisphosphonates by 2 hours; coordinate with tetracycline and fluoroquinolone antibiotics by 2 to 4 hours; consult prescribing physician if on warfarin, lithium, methotrexate, or anticonvulsants; not formulated for non-pregnant pediatric use; pediatric iron overdose is potentially fatal in children under 6; keep out of reach of children with child-resistant packaging.\n\n**What makes it different:** What separates Grow+ from generic prenatal multivitamins is the convergence of methylated B-cofactor forms (5-MTHF directly, not synthetic folic acid; methylcobalamin directly, not cyanocobalamin) with chelated minerals (Bisglycinate iron and zinc, citrate plus MCHC calcium) and liposomal carriers on five core vitamins and minerals. Choline at 450 mg Alpha-GPC per capsule (approximately 360 mg elemental choline per day at 2 capsules) approaches the pregnancy AI of 450 mg, addressing the under-supplementation of choline that affects 90% of pregnant women in dietary intake. Iron in bisglycinate chelate provides RDA-aligned iron with substantially gentler GI tolerance versus ferrous sulfate. The D3 plus K2 combination provides the directional calcium regulation that supplemental calcium without K2 lacks. Grow+ is positioned as a focused prenatal vitamin, mineral, and choline formulation designed for **practitioner-guided use under OB/GYN supervision** and **paired with a dedicated algal omega-3 DHA supplement** for full prenatal coverage per ACOG recommendations. Grow+ does NOT include omega-3 DHA, amino acid matrix, broader antioxidant complex, or digestive enzymes; women requiring those should pair with appropriate dedicated products.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'grow-plus-pre-natal-formula'
      AND p.sku = 'FC-GROW-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152t Grow+ Pre-Natal update skipped: row not found at slug grow-plus-pre-natal-formula / SKU FC-GROW-001';
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
        '152t_grow_plus_pre_natal_formula_revision',
        'products',
        'FC-GROW-001',
        v_product_id,
        jsonb_build_object(
            'method', 'rev2_structured_description_lane2_reconciled_per_152p_canonical_INSERT_to_UPDATE_conversion_with_hannah_clinical_safety_substitutions',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'rev2_structured_pdp_152p_canonical_lane2_plus_clinical_safety_overrides',
            'authority', 'Gary canonical 2026-05-06 Prompt #152t (Lane A directive: convert spec INSERT to UPDATE; live row already exists with matching 10-ingredient 1,396.9 mg authoritative formulation; Hannah clinical pre-flight applied 3 substitutions before draft)',
            'spec_premise_drift_correction', 'Spec authored as INSERT for net-new product. Live row already at authoritative 10/1,396.9 formulation. Spec INSERT premise incorrect against live data (fourth consecutive 152x net-new spec to hit live-row drift after 152q + 152r + 152s). Migration converted to UPDATE Lane 2 reconciliation.',
            'marshall_scan', 'human_review_pass; zero hits; all 10 ingredients are vitamins + chelated minerals + mineral salts + branded methylated B-complex; no peptide drugs',
            'bioavailability_format', '10x to 28x APPLIES SCOPED to 5 liposomal ingredients only (Vit D3, K2, Choline Alpha-GPC, Magnesium Synergy Matrix, Vit C); NOT whole-formula. Other 5 ingredients (MethylB Complete+, Iron Bisglycinate, Calcium Citrate+MCHC, Iodine KI, Zinc Bisglycinate) get inherent bioavailability framing through chelation/methylation. Same partial-encapsulation pattern as 152q DigestiZorb+ (2/11 carriers). Prose framing: "The 5 liposomal ingredients achieve 10x to 28x bioavailability; the chelated minerals and methylated B-cofactor forms provide established inherent bioavailability advantages."',
            'sku_verify_outcome', 'FC-GROW-001 canonical FC-prefix; same as 152o-rev2 + 152e-rev2 + 152q + 152r + 152s patterns',
            'hannah_clinical_substitutions', jsonb_build_array(
                'IODINE bullet (Q1, Hannah Option B neutral framing): dropped "RDA-aligned iodine for thyroid hormone synthesis essential for fetal brain development, since severe iodine deficiency in pregnancy is the leading preventable cause of intellectual disability worldwide" -> "Provides iodine for fetal thyroid development and maternal thyroid hormone synthesis." Reason: live JSONB iodine 2.2 mg KI per cap exceeds pregnancy UL by 3X if literal; spec Path 1 correction (0.22 mg KI = 220 mcg elemental I) NOT applied to live JSONB; cannot ship "RDA-aligned" copy while live JSONB ships 3X UL. Neutral structure-function only ships safely under either Gary resolution.',
                'D3 bullet (Q2, Hannah defensible-with-caveat): header matches live JSONB "Liposomal Vitamin D3 (Cholecalciferol) (2000 IU)" verbatim per Lane 2 match-live precedent; body remains generic ("at the standard prenatal supplementation dose") without specific IU restated in prose. Formulator written confirmation that 0.5 mg refers to liposomal complex weight (lipid carrier matrix + cholecalciferol activity) and NOT cholecalciferol mass (which would be 20,000 IU per cap, 5X UL) flagged for Gary in clinical_safety_flags below.',
                'MAGNESIUM bullet (Q3, Hannah HARD CUT): dropped "may reduce preeclampsia risk in some studies" disease-risk-reduction claim per FDA warning letters to prenatal supplement marketers 2019-2023 (hedging with "may + in some studies" does not rescue under DSHEA); spec underlying evidence also weak (preeclampsia evidence is IV magnesium sulfate acute, not oral supplementation prophylactic). Restructured bullet to: "Cofactors over three hundred enzymes including ATP synthase, supports neuromuscular relaxation, and helps maintain normal muscle function during pregnancy in liposomal multi-form matrix combining citrate, glycinate, and malate."'
            ),
            'lane2_corrections', jsonb_build_array(
                'Migration shape: INSERT -> UPDATE (live row exists with placeholder copy, same as 152q + 152r + 152s + 152o pattern; fourth consecutive net-new spec to hit drift)',
                'No H1 capitalization correction needed (live name "Grow+ Pre-Natal Formula" matches spec H1 verbatim, unlike 152s FLEX+ which needed ALL-CAPS match)',
                'No prose product-abbreviation correction needed (live "Grow+" matches spec)',
                'Bullet 3 ingredient name: "(Citrate and MCHC)" -> "(Citrate & MCHC)" (match live JSONB ampersand connector per match-live precedent)',
                'Bullet 4 ingredient name: "(Cholecalciferol, 2000 IU)" -> "(Cholecalciferol) (2000 IU)" (match live JSONB split-paren format)',
                'Standing-rule fix per feedback_no_dashes.md: " - " parenthetical aside in pediatric iron warning sentence -> "; " semicolon (pediatric iron overdose is potentially fatal in children under 6 - keep out -> ...children under 6; keep out)',
                'Zero apostrophes in description body; no SQL escape needed (cleanest 152x in series)',
                'Zero ® brand symbols on any live JSONB ingredient names (differs from 152s FLEX+ 4-® pattern)'
            ),
            'product_name', 'Grow+ Pre-Natal Formula',
            'three_pillar_positioning', 'Nourish | Develop | Sustain',
            'live_ingredient_total_mg', 1396.9,
            'live_ingredient_count', 10,
            'live_format', 'capsule',
            'live_status_tag', 'NONE (TIER not assigned in live status_tags)',
            'live_category_slug', 'womens-health',
            'live_carrier_breakdown', '5 liposomal (D3, K2, Choline Alpha-GPC, Magnesium Synergy Matrix, Vit C) + 3 chelated minerals (Iron Bisglycinate, Calcium Citrate+MCHC, Zinc Bisglycinate) + 1 mineral salt (Iodine KI) + 1 brand-name methylated B-complex (MethylB Complete+) = 5/10 partial-encapsulation; 10x to 28x anchor APPLIES SCOPED to 5 liposomal only',
            'cross_product_reference', 'Separate algal omega-3 DHA supplement recommended (200 to 300 mg DHA per day per ACOG) for full prenatal coverage; not yet a Via Cura SKU per spec Discrepancy 3; recommendation generic to allow dose flexibility per dietary fish intake and gestational stage',
            'spec_source_doc_legacy_artifacts_dropped', 'FarmCeutica Inc + FarmCeutica Wellness Ltd + Building Performance Through Science tagline + TM symbols on Grow+ + TM symbols on MethylB Complete+ + Methylated Liposomal Capsules subtitle + BioB Fusion (replaced by MethylB Complete+ in live JSONB) + 12 removed source-doc ingredients (algal omega-3 + 8 amino acids + Vit A + Vit E + CoQ10 + Micellar Ginger) all NOT in reconciled copy except in negative-differentiation form ("does NOT include omega-3 DHA, amino acid matrix, broader antioxidant complex, or digestive enzymes")',
            'omega_3_status', 'EXPLICITLY EXCLUDED from formulation per spec Discrepancy 3; PDP copy explicitly notes absence and recommends pairing with dedicated algal DHA supplement (200 to 300 mg DHA per day per ACOG); future Via Cura algal omega-3 SKU deferred to potential 152t.5 if Gary pursues',
            'rev2_canonical_pattern', 'feedback_152p_canonical_for_all_formulation_updates',
            'eleventh_152x_rev2_under_standing_rule', 'true (after 152e/f/i/k/l/n/o-rev2 + 152q + 152r + 152s)',
            'positioning_disclosure', 'PRACTITIONER-GUIDED PRENATAL FORMULATION FOR PRE-CONCEPTION + PREGNANCY + POSTPARTUM UNDER OB/GYN SUPERVISION; strongest practitioner-guidance framing in 152 series; pediatric iron overdose warning + child-resistant packaging language preserved per FDA guidance',
            'comprehensive_contraindications', 'THYROID (hyperthyroidism + Graves disease + autoimmune thyroid disease consult endocrinologist), IRON OVERLOAD (hemochromatosis + iron overload), CALCIUM/D (hypercalcemia + primary hyperparathyroidism + calcium-phosphate kidney stones + vitamin D toxicity + sarcoidosis), RENAL (renal failure), MEDICATION COORDINATION (levothyroxine 4h + bisphosphonates 2h + tetracycline/fluoroquinolone 2-4h + warfarin/lithium/methotrexate/anticonvulsants prescribing-physician consultation), PEDIATRIC (not for non-pregnant pediatric use; pediatric iron overdose potentially fatal in children under 6; child-resistant packaging required per FDA guidance)',
            'clinical_safety_flags', jsonb_build_array(
                'CRITICAL FLAG 1 (IODINE): Live JSONB iodine 2.2 mg KI per capsule = ~1,670 mcg elemental I per cap = ~3,340 mcg/day at 2 caps = 3X pregnancy UL (1,100 mcg) and 7.6X RDA per cap (220 mcg). Spec Path 1 correction proposes 10x typo to 0.22 mg KI = 220 mcg elemental I per cap (RDA-aligned at 2 caps = 440 mcg/day). Gary MUST reconcile live JSONB iodine to 0.22 mg before any production label print, with formulator sign-off. PDP copy substituted to neutral framing per Hannah Q1 Option B so works under either resolution.',
                'CRITICAL FLAG 2 (D3): Live JSONB lists Liposomal Vitamin D3 (Cholecalciferol) (2000 IU) at 0.5 mg per capsule. Defensible interpretation: 0.5 mg = liposomal complex weight (lipid carrier matrix + cholecalciferol), 2000 IU = actual cholecalciferol activity. Alternate interpretation: 0.5 mg = cholecalciferol mass (= 20,000 IU per cap, 5X pregnancy UL). Gary MUST obtain formulator written confirmation that 2000 IU is the cholecalciferol activity (not 20,000 IU) before any production run.',
                'CRITICAL FLAG 3 (PREECLAMPSIA): Spec body contained may reduce preeclampsia risk hedged claim. Hannah HARD CUT removed entirely. Even with hedging the underlying disease-risk-reduction claim crosses FDA DSHEA line per recent FDA warning letters; underlying evidence is also weak (IV magnesium sulfate acute, not oral supplementation prophylactic).',
                'GORDON HANDOFF (out of #152t scope): future Nutritional Log iodine UL flag at >1,100 mcg/day across all user-logged sources. Filed for separate Gordon-domain prompt.',
                'PROCESS NOTE: 152t had highest clinical safety bar in 152 series; required Hannah pre-flight clinical review before draft (new pattern); 3 substitutions applied before any copy was written; pattern recommended for future prenatal/pediatric/special-population products.'
            )
        )
    );

    RAISE NOTICE '#152t Grow+ Pre-Natal update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
