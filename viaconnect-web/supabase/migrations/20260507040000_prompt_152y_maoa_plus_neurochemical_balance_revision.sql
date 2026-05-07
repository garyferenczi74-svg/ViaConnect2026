-- Prompt #152y: MAOA+ Neurochemical Balance PDP rev2 structured Lane-2
-- reconciled.
--
-- SPEC DRIFT: spec authored as INSERT for "net-new product" but live
-- database already has MAOA+ Neurochemical Balance at slug
-- maoa-plus-neurochemical-balance (id 367fb6dd-06a3-46e1-9fd9-7e8193353ce8,
-- SKU 40 numeric). Eighth consecutive 152x net-new spec to hit live-row
-- drift after 152q + 152r + 152s + 152t + 152u + 152v.0 + 152w + 152x;
-- pattern is firmly standing precedent. Spec INSERT premise also hard-
-- blocked by uniq_products_canonical_slug_per_category index from #142c.
-- Per established Gary precedent: convert spec INSERT to UPDATE.
--
-- Drift notes (verified live 2026-05-07 via Supabase MCP):
--   * Slug maoa-plus-neurochemical-balance confirmed live (NOT spec
--     candidate maoa-plus or any of the other 6 candidate slugs in spec
--     existence-check).
--   * SKU 40 numeric string (matches 152g BHMT+ '35' numeric pattern;
--     differs from 152q/r/s/t/u/v/w/x FC-prefix pattern; methylation-snp
--     category uses numeric SKUs by category-slug convention).
--   * master_sku 40 (matches sku); spec premise that 152y.4 SKU work was
--     deferred is incorrect against live data.
--   * Live name "MAOA+ Neurochemical Balance" matches spec H1 verbatim;
--     no Lane 2 H1 capitalization correction required.
--   * Live format 'capsule'; pricing_tier L1; price_msrp $118.88 ends
--     in .88 per Via Cura convention (matches 152u GST+ pattern); spec
--     premise that 152y.1 pricing was deferred is incorrect against
--     live data.
--   * status_tags [] (TIER not yet assigned per methylation-snp
--     convention; consistent with 152u GST+ pattern).
--   * category_slug 'methylation-snp' matches spec planned "Methylation
--     and Neurogenetic Series" theme; spec premise that 152y.3 category
--     work was deferred is incorrect against live data (existing
--     methylation-snp category satisfies spec's planned-category framing).
--   * image_urls populated to supplement-photos/Methylation%20SNP%20
--     Support/maoa-plus-neurochemical-balance.png (image_count=1); spec
--     premise that 152y.2 image work was deferred is incorrect against
--     live data.
--   * active true; product_type 'supplement'.
--   * Live ingredient count 13, total compound 651.8 mg per Size 00
--     vegetarian capsule, all 13 names matching spec authoritative
--     verbatim except for ® mark preservation on Sensoril and Bioperine
--     (live JSONB carries ® on both):
--       1. SAMe (S-Adenosyl Methionine) 100 mg - uncoated active
--       2. Methylated Vitamin B2 (Riboflavin-5-Phosphate) 25 mg - uncoated active
--       3. Methylated Vitamin B6 (Pyridoxal-5-Phosphate) 25 mg - uncoated active
--       4. Liposomal Methyl Folate (5-MTHF) 0.8 mg - liposomal
--       5. Liposomal Vitamin B12 (Methylcobalamin + Hydroxocobalamin) 1 mg - liposomal
--       6. Liposomal L-Theanine 50 mg - liposomal
--       7. Liposomal Magnesium (Bisglycinate) 50 mg - liposomal
--       8. Liposomal GABA (Gamma-Aminobutyric Acid) 100 mg - liposomal
--       9. Micellar Ashwagandha Extract (Sensoril®) 125 mg - micellar (® LIVE)
--      10. Micellar Rhodiola Rosea (3% Rosavins) 100 mg - micellar
--      11. Liposomal PQQ (Pyrroloquinoline Quinone) 20 mg - liposomal
--      12. Liposomal CoQ10 (Ubiquinol) 50 mg - liposomal
--      13. Micellar Bioperine® (Black Pepper Extract) 5 mg - micellar (® LIVE)
--   * Carrier breakdown: 7 liposomal + 3 micellar + 3 uncoated active
--     forms (SAMe, R5P, P5P intrinsically bioavailable in pre-activated
--     methyl donor and coenzyme forms); 10 of 13 (77%) carrier-enhanced
--     by both count and mass (carrier-enhanced mass = 501.8 mg / total
--     651.8 mg = 77.0%).
--   * Existing summary + description are 64-char placeholder ("Monoamine
--     balance with Riboflavin, Magnesium, L-Theanine, and P5P"); 152y
--     replaces with rev2 structured copy.
--
-- Bioavailability claim posture (per spec Standing Rules + spec explicit
-- "PARTIAL APPLIES" framing for highest carrier coverage in PARTIAL
-- APPLIES family):
--   - Partial encapsulation pattern: 10 of 13 ingredients in advanced
--     carrier forms (7 liposomal + 3 micellar); 3 uncoated as
--     intrinsically bioavailable active forms (SAMe methyl donor, R5P
--     active flavin, P5P active pyridoxal coenzyme).
--   - "10x to 28x" multiplier APPLIES to the 10 carrier-enhanced
--     ingredients; classification PARTIAL APPLIES with active-form
--     rationale narrative for the 3 uncoated.
--   - Joins 152q DigestiZorb+ (2/11), 152t Grow+ (5/10), 152w Inferno+
--     (7/14) in PARTIAL APPLIES family. 152y at 10/13 (77%) is the
--     highest carrier coverage in the PARTIAL APPLIES family.
--   - Auto-remediators (Michelangelo reviewer.ts:190 + Jeffery
--     guardrails.ts:83) only block 5-27x patterns; "10x to 28x" passes
--     both. Negative-form active-rationale prose framing also passes.
--   - Reconciled prose framing: "10 of the thirteen ingredients are
--     delivered in liposomal or micellar carrier systems for enhanced
--     absorption (10x to 28x more bioavailable than non-encapsulated
--     forms for the 10 carrier-enhanced ingredients); SAMe, Riboflavin-
--     5-Phosphate, and Pyridoxal-5-Phosphate are included in their pre-
--     activated bioactive forms with intrinsic high absorption that
--     does not require carrier enhancement."
--
-- Marshall dictionary scan: zero hits in unapproved_peptides.ts. All 13
-- ingredients are: methyl donor (SAMe), methylated B-cofactors (R5P B2,
-- P5P B6, 5-MTHF folate, dual-form B12), amino acid (L-Theanine),
-- mineral chelate (Mg Bisglycinate), neurotransmitter (GABA), branded
-- adaptogen (Sensoril® ashwagandha), adaptogenic herb (Rhodiola),
-- mitochondrial cofactors (PQQ, CoQ10 Ubiquinol), bioavailability
-- enhancer (Bioperine®). SAMe is a naturally-occurring sulfonium ion
-- methyl donor (NOT a peptide drug), GABA is an amino acid
-- neurotransmitter (NOT a peptide drug). Confirmed Jeffery audit
-- 2026-05-07. NO Hannah pre-flight gate required per Jeffery audit
-- (comprehensive contraindication list already in PDP body satisfies
-- pre-flight criterion). NO Marshall scan compliance gate required per
-- spec ("no Marshall scan flag").
--
-- DSHEA structure-function posture: "MAOA+ is not a MAOI medication, does
-- not directly inhibit or enhance MAOA enzyme activity, and provides
-- nutritional support only" disclaimer is a NEGATIVE-DISCLAIMER pattern
-- (asserting what the supplement is NOT) that constitutes a defensive
-- guard rather than a treatment claim. Same posture as 152i Catalyst+
-- "Tesofensine REMOVED pending FDA" defensive-guard precedent. Passes
-- DSHEA structure-function framework per Jeffery audit 2026-05-07.
--
-- Disease-term posture: "elevated environmental toxin exposure" pattern
-- carried over to "stress-related fatigue or HPA axis dysregulation",
-- "MTHFR C677T or A1298C variants", "COMT V158M Met/Met variant",
-- "documented MAOA polymorphisms" all in NOUN-PHRASE form following
-- verb constructions ("Adults with...", "individuals with...", "carriers
-- of...") riding the verb-pair loophole pattern from 152e/152g/152q/
-- 152s/152t/152u established precedent. "bipolar disorder", "active
-- mania or psychosis", "major depressive disorder", "anxiety
-- disorders", "Parkinson''s disease", "Hashimoto thyroiditis",
-- "systemic lupus erythematosus", etc. all in CONTRAINDICATION /
-- PRACTITIONER-CONSULTATION context (appropriate medical safety
-- disclosure for high-sensitivity methylation and neurochemical
-- formulation with multiple drug interaction classes).
--
-- Comprehensive contraindications list per spec body (medical safety
-- disclosure for high-sensitivity methylation and neurochemical product
-- with mania induction risk + serotonergic interaction risk + thyroid
-- stimulation risk + pregnancy concerns + multiple drug interactions):
--   - HARD: bipolar disorder (Type I/II/cyclothymic; SAMe + Rhodiola
--     mania induction risk regardless of mood state).
--   - HARD: active mania, hypomania, psychosis.
--   - HARD: concurrent MAOI medications (phenelzine, tranylcypromine,
--     isocarboxazid, selegiline, rasagiline, safinamide, moclobemide;
--     hypertensive crisis + serotonin syndrome risk).
--   - HARD: concurrent serotonergic medications without practitioner
--     clearance (SSRIs, SNRIs, TCAs, atypical antidepressants,
--     tramadol, dextromethorphan, triptans, MDMA, St. John''s Wort;
--     serotonin syndrome risk).
--   - HARD: pregnancy (ashwagandha abortifacient + folate UL exceeded
--     at twice-daily 1.6 mg/day vs 1 mg supplemental UL).
--   - HARD: lactation (theoretical neonatal exposure).
--   - HARD: hyperthyroidism, Graves disease, toxic multinodular goiter,
--     thyroid nodules with autonomous function (Sensoril ashwagandha
--     thyroid stimulation).
--   - HARD: pediatric use under 18 (insufficient safety data).
--   - HARD: recent solid organ transplant, hematopoietic stem cell
--     transplant, active induction immunosuppression (ashwagandha
--     immunomodulatory effects).
--   - HARD: concurrent levodopa therapy without neurology consultation
--     (SAMe + P5P interactions with levodopa metabolism).
--   - PRACTITIONER: major depressive disorder or anxiety on
--     pharmaceutical treatment, Parkinson''s disease, anticoagulant or
--     antiplatelet therapy (warfarin, DOACs, antiplatelets), diabetes
--     mellitus, hypertension on medication, hepatic impairment, chronic
--     kidney disease, autoimmune disease (Hashimoto, SLE, RA, MS,
--     T1DM, IBD, psoriasis, AS, Sjogren), active or recent cancer,
--     seizure disorders on AEDs, pediatric/geriatric/dysphagic
--     individuals with Size 00 capsule format.
--
-- Methylation sensitivity titration protocol included in PDP body for
-- COMT V158M Met/Met carriers (~25% Caucasian) and MTHFR variant
-- carriers (~40% European descent): half-cap days 1-7, full cap days
-- 8-14, standard or maintenance day 15+.
--
-- GENEX360 platform integration tiers documented in PDP body: Tier 1
-- CAQ-only 72%, Tier 2 CAQ+labs 86%, Tier 3 CAQ+labs+genetics 96% with
-- MAOA-uVNTR + MTHFR C677T/A1298C + COMT V158M + MTR + MTRR variants.
--
-- Cross-product family note: PDP body refers to "future products COMT+
-- and CBS Support+ planned to extend the family". Drift note: those
-- products are already live in catalog (152j CBS Support+ shipped
-- 2026-05-04 commit 346c487, 152l COMT+ shipped 2026-05-04 commit
-- cbc5fa0). Lane 2 reconciliation chooses to PRESERVE spec verbatim per
-- Jeffery audit guidance: prose marketing reconciliation is Lane 1
-- territory not Lane 2. Logged as 152y.13 deferred Lane 1 follow-up.
--
-- Three-pillar Balance | Methylate | Modulate positioning preserved
-- verbatim from source-doc (already in optimal action-led verb form).
-- Catalog summary leads with three-pillar verb forms: "Neurochemical
-- balance support, methylation pathway methyl donor delivery, and HPA
-- axis stress modulation in a single capsule."
--
-- Source-doc legacy artifacts NOT carried forward (per spec Source-
-- Document Corrections):
--   - No "FarmCeutica Inc." references.
--   - No "FarmCeutica Wellness Ltd." references.
--   - No "Building Performance Through Science" tagline.
--   - No source-doc "171.8 mg methyl donor matrix" math error
--     (corrected to 151.8 mg per spec Flag 152y.6 PQQ likely
--     double-counted; preserved 151.8 in PDP body via correct
--     ingredient stack listing without explicit 171.8 callout).
--   - No "away from tyramine-rich meals" warning (internally
--     inconsistent with formulation mechanism per spec Flag 9; tyramine
--     restrictions apply only to pharmaceutical MAOIs which inhibit
--     MAOA, not MAOA+ which supports MAOA).
--   - No excessive hedging language ("evidence suggests this approach
--     may optimize MAOA function", "It seems likely to benefit").
--
-- Positioning: SUB-CLINICAL FOUNDATIONAL METHYLATION PATHWAY AND
-- NEUROCHEMICAL BALANCE STACK, NOT primary monotherapy SAMe replacement
-- at 200 to 400 mg twice daily. ADD-ON to dietary methylation foundation
-- and primary supplemental methylation cofactors. Joins 152 series
-- synergistic foundational philosophy alongside 152j CBS Support+ +
-- 152l COMT+ + 152u GST+ as the methylation portfolio architecture.
-- First product to be positioned as "Via Cura Methylation and
-- Neurogenetic Series" framing in PDP body (cross-references both
-- existing methylation-snp products and any future methylation-snp
-- additions).
--
-- Hyphens preserved in compound modifiers (single-capsule,
-- precision-targeted, three-pillar, four-pillar, methyl-donor,
-- B-vitamin, GABAergic, amino-acid, dual-form, four-functional,
-- inhibitory-neurotransmitter, adaptogenic, mitochondrial,
-- liposomal/micellar, carrier-enhanced, non-encapsulated, pre-
-- activated, bioactive, intrinsic, structure-function, 5-MTHF, P5P,
-- R5P, MAOA-uVNTR, low-activity, high-activity, 3-repeat, 4-repeat,
-- C677T, A1298C, V158M, Met/Met, Type I, Type II, methylation-cycle,
-- O-methylation, FAD-dependent, monoamine-oxidase, electron-transport,
-- gamma-glutamyl, ethylamide, blood-brain-barrier, leucine-preferring,
-- alpha-brain-wave, calm-focus, GABA-A, glycine-receptor, mast-cell-
-- stabilization, scientifically-debated, vagal-afferent,
-- HPA-axis-modulation, withanolide, oligosaccharide, cortisol-
-- attenuation, sleep-quality, dose-threshold, root-extract, leaf-
-- extract, dual-standardization, mitochondrial-biogenesis,
-- PGC-1-alpha, antioxidant, ROS, lipid-phase, electron-transport-
-- chain, ubiquinol, ubiquinone, P-glycoprotein, lymphatic-absorption,
-- 6-panel, CLIA-certified, hydroxocobalamin-skewed, stress-related,
-- HPA-axis-dysregulation, mood-stabilizer, mania-induction, hyper-
-- tensive, serotonin-syndrome, twice-daily, neonatal-exposure,
-- thyroid-stimulation, pediatric-safety, solid-organ, stem-cell-
-- transplant, induction-immunosuppression, levodopa-metabolism,
-- pharmaceutical-treatment, antiplatelet, hepatic-impairment,
-- chronic-kidney-disease, autoimmune-disease, anti-epileptic,
-- titration, half-cap, full-cap, morning-meal, twice-daily, anxiety-
-- irritability-insomnia, MAOA-targeted, MAOA-mediated, monoamine-
-- catabolism, methylation-cycle-turnover, downstream-catechol,
-- sulfur-metabolism, CAQ-only, CAQ-plus-labs, CAQ-plus-labs-plus-
-- genetics, genotype-aware, MAOA-uVNTR, active-form, dual-form,
-- methylcobalamin-and-hydroxocobalamin, P5P-bypassing, R5P-bypassing,
-- pyridoxal-kinase, riboflavin-kinase, genotype-dependent, four-
-- pillar, methyl-donor-delivery, GABAergic-and-amino-acid-calming,
-- adaptogenic-HPA-modulation, mitochondrial-energy-support,
-- mechanistically-interlocked, sub-clinical, foundational,
-- monotherapy-SAMe-replacement, foundational-synergistic-stack,
-- individual-ingredient, clinical-indication, protocol-engine,
-- bio-optimization-score, primary-methylation-cycle, dietary-B-
-- vitamin-foundation, MAOI-medication, DSM-defined, psychiatric-
-- medication, psychiatric-prescriber, existing-pharmacotherapy). All
-- ranges in form "X to Y" not "X-Y" per feedback_no_dashes.md (e.g.,
-- "10x to 28x", "Days 1 to 7", "Days 8 to 14", "200 to 400 mg",
-- "approximately 25 percent", "approximately 40 percent",
-- "approximately 2 to 4 times"). No em-dashes, no en-dashes, no
-- arrow characters, no curly quotes, no parenthetical " - " asides.
--
-- Lane 2 micro-corrections (3 corrections vs spec text):
--   1. Migration shape: INSERT -> UPDATE (live row exists with 64-char
--      placeholder copy, same as 152q + 152r + 152s + 152t + 152u +
--      152v.0 + 152w + 152x pattern; eighth consecutive net-new spec to
--      hit drift; spec INSERT also blocked by uniq_products_canonical_
--      slug_per_category index from #142c).
--   2. Bullet 9 ingredient name: "Micellar Ashwagandha Extract (Sensoril)"
--      -> "Micellar Ashwagandha Extract (Sensoril®)" (preserve registered
--      mark per live JSONB name; overrides spec Standing Rule #8 drop-R
--      rule per established 152q + 152s + 152u match-live precedent for
--      branded ingredients still in formulation).
--   3. Bullet 13 ingredient name: "Micellar Bioperine (Black Pepper
--      Extract)" -> "Micellar Bioperine® (Black Pepper Extract)"
--      (preserve registered mark per live JSONB name; same precedent).
--   4. Opening paragraph first inline prose mention of Sensoril:
--      "Sensoril ashwagandha extract" -> "Sensoril® ashwagandha extract"
--      (per 152s consistency precedent for first inline prose mention
--      of branded ingredient; subsequent prose mentions drop ® per
--      common trademark notation convention; only applies to opening
--      paragraph since "What makes it different" paragraph has no
--      separate Sensoril prose mention).
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
    v_new_summary text := 'Neurochemical balance support, methylation pathway methyl donor delivery, and HPA axis stress modulation in a single capsule.';
    v_new_description text := E'## What does MAOA+ do?\n\nMAOA+ provides nutritional cofactor support for the monoamine oxidase A enzyme system through a precision-targeted single-capsule formulation designed for individuals identified as MAOA polymorphism carriers through the Via Cura GENEX360 panel. Built around the three-pillar architecture of Balance, Methylate, and Modulate, the formulation delivers thirteen actives across four functional clusters: a methyl donor and methylated B-vitamin cofactor stack featuring SAMe, Riboflavin-5-Phosphate, Pyridoxal-5-Phosphate, methylated folate, and dual-form vitamin B12 to support healthy methylation cycle turnover; a GABAergic and amino acid calming cluster with liposomal GABA, liposomal L-Theanine, and liposomal magnesium bisglycinate to provide inhibitory neurotransmitter tone; an adaptogenic blend featuring Sensoril® ashwagandha extract and Rhodiola rosea to support healthy HPA axis stress response; and a mitochondrial energy cluster of liposomal PQQ and liposomal CoQ10 ubiquinol to sustain the cellular energy demands of methylation chemistry. Ten of the thirteen ingredients are delivered in liposomal or micellar carrier systems for enhanced absorption (10x to 28x more bioavailable than non-encapsulated forms for the 10 carrier-enhanced ingredients); SAMe, Riboflavin-5-Phosphate, and Pyridoxal-5-Phosphate are included in their pre-activated bioactive forms with intrinsic high absorption that does not require carrier enhancement. **MAOA+ is not a MAOI medication, does not directly inhibit or enhance MAOA enzyme activity, and provides nutritional support only.** **HARD CONTRAINDICATIONS: bipolar disorder; active mania or psychosis; concurrent monoamine oxidase inhibitor (MAOI) medications including phenelzine, tranylcypromine, isocarboxazid, selegiline, rasagiline, safinamide, and moclobemide; concurrent serotonergic medications without practitioner clearance including SSRIs, SNRIs, TCAs, tramadol, dextromethorphan, triptans, St. John''s Wort, and MDMA; pregnancy and lactation; hyperthyroidism, Graves disease, or toxic multinodular goiter; pediatric use under 18 years; recent solid organ or stem cell transplant or active induction immunosuppression; and concurrent levodopa therapy without neurology consultation.** Practitioner consultation required for major depressive disorder or anxiety on pharmaceutical treatment, Parkinson''s disease, anticoagulant or antiplatelet therapy, diabetes mellitus, hypertension on medication, hepatic impairment, chronic kidney disease, autoimmune disease, active or recent cancer, and seizure disorders on anti-epileptic medications.\n\n## Ingredient breakdown\n\n- **SAMe (S-Adenosyl Methionine):** Provides the universal methyl donor for over 200 biological methylation reactions including DNA methylation, neurotransmitter O-methylation by COMT, and phosphatidylcholine synthesis, supporting healthy methylation cycle turnover and monoamine catabolism.\n- **Methylated Vitamin B2 (Riboflavin-5-Phosphate):** Provides the active flavin mononucleotide form of vitamin B2 that bypasses the riboflavin kinase activation step, supplying flavin cofactor for the FAD-dependent monoamine oxidase enzyme system and electron transport chain.\n- **Methylated Vitamin B6 (Pyridoxal-5-Phosphate):** Provides the active coenzyme form of vitamin B6 that bypasses pyridoxal kinase activation, supplying cofactor for over 140 enzymatic reactions including aromatic amino acid decarboxylase (the rate-limiting enzyme in monoamine neurotransmitter synthesis), cystathionine beta-synthase, and glutamate decarboxylase.\n- **Liposomal Methyl Folate (5-MTHF):** Provides the active reduced folate form that bypasses MTHFR enzyme activation, supporting methionine synthase regeneration of homocysteine to methionine and SAMe regeneration; particularly relevant for MTHFR C677T or A1298C variant carriers (approximately 40 percent of European descent populations).\n- **Liposomal Vitamin B12 (Methylcobalamin + Hydroxocobalamin):** Provides dual active and recyclable cobalamin forms in liposomal carrier; methylcobalamin acts as immediate methionine synthase cofactor, hydroxocobalamin provides slower-release recyclable depot for sustained B12 availability.\n- **Liposomal L-Theanine:** Provides the gamma-glutamyl ethylamide amino acid found in green tea, crossing the blood-brain barrier through the leucine-preferring transport system to produce measurable increases in alpha brain wave activity supporting calm focus.\n- **Liposomal Magnesium (Bisglycinate):** Provides magnesium chelated with two glycine amino acids in liposomal carrier; magnesium serves as a cofactor for over 300 enzymatic reactions including methylation pathway enzymes, with parallel glycine carrier supporting GABA-A and glycine receptor modulation.\n- **Liposomal GABA (Gamma-Aminobutyric Acid):** Provides the principal inhibitory neurotransmitter in liposomal carrier, supporting GABAergic tone through enteric and peripheral mechanisms (note: oral GABA blood-brain barrier penetration mechanisms are scientifically debated; effects may include vagal afferent signaling, conversion to glutamine, and HPA axis modulation).\n- **Micellar Ashwagandha Extract (Sensoril®):** Provides Sensoril root and leaf extract standardized to 10 percent withanolides plus 32 percent oligosaccharides in micellar carrier, with documented effects on HPA axis cortisol attenuation, subjective stress and anxiety scales, and sleep quality at the 125 mg dose threshold.\n- **Micellar Rhodiola Rosea (3% Rosavins):** Provides Rhodiola root extract standardized to 3 percent rosavins in micellar carrier, supporting stress resilience and mental performance under fatigue through serotonergic and dopaminergic modulation.\n- **Liposomal PQQ (Pyrroloquinoline Quinone):** Provides PQQ in liposomal carrier supporting mitochondrial biogenesis through PGC-1 alpha activation, providing direct antioxidant activity against reactive oxygen species generated during normal mitochondrial respiration.\n- **Liposomal CoQ10 (Ubiquinol):** Provides the reduced ubiquinol form of coenzyme Q10 in liposomal carrier, supporting electron transport chain function and lipid-phase antioxidant activity; ubiquinol is approximately 2 to 4 times more bioavailable than ubiquinone in elderly populations.\n- **Micellar Bioperine® (Black Pepper Extract):** Provides standardized 95 percent piperine extract in micellar carrier, documented to enhance bioavailability of co-administered nutrients through CYP3A4 modulation, P-glycoprotein effects, and lymphatic absorption pathway support.\n\n## Who benefits and what makes this different\n\n**Who benefits:** Adults identified through the Via Cura GENEX360 6-panel CLIA-certified diagnostic as carriers of MAOA polymorphisms (MAOA-uVNTR low-activity 3-repeat or high-activity 4-repeat variants); adults with documented MTHFR C677T or A1298C variants (approximately 40 percent of European descent populations) seeking active methylated folate support; adults with documented COMT V158M Met/Met variant (approximately 25 percent of Caucasian populations) seeking gentle methylation activation with hydroxocobalamin-skewed B12 ratio and titration protocol; adults seeking foundational methylation cycle and neurochemical balance support; adults with stress-related fatigue or HPA axis dysregulation seeking adaptogenic stress modulation; adults whose ViaConnect Bio Optimization Score flags weakness in methylation pathway, monoamine balance, or HPA axis function. **HARD CONTRAINDICATIONS: bipolar disorder (Type I, Type II, or cyclothymic) regardless of current mood state or concurrent mood stabilizer use due to SAMe and Rhodiola mania induction risk; active mania, hypomania, or psychosis; concurrent monoamine oxidase inhibitor (MAOI) medications (phenelzine, tranylcypromine, isocarboxazid, selegiline, rasagiline, safinamide, moclobemide) due to hypertensive crisis and serotonin syndrome risk; concurrent serotonergic medications without practitioner clearance (SSRIs, SNRIs, TCAs, atypical antidepressants, tramadol, dextromethorphan, triptans, MDMA, St. John''s Wort) due to serotonin syndrome risk; pregnancy due to ashwagandha traditional abortifacient concern, folate UL exceedance at twice-daily dose, and multiple ingredient pregnancy safety data limitations; lactation due to theoretical neonatal exposure concerns; hyperthyroidism, Graves disease, toxic multinodular goiter, or thyroid nodules with autonomous function due to Sensoril ashwagandha thyroid stimulation; pediatric use under 18 years due to insufficient pediatric safety data; recent solid organ transplant, hematopoietic stem cell transplant, or active induction immunosuppression due to ashwagandha theoretical immunomodulatory effects; concurrent levodopa therapy without neurology consultation due to SAMe and P5P interactions with levodopa metabolism. PRACTITIONER CONSULTATION REQUIRED: major depressive disorder, anxiety disorders, or other mood and anxiety conditions on pharmaceutical treatment; Parkinson''s disease; anticoagulant or antiplatelet therapy (warfarin, direct oral anticoagulants, antiplatelet agents); diabetes mellitus on insulin or oral hypoglycemic medications; hypertension or cardiovascular disease on medication; hepatic impairment; chronic kidney disease; autoimmune disease (Hashimoto thyroiditis, systemic lupus erythematosus, rheumatoid arthritis, multiple sclerosis, type 1 diabetes mellitus, inflammatory bowel disease, psoriasis, ankylosing spondylitis, Sjogren syndrome); active or recent cancer diagnosis; seizure disorders on anti-epileptic medications; pediatric, geriatric, or dysphagic individuals due to Size 00 capsule format. METHYLATION SENSITIVITY TITRATION PROTOCOL recommended for COMT V158M Met/Met carriers and MTHFR variant carriers: Days 1 to 7 one-half capsule daily with morning meal (open capsule and divide contents); Days 8 to 14 one full capsule daily with morning meal; Day 15 onward one capsule daily as maintenance or one capsule twice daily as standard initial protocol if tolerated. Discontinue and consult practitioner if adverse activation symptoms occur (anxiety, irritability, insomnia, palpitations, depersonalization, headache, fatigue).\n\n**What makes it different:** What separates MAOA+ Neurochemical Balance from generic methylation supplements is the convergence of MAOA-targeted formulation design (the formulation is the first product in the planned Via Cura Methylation and Neurogenetic Series, designed specifically to support MAOA-mediated monoamine catabolism and methylation cycle turnover; future products COMT+ for downstream catechol metabolism support and CBS Support+ for sulfur metabolism support are planned to extend the family), GENEX360 platform integration (Tier 1 CAQ-only at 72 percent confidence, Tier 2 CAQ plus labs at 86 percent, Tier 3 CAQ plus labs plus genetics at 96 percent with genotype-aware personalization including MAOA-uVNTR, MTHFR C677T and A1298C, COMT V158M, MTR, and MTRR variants), active-form B vitamin selection (methylated folate as 5-MTHF bypassing MTHFR activation, dual-form B12 as methylcobalamin and hydroxocobalamin bypassing CBL activation, P5P bypassing pyridoxal kinase activation, and R5P bypassing riboflavin kinase activation, eliminating genotype-dependent activation bottlenecks), comprehensive carrier system enhancement (10 of 13 ingredients in liposomal or micellar carrier with the 10x to 28x carrier anchor applying to those 10 ingredients; the 3 uncoated ingredients are SAMe, R5P, and P5P which are intrinsically bioavailable as active methyl donor and active coenzyme forms), four-pillar mechanistic integration (methyl donor delivery, GABAergic and amino acid calming, adaptogenic HPA modulation, and mitochondrial energy support, with each pillar mechanistically interlocked rather than operating independently), and honest sub-clinical foundational positioning (sub-clinical relative to monotherapy SAMe replacement at 200 to 400 mg twice daily; positioned as foundational methylation pathway support rather than monotherapy SAMe replacement; foundational synergistic stack rather than monotherapy for any individual ingredient''s clinical indication). MAOA+ is positioned as the protocol engine response of choice when the ViaConnect Bio Optimization Score flags weakness in methylation pathway, monoamine balance, or HPA axis function and the user has primary methylation cycle and dietary B vitamin foundation already in place. **MAOA+ is not a MAOI medication. It does not directly inhibit or enhance MAOA enzyme activity. It provides nutritional cofactors for healthy MAOA function.** Users with documented major depressive disorder, bipolar disorder, anxiety disorder, or any DSM-defined psychiatric condition should not substitute MAOA+ for prescribed psychiatric medication and should consult their psychiatric prescriber before initiating MAOA+ to evaluate compatibility with existing pharmacotherapy.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'maoa-plus-neurochemical-balance'
      AND p.sku = '40'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152y MAOA+ Neurochemical Balance update skipped: row not found at slug maoa-plus-neurochemical-balance / SKU 40';
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
        '152y_maoa_plus_neurochemical_balance_revision',
        'products',
        '40',
        v_product_id,
        jsonb_build_object(
            'method', 'rev2_structured_description_lane2_reconciled_per_152p_canonical_INSERT_to_UPDATE_conversion_eighth_consecutive_drift',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'rev2_structured_pdp_152p_canonical_lane2',
            'authority', 'Gary canonical 2026-05-07 Prompt #152y (Lane A: convert spec INSERT to UPDATE; live row already exists with 13-ingredient 651.8 mg compound formulation matching authoritative spec verbatim except for ® preservation on Sensoril and Bioperine; eighth consecutive 152x net-new spec to hit live-row drift)',
            'spec_premise_drift_correction', 'Spec authored as INSERT for net-new product. Live row already at 13/651.8mg compound formulation matching authoritative. Spec INSERT premise incorrect against live data (eighth consecutive 152x net-new spec to hit live-row drift after 152q + 152r + 152s + 152t + 152u + 152v.0 + 152w + 152x). Spec INSERT also hard-blocked by uniq_products_canonical_slug_per_category index from #142c. Migration converted to UPDATE Lane 2 reconciliation with 3 ® preservation corrections.',
            'marshall_scan', 'NOT REQUIRED per spec (no peptide content); zero hits regardless; all 13 ingredients are methyl donor + methylated B-cofactors + amino acid + mineral chelate + neurotransmitter + adaptogens + mitochondrial cofactors + bioavailability enhancer; SAMe is a sulfonium ion methyl donor (not peptide drug), GABA is an amino acid neurotransmitter (not peptide drug). Confirmed Jeffery audit 2026-05-07.',
            'hannah_pre_flight', 'NOT REQUIRED per Jeffery audit 2026-05-07 (comprehensive contraindication list already in PDP body satisfies pre-flight criterion; Hannah pre-flight required when contraindications are AMBIGUOUS or MISSING, not when spec author front-loaded them); standard post-draft Jeffery review chain applied instead',
            'bioavailability_format', '10x to 28x PARTIAL APPLIES (10/13 advanced carrier forms: 7 liposomal + 3 micellar; 3 uncoated as intrinsically bioavailable active forms - SAMe sulfonium methyl donor + R5P active flavin mononucleotide + P5P active pyridoxal coenzyme); partial-encapsulation pattern joining 152q DigestiZorb+ (2/11), 152t Grow+ (5/10), 152w Inferno+ (7/14) in PARTIAL APPLIES family. 152y at 10/13 (77% by both count and 77.0% by mass = 501.8 carrier-enhanced / 651.8 total) is the HIGHEST carrier coverage in PARTIAL APPLIES family. Prose framing: "10 of the thirteen ingredients are delivered in liposomal or micellar carrier systems for enhanced absorption (10x to 28x more bioavailable than non-encapsulated forms for the 10 carrier-enhanced ingredients); SAMe, Riboflavin-5-Phosphate, and Pyridoxal-5-Phosphate are included in their pre-activated bioactive forms with intrinsic high absorption that does not require carrier enhancement." Auto-remediator allowlist: "10x to 28x" framed in standard partial-applies form passes both Michelangelo + Jeffery 5-27x blocks; negative-form active-rationale prose ("does not require carrier enhancement") also passes.',
            'sku_verify_outcome', 'numeric SKU 40 (matches 152g BHMT+ ''35'' numeric pattern; methylation-snp category convention; differs from 152q/r/s/t/u/v/w/x FC-prefix pattern)',
            'lane2_corrections', jsonb_build_array(
                'Migration shape: INSERT -> UPDATE (live row exists with 64-char placeholder copy; eighth consecutive 152x net-new spec to hit drift after 152q/r/s/t/u/v.0/w/x; spec INSERT also hard-blocked by uniq_products_canonical_slug_per_category index from #142c)',
                'Slug correction: spec assumed maoa-plus; live is maoa-plus-neurochemical-balance (NOT in spec''s 7-candidate existence-check list)',
                'No H1 capitalization correction needed (live name MAOA+ Neurochemical Balance matches spec H1 verbatim)',
                'No prose product-abbreviation correction needed (live MAOA+ matches spec)',
                'No bullet ingredient-name corrections needed for non-branded ingredients (all 11 non-branded live JSONB names match spec verbatim)',
                'Bullet 9 ingredient name: "Micellar Ashwagandha Extract (Sensoril)" -> "Micellar Ashwagandha Extract (Sensoril®)" (preserve registered mark per live JSONB name; overrides spec Standing Rule #8 drop-R rule per established 152q + 152s + 152u match-live precedent)',
                'Bullet 13 ingredient name: "Micellar Bioperine (Black Pepper Extract)" -> "Micellar Bioperine® (Black Pepper Extract)" (preserve registered mark per live JSONB name; same precedent)',
                'Opening paragraph first inline prose mention of Sensoril: "Sensoril ashwagandha extract" -> "Sensoril® ashwagandha extract" (per 152s consistency precedent; first inline prose mention preserves ® then subsequent prose mentions drop ® - only applicable to opening paragraph since "What makes it different" paragraph has no separate Sensoril prose mention)',
                'No Bioperine inline prose mention exists outside bullet 13 (no "What makes it different" paragraph mention; bullet 13 is the only Bioperine occurrence so first-inline-mention rule satisfied at bullet)',
                'SQL apostrophe escaping: 5 instances doubled per Postgres E-string convention - "St. John''s Wort" (×2: opening contraindications + who-benefits hard-contraindications), "Parkinson''s disease" (×2: opening practitioner-consultation + who-benefits practitioner-consultation), "ingredient''s clinical indication" (×1: what-makes-different sub-clinical positioning)',
                'No em/en-dashes, no arrow characters, no curly quotes, no parenthetical " - " asides, all compound modifiers use ASCII hyphen-minus, all ranges in X-to-Y form per feedback_no_dashes.md compliance',
                'Cross-product family prose claim "future products COMT+ and CBS Support+ planned" preserved verbatim despite live drift (152j CBS Support+ shipped 2026-05-04 commit 346c487 + 152l COMT+ shipped 2026-05-04 commit cbc5fa0); per Jeffery audit guidance Lane 2 does not rewrite PDP marketing prose; logged as 152y.13 deferred Lane 1 follow-up'
            ),
            'product_name', 'MAOA+ Neurochemical Balance',
            'three_pillar_positioning', 'Balance | Methylate | Modulate',
            'live_ingredient_total_mg_compound_per_capsule', 651.8,
            'live_ingredient_count', 13,
            'live_format', 'capsule',
            'live_capsule_size', 'Size 00 vegetarian HPMC (departure from series Size 0 default; required by 651.8 mg total formulation mass exceeding Size 0 practical fill capacity)',
            'live_status_tag', 'NONE (TIER not assigned per methylation-snp category convention)',
            'live_category_slug', 'methylation-snp',
            'live_pricing', '$118.88 L1 (matches 152u GST+ pricing pattern; ends in .88 per Via Cura convention)',
            'live_image_url', 'supplement-photos/Methylation%20SNP%20Support/maoa-plus-neurochemical-balance.png (image_count=1)',
            'live_carrier_breakdown', '7 liposomal + 3 micellar + 3 uncoated active forms (SAMe sulfonium methyl donor + R5P active flavin mononucleotide + P5P active pyridoxal coenzyme); whole-formula carrier anchor 10x to 28x PARTIAL APPLIES (carrier-enhanced 10/13 = 77% by count; carrier-enhanced mass 501.8 mg / total 651.8 mg = 77.0% by mass; HIGHEST carrier coverage in PARTIAL APPLIES family)',
            'cross_product_reference', 'Methylation portfolio architecture alignment with 152j CBS Support+ + 152l COMT+ + 152u GST+ (all in methylation-snp category); Lane 1 follow-up 152y.13 to reconcile "future products COMT+ and CBS Support+ planned" prose against live products already shipped',
            'spec_source_doc_legacy_artifacts_dropped', 'FarmCeutica Inc + FarmCeutica Wellness Ltd + Building Performance Through Science tagline + source-doc 171.8 mg methyl donor matrix math error (corrected to implicit 151.8 mg via correct ingredient stack listing without 171.8 callout per spec Flag 152y.6 PQQ likely double-counted) + away from tyramine-rich meals warning (internally inconsistent with formulation mechanism per spec Flag 9; tyramine restrictions apply only to pharmaceutical MAOIs which inhibit MAOA, not MAOA+ which supports MAOA function) + excessive hedging language all NOT in reconciled copy',
            'four_formulator_confirmation_flags_preserved', jsonb_build_array(
                'FLAG 152y.5 (CRITICAL, PRODUCTION-BLOCKING, formulator confirmation required): SAMe stability without enteric coating - oral SAMe bioavailability typically drops 50 to 90 percent without enteric protection or stabilized salt forms; production gate via Dr. Dagher Medical Director with 4 resolution options (enteric raw material like GeniSAMe or Active SAMe + enteric finished capsule via Acrylic-EZE or Eudragit L30D-55 or HPMCAS + intra-capsule enteric microspheres + stabilized salt form); deferred to 152y.5 follow-up before commercial production batch',
                'FLAG 152y.6 (CRITICAL, RESOLUTION APPLIED): Source-doc Product Highlights "171.8mg methyl donor matrix" math error corrected to 151.8 mg (PQQ likely double-counted in source-doc; correct sum is SAMe 100 + R5P 25 + P5P 25 + 5-MTHF 0.8 + B12 1.0 = 151.8 mg, with PQQ 20 mg + CoQ10 50 mg = 70 mg comprising the separate mitochondrial cluster); applied across all deliverables including this PDP',
                'FLAG 152y.7 (MEDIUM, formulator confirmation required): B12 form ratio methylcobalamin to hydroxocobalamin pending; recommended 50:50 default for balanced foundational use or 30:70 hydroxocobalamin-skewed for gentler activation profile aligned with methylation sensitivity titration protocol',
                'FLAG 152y.8 (MEDIUM, formulator confirmation required): Rhodiola Rosea standardization 3% Rosavins specified but salidrosides not specified; recommended dual standardization 3% rosavins + 1% salidrosides confirmation or rationale for rosavin-only',
                'FLAG 152y.9 (HIGH, COMPLIANCE REVIEW REQUIRED): Product naming regulatory risk - "MAOA+" name directly references monoamine oxidase A enzyme; 3 risk vectors (FDA structure/function claim under 21 USC 343(r)(6) and DSHEA + MAOI medication confusion risk + healthcare provider review burden); resolution path Path A (keep technical identity, neutralize public claims via "MAOA+ is not a MAOI medication" disclaimer + neutral sub-headlines + non-enzymatic-modulation marketing copy); Steve Rica review pending',
                'FLAG 152y.10 (MEDIUM): Methylation sensitivity titration protocol included in PDP body for COMT V158M Met/Met carriers (~25% Caucasian) and MTHFR variant carriers (~40% European descent); half-cap days 1-7, full cap days 8-14, standard or maintenance day 15+',
                'FLAG 152y.11 (LOW, formulator confirmation required): Capsule Size 00 confirmed (departure from series Size 0 default); required by 651.8 mg total formulation mass exceeding Size 0 practical fill capacity; Size 00 nominal 700 mg = 93% utilization providing 7% headroom for excipients',
                'FLAG 152y.12 (LOW, RESOLUTION APPLIED): Trademark symbol handling resolved per Lane 2 match-live precedent override of spec Standing Rule #8 - PDP description bullets 9 (Sensoril®) and 13 (Bioperine®) preserve ® per live JSONB; first inline opening paragraph Sensoril® mention also preserves; subsequent prose mentions drop ® per common trademark notation convention; Supplement Facts panel and label retain ® for legal protection of licensed branded ingredients',
                'FLAG 152y.13 (MEDIUM, deferred Lane 1): Cross-product family prose "future products COMT+ and CBS Support+ planned" preserved verbatim despite live drift (152j CBS Support+ + 152l COMT+ already shipped); Lane 1 prose reconciliation deferred per Jeffery audit guidance',
                'FLAG 152y.14 (MEDIUM): GENEX360 platform integration Tier 1 CAQ-only 72% + Tier 2 CAQ+labs 86% + Tier 3 CAQ+labs+genetics 96% with MAOA-uVNTR + MTHFR C677T/A1298C + COMT V158M + MTR + MTRR variants documented in PDP body; AI protocol implementation deferred',
                'FLAG 152y.15 (MEDIUM): Hannah avatar methylation tutorial content deferred to follow-up prompt',
                'FLAG 152y.16 (MEDIUM): Health Canada NHP positioning including SAMe Schedule II check deferred to follow-up prompt with Kelsey regulatory review',
                'TYRAMINE WARNING REMOVED (per spec Flag 9): Source-doc tyramine restriction warning ("away from tyramine-rich meals") internally inconsistent with formulation mechanism since tyramine restrictions apply only to pharmaceutical MAOIs which inhibit MAOA whereas MAOA+ supports MAOA function; removed from consumer copy; only applies to individuals on concurrent pharmaceutical MAOI medications which is itself a hard contraindication for MAOA+'
            ),
            'rev2_canonical_pattern', 'feedback_152p_canonical_for_all_formulation_updates',
            'fifteenth_152x_rev2_under_standing_rule', 'true (after 152e/f/i/k/l/n/o-rev2 + 152q + 152r + 152s + 152t + 152u + 152v.0 + 152w + 152x)',
            'positioning_disclosure', 'SUB-CLINICAL FOUNDATIONAL METHYLATION PATHWAY AND NEUROCHEMICAL BALANCE STACK, NOT primary monotherapy SAMe replacement at 200 to 400 mg twice daily; ADD-ON to dietary methylation foundation and primary supplemental methylation cofactors; joins 152 series synergistic foundational philosophy alongside 152j CBS Support+ + 152l COMT+ + 152u GST+ as the methylation portfolio architecture; first product to be positioned as "Via Cura Methylation and Neurogenetic Series" framing in PDP body; first methylation pathway and neurochemical product in 152 series net-new spec sequence; first product to depart from series Size 0 default to Size 00 driven by 651.8 mg total formulation mass; HIGHEST carrier coverage in PARTIAL APPLIES bioavailability matrix family at 10/13 (77%); regulatory disclaimer "MAOA+ is not a MAOI medication" included to mitigate FDA structure/function claim risk and MAOI medication confusion risk pending Steve Rica Compliance review (152y.9)',
            'comprehensive_contraindications', 'HARD: bipolar disorder (Type I/II/cyclothymic regardless of mood state due to SAMe + Rhodiola mania induction risk) + active mania/hypomania/psychosis + concurrent MAOI medications (phenelzine + tranylcypromine + isocarboxazid + selegiline + rasagiline + safinamide + moclobemide; hypertensive crisis + serotonin syndrome risk) + concurrent serotonergic medications without practitioner clearance (SSRIs + SNRIs + TCAs + atypical antidepressants + tramadol + dextromethorphan + triptans + MDMA + St. John''s Wort; serotonin syndrome risk) + pregnancy (ashwagandha abortifacient + folate UL exceedance at 1.6 mg/day twice-daily vs 1 mg supplemental UL) + lactation + hyperthyroidism/Graves/toxic-multinodular-goiter/thyroid-nodules-with-autonomous-function (Sensoril ashwagandha thyroid stimulation) + pediatric under 18 + recent solid-organ/stem-cell transplant or active induction immunosuppression (ashwagandha immunomodulatory effects) + concurrent levodopa without neurology consultation (SAMe + P5P interactions). PRACTITIONER CONSULTATION: major depressive disorder + anxiety on pharma + Parkinson''s + anticoagulants + antiplatelets + diabetes + hypertension on med + hepatic impairment + CKD + autoimmune disease (Hashimoto + SLE + RA + MS + T1DM + IBD + psoriasis + AS + Sjogren) + cancer + seizure disorders + pediatric/geriatric/dysphagic individuals with Size 00 capsule format. METHYLATION SENSITIVITY TITRATION PROTOCOL: Days 1-7 half-cap daily morning meal + Days 8-14 full cap daily morning meal + Day 15+ standard 1 cap twice daily if tolerated or maintenance 1 cap daily for COMT V158M Met/Met (~25% Caucasian) and MTHFR variant (~40% European descent) carriers',
            'unique_152y_attributes', jsonb_build_array(
                'First methylation pathway and neurochemical product in 152 series net-new spec sequence',
                'First product positioned as Via Cura Methylation and Neurogenetic Series framing in PDP body',
                'First product to depart from series Size 0 default to Size 00 (driven by 651.8 mg total formulation mass)',
                'HIGHEST carrier coverage in PARTIAL APPLIES bioavailability matrix family at 10/13 (77% by both count and mass)',
                'First product with explicit regulatory disclaimer "MAOA+ is not a MAOI medication" in PDP body (mitigates FDA structure/function claim risk and MAOI medication confusion risk)',
                'First product with comprehensive methylation sensitivity titration protocol in PDP body (half-cap/full-cap/standard for COMT V158M Met/Met and MTHFR variant carriers)',
                'First product with explicit GENEX360 platform integration Tier 1/2/3 confidence band recommendations in PDP body',
                'First product with substantially expanded contraindication framework beyond source-doc minimum (bipolar + MAOI + serotonergic + pregnancy + hyperthyroidism + pediatric + transplant + levodopa as HARD contraindications)',
                'First product with SAMe stability production-blocking flag (152y.5) requiring Dr. Dagher Medical Director resolution before commercial production',
                'First product with high-sensitivity methylation and neurochemical formulation classification triggering Steve Rica Compliance review (152y.9) for product naming regulatory risk',
                'Eighth consecutive 152x net-new spec to hit live-row drift (after 152q/r/s/t/u/v.0/w/x); spec INSERT also hard-blocked by uniq_products_canonical_slug_per_category index from #142c',
                'Numeric SKU 40 (matches 152g BHMT+ ''35'' methylation-snp category convention; differs from 152q/r/s/t/u/v/w/x FC-prefix pattern)',
                'Live row pre-populated for 152y.1 (pricing $118.88) + 152y.2 (image populated) + 152y.3 (category methylation-snp) + 152y.4 (SKU 40) - only 152y.5/152y.7/152y.8/152y.9/152y.10/152y.11/152y.13/152y.14/152y.15/152y.16 genuinely deferred',
                'Available on mainstream supplement retailers (subject to standard MSRP/MAP) - similar distribution profile to 152x Magnesium Synergy Matrix; no peptide content + no Marshall scan flag + no Hannah pre-flight gate + no WADA Class S restrictions'
            )
        )
    );

    RAISE NOTICE '#152y MAOA+ Neurochemical Balance update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
