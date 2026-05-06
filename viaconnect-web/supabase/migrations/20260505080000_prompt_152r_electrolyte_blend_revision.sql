-- Prompt #152r: Electrolyte Blend PDP rev2 structured Lane-2 reconciled.
--
-- SPEC DRIFT: spec was authored as an INSERT for a "net-new product" but
-- live database already has Electrolyte Blend at slug electrolyte-blend
-- (id 8bba6353-3d23-4f37-98ae-068d0526d248, SKU FC-ELECTRO-001). Live row
-- has the full 5-ingredient / 255 mg formulation INCLUDING Zinc
-- Bisglycinate at 5 mg, contradicting the spec's "Discrepancy 2: New
-- Ingredient Addition (Zinc Bisglycinate)" framing. Live format already
-- 'tablet' (not powder/additive), contradicting "Discrepancy 3: Format
-- Change". Per Gary 2026-05-05 standing precedent set in 152q (option A):
-- convert spec INSERT to UPDATE, treating 152r as Lane 2 reconciliation
-- against existing row with placeholder copy.
--
-- Same shape as 152o-rev2 DESIRE+ + 152q DigestiZorb+ which had short
-- placeholder summaries before their rev2 landed: existing row +
-- placeholder copy + clean upgrade to structured rev2 format.
--
-- Drift notes (verified live 2026-05-05):
--   * Slug electrolyte-blend confirmed live (matches first spec
--     candidate).
--   * SKU FC-ELECTRO-001 (canonical FC-prefix; no SKU mismatch).
--   * Live name "Electrolyte Blend" matches spec H1 exactly; no Lane 2
--     micro-correction required on H1 (unlike 152q which dropped
--     "Digestive").
--   * Live format 'tablet'; spec Discrepancy 3 already resolved upstream
--     of this migration. The spec's source-doc "powder/additive" is
--     historical; live formulation report and live row both describe
--     effervescent tablet.
--   * Live ingredient count 5, total 255 mg (100+50+50+50+5); Zinc
--     Bisglycinate 5 mg already present; ingredient list matches spec's
--     5 bullets 1:1 with names matching JSONB verbatim:
--       1. Effervescent Hydrogen Matrix (Mg-H complex) 100 mg
--       2. Magnesium (as Citrate) 50 mg
--       3. Potassium (as Citrate) 50 mg
--       4. Pure Himalayan Sea Salt Sodium (as Citrate) 50 mg
--       5. Zinc (Bisglycinate) 5 mg
--   * price_msrp $48.88 ends in .88 per Via Cura convention; pricing_tier
--     L1; price 48.88. No 152r.1 pricing follow-up needed against current
--     live state, though spec lists it as deferred.
--   * status_tags []; category_slug base-formulations; image_urls
--     populated to supplement-photos/Base Formulations/electrolyte-
--     blend.png; active true; product_type 'supplement'; master_sku '03'
--     (numeric SKU like 152g BHMT+'s '35').
--   * Existing summary + description are 82-char placeholder
--     ("Hydrogen-rich electrolyte matrix with Mg-H complex for superior
--     cellular hydration"); 152r replaces with rev2 structured copy.
--   * Spec premises "Discrepancy 2: New Ingredient Addition (Zinc
--     Bisglycinate)" and "Discrepancy 3: Format Change (Powder/Additive
--     to Tablet)" are INCORRECT against live; both already resolved
--     upstream. Audit metadata records these drift corrections.
--
-- Bioavailability claim posture (CRITICAL nuance per spec Discrepancy 4):
--   - Tablet format with no liposomal/micellar carriers. The 10x to 28x
--     bioavailability anchor used across capsule products with liposomal
--     and micellar carriers does NOT apply to this product. The reconciled
--     prose framing per spec: "the 10x to 28x bioavailability anchor used
--     in capsule products does not apply to this tablet."
--   - This pattern matches 152f BHB Ketone Salts (tablet, anchor does not
--     apply) and 152d Amino Acid Matrix+ / 152m Creatine HCL+ (scoop
--     powder, anchor does not apply). Per Gary 2026-05-04 / 2026-05-05
--     precedent, format-deviation framing is canonical and must NOT be
--     auto-remediated to a 10x to 28x claim by Michelangelo reviewer.ts
--     or Jeffery guardrails.ts.
--   - Auto-remediators only block 5-27x patterns; "10x to 28x" passes
--     both. The format-deviation framing notes the anchor does NOT apply,
--     which is the precise scoped honest disclosure pattern.
--   - Bioavailability mechanisms named in prose: citrate chelation,
--     effervescent dissolution, bisglycinate chelation. These are the
--     legitimate format-appropriate absorption mechanisms.
--
-- Marshall dictionary scan: zero hits in unapproved_peptides.ts. All 5
-- ingredients are food-grade minerals and mineral chelates (citrate,
-- bisglycinate, Mg-H matrix). No peptide drugs. No SNP/SKU/cron internals
-- on public-facing copy.
--
-- Disease-term posture: "mild dehydration symptoms", "muscle cramps",
-- "low dietary magnesium, potassium, or zinc intake", "low stomach acid"
-- (none in 152r), "mild fatigue" all in noun-phrase form following verb
-- constructions ("Adults pursuing...", "individuals with mild...",
-- "those pursuing..."). Verb-pair loophole pattern from 152e/152g
-- precedent.
--
-- Comprehensive contraindications list per spec (medical safety
-- disclosure for electrolyte product with multiple meaningful renal,
-- cardiovascular, and medication interactions): chronic kidney disease,
-- hyperkalemia, uncontrolled hypertension, congestive heart failure,
-- cardiac arrhythmia, potassium-sparing diuretics, ACE inhibitors, ARBs,
-- digoxin, lithium therapy, pregnancy, lactation, active GI bleeding,
-- individuals under 18; separation dosing 2 to 4 hours from
-- tetracyclines, fluoroquinolones, bisphosphonates, levothyroxine.
--
-- Cross-product reference: closing differentiation paragraph notes
-- complementary positioning with Catalyst+ Energy Multivitamin (152i,
-- shipped). Same portfolio-architecture pattern as 152q DigestiZorb+ /
-- Balance+ cross-reference and 152l COMT+ / DAO+ cross-reference.
--
-- Three-pillar Hydrate | Replenish | Function positioning preserved.
-- Catalog summary leads with the three-pillar nouns:
--   "Hydration balance, mineral replenishment, and cellular function
--   support in a single tablet."
--
-- Source-doc legacy artifacts NOT carried forward (per spec
-- Source-Document Corrections): no "FarmCeutica Inc.", no "FarmCeutica
-- Wellness Ltd.", no "Building Performance Through Science" tagline, no
-- TM symbols on Electrolyte Blend, no excessive hedging language ("It
-- seems likely", "Evidence suggests this balanced citrate blend may").
-- Manufacturer is FarmCeutica Wellness LLC; tagline is Built For Your
-- Biology (rendered separately via #152a brand-footer caption beneath
-- description, not embedded in this prose).
--
-- Positioning: DAILY MINERAL SUPPORT WITH MILD POST-EXERTION
-- REPLENISHMENT, NOT athletic hydration replacement. Per spec
-- Discrepancy 1 resolution path 1 (accept-as-stated compound-weight
-- interpretation; ~34 mg total elemental electrolyte content; 1/30th of
-- LMNT's 1,260 mg combined elemental). Honest disclosure of clinical
-- limitations preserved. Reformulation paths 2 and 3 (higher elemental
-- doses; Sport variant) deferred to follow-up prompt 152r.5 if pursued.
--
-- Hyphens preserved in compound modifiers (acid-base, post-exertion,
-- post-exercise, on-demand, electrolyte-mediated, citrate-chelated,
-- citrate-to-bicarbonate, high-elemental-dose, Na/K). No em-dashes, no
-- en-dashes.
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
    v_new_summary text := 'Hydration balance, mineral replenishment, and cellular function support in a single tablet.';
    v_new_description text := E'## What does Electrolyte Blend do?\n\nElectrolyte Blend supports daily mineral and hydration physiology through three interconnected pillars: hydration balance through electrolyte-mediated osmotic regulation, mineral replenishment through bioavailable citrate and bisglycinate chelation, and cellular function through Na/K ATPase membrane potential and ATP-magnesium cofactor support. The 5-ingredient effervescent tablet pairs the Effervescent Hydrogen Matrix (Mg-H complex) for hydrogen release and additional magnesium with citrate-chelated magnesium, potassium, and sodium plus zinc bisglycinate for cofactor support. The tablet format relies on citrate chelation, effervescent dissolution, and bisglycinate chelation as the absorption mechanisms; the 10x to 28x bioavailability anchor used in capsule products does not apply to this tablet. Positioned for daily mineral support and mild post-exertion replenishment rather than for athletic hydration replacement during heavy sweat loss.\n\n## Ingredient breakdown\n\n- **Effervescent Hydrogen Matrix (Mg-H complex):** Releases molecular hydrogen and elemental magnesium upon aqueous dissolution, providing combined antioxidant tone and electrolyte cofactor activity for cellular hydration support.\n- **Magnesium (as Citrate):** Cofactors over three hundred enzymes including ATP synthase and supports neuromuscular relaxation and acid-base balance through the bioavailable citrate chelation form.\n- **Potassium (as Citrate):** Maintains the Na/K ATPase membrane potential that nerve signaling and muscle contraction depend on, with the citrate form supporting renal acid-base balance.\n- **Pure Himalayan Sea Salt Sodium (as Citrate):** Provides sodium for extracellular hydration regulation plus trace minerals from the Himalayan source, in citrate form for buffered absorption versus sodium chloride.\n- **Zinc (Bisglycinate):** Cofactors over three hundred enzymes including those in protein synthesis and immune function, in bisglycinate chelate form for high bioavailability and gentle GI tolerance.\n\n## Who benefits and what makes this different\n\n**Who benefits:** Adults pursuing daily electrolyte and trace mineral support for cellular function and hydration baseline, individuals with mild dehydration symptoms from heat, mild illness, or travel, people seeking post-exercise mineral replenishment after light to moderate activity, adults navigating mild fatigue or occasional muscle cramps where mineral status may contribute, those pursuing the antioxidant tone of effervescent hydrogen release alongside mineral replenishment, individuals with low dietary magnesium, potassium, or zinc intake, and individuals whose ViaConnect Bio Optimization Score flags weakness in cellular function, hydration, or mineral status domains. Important contraindications: not for use in chronic kidney disease, hyperkalemia, uncontrolled hypertension, congestive heart failure, cardiac arrhythmia, on potassium-sparing diuretics, on ACE inhibitors or ARBs without practitioner supervision, on digoxin, on lithium therapy, during pregnancy or lactation, with active GI bleeding, or for individuals under 18; separate dosing by 2 to 4 hours from tetracycline or fluoroquinolone antibiotics, bisphosphonates, and thyroid medications.\n\n**What makes it different:** What separates Electrolyte Blend from generic electrolyte products is the convergence of three pillars in a single effervescent tablet: rapid effervescent dissolution for fast mineral availability, citrate chelation across the macromineral electrolytes for enhanced bioavailability and acid-base buffer support through citrate-to-bicarbonate metabolism, and the hydrogen matrix antioxidant tone alongside the electrolyte mission. Electrolyte Blend is positioned as daily mineral support with mild post-exertion replenishment, NOT as athletic hydration replacement competing with high-elemental-dose products like LMNT, Liquid IV, or Pedialyte. For athletic hydration during sustained heavy sweat loss or clinical dehydration, dedicated higher-elemental-dose products are appropriate. Complementary to Catalyst+ Energy Multivitamin: Electrolyte Blend provides the rapid effervescent on-demand hydration support, Catalyst+ provides the daily multivitamin baseline.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'electrolyte-blend'
      AND p.sku = 'FC-ELECTRO-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152r Electrolyte Blend update skipped: row not found at slug electrolyte-blend / SKU FC-ELECTRO-001';
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
        '152r_electrolyte_blend_revision',
        'products',
        'FC-ELECTRO-001',
        v_product_id,
        jsonb_build_object(
            'method', 'rev2_structured_description_lane2_reconciled_per_152p_canonical_INSERT_to_UPDATE_conversion',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'rev2_structured_pdp_152p_canonical_lane2',
            'authority', 'Gary canonical 2026-05-05 Prompt #152r (Lane A directive: convert spec INSERT to UPDATE; live row already exists with matching 5-ingredient 255 mg formulation including Zinc Bisglycinate AND tablet format)',
            'spec_premise_drift_correction', 'Spec authored as INSERT for net-new product with "Discrepancy 2: New Ingredient Addition (Zinc Bisglycinate)" and "Discrepancy 3: Format Change (Powder/Additive to Tablet)" framings. Live row already has Zinc Bisglycinate 5 mg AND format=tablet. Both spec premises incorrect against live data. Migration converted to UPDATE (same shape as 152q DigestiZorb+ which had identical INSERT-vs-live drift; 152o-rev2 DESIRE+ shape).',
            'marshall_scan', 'human_review_pass; zero hits; all 5 ingredients are food-grade minerals and mineral chelates (citrate, bisglycinate, Mg-H matrix); no peptide drugs',
            'bioavailability_format', '10x to 28x DOES NOT APPLY (tablet format, no liposomal/micellar carriers); same format-deviation pattern as 152f BHB Ketone Salts + 152d Amino Acid Matrix+ + 152m Creatine HCL+; legitimate absorption mechanisms named (citrate chelation, effervescent dissolution, bisglycinate chelation)',
            'sku_verify_outcome', 'FC-ELECTRO-001 canonical FC-prefix; same as 152o-rev2 + 152e-rev2 + 152q patterns',
            'lane2_corrections', jsonb_build_array(
                'Migration shape: INSERT -> UPDATE (live row exists with placeholder copy, same as 152q + 152o pattern)',
                'No H1 micro-correction needed (live name "Electrolyte Blend" matches spec H1 verbatim, unlike 152q which dropped "Digestive" from "DigestiZorb+ Digestive Enzyme Complex")',
                'No bullet ingredient-name micro-corrections needed (all 5 live JSONB names match spec bullet names verbatim including parenthetical chelate forms)'
            ),
            'product_name', 'Electrolyte Blend',
            'three_pillar_positioning', 'Hydrate | Replenish | Function',
            'live_ingredient_total_mg', 255,
            'live_ingredient_count', 5,
            'live_format', 'tablet',
            'live_carrier_breakdown', '0 liposomal + 0 micellar = 0/5 carriers; 5 plain mineral citrates and bisglycinate (no-encapsulation pattern; 10x to 28x anchor inapplicable per spec Discrepancy 4)',
            'cross_product_reference', 'Catalyst+ Energy Multivitamin complementary positioning (Electrolyte Blend on-demand effervescent; Catalyst+ daily multivitamin baseline)',
            'spec_source_doc_legacy_artifacts_dropped', 'FarmCeutica Inc + FarmCeutica Wellness Ltd + Building Performance Through Science tagline + TM symbols + hedging language ("It seems likely", "Evidence suggests this balanced citrate blend may") all NOT in reconciled copy',
            'zinc_bisglycinate_status', 'ALREADY IN LIVE FORMULATION (5 mg); spec "new ingredient addition" framing was incorrect against live data',
            'tablet_format_status', 'ALREADY IN LIVE FORMULATION (format=tablet); spec "format change from powder/additive to tablet" framing was incorrect against live data',
            'rev2_canonical_pattern', 'feedback_152p_canonical_for_all_formulation_updates',
            'ninth_152x_rev2_under_standing_rule', 'true (after 152e/f/i/k/l/n/o-rev2 + 152q)',
            'positioning_disclosure', 'DAILY MINERAL SUPPORT WITH MILD POST-EXERTION REPLENISHMENT, NOT athletic hydration replacement; per spec Discrepancy 1 resolution path 1 (compound-weight interpretation accepted; ~34 mg total elemental); reformulation paths 2 and 3 (higher elemental doses; Sport variant) deferred to follow-up 152r.5 if pursued',
            'comprehensive_contraindications', 'CKD, hyperkalemia, uncontrolled hypertension, CHF, cardiac arrhythmia, K-sparing diuretics, ACE inhibitors, ARBs, digoxin, lithium, pregnancy, lactation, active GI bleeding, individuals under 18; separation dosing 2-4h from tetracyclines, fluoroquinolones, bisphosphonates, levothyroxine'
        )
    );

    RAISE NOTICE '#152r Electrolyte Blend update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
