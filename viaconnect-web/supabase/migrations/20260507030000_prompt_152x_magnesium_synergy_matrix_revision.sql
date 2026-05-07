-- Prompt #152x: Magnesium Synergy Matrix PDP rev2 structured Lane-2
-- reconciled.
--
-- SPEC DRIFT: spec authored as INSERT for "net-new product" but live
-- database already has Magnesium Synergy Matrix at slug magnesium-
-- synergy-matrix (id 2c4b5554-06f5-48e6-8842-9df9ae560276, SKU
-- FC-MAG-001). Seventh consecutive 152x net-new spec to hit live-row
-- drift; pattern is standing precedent.
--
-- Drift notes (verified live 2026-05-07):
--   * Slug magnesium-synergy-matrix confirmed live (matches spec
--     candidate verbatim).
--   * SKU FC-MAG-001 (canonical FC-prefix; matches 152o-rev2 +
--     152e-rev2 + 152q + 152r + 152s + 152t + 152u + 152v.0 + 152w
--     patterns).
--   * Live name "Magnesium Synergy Matrix" matches spec H1 verbatim;
--     no Lane 2 H1 capitalization correction required.
--   * Live format 'capsule'; pricing_tier L1; price_msrp $58.88
--     already set (does NOT require 152x.1 follow-up; differs from
--     standard 152x deferred-pricing pattern); master_sku '05'
--     already set; status_tags []; category_slug 'base-formulations';
--     image_urls populated (image_count=1; does NOT require 152x.2
--     follow-up); active true; product_type 'supplement' (no
--     Inferno+ NULL-bug analog here).
--   * Live ingredient count 6 already populated, total 150 mg
--     compound per spec, all 6 plain chelates matching authoritative
--     verbatim (no liposomal/micellar prefixes; spec 152x.6 flag
--     about source-doc copy-paste artifacts is therefore moot
--     against live JSONB):
--       1. Magnesium Bisglycinate 25 mg
--       2. Magnesium Citrate 25 mg
--       3. Magnesium Malate 25 mg
--       4. Magnesium Orotate 25 mg
--       5. Magnesium Taurate 25 mg
--       6. Magnesium L-Threonate 25 mg
--   * Zero ® brand symbols on any live JSONB ingredient names
--     (Magtein-vs-generic L-Threonate flag 152x.8 stays in spec but
--     live JSONB just says "Magnesium L-Threonate" generic).
--   * Existing summary + description are 86-char placeholder
--     ("6-form magnesium complex targeting sleep, cognition, muscle,
--     and cardiovascular health"); 152x replaces with rev2 structured
--     copy.
--   * 152x.1 (pricing) + 152x.2 (image) + 152x.4 (SKU/master) all
--     ALREADY POPULATED in live data; only 152x.3 (category
--     reassignment if Mineral Synergy / Magnesium category created)
--     + 152x.5-152x.8 formulator confirmations remain genuinely
--     deferred. category_slug=base-formulations is acceptable
--     interim placement.
--
-- Bioavailability claim posture (per spec Standing Rules + spec
-- explicit "DOES NOT APPLY" framing):
--   - Pure chelation-form bioavailability narrative: 6 of 6 plain
--     chelates, ZERO liposomal/micellar carriers. First 152 series
--     product with this profile.
--   - "10x to 28x" carrier multiplier DOES NOT APPLY at any level
--     (whole-formula or partial). Joins 152d (powder), 152f BHB
--     (tablet), 152r Electrolyte Blend (tablet) in DOES-NOT-APPLY
--     anchor matrix entry but distinguished by the chelation-form
--     bioavailability story.
--   - Reconciled prose framing: "All six ingredients are in advanced
--     chelated forms (3 to 8 times more bioavailable than basic
--     magnesium oxide or sulfate); the 10x to 28x liposomal/micellar
--     bioavailability anchor used elsewhere in the Via Cura portfolio
--     does not apply to this product."
--   - Auto-remediators (Michelangelo reviewer.ts:190 + Jeffery
--     guardrails.ts:83) only block 5-27x patterns; "10x to 28x"
--     framed in negative form ("does not apply") passes both blocks.
--
-- Marshall dictionary scan: zero hits in unapproved_peptides.ts. All
-- 6 ingredients are mineral chelates (no peptide drugs, no
-- controversial peptide compounds). Bisglycinate uses glycine amino
-- acid carrier (not a peptide drug); Taurate uses taurine sulfonic
-- amino acid carrier (not a peptide drug); L-Threonate uses
-- L-threonic acid (vitamin C metabolite, not a peptide). NO Hannah
-- pre-flight gate required per feedback_clinical_preflight_pattern.md
-- (no peptides, no special-population product category, low clinical
-- bar). NO Marshall scan compliance gate required per spec ("no
-- Marshall scan required").
--
-- Disease-term posture: "magnesium-related concerns spanning multiple
-- tissues, sleep or stress regulation concerns, digestive sensitivity,
-- magnesium-mediated cellular functions" all in noun-phrase form
-- following verb constructions ("adults with...", "people with...",
-- "users whose...") riding the verb-pair loophole pattern.
-- "moderate-to-severe chronic kidney disease, end-stage renal disease,
-- dialysis, acute kidney injury, active diarrheal illness, myasthenia
-- gravis, second or third degree heart block" all in CONTRAINDICATION
-- context (appropriate medical safety disclosure for product with
-- magnesium chelation interactions and renal excretion considerations).
--
-- Comprehensive contraindications list per spec body (medical safety
-- disclosure for chelated mineral product with renal excretion +
-- medication chelation profile):
--   - Renal: moderate-to-severe CKD (eGFR <60), ESRD, dialysis (need
--     nephrologist supervision); AKI (until function recovers);
--     reason - magnesium is excreted by kidneys, impaired excretion
--     causes hypermagnesemia.
--   - Medication chelation timing (separate by 2 to 4 hours):
--     tetracycline antibiotics, fluoroquinolone antibiotics,
--     bisphosphonates (separate 2h), thyroid hormone medications
--     (separate 4h), penicillamine (separate 2h), some HIV meds
--     (dolutegravir, raltegravir).
--   - Active diarrheal illness (magnesium can worsen diarrhea).
--   - Myasthenia gravis (without prescribing physician supervision).
--   - Second or third degree heart block (without pacemaker).
--   - Individuals under 18.
--   - Pregnancy/lactation: generally safe at sub-clinical dose with
--     prescribing physician consultation.
--
-- Cross-product reference: differentiation paragraph notes "aligning
-- with Via Cura's broader synergistic micro-dosing philosophy used in
-- Inferno+ and Flex+ products". Joins the established 152 series
-- portfolio architecture pattern.
--
-- Three-pillar Absorb | Support | Optimize positioning preserved
-- verbatim (already in optimal action-led verb form per spec).
-- Catalog summary leads with the three-pillar verb forms: "Six-form
-- magnesium synergy for multi-tissue absorption, muscle and nerve
-- support, and metabolic optimization in a single capsule."
--
-- Source-doc legacy artifacts NOT carried forward (per spec
-- Source-Document Corrections):
--   - No "FarmCeutica Inc." references.
--   - No "FarmCeutica Wellness Ltd." references.
--   - No "Building Performance Through Science" tagline.
--   - No source-doc Section 9 "Micellar and liposomal components
--     enhance aqueous dispersion" copy-paste artifact.
--   - No "150mg liposomal+ micellar powder" Packaging Specs copy-
--     paste artifact (corrected to plain chelate description).
--   - No "150mg powder additive" dosing-protocol language (corrected
--     to "1 capsule per day with food" implicit in capsule context).
--   - No excessive hedging language ("evidence suggests this diverse
--     form approach may improve overall magnesium status", "It seems
--     likely to benefit").
--
-- Positioning: SUB-CLINICAL SYNERGISTIC MULTI-FORM ENHANCER, NOT
-- primary magnesium replacement. Path 2 dose interpretation (25 mg
-- compound per chelate yielding ~15 mg elemental Mg per cap) is the
-- only physically buildable single-capsule interpretation given
-- source-doc Size 00 with 150 mg fill weight. ADD-ON to dietary and
-- primary supplemental Mg foundation. Joins 152 series synergistic
-- micro-dosing philosophy alongside Inferno+ and Flex+.
--
-- Hyphens preserved in compound modifiers (multi-form, multi-tissue,
-- multi-pathway, sub-clinical, moderate-to-severe, end-stage,
-- second-or-third-degree, blood-brain-barrier, BBB-penetrating,
-- multi-mineral, single-mineral, single-form, single-capsule, low-
-- dose, high-dose, clinical-dose, MIT-developed, Mg-ATP, GABA-A,
-- malate-aspartate, L-Threonate, L-threonic, Mg-mediated, six-form,
-- six-ingredient, multi-form, anti-doping). All ranges in form
-- "X to Y" not "X-Y" per feedback_no_dashes.md (e.g., "3 to 8 times",
-- "2 to 4 hours", "200 to 400 mg"). No em-dashes, no en-dashes, no
-- parenthetical " - " asides.
--
-- Lane 2 micro-corrections (1 vs spec text; cleanest 152x in
-- new-product series):
--   1. Migration shape: INSERT -> UPDATE (live row exists with 86-
--      char placeholder copy; seventh consecutive net-new spec to
--      hit drift after 152q + 152r + 152s + 152t + 152u + 152v.0 +
--      152w + 152w follow-ons).
--   2. No H1 capitalization correction needed (live name matches
--      spec verbatim).
--   3. No prose product-abbreviation correction needed.
--   4. No bullet ingredient-name corrections needed (all 6 live JSONB
--      names match spec verbatim).
--   5. Zero ® brand symbols on any live JSONB ingredients (no carrier
--      brand symbols; differs from 152s 4-® and 152u 1-® patterns).
--   6. Zero apostrophes in description body; no SQL escape needed.
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
    v_new_summary text := 'Six-form magnesium synergy for multi-tissue absorption, muscle and nerve support, and metabolic optimization in a single capsule.';
    v_new_description text := E'## What does Magnesium Synergy Matrix do?\n\nMagnesium Synergy Matrix supports natural magnesium-mediated physiology through three interconnected pillars: absorb through six advanced chelate forms with complementary intestinal absorption pathways and tissue affinities (Magnesium Bisglycinate, Citrate, Malate, Orotate, Taurate, and L-Threonate); support muscle and nerve function through magnesium cofactor activity at the neuromuscular junction, NMDA receptors, GABA-A receptors, and calcium channels (with parallel glycine and taurine carrier benefits from Bisglycinate and Taurate components); and optimize metabolic pathways through Krebs cycle substrate provision (malate carrier), pyrimidine biosynthesis (orotate carrier), Mg-ATP cofactor activity, and CNS magnesium replenishment (L-Threonate BBB penetration). The 6-ingredient capsule provides 150 mg of total active compound weight (approximately 15 mg elemental magnesium) per Size 0 vegetarian capsule, distributed equally across six chelate forms at 25 mg compound weight each. **Sub-clinical synergistic multi-form positioning: this product is intended as ADD-ON to dietary magnesium foundation and primary supplemental magnesium, NOT a primary magnesium replacement at this dose.** All six ingredients are in advanced chelated forms (3 to 8 times more bioavailable than basic magnesium oxide or sulfate); the 10x to 28x liposomal/micellar bioavailability anchor used elsewhere in the Via Cura portfolio does not apply to this product. Designed for adults with magnesium foundations already in place who want tissue-specific multi-form enhancement, especially for cardiovascular, CNS, and metabolic tissue affinities. **Contraindicated in moderate-to-severe renal impairment without nephrologist supervision. Separate from tetracycline antibiotics, fluoroquinolone antibiotics, bisphosphonates, thyroid hormone medications, and penicillamine by 2 to 4 hours.**\n\n## Ingredient breakdown\n\n- **Magnesium Bisglycinate:** Provides magnesium chelated with two glycine amino acids for excellent GI tolerance and high absorption through both passive diffusion and amino-acid transport pathways, with parallel glycine carrier benefits supporting GABA-A receptor modulation for sleep and mild central calming.\n- **Magnesium Citrate:** Provides magnesium citrate salt with moderate solubility and citric acid carrier participating in Krebs cycle, supporting general magnesium absorption with mild osmotic regulation of bowel transit at higher doses.\n- **Magnesium Malate:** Provides magnesium malate salt with malic acid carrier participating in Krebs cycle and the malate-aspartate shuttle for mitochondrial electron transport, supporting cellular ATP production and energy metabolism.\n- **Magnesium Orotate:** Provides magnesium orotate salt with orotic acid carrier participating in pyrimidine biosynthesis for DNA and RNA synthesis, with cardiovascular research base for cardiac DNA repair and membrane phospholipid synthesis support.\n- **Magnesium Taurate:** Provides magnesium chelated with taurine sulfonic amino acid, with parallel taurine carrier benefits supporting cardiac rhythm regulation, calcium handling in cardiomyocytes, blood pressure regulation, and central nervous system calming.\n- **Magnesium L-Threonate:** Provides magnesium with L-threonic acid carrier in the unique form that crosses the blood-brain barrier selectively, raising central nervous system magnesium concentrations preferentially for synaptic density support and cognitive function (typically supplied as the Magtein commercial form developed at MIT).\n\n## Who benefits and what makes this different\n\n**Who benefits:** Adults already on a clinical-dose magnesium supplement who want tissue-specific multi-form enhancement on top of their foundation, people with magnesium-related concerns spanning multiple tissues (cardiovascular plus CNS plus muscular plus metabolic) where single-form magnesium may not address all areas, adults seeking brain magnesium support specifically through the L-Threonate component''s BBB penetration, athletes and active adults seeking cardiovascular and muscular magnesium support through the Orotate plus Taurate plus Malate trio, adults with sleep or stress regulation concerns where the glycine carrier of Bisglycinate provides parallel GABA-A modulation, adults with digestive sensitivity to high-dose magnesium where the multi-form approach reduces the GI laxative effect of any single form, and users whose ViaConnect Bio Optimization Score flags weakness in magnesium-mediated cellular functions. **CRITICAL CONTRAINDICATIONS:** NOT for use in moderate-to-severe chronic kidney disease (eGFR <60), end-stage renal disease, or dialysis without nephrologist supervision (magnesium is excreted by kidneys; impaired excretion can cause hypermagnesemia); NOT for use in acute kidney injury until kidney function recovers; standard medication chelation timing required for tetracycline antibiotics (separate by 2 to 4 hours), fluoroquinolone antibiotics (separate by 2 to 4 hours), bisphosphonates (separate by 2 hours), thyroid hormone medications (separate by 4 hours), penicillamine (separate by 2 hours), and some HIV medications (dolutegravir, raltegravir; separate by 2 to 4 hours); NOT for use during active diarrheal illness (magnesium can worsen diarrhea); NOT for use with myasthenia gravis without prescribing physician supervision; NOT for use with second or third degree heart block without pacemaker; NOT for individuals under 18; pregnancy and lactation generally safe at this sub-clinical dose with prescribing physician consultation; users on high-dose primary magnesium supplements should evaluate whether the Matrix adds meaningful incremental value at sub-clinical levels.\n\n**What makes it different:** What separates Magnesium Synergy Matrix from generic magnesium products is the convergence of six-form chelation diversity in a single capsule (most magnesium products use one or two forms; the Matrix uses six with distinct tissue affinities and mechanism profiles), CNS-penetrating L-Threonate component (rarely included in multi-form products due to cost), cardiovascular-affinity Orotate and Taurate components (most multi-form products focus on Bisglycinate plus Citrate plus Malate only), GI tolerance through multi-form balance (Bisglycinate offsets the mild laxative effect of Citrate), and honest sub-clinical synergistic positioning (the Matrix is openly positioned as a multi-form enhancer add-on rather than a clinical-dose replacement, aligning with Via Cura''s broader synergistic micro-dosing philosophy used in Inferno+ and Flex+ products). Each chelate carrier provides parallel benefits beyond magnesium contribution: glycine (Bisglycinate) supports sleep and mild central calming through GABA-A and glycine receptor agonism; taurine (Taurate) supports cardiac rhythm, calcium handling, and CNS calming; malate (Malate) participates in Krebs cycle as energy substrate; orotate (Orotate) supports pyrimidine biosynthesis for DNA repair; citrate (Citrate) participates in Krebs cycle and provides mild alkalinizing effect; threonate (L-Threonate) is a vitamin C metabolite with selective BBB penetration. Magnesium Synergy Matrix is positioned as the protocol engine response of choice when the ViaConnect Bio Optimization Score flags weakness in magnesium-mediated cellular functions and the user has primary magnesium foundation already in place. Practitioner-guided use under healthcare professional supervision recommended given renal impairment contraindication and medication chelation interactions; users with documented magnesium deficiency should use clinical-dose magnesium (200 to 400 mg elemental per day) as primary intervention, with the Matrix as multi-form synergy enhancer.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'magnesium-synergy-matrix'
      AND p.sku = 'FC-MAG-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152x Magnesium Synergy Matrix update skipped: row not found at slug magnesium-synergy-matrix / SKU FC-MAG-001';
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
        '152x_magnesium_synergy_matrix_revision',
        'products',
        'FC-MAG-001',
        v_product_id,
        jsonb_build_object(
            'method', 'rev2_structured_description_lane2_reconciled_per_152p_canonical_INSERT_to_UPDATE_conversion_no_pre_flight_required',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'rev2_structured_pdp_152p_canonical_lane2',
            'authority', 'Gary canonical 2026-05-07 Prompt #152x (Lane A: convert spec INSERT to UPDATE; live row already exists with 6-ingredient 150 mg compound formulation matching authoritative; cleanest 152x reconciliation in new-product series with only 1 Lane 2 correction)',
            'spec_premise_drift_correction', 'Spec authored as INSERT for net-new product. Live row already at 6/150mg compound formulation matching authoritative. Spec INSERT premise incorrect against live data (seventh consecutive 152x net-new spec to hit live-row drift after 152q + 152r + 152s + 152t + 152u + 152v.0 + 152w). Migration converted to UPDATE Lane 2 reconciliation. Cleanest reconciliation in new-product series (1 Lane 2 vs 5-8 in prior 152x prompts).',
            'marshall_scan', 'NOT REQUIRED per spec (no peptide content); zero hits regardless; all 6 ingredients are mineral chelates with amino-acid carriers (glycine for Bisglycinate, taurine for Taurate) or organic acid carriers (malate, orotate, citrate, threonate) that are NOT peptide drugs',
            'hannah_pre_flight', 'NOT REQUIRED per feedback_clinical_preflight_pattern.md (no peptides, no special-population product category, low clinical bar for sub-clinical chelated mineral product); standard post-draft Jeffery review chain applied instead',
            'bioavailability_format', '10x to 28x DOES NOT APPLY (zero of 6 in liposomal/micellar; first 152 series product with PURE chelation-form bioavailability narrative). Joins 152d (powder), 152f BHB (tablet), 152r Electrolyte Blend (tablet) in DOES-NOT-APPLY anchor matrix entry but distinguished by chelation-form bioavailability story (3-8x more bioavailable than basic Mg oxide/sulfate). Auto-remediator allowlist: "10x to 28x" framed in negative form ("does not apply") passes both Michelangelo + Jeffery 5-27x blocks.',
            'sku_verify_outcome', 'FC-MAG-001 canonical FC-prefix; same as 152o-rev2 + 152e-rev2 + 152q + 152r + 152s + 152t + 152u + 152v.0 + 152w patterns',
            'lane2_corrections', jsonb_build_array(
                'Migration shape: INSERT -> UPDATE (live row exists with 86-char placeholder copy, same as 152q + 152r + 152s + 152t + 152u + 152v.0 + 152w + 152o pattern; seventh consecutive net-new spec to hit drift)',
                'No H1 capitalization correction needed (live name Magnesium Synergy Matrix matches spec H1 verbatim)',
                'No prose product-abbreviation correction needed',
                'No bullet ingredient-name corrections needed (all 6 live JSONB names Magnesium Bisglycinate/Citrate/Malate/Orotate/Taurate/L-Threonate match spec verbatim; differs from 152s + 152u where bullet renames were needed)',
                'Zero brand registered marks on any live JSONB ingredients (no Magtein® - L-Threonate stays generic per live JSONB; differs from 152s 4-marks and 152u 1-mark Bioperine pattern)',
                'Zero straight-apostrophes in description body except possessive contractions ("component''s", "Cura''s") which are SQL-escaped via doubled apostrophe per standard PostgreSQL string-literal escape',
                'No em/en-dashes, no parenthetical " - " asides, all compound modifiers use ASCII hyphen-minus, all ranges in X-to-Y form per feedback_no_dashes.md compliance'
            ),
            'product_name', 'Magnesium Synergy Matrix',
            'three_pillar_positioning', 'Absorb | Support | Optimize',
            'live_ingredient_total_mg_compound_per_capsule', 150,
            'live_ingredient_count', 6,
            'live_format', 'capsule',
            'live_status_tag', 'NONE (TIER not assigned)',
            'live_category_slug', 'base-formulations',
            'live_carrier_breakdown', '0 liposomal + 0 micellar + 6 plain chelates with amino-acid or organic-acid carriers (Bisglycinate, Citrate, Malate, Orotate, Taurate, L-Threonate); whole-formula carrier anchor 10x to 28x DOES NOT APPLY; chelation-form bioavailability narrative substituted (3-8x more bioavailable than basic Mg oxide/sulfate)',
            'cross_product_reference', 'Synergistic micro-dosing philosophy alignment with 152 series Inferno+ + Flex+ products; differentiation from Catalyst+ (multi-mineral multivitamin) + Electrolyte Blend (broader electrolyte profile) + standalone clinical-dose Mg supplements (Inferno+ BHB Salts contain Mg but at sub-clinical Mg level)',
            'spec_source_doc_legacy_artifacts_dropped', 'FarmCeutica Inc + FarmCeutica Wellness Ltd + Building Performance Through Science tagline + source-doc Section 9 "Micellar and liposomal components enhance aqueous dispersion" copy-paste artifact + Packaging Specs "150mg liposomal+ micellar powder" copy-paste artifact + "150mg powder additive" dosing protocol language + excessive hedging language all NOT in reconciled copy',
            'four_formulator_confirmation_flags', jsonb_build_array(
                'FLAG 1 (CRITICAL, formulator confirmation required): Path 2 dose interpretation locked (25 mg compound per chelate yielding ~15 mg elemental Mg per cap); only physically buildable single-capsule interpretation given source-doc Size 00 with 150 mg fill weight; deferred to 152x.5 follow-up',
                'FLAG 2 (MEDIUM, formulator confirmation required): source-doc Section 9 + Packaging Specs liposomal/micellar references treated as copy-paste artifacts (live JSONB has plain chelates matching this assumption); deferred to 152x.6 follow-up',
                'FLAG 3 (LOW, formulator confirmation required): capsule Size 0 vegetarian recommended for series consistency vs source-doc Size 00; deferred to 152x.7 follow-up',
                'FLAG 4 (LOW, formulator confirmation required): Magnesium L-Threonate generic vs Magtein-branded (AIDP); live JSONB just says generic Magnesium L-Threonate; PDP body says "typically supplied as the Magtein commercial form developed at MIT" which assumes Magtein but does not require it; deferred to 152x.8 follow-up'
            ),
            'rev2_canonical_pattern', 'feedback_152p_canonical_for_all_formulation_updates',
            'fourteenth_152x_rev2_under_standing_rule', 'true (after 152e/f/i/k/l/n/o-rev2 + 152q + 152r + 152s + 152t + 152u + 152v.0 + 152w)',
            'positioning_disclosure', 'SUB-CLINICAL SYNERGISTIC MULTI-FORM ENHANCER, NOT primary magnesium replacement; ADD-ON to dietary and primary supplemental Mg foundation; joins 152 series synergistic micro-dosing philosophy alongside Inferno+ + Flex+; first single-mineral synergy product in 152 series; first product with PURE chelation-form bioavailability narrative',
            'comprehensive_contraindications', 'RENAL (CKD eGFR<60 + ESRD + dialysis + AKI; nephrologist supervision required), MEDICATION CHELATION TIMING (tetracyclines 2-4h + fluoroquinolones 2-4h + bisphosphonates 2h + thyroid hormone 4h + penicillamine 2h + some HIV meds dolutegravir/raltegravir 2-4h), GI (active diarrheal illness; Mg worsens diarrhea), NEUROMUSCULAR (myasthenia gravis), CARDIAC (second/third degree heart block without pacemaker), PEDIATRIC (under 18), PREGNANCY/LACTATION (generally safe at sub-clinical dose with prescriber consultation)',
            'unique_152x_attributes', jsonb_build_array(
                'First single-mineral synergy product in 152 series',
                'First product with PURE chelation-form bioavailability narrative (zero liposomal/micellar)',
                'Cleanest 152x reconciliation in new-product series (1 Lane 2 correction vs 3-8 in prior)',
                'No Hannah pre-flight required (no peptides, no special-population)',
                'No Marshall scan required (no peptide drugs)',
                'No WADA disclosure required (no banned substances)',
                'Live row pre-populated for 152x.1/2/4 (pricing $58.88, image, master_sku 05) - only 152x.3 + 152x.5-8 genuinely deferred',
                'Available on mainstream supplement retailers (subject to standard MSRP/MAP) - distinct from 152w distribution restrictions'
            )
        )
    );

    RAISE NOTICE '#152x Magnesium Synergy Matrix update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
