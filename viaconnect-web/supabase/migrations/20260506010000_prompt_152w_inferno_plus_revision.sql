-- Prompt #152w: Inferno+ Natural Metabolic Activator Complex PDP rev2
-- structured Lane-2 reconciled with Hannah pre-flight 6-substitution fix.
--
-- SPEC DRIFT (DOUBLE): spec authored as INSERT for "net-new product"
-- but live database already has Inferno+ Natural Metabolic Activator
-- Complex at slug inferno-plus-natural-metabolic-activator (id
-- 26060895-3816-4f2e-a690-b8730476beb9, SKU FC-INFERNO-001). Sixth
-- consecutive 152x net-new spec to hit live-row drift; pattern is
-- standing precedent.
--
-- ADDITIONAL SECONDARY DRIFT: live row already has 9528-char
-- description from a PRIOR 152w-prep iteration (13-bullet, no
-- Liposomal Body-Protective Compound, no WADA disclosure, no active
-- cancer disclosure). The current 152w spec SUPERSEDES that earlier
-- iteration with the new BPC-157 Path A architecture: 14th bullet
-- substitution + WADA Class S2.5 disclosure + active cancer/cancer
-- history practitioner-consult disclosure.
--
-- ALSO: spec premise "Live Supabase JSONB: Contains BPC-157 at 0.2 mg
-- per capsule" is INCORRECT for Inferno+ specifically. Live Inferno+
-- ingredients[] is EMPTY. BPC-157 at 0.2 mg is in a SEPARATE product
-- (Thrive+ Post-Natal GLP-1, slug thrive-plus-post-natal-glp-1, SKU
-- FC-THRIVE-001) JSONB. JSONB ingredient population for Inferno+ is
-- DEFERRED per spec acceptance criterion 32 to follow-up 152w.7
-- "Reconcile authoritative ingredient list against live Supabase JSONB
-- before any future Hannah pre-flight; formalize the discrepancy-catch
-- as a standing pre-deployment check rather than discovery-by-
-- accident". This migration does NOT touch ingredients[]. Path A
-- architecture is preserved at the description level: neutral
-- "Liposomal Body-Protective Compound" language passes Marshall scan
-- in public-facing description; eventual 152w.7 JSONB population will
-- carry BPC-157 by actual identifier in Supplement Facts panel data
-- source per FDA 21 CFR 101.36.
--
-- HANNAH PRE-FLIGHT VALIDATION (verdict: FIX with 6 substitutions
-- BEFORE migration draft; same pattern as 152t Grow+ Pre-Natal):
--
--   FIX 1 (bullet 14, Path A neutral language tighten): spec text
--     "supporting cellular integrity and gut-barrier function in
--     synergy with the probiotic and prebiotic blend for comprehensive
--     gut-axis cellular support" stacks 3 structure-function verbs in
--     one breath, reads claim-heavy. Tightened to: "supporting
--     cellular integrity and gut-barrier function alongside the
--     probiotic and prebiotic blend." Marshall scan still clean (zero
--     mentions of BPC-157/BPC157/Body Protection Compound/
--     Pentadecapeptide/PL 14736).
--
--   FIX 2 (WADA disclosure forensic-claim softening): spec text
--     "which will result in failed anti-doping screening" is a
--     definitive forensic claim that cannot be warranted for every
--     assay window. Softened to: "which may result in a positive
--     anti-doping result." Applied in both opening paragraph + Who-
--     benefits paragraph.
--
--   FIX 3 (opening paragraph "peptide compliance considerations"
--     vague-redundant flag): replaced with "athletic-screening
--     considerations" so the disclosure is purpose-clear without
--     re-flagging the peptide a second time inside the same paragraph.
--
--   FIX 4 (Paraxanthine bullet anxiety/BP comparative claim cut):
--     spec text "with cleaner profile than unmetabolized caffeine
--     (less jitter, less anxiety, less BP elevation) at equivalent
--     doses." -> "with a smoother subjective profile than
--     unmetabolized caffeine in published comparisons at equivalent
--     doses." Drops "anxiety" mental-health-adjacent claim + drops BP
--     cardiovascular comparator per FDA 2024-2025 nutraceutical
--     warning letter precedent on stimulant comparative claims.
--
--   FIX 5 (Berberine bullet + opening paragraph "GLP-1 axis
--     modulation" pharma-adjacent verb softening): "modulation" is
--     too pharma-adjacent for DSHEA structure-function. Replaced in
--     Berberine bullet 1 with "supporting healthy GLP-1 signaling
--     through gut-microbiome support". Replaced in opening paragraph
--     with "GLP-1 signaling support through gut-microbiome and
--     prebiotic mechanisms".
--
--   FIX 6 (differentiation paragraph "NOT a substitute for prescription
--     GLP-1 receptor agonists" molecule-naming + pharma-mechanism
--     comparison cut): spec text "NOT a substitute for prescription
--     GLP-1 receptor agonists (semaglutide, tirzepatide, retatrutide
--     pharmaceutical mechanisms are not replicated by natural
--     ingredients at sub-clinical doses), prescription diabetes
--     medications, or weight loss medications." compressed to: "NOT
--     a substitute for prescription weight-management medications."
--     Drops 3 named Rx comparators (semaglutide, tirzepatide,
--     retatrutide) per recent FDA Ozempic-adjacent supplement letter
--     precedent 2024-2025. Drops pharma-mechanism comparison verb.
--
--   FIX 1.5 (active cancer disclosure mechanism rationale cut): spec
--     text "(theoretical concerns about peptide growth factor
--     signaling and angiogenesis activity)" attributes a
--     pharmacological mechanism to a dietary supplement and pairs it
--     with cancer, the exact framing FDA cited in 2023-2025 peptide
--     warning letters. Replaced with: "(out of an abundance of
--     caution given limited safety data in oncology populations)."
--     Keep contraindication; drop mechanism rationale on public
--     surface.
--
-- Drift notes (verified live 2026-05-06):
--   * Slug inferno-plus-natural-metabolic-activator confirmed live
--     (matches first spec candidate verbatim).
--   * SKU FC-INFERNO-001 (canonical FC-prefix; matches 152o-rev2 +
--     152e-rev2 + 152q + 152r + 152s + 152t + 152u + 152v.0 patterns).
--   * Live name "Inferno+ Natural Metabolic Activator Complex"
--     matches spec verbatim.
--   * Live format 'capsule'; pricing_tier L1; price_msrp NULL
--     (deferred to 152w.1); master_sku NULL (deferred to 152w.4);
--     status_tags [] (TIER not yet assigned); category_slug
--     'base-formulations' (per spec acceptance criterion 32 deferred
--     to 152w.3 follow-up; spec mentions "Metabolic Support / GLP-1
--     Support / Weight Management" but live is in base-formulations
--     for now); image_urls [] (deferred to 152w.2); active true.
--   * Live ingredient count 0, ingredients []  (deferred per AC #32
--     to 152w.7 reconciliation infrastructure).
--   * Existing summary (92 chars) and description (9528 chars) are
--     from prior 152w-prep iteration; THIS migration replaces with
--     Hannah-validated rev2 copy.
--
-- Bioavailability claim posture (per spec Standing Rules):
--   - Partial encapsulation pattern: 7 of 14 ingredients in advanced
--     carrier forms (4 liposomal: CLA, EGCG, Paraxanthine,
--     Body-Protective Compound + 3 micellar: Cinnamon, Moringa,
--     Artichoke). 7 of 14 use mechanism-appropriate alternative
--     absorption (mineral transporters for Chromium/Selenium, viable
--     probiotic colonization for Probiotic Blend, prebiotic
--     fermentation substrate for Inulin-FOS, established uncoated
--     absorption for Berberine HCl/BHB Salts/L-Carnitine Tartrate).
--   - "10x to 28x" multiplier APPLIES SCOPED to the 7 liposomal/
--     micellar ingredients only, NOT whole-formula. Same partial-
--     encapsulation pattern as 152q DigestiZorb+ (2/11) + 152t Grow+
--     Pre-Natal (5/10). NOT whole-formula like 152n DAO+, 152o
--     DESIRE+, 152s FLEX+, 152u GST+, 152v Histamine Relief.
--   - Auto-remediators (Michelangelo reviewer.ts:190 + Jeffery
--     guardrails.ts:83) only block 5-27x patterns; "10x to 28x"
--     passes both. Partial-encapsulation framing is a precise scoped
--     claim, not a violation of the substantiation rule.
--
-- Marshall dictionary scan: zero hits in unapproved_peptides.ts
-- (BPC-157, BPC157, Body Protection Compound, Pentadecapeptide,
-- PL 14736 all absent from public PDP description per Path A neutral
-- language substitution). All 14 surface ingredients are: botanicals
-- (Berberine, Cinnamon, Moringa, Artichoke, EGCG/Green Tea, Inulin-FOS),
-- amino acid derivatives (L-Carnitine), ketone salts (BHB), trace
-- minerals (Chromium, Selenium), probiotic blend, caffeine metabolite
-- (Paraxanthine), CLA, and Liposomal Body-Protective Compound (neutral
-- language for BPC-157). Glutathione network and Phase II detox
-- mechanisms not invoked here (different from 152u GST+).
--
-- Disease-term posture: "metabolic syndrome features, prediabetes,
-- borderline elevated fasting glucose, mild insulin resistance,
-- appetite dysregulation, gut-microbiome-mediated metabolic concerns,
-- exercise-induced oxidative stress" all in noun-phrase form following
-- verb constructions ("adults with...", "individuals with...", "people
-- with...") riding the verb-pair loophole pattern from 152e/152g/152q/
-- 152s/152t/152u established precedent. "active cancer or cancer
-- history, active liver disease, active gallbladder disease, active
-- autoimmune flare, cardiovascular disease, anxiety disorders,
-- hyperthyroidism, sleep disorders, diabetes, hypertension" all in
-- CONTRAINDICATION context (appropriate medical safety disclosure).
--
-- Comprehensive contraindications list per spec body + Hannah-validated
-- (medical safety disclosure for multi-mechanism metabolic product
-- with significant medication interaction profile):
--   - Bleeding risk: anticoagulants (warfarin, apixaban, rivaroxaban,
--     dabigatran), antiplatelets (aspirin, clopidogrel), NSAIDs;
--     pre-surgical 7-14 day discontinuation.
--   - Pregnancy/lactation: Berberine kernicterus + uterine stimulation,
--     Paraxanthine miscarriage/low-birth-weight associations, EGCG
--     hepatotoxicity at higher doses, CLA limited safety data.
--   - Diabetes medications: Berberine hypoglycemic activity.
--   - Antihypertensives: Berberine hypotensive activity, Paraxanthine
--     variable BP effects.
--   - Cardiovascular disease: Paraxanthine stimulant effects.
--   - Anxiety disorders: Paraxanthine stimulant.
--   - Hyperthyroidism: dose context.
--   - Sleep disorders: avoid within 6 hours of bedtime.
--   - Active liver disease: EGCG, CLA, Berberine hepatic concerns.
--   - Active gallbladder disease: Artichoke bile flow stimulation.
--   - WADA athletic prohibition: peptide compound on Class S2.5;
--     contraindicated for competitive athletes subject to WADA testing.
--   - Active cancer/cancer history: practitioner consultation required
--     out of abundance of caution given limited safety data in oncology
--     populations (mechanism rationale dropped per Hannah FIX 1.5).
--   - Individuals under 18.
--   - Selenium UL: avoid concurrent selenium supplements at 2-cap dose.
--   - CYP3A4 substrates (statins, calcium channel blockers,
--     immunosuppressants, HIV PIs, benzodiazepines, opioids,
--     antifungals): Berberine inhibition.
--   - P-glycoprotein substrates (digoxin, cyclosporine, tacrolimus):
--     Berberine inhibition.
--   - CYP2C9 substrates: Berberine inhibition.
--
-- Three-pillar Regulate | Control | Balance positioning preserved
-- verbatim (already in optimal action-led verb form per spec).
-- Catalog summary leads with the three-pillar nouns: "Metabolic
-- regulation, appetite control, and blood sugar balance support in
-- a single capsule." (live summary already at this spec value;
-- migration includes summary in UPDATE for idempotency).
--
-- Source-doc legacy artifacts NOT carried forward (per spec
-- Source-Document Corrections + 5 explicit corrections):
--   1. Tesofensine REMOVED entirely (Path A) per Via Cura April 2026
--      standing rule "Tesofensine removed from Catalyst+/Building
--      Blocks+ pending FDA approval".
--   2. Selenium 1.0 mg corrected to 0.2 mg (200 mcg elemental Se,
--      matches 152u GST+ pattern). Original was 2.5X-5X UL.
--   3. Chromium Picolinate 2.0 mg corrected to 0.2 mg (200 mcg
--      elemental Cr, supplement-industry standard). Original was
--      50-160X RDA and 2-4X Health Canada UL.
--   4. Dileucine (10 mg) removed source-doc-to-authoritative.
--   5. BPC-157 Path A architecture (description neutral language
--      "Liposomal Body-Protective Compound" + Hannah pre-flight
--      validation; JSONB ingredient population deferred to 152w.7).
-- Plus: no "FarmCeutica Inc.", no "FarmCeutica Wellness Ltd.", no
-- "Building Performance Through Science" tagline, no TM symbols on
-- Inferno+, no PureCaf® registered mark in product copy (preserved
-- in formulation report ingredient table for source attribution),
-- no "GLP-1 Activator Complex" pharmaceutical-class naming in
-- subtitle (replaced with "Natural Metabolic Activator Complex" per
-- FDA enforcement risk avoidance on supplements claiming
-- pharmaceutical-class equivalence), no excessive hedging language,
-- no source-doc math errors (425/445/435 reconciled to corrected
-- 430.6 mg per capsule).
--
-- Cross-product reference: differentiation paragraph notes Selenium
-- L-Selenomethionine "matching the 152u GST+ Selenium pattern" for
-- methionine-transporter absorption. Same portfolio-architecture
-- pattern as 152q-u cross-references. Closing sentence references
-- "prescription weight-management medications" (compressed per
-- Hannah FIX 6) without naming molecules.
--
-- Positioning: SYNERGISTIC MICRO-DOSING ACROSS OVERLAPPING METABOLIC
-- PATHWAYS, NOT clinical-dose efficacy claims. Practitioner-guided
-- use under healthcare professional supervision strongly recommended.
-- WADA Class S2.5 athletic-testing contraindication explicitly
-- disclosed. Active cancer/cancer history practitioner-consultation
-- requirement explicitly disclosed.
--
-- Hyphens preserved in compound modifiers (anti-doping, anti-platelet,
-- gut-axis, gut-barrier, gut-microbiome, clean-energy, clean-stimulant,
-- sub-clinical, sub-toxicity, broader-lifestyle, multi-mechanism,
-- multi-pathway, three-pillar, three-mechanism, ketone-substrate,
-- L-Carnitine, L-Selenomethionine, weight-management, body-protective).
-- All ranges in form "X to Y" not "X-Y" per feedback_no_dashes.md
-- (e.g., "discontinue 7 to 14 days", "500 to 1500 mg", "1 to 3 g",
-- "100 to 400 mg"; note that spec text used hyphen "X-Y" but live
-- description already normalized to "X to Y" form; preserving live
-- normalization).
--
-- Lane 2 micro-corrections (5 vs spec text):
--   1. Migration shape: INSERT -> UPDATE (live row exists with
--      9528-char prior-iteration description; sixth consecutive net-
--      new spec to hit drift after 152q-u + 152v.0 pre-rename).
--   2. Range notation normalization: spec hyphen-form "500-1500 mg"
--      / "1-3 g" / "100-400 mg" -> "X to Y" form per feedback_no_
--      dashes.md (live was already normalized; preserved).
--   3. No H1 capitalization correction (live name matches spec H1).
--   4. No prose product-abbreviation correction (live "Inferno+"
--      matches spec).
--   5. Zero ® brand symbols on any ingredient bullet headers (PureCaf
--      ® dropped per spec; differs from 152s 4-® pattern).
--
-- Hannah substitutions applied (6 substitutions per pre-flight):
--   FIX 1 (bullet 14 tighten), FIX 1.5 (cancer mechanism rationale
--   cut), FIX 2 (WADA forensic softening x2 in opening + Who-benefits),
--   FIX 3 (athletic-screening replacement), FIX 4 (Paraxanthine
--   anxiety/BP cut), FIX 5 (GLP-1 axis modulation softening x2 in
--   Berberine bullet + opening paragraph), FIX 6 (Rx molecule naming
--   compression).
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
    v_new_summary text := 'Metabolic regulation, appetite control, and blood sugar balance support in a single capsule.';
    v_new_description text := E'## What does Inferno+ do?\n\nInferno+ Natural Metabolic Activator Complex supports natural metabolic regulation through three interconnected pillars: regulate through AMPK activation and ketone metabolic substrate (Berberine HCl, BHB Salts, L-Carnitine Tartrate, EGCG), control through gut-axis appetite signaling and clean-energy stimulant support (Probiotic Blend, Inulin-FOS prebiotic, Paraxanthine, CLA), and balance through insulin sensitivity cofactor support and glucose-regulatory botanical synergy (Chromium Picolinate, Cinnamon Bark, Moringa Leaf, Selenium L-Selenomethionine, Artichoke Leaf), with additional gut-axis cellular support (Liposomal Body-Protective Compound). The 14-ingredient liposomal and micellar capsule provides synergistic micro-dosing across overlapping metabolic pathways: AMPK activation, GLP-1 signaling support through gut-microbiome and prebiotic mechanisms, insulin sensitivity, fat metabolism, clean-energy stimulant effects, and gut-barrier cellular integrity. 7 of 14 ingredients use liposomal or micellar carriers achieving 10x to 28x bioavailability versus standard formulations on those ingredients; the remaining 7 ingredients use mechanism-appropriate alternative absorption pathways (mineral transporters, viable probiotic colonization, prebiotic fermentation substrates, established uncoated absorption). Designed for adults with metabolic concerns seeking comprehensive multi-pathway support as part of broader lifestyle approach. **Contains Paraxanthine (caffeine metabolite stimulant). Contains a peptide compound on the WADA Prohibited List Class S2.5; NOT FOR USE BY COMPETITIVE ATHLETES SUBJECT TO WADA TESTING. Practitioner-guided use under healthcare professional supervision strongly recommended given Berberine medication interaction profile, athletic-screening considerations, and pregnancy contraindication.**\n\n## Ingredient breakdown\n\n- **Berberine HCl (98% purity):** Activates AMPK through both LKB1 and CaMKK2 pathways supporting cellular energy regulation, with parallel effects supporting healthy GLP-1 signaling through gut-microbiome support (medication interactions: CYP3A4, P-glycoprotein, hypoglycemic, hypotensive activity; pregnancy contraindicated).\n- **BHB Salts (Magnesium, Calcium, Sodium):** Provides exogenous beta-hydroxybutyrate as alternative cellular fuel substrate signaling through HCAR2 receptor, with mineral cations supporting electrolyte balance and cardiovascular function.\n- **L-Carnitine Tartrate:** Supplies the rate-limiting substrate for carnitine-acylcarnitine translocase shuttling long-chain fatty acids across mitochondrial membranes for beta-oxidation, in the well-absorbed Tartrate form using OCTN2 transporter uptake.\n- **Chromium Picolinate:** Provides essential trace mineral cofactor for chromodulin amplifying insulin receptor tyrosine kinase activity, in the picolinate-mediated absorption form at supplement-industry standard 200 mcg elemental chromium.\n- **Micellar Cinnamon Bark Extract (10:1):** Delivers methylhydroxychalcone polymer (MHCP) and cinnamaldehyde for insulin signaling support and modest blood sugar moderation, in the micellar carrier for enhanced absorption of lipophilic phytochemicals.\n- **Liposomal Conjugated Linoleic Acid (CLA):** Provides PPAR-gamma modulation and modest fat metabolism support through the c9,t11 and t10,c12 isomer combination from safflower oil, in the liposomal carrier for enhanced fatty acid absorption.\n- **Probiotic Blend (10 billion CFU):** Supplies viable probiotic strains supporting gut microbiome diversity, intestinal barrier function, and SCFA production that drives gut-axis GLP-1 and PYY signaling for appetite regulation.\n- **Liposomal EGCG (Green Tea Extract, 50%):** Activates AMPK pathway through complementary mechanism to Berberine and supports GLUT4 glucose transporter translocation, at sub-toxicity dose (well below documented hepatotoxicity threshold) in liposomal carrier for enhanced absorption.\n- **Micellar Moringa Leaf Extract (10:1):** Provides isothiocyanate-mediated Nrf2 pathway activation plus phenolic antioxidant compounds with traditional glucose-regulatory activity, in the micellar carrier for enhanced absorption.\n- **Liposomal Paraxanthine (PureCaf):** Delivers the primary active metabolite of caffeine providing alertness through adenosine receptor antagonism with a smoother subjective profile than unmetabolized caffeine in published comparisons at equivalent doses.\n- **Selenium (L-Selenomethionine):** Provides selenium through methionine transporter absorption for incorporation into selenoproteins (glutathione peroxidases, thioredoxin reductases, iodothyronine deiodinases that support thyroid metabolism affecting glucose homeostasis), in the most bioavailable food-source selenium form.\n- **Micellar Artichoke Leaf Extract (5% Cynarin):** Supports bile flow and hepatobiliary function through cynarin and chlorogenic acid compounds affecting systemic lipid and glucose metabolism, in the micellar carrier for enhanced phytochemical absorption.\n- **Inulin-FOS (Prebiotic Blend):** Provides fermentation substrate for gut bacteria producing short-chain fatty acids (butyrate, propionate, acetate) that activate intestinal L-cell GPR41 and GPR43 receptors stimulating GLP-1 and PYY secretion in synbiotic combination with the probiotic blend.\n- **Liposomal Body-Protective Compound:** Liposomal delivery of body-protective compound supporting cellular integrity and gut-barrier function alongside the probiotic and prebiotic blend.\n\n## Who benefits and what makes this different\n\n**Who benefits:** Adults with metabolic syndrome features (waist circumference, blood pressure, lipid profile, glucose) seeking natural multi-pathway support, individuals with prediabetes or borderline elevated fasting glucose under practitioner supervision, adults with gut-microbiome-mediated metabolic concerns, people with appetite dysregulation contributing to weight management challenges, adults with mild insulin resistance under practitioner supervision, individuals supporting natural energy metabolism through ketone substrate plus fat-energy transport plus clean-stimulant combination, adults with genetic variants affecting metabolic pathways (CYP1A2 polymorphisms, PPAR-alpha/gamma variants, TCF7L2 variants), and users whose ViaConnect Bio Optimization Score flags weakness in metabolic regulation, gut microbiome diversity, blood sugar balance, or appetite signaling domains. **CRITICAL CONTRAINDICATIONS:** NOT for use during pregnancy or lactation due to multiple ingredient concerns (Berberine kernicterus risk and uterine stimulation, Paraxanthine miscarriage and low birth weight associations at higher doses, EGCG hepatotoxicity at higher doses, CLA limited safety data); NOT for use with diabetes medications (Berberine hypoglycemic activity); NOT for use with antihypertensives without monitoring (Berberine hypotensive activity, Paraxanthine variable BP effects); NOT for use with anticoagulants or antiplatelets without prescriber supervision (Berberine CYP2C9 inhibition, CLA and EGCG mild antiplatelet); discontinue 7 to 14 days before any planned surgery; NOT for use with cardiovascular disease (Paraxanthine stimulant effects), anxiety disorders (Paraxanthine stimulant), hyperthyroidism, sleep disorders (avoid within 6 hours of bedtime), active liver disease (EGCG, CLA, Berberine hepatic concerns), active gallbladder disease (Artichoke bile flow stimulation); **NOT FOR USE BY COMPETITIVE ATHLETES SUBJECT TO WADA TESTING** (contains a peptide compound on the WADA Prohibited List Class S2.5 which may result in a positive anti-doping result); NOT for individuals under 18; **NOT FOR USE BY INDIVIDUALS WITH ACTIVE CANCER OR CANCER HISTORY without practitioner consultation** (out of an abundance of caution given limited safety data in oncology populations); review medication list for CYP3A4 substrates (statins, calcium channel blockers, immunosuppressants, HIV protease inhibitors, benzodiazepines, opioids, antifungals) and P-glycoprotein substrates (digoxin, cyclosporine, tacrolimus) given Berberine inhibition; avoid concurrent selenium-containing supplements at the 2-capsule dose (Selenium reaches UL at 2 caps).\n\n**What makes it different:** What separates Inferno+ from generic metabolic support products is the convergence of three-pillar synergistic micro-dosing architecture (Regulate through Berberine + BHB + L-Carnitine + EGCG; Control through Probiotics + Inulin-FOS + Paraxanthine + CLA; Balance through Chromium + Cinnamon + Moringa + Selenium + Artichoke). Most metabolic support products focus on one or two mechanisms; Inferno+ addresses cellular energy metabolism, gut-axis appetite signaling, AND insulin sensitivity simultaneously with mechanistically diverse low-dose ingredients targeting overlapping pathways. The honest clinical positioning is **synergistic micro-dosing** rather than clinical-dose efficacy: each ingredient is sub-clinical individually relative to typical clinical research thresholds (Berberine 30 mg vs clinical 500 to 1500 mg; L-Carnitine 25 mg vs clinical 1 to 3 g; EGCG 10 mg vs clinical 100 to 400 mg), but the mechanistically diverse combination targets overlapping AMPK, GLP-1 axis, insulin sensitivity, fat metabolism, and gut microbiome pathways for additive or synergistic effect. Distinctive features include Liposomal Paraxanthine for clean-energy stimulant (caffeine metabolite without jitter profile), Liposomal EGCG at sub-toxicity dose (well below documented hepatotoxicity threshold), synbiotic combination of probiotics plus Inulin-FOS for gut-axis signaling, and L-Selenomethionine for methionine-transporter selenium absorption matching the 152u GST+ Selenium pattern. Inferno+ is positioned as comprehensive multi-pathway support as part of broader lifestyle approach (dietary modification, exercise, sleep optimization), NOT a substitute for prescription weight-management medications. Practitioner-guided use under healthcare professional supervision strongly recommended given Berberine medication interaction profile, Paraxanthine stimulant cardiovascular effects, and pregnancy contraindication.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'inferno-plus-natural-metabolic-activator'
      AND p.sku = 'FC-INFERNO-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152w Inferno+ update skipped: row not found at slug inferno-plus-natural-metabolic-activator / SKU FC-INFERNO-001';
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
        '152w_inferno_plus_natural_metabolic_activator_revision',
        'products',
        'FC-INFERNO-001',
        v_product_id,
        jsonb_build_object(
            'method', 'rev2_structured_description_lane2_reconciled_per_152p_canonical_INSERT_to_UPDATE_with_hannah_pre_flight_6_substitutions_and_BPC_157_path_A_neutral_language',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'rev2_structured_pdp_152p_canonical_lane2_plus_hannah_clinical_safety_overrides_plus_path_A_marshall_compliance',
            'authority', 'Gary canonical 2026-05-06 Prompt #152w (Lane A: convert spec INSERT to UPDATE; live row already exists with prior 9528-char 13-bullet description from earlier 152w-prep iteration; current 152w SUPERSEDES with BPC-157 Path A architecture + Hannah pre-flight 6-substitution validation)',
            'spec_premise_drift_correction', 'Spec authored as INSERT for net-new product. Live row already at 9528-char prior 13-bullet description. Spec INSERT premise incorrect against live data (sixth consecutive 152x net-new spec to hit live-row drift after 152q + 152r + 152s + 152t + 152u + 152v.0 pre-rename). Migration converted to UPDATE Lane 2 reconciliation. ALSO: spec premise BPC-157 in live Inferno+ JSONB at 0.2 mg INCORRECT; live Inferno+ ingredients[] is empty; BPC-157 0.2 mg is in SEPARATE Thrive+ Post-Natal GLP-1 product (slug thrive-plus-post-natal-glp-1, SKU FC-THRIVE-001). JSONB ingredient population for Inferno+ deferred to 152w.7 reconciliation infrastructure per spec acceptance criterion 32.',
            'marshall_scan', 'human_review_pass; zero hits in public-facing description for: BPC-157, BPC157, Body Protection Compound, Pentadecapeptide, PL 14736; Path A neutral language Liposomal Body-Protective Compound substituted in 14th bullet + opening paragraph; Hannah pre-flight validated substitution + 5 other clinical/regulatory FIX substitutions before draft',
            'bioavailability_format', '10x to 28x APPLIES SCOPED to 7 liposomal/micellar ingredients only (4 liposomal: CLA, EGCG, Paraxanthine, Body-Protective Compound + 3 micellar: Cinnamon, Moringa, Artichoke); NOT whole-formula. Other 7 ingredients use mechanism-appropriate alternative absorption (mineral transporters, viable probiotic colonization, prebiotic fermentation substrates, established uncoated absorption). Same partial-encapsulation pattern as 152q DigestiZorb+ (2/11) + 152t Grow+ Pre-Natal (5/10). Differs from 152n/152o/152s/152u/152v whole-formula application. Auto-remediator allowlist: 10x to 28x passes both Michelangelo + Jeffery 5-27x blocks.',
            'sku_verify_outcome', 'FC-INFERNO-001 canonical FC-prefix; same as 152o-rev2 + 152e-rev2 + 152q + 152r + 152s + 152t + 152u + 152v.0 patterns',
            'hannah_clinical_substitutions', jsonb_build_array(
                'FIX 1 (bullet 14 Path A neutral language tighten): supporting cellular integrity and gut-barrier function in synergy with the probiotic and prebiotic blend for comprehensive gut-axis cellular support -> supporting cellular integrity and gut-barrier function alongside the probiotic and prebiotic blend. Reason: spec stacked 3 structure-function verbs in one breath, reads claim-heavy.',
                'FIX 1.5 (active cancer mechanism rationale cut per Hannah Q2(c) FDA peptide warning letter precedent 2023-2025): theoretical concerns about peptide growth factor signaling and angiogenesis activity -> out of an abundance of caution given limited safety data in oncology populations. Reason: spec attributed pharmacological mechanism to dietary supplement and paired it with cancer, exact framing FDA cited in peptide warning letters.',
                'FIX 2 (WADA disclosure forensic-claim softening): which will result in failed anti-doping screening -> which may result in a positive anti-doping result. Reason: definitive forensic claim cannot be warranted for every assay window. Applied in opening paragraph + Who-benefits paragraph.',
                'FIX 3 (opening paragraph athletic-screening replacement): peptide compliance considerations -> athletic-screening considerations. Reason: vague-redundant flag re-flags the peptide a second time within same paragraph.',
                'FIX 4 (Paraxanthine bullet anxiety/BP comparative claim cut): with cleaner profile than unmetabolized caffeine (less jitter, less anxiety, less BP elevation) at equivalent doses -> with a smoother subjective profile than unmetabolized caffeine in published comparisons at equivalent doses. Reason: anxiety reads as mental-health structure-function claim adjacent to disease; BP comparator reads as cardiovascular structure-function claim. Both crossed FDA stimulant comparative claim line.',
                'FIX 5 (Berberine bullet + opening paragraph GLP-1 axis modulation pharma-adjacent verb softening): with parallel effects on GLP-1 axis modulation through gut-microbiome shifts -> with parallel effects supporting healthy GLP-1 signaling through gut-microbiome support (Berberine bullet 1); GLP-1 axis modulation through gut-microbiome and prebiotic support -> GLP-1 signaling support through gut-microbiome and prebiotic mechanisms (opening paragraph). Reason: modulation is too pharma-adjacent for DSHEA.',
                'FIX 6 (differentiation paragraph Rx molecule naming + pharma-mechanism comparison cut): NOT a substitute for prescription GLP-1 receptor agonists (semaglutide, tirzepatide, retatrutide pharmaceutical mechanisms are not replicated by natural ingredients at sub-clinical doses), prescription diabetes medications, or weight loss medications -> NOT a substitute for prescription weight-management medications. Reason: naming three Rx comparators in negative form is the same pattern FDA flagged on Ozempic-adjacent supplements 2024-2025. Compress and drop molecule names.'
            ),
            'lane2_corrections', jsonb_build_array(
                'Migration shape: INSERT -> UPDATE (live row exists with 9528-char prior 13-bullet description from earlier 152w-prep iteration; sixth consecutive net-new spec to hit drift after 152q + 152r + 152s + 152t + 152u + 152v.0 pre-rename)',
                'Range notation normalization: spec hyphen-form (500-1500 mg, 1-3 g, 100-400 mg) -> X to Y form per feedback_no_dashes.md (live description was already normalized; preserved live form throughout)',
                'No H1 capitalization correction needed (live name Inferno+ Natural Metabolic Activator Complex matches spec H1 verbatim)',
                'No prose product-abbreviation correction needed (live Inferno+ matches spec)',
                'Zero brand registered marks on any ingredient bullet headers (PureCaf® dropped per spec drop-R rule for product copy; differs from 152s 4-® pattern)'
            ),
            'product_name', 'Inferno+ Natural Metabolic Activator Complex',
            'three_pillar_positioning', 'Regulate | Control | Balance',
            'live_ingredient_total_mg_per_capsule', 'NOT POPULATED in this migration (deferred to 152w.7); per spec target final corrected formulation 14 ingredients @ 430.6 mg per capsule',
            'live_ingredient_count_in_jsonb', 0,
            'spec_target_ingredient_count', 14,
            'live_format', 'capsule',
            'live_status_tag', 'NONE (TIER not assigned in live status_tags)',
            'live_category_slug', 'base-formulations',
            'live_carrier_breakdown', '4 liposomal (CLA, EGCG, Paraxanthine, Body-Protective Compound) + 3 micellar (Cinnamon, Moringa, Artichoke) + 7 mechanism-appropriate alternative absorption (Berberine HCl, BHB Salts, L-Carnitine Tartrate, Chromium Picolinate, Probiotic Blend, Selenium L-Selenomethionine, Inulin-FOS) = 7/14 partial-encapsulation; 10x to 28x anchor APPLIES SCOPED to 7 advanced carrier ingredients only',
            'cross_product_reference', 'Selenium L-Selenomethionine matching 152u GST+ Selenium pattern (methionine-transporter absorption); BPC-157 Path A architecture differs from 152v Histamine Relief Protocol future treatment (152v decisions locked 2026-05-06 await formal prompt drafting)',
            'spec_source_doc_legacy_artifacts_dropped', '5 explicit corrections per Garys decisions: (1) Tesofensine REMOVED entirely Path A per Via Cura April 2026 standing rule; (2) Selenium 1.0 mg corrected to 0.2 mg matching 152u GST+ pattern resolving 2.5X-5X UL safety concern; (3) Chromium Picolinate 2.0 mg corrected to 0.2 mg supplement-industry standard resolving 50-160X RDA + 2-4X Health Canada UL safety concern; (4) Dileucine 10 mg removed source-doc-to-authoritative reformulation; (5) BPC-157 Path A architecture (description neutral language + Hannah pre-flight validation; JSONB ingredient population deferred to 152w.7). Plus: FarmCeutica Inc + FarmCeutica Wellness Ltd + Building Performance Through Science tagline + TM symbols on Inferno+ + PureCaf® registered mark in product copy + GLP-1 Activator Complex pharmaceutical-class subtitle (replaced with Natural Metabolic Activator Complex per FDA enforcement risk avoidance) + excessive hedging language + source-doc math errors (425/445/435 reconciled to corrected 430.6 mg per capsule) all NOT in reconciled copy',
            'rev2_canonical_pattern', 'feedback_152p_canonical_for_all_formulation_updates',
            'thirteenth_152x_rev2_under_standing_rule', 'true (after 152e/f/i/k/l/n/o-rev2 + 152q + 152r + 152s + 152t + 152u + 152v.0 pre-rename); 152v formal PDP prompt awaits future session per locked decisions in project_prompt_152v_decisions.md',
            'positioning_disclosure', 'SYNERGISTIC MICRO-DOSING ACROSS OVERLAPPING METABOLIC PATHWAYS, NOT clinical-dose efficacy claims; practitioner-guided use under healthcare professional supervision strongly recommended; WADA Class S2.5 athletic-testing contraindication explicitly disclosed; active cancer/cancer history practitioner-consultation requirement explicitly disclosed; NOT a substitute for prescription weight-management medications (Hannah FIX 6 compressed)',
            'comprehensive_contraindications', 'BLEEDING RISK (anticoagulants warfarin/apixaban/rivaroxaban/dabigatran + antiplatelets aspirin/clopidogrel + NSAIDs + 7-14 day pre-surgical discontinuation), PREGNANCY/LACTATION (Berberine kernicterus + uterine stimulation + Paraxanthine + EGCG + CLA), DIABETES MEDICATIONS (Berberine hypoglycemic), ANTIHYPERTENSIVES (Berberine hypotensive + Paraxanthine BP), CARDIOVASCULAR DISEASE (Paraxanthine stimulant), ANXIETY DISORDERS (Paraxanthine), HYPERTHYROIDISM, SLEEP DISORDERS (avoid 6h bedtime), ACTIVE LIVER DISEASE (EGCG + CLA + Berberine hepatic), ACTIVE GALLBLADDER DISEASE (Artichoke bile), WADA ATHLETIC PROHIBITION (Class S2.5), ACTIVE CANCER/CANCER HISTORY (practitioner consultation), INDIVIDUALS UNDER 18, SELENIUM UL (avoid concurrent), CYP3A4 + P-glycoprotein + CYP2C9 substrate review (Berberine inhibition)',
            'clinical_safety_flags', jsonb_build_array(
                'CRITICAL FLAG 1 (BPC-157 PATH A ARCHITECTURE): Public PDP description uses neutral Liposomal Body-Protective Compound; live JSONB ingredients[] currently empty for Inferno+ (deferred to 152w.7 reconciliation infrastructure); spec premise of BPC-157 in live Inferno+ JSONB INCORRECT against live data (BPC-157 is in Thrive+ Post-Natal GLP-1 JSONB instead).',
                'CRITICAL FLAG 2 (FORMULATION CORRECTIONS PRE-PRODUCTION): 3 production-blocking corrections applied at PDP level only (Tesofensine removed; Selenium 1.0->0.2 mg; Chromium 2.0->0.2 mg). Live JSONB does not currently reflect these corrections (ingredients[] empty). 152w.7 must reconcile JSONB to corrected formulation before any production label print.',
                'CRITICAL FLAG 3 (WADA + ACTIVE CANCER DISCLOSURES): Both disclosures Hannah-validated post-FIX-2/FIX-1.5 substitutions; copy now compliant with FDA peptide warning letter precedent 2023-2025.',
                'CRITICAL FLAG 4 (DISTRIBUTION RESTRICTIONS): Per spec: NOT available on Amazon, Vitacost, GNC, Whole Foods, Sprouts; distribution restricted to direct-to-consumer (via-connect2026.vercel.app, viaconnectapp.com) and practitioner channel. Distribution channel implementation deferred to separate prompt.',
                'PROCESS NOTE: 152w second 152x to require Hannah pre-flight (after 152t Grow+ Pre-Natal); pattern memorialized in feedback_clinical_preflight_pattern.md confirms peptide-compliance products now established as triggering pre-flight alongside special-population (prenatal/pediatric/geriatric/immunocompromised).'
            )
        )
    );

    RAISE NOTICE '#152w Inferno+ update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
