-- Prompt #152q: DigestiZorb+ Enzyme Complex PDP rev2 structured Lane-2 reconciled.
--
-- SPEC DRIFT: spec was authored as an INSERT for a "net-new product" but
-- live database already has DigestiZorb+ Enzyme Complex at slug
-- digestizorb-plus-enzyme-complex (id 92da890e-30a9-449c-80cc-9dadb8cfa868,
-- SKU FC-DIGEST-001). Live row has the full 11-ingredient / 85 mg
-- formulation INCLUDING Liposomal Pepsin at 5 mg, contradicting the spec's
-- "Critical Issue 1: New Ingredient Addition (Liposomal Pepsin)" framing.
-- Per Gary directive 2026-05-05 (option A): convert spec INSERT to UPDATE,
-- treating 152q as Lane 2 reconciliation against existing row with
-- placeholder copy (71-char summary + description).
--
-- Same shape as 152o-rev2 DESIRE+ which had 50-char placeholders before
-- its rev2 landed: existing row + placeholder copy + clean upgrade to
-- structured rev2 format.
--
-- Lane 2 corrections (2 micro-corrections vs spec text):
--   1. Description H1: "## What does DigestiZorb+ Digestive Enzyme
--      Complex do?" -> "## What does DigestiZorb+ Enzyme Complex do?"
--      (drop "Digestive" to match live name "DigestiZorb+ Enzyme Complex")
--   2. Bullet 11: "Black Pepper Extract (Bioperine, 95% piperine):" ->
--      "Black Pepper Extract (Bioperine®):" (match live JSONB name; ®
--      preserved per 152e/n/o-rev2 precedent which preserves trademark
--      symbols when live has them, contra spec's stated "drop R" rule)
--
-- Drift notes (verified live 2026-05-05):
--   * Slug digestizorb-plus-enzyme-complex confirmed live (matches first
--     spec candidate).
--   * SKU FC-DIGEST-001 (canonical FC-prefix; no SKU mismatch).
--   * Live name "DigestiZorb+ Enzyme Complex" (NOT "DigestiZorb+ Digestive
--     Enzyme Complex" as spec proposes). Reconciled H1 matches live.
--   * Live ingredient count 11, total 85 mg (15+20+10+10+5+5+5+5+3+5+2);
--     Liposomal Pepsin 5 mg already present; ingredient list matches
--     spec's 11 bullets 1:1.
--   * price_msrp $48.88 ends in .88 per convention.
--   * status_tags ["TIER 3"], category_slug advanced-formulas, image_url
--     populated, active true.
--   * Existing summary + description are 71-char placeholder
--     ("Full-spectrum digestive enzyme complex for malabsorption and
--     gut health"); 152q replaces with rev2 structured copy.
--   * Spec premise "Critical Issue 1: New Ingredient Addition (Liposomal
--     Pepsin)" is INCORRECT against live; pepsin is already in formula.
--     Audit metadata records this drift correction.
--
-- Bioavailability claim posture (CRITICAL nuance per spec):
--   - Partial encapsulation pattern: only 2 of 11 ingredients have
--     Liposomal/Micellar carrier prefix (Liposomal Pepsin + Micellar
--     Ginger Root Extract). The other 9 are uncoated enzymes/extracts
--     standard for digestive enzyme products and protected by capsule
--     shell during gastric transit.
--   - "10x to 28x" multiplier APPLIES SPECIFICALLY to those 2 encapsulated
--     compounds, NOT to the whole formula. Reconciled prose framing:
--     "The 10x to 28x bioavailability anchor applies specifically to the
--     Liposomal Pepsin and Micellar Ginger Root Extract; the other 9
--     ingredients use uncoated enzyme and extract forms."
--   - Auto-remediators (Michelangelo reviewer.ts:190 + Jeffery
--     guardrails.ts:83) only block 5-27x patterns; "10x to 28x" passes
--     both. The partial-encapsulation framing is a precise scoped claim,
--     not a violation of the substantiation rule.
--   - Per feedback_pdp_multiplier_claim_substantiation: claim is
--     authorized when at least one live ingredient has Liposomal or
--     Micellar carrier prefix. 2 ingredients qualify here.
--
-- Marshall dictionary scan: zero hits in unapproved_peptides.ts. All 11
-- ingredients are food-grade enzymes (protease, amylase, lipase, lactase,
-- cellulase, bromelain, papain, pepsin) and herbal extracts (ginger,
-- fennel, black pepper Bioperine®). Pepsin is a digestive enzyme, not
-- a peptide drug; not on Marshall list.
--
-- Disease-term posture: "occasional bloating, gas, or incomplete
-- digestion symptoms", "mild lactose or fiber sensitivity", "low stomach
-- acid", "age-related decline in endogenous enzyme production" all in
-- noun-phrase form following verb constructions ("Adults with...",
-- "individuals with...", "those pursuing...").
--
-- Comprehensive contraindications list preserved per spec: pregnancy,
-- lactation, active PUD, gastritis, IBD flare, pancreatic insufficiency,
-- PPI therapy, anticoagulants, antiplatelets, bromelain/papain allergy,
-- latex-fruit syndrome, severe GERD, individuals under 18. PPI
-- interaction note (pepsin requires acidic gastric pH for activation,
-- suppressed in PPI therapy) is implicit in the contraindication list.
-- Drug-class contraindication mentions are appropriate medical safety
-- disclosure for digestive enzyme product with multiple meaningful
-- interactions.
--
-- Cross-product reference: closing differentiation paragraph notes
-- complementary positioning with Balance+ Gut Repair (DigestiZorb+ during
-- meals; Balance+ between meals). Same portfolio-architecture pattern
-- as 152l COMT+ DAO+ cross-reference and 152j CBS Support+ pattern.
--
-- Three-pillar Absorb | Comfort | Optimize positioning preserved.
--
-- Source-doc legacy artifacts NOT carried forward (per spec): no
-- "FarmCeutica Inc.", no "FarmCeutica Wellness Ltd.", no "Building
-- Performance Through Science", no "20-30%" absorption percentage claim,
-- no excessive hedging language ("evidence suggests this enzyme-herbal
-- synergy may"), no TM symbols on DigestiZorb+. Bioperine® R preserved
-- per live name (overrides spec's "drop R" directive).
--
-- Hyphens preserved in compound modifiers (acid-stable, fat-soluble,
-- broad-spectrum, anti-inflammatory, in-meal, between-meal, pre-meal,
-- single-enzyme, pure-enzyme, age-related, gas-relieving, latex-fruit,
-- lipase-mediated, brush-border, sulfhydryl, post-meal). No em-dashes,
-- no en-dashes.
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
    v_new_summary text := 'Nutrient absorption, gut comfort, and digestive optimization support in a single capsule.';
    v_new_description text := E'## What does DigestiZorb+ Enzyme Complex do?\n\nDigestiZorb+ targets the in-meal digestive process through three interconnected pillars: nutrient absorption through broad-spectrum macronutrient enzyme breakdown, gut comfort through anti-inflammatory enzymes and herbal soothing botanicals, and digestive optimization through bioavailability enhancement and partial liposomal/micellar delivery. The 11-ingredient capsule pairs all four macronutrient enzymes (protease, amylase, lipase, lactase) plus cellulase for fiber tolerance with anti-inflammatory enzymes (bromelain, papain), gastric phase support through Liposomal Pepsin, smooth muscle relaxation through Micellar Ginger and Fennel, and Bioperine bioavailability enhancement. The 10x to 28x bioavailability anchor applies specifically to the Liposomal Pepsin and Micellar Ginger Root Extract; the other 9 ingredients use uncoated enzyme and extract forms standard for digestive enzyme products and protected by the capsule shell during gastric transit.\n\n## Ingredient breakdown\n\n- **Amylase:** Hydrolyzes starches and complex carbohydrates into oligosaccharides for further breakdown by brush-border enzymes, the highest-dose enzyme reflecting carbohydrate-heavy meal content.\n- **Protease (acid-stable blend):** Hydrolyzes proteins into peptides and amino acids; the acid-stable specification preserves enzyme activity through gastric transit for continued small intestinal action.\n- **Lipase:** Hydrolyzes triglycerides into fatty acids and monoglycerides, supporting fat-soluble vitamin (A, D, E, K) absorption that depends on micelle formation.\n- **Lactase:** Hydrolyzes lactose into glucose and galactose, supporting lactose tolerance for individuals with mild lactase insufficiency at this supportive dose.\n- **Cellulase:** Degrades cellulose and plant cell walls, releasing nutrients trapped within plant matrix and supporting tolerance for raw vegetables, beans, and cruciferous foods.\n- **Bromelain (from Pineapple extract):** A sulfhydryl protease that hydrolyzes proteins and provides anti-inflammatory tone through fibrinolytic and bradykinin-modulating activity.\n- **Papaya Extract (Papain enzyme):** A cysteine protease that complements bromelain through similar proteolytic and anti-inflammatory mechanisms via plant cysteine protease activity.\n- **Liposomal Pepsin:** Provides gastric phase protein digestion in liposomal form that protects the enzyme through transit, particularly relevant for older adults and individuals with low stomach acid output.\n- **Micellar Ginger Root Extract (10:1):** Supports gastric motility, reduces nausea, and provides carminative gas-relieving activity through gingerols and shogaols delivered in micellar form for absorption.\n- **Fennel Seed Extract (4:1):** Supports smooth muscle relaxation in the GI tract through anethole and terpenoid compounds, reducing post-meal bloating and intestinal spasm.\n- **Black Pepper Extract (Bioperine®):** Inhibits intestinal and hepatic UDP-glucuronosyltransferase and CYP3A4 enzymes, extending systemic exposure for the enzyme and herbal components.\n\n## Who benefits and what makes this different\n\n**Who benefits:** Adults with occasional bloating, gas, or incomplete digestion symptoms, individuals with mild lactose or fiber sensitivity, adults over 50 navigating age-related decline in endogenous enzyme production, those pursuing nutrient absorption optimization during meals, individuals with low stomach acid where supplemental pepsin in liposomal form contributes to protein digestion, adults pursuing digestive comfort during travel or unusual food volume, and individuals whose ViaConnect Bio Optimization Score flags weakness in the digestive function, nutrient absorption, or gut comfort domains. Important contraindications: not for use during pregnancy or lactation, with active peptic ulcer disease or gastritis, on PPI therapy, on anticoagulant or antiplatelet medications, with bromelain or papain allergies, with pancreatic insufficiency requiring prescription enzyme replacement therapy, or for individuals under 18.\n\n**What makes it different:** What separates DigestiZorb+ from single-enzyme products or generic digestive blends is the convergence of three pillars in a single capsule: broad-spectrum macronutrient coverage including the rare gastric phase pepsin support, anti-inflammatory enzyme tone through bromelain and papain, and herbal soothing through Micellar Ginger and Fennel that addresses the gut motility and comfort dimension pure-enzyme products miss. DigestiZorb+ is complementary to Balance+ Gut Repair: DigestiZorb+ supports in-meal digestion when food is being processed; Balance+ supports between-meal gut barrier repair and microbiome modulation. Take with the first bite of food, not after meals; pre-meal timing is critical for enzyme effectiveness.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'digestizorb-plus-enzyme-complex'
      AND p.sku = 'FC-DIGEST-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152q DigestiZorb+ update skipped: row not found at slug digestizorb-plus-enzyme-complex / SKU FC-DIGEST-001';
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
        '152q_digestizorb_plus_enzyme_complex_revision',
        'products',
        'FC-DIGEST-001',
        v_product_id,
        jsonb_build_object(
            'method', 'rev2_structured_description_lane2_reconciled_per_152p_canonical_INSERT_to_UPDATE_conversion',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'rev2_structured_pdp_152p_canonical_lane2',
            'authority', 'Gary canonical 2026-05-05 Prompt #152q (Lane A directive: convert spec INSERT to UPDATE; live row already exists with matching 11-ingredient 85 mg formulation including Liposomal Pepsin)',
            'spec_premise_drift_correction', 'Spec authored as INSERT for net-new product with "Critical Issue 1: New Ingredient Addition (Liposomal Pepsin)" framing. Live row already has Liposomal Pepsin 5 mg. Spec premise incorrect against live data. Migration converted to UPDATE (same shape as 152o-rev2 DESIRE+ which had placeholder copy before rev2 landed).',
            'marshall_scan', 'human_review_pass; zero hits; all 11 ingredients are food-grade enzymes/extracts; pepsin is digestive enzyme not peptide drug',
            'bioavailability_format', '10x to 28x SCOPED to Liposomal Pepsin + Micellar Ginger Root Extract only (2 of 11 carrier-prefixed); partial-encapsulation pattern; whole-formula multiplier explicitly NOT claimed',
            'sku_verify_outcome', 'FC-DIGEST-001 canonical FC-prefix; same as 152o-rev2 + 152e-rev2 patterns',
            'lane2_corrections', jsonb_build_array(
                'Migration shape: INSERT -> UPDATE (live row exists with placeholder copy, same as 152o pattern)',
                'Description H1: "## What does DigestiZorb+ Digestive Enzyme Complex do?" -> "## What does DigestiZorb+ Enzyme Complex do?" (drop "Digestive" to match live name)',
                'Bullet 11: "Black Pepper Extract (Bioperine, 95% piperine):" -> "Black Pepper Extract (Bioperine®):" (match live JSONB; ® preserved per 152e/n/o-rev2 precedent)'
            ),
            'product_name', 'DigestiZorb+ Enzyme Complex',
            'three_pillar_positioning', 'Absorb | Comfort | Optimize',
            'live_ingredient_total_mg', 85,
            'live_ingredient_count', 11,
            'live_format', 'capsule',
            'live_carrier_breakdown', '1 Liposomal Pepsin + 1 Micellar Ginger = 2/11 carriers; 9 plain enzymes/extracts (partial-encapsulation pattern)',
            'cross_product_reference', 'Balance+ Gut Repair complementary positioning (DigestiZorb+ in-meal; Balance+ between-meal)',
            'spec_source_doc_legacy_artifacts_dropped', 'FarmCeutica Inc + FarmCeutica Wellness Ltd + Building Performance Through Science tagline + 20-30% absorption claim + hedging language all NOT in reconciled copy',
            'liposomal_pepsin_status', 'ALREADY IN LIVE FORMULATION (5 mg); spec "new ingredient addition" framing was incorrect against live data',
            'rev2_canonical_pattern', 'feedback_152p_canonical_for_all_formulation_updates',
            'eighth_152x_rev2_under_standing_rule', 'true (after 152e/f/i/k/l/n/o-rev2)'
        )
    );

    RAISE NOTICE '#152q DigestiZorb+ update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
