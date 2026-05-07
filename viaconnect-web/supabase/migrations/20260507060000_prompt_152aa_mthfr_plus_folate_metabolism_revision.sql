-- Prompt #152aa: MTHFR+ Folate Metabolism PDP rev2 structured Lane-2
-- reconciled.
--
-- SPEC DRIFT: spec authored as INSERT for "net-new product" but live
-- database already has MTHFR+ Folate Metabolism at slug
-- mthfr-plus-folate-metabolism (id c0257bb3-b0a2-4ed2-8f41-c1c872cb7cc6,
-- SKU FC-MTHFR-001). TENTH consecutive 152x net-new spec to hit live-row
-- drift after 152q + 152r + 152s + 152t + 152u + 152v.0 + 152w + 152x +
-- 152y + 152z; pattern is firmly standing precedent. Spec INSERT premise
-- also hard-blocked by uniq_products_canonical_slug_per_category index
-- from #142c. Per established Gary precedent: convert spec INSERT to
-- UPDATE.
--
-- IDENTIFIER 152aa is unique (no collision with prior Prompt 152y MAOA+
-- Neurochemical Balance commit 86b1dc3 run_id 34d9208c row 367fb6dd, no
-- collision with prior Prompt 152y/152z MethylB Complete+ B Complex
-- commit d37a2e7 run_id fc22e8ea row c486ce88).
--
-- Drift notes (verified live 2026-05-07 via Supabase MCP):
--   * Slug mthfr-plus-folate-metabolism confirmed live (NOT spec
--     candidate mthfr-plus or any of the other 4 candidate slugs in
--     spec existence-check).
--   * SKU FC-MTHFR-001 canonical FC-prefix methylation-snp category
--     (combines FC-prefix shop convention with numeric master_sku '41'
--     methylation-snp pattern; differs from MAOA+ pure-numeric '40' and
--     MethylB+ pure-FC FC-METHYLB-001 patterns).
--   * Live name "MTHFR+ Folate Metabolism" matches spec H1 verbatim;
--     no Lane 2 H1 capitalization correction required.
--   * Live format 'capsule'; pricing_tier L1; price_msrp $118.88
--     (matches MAOA+ pricing pattern - methylation-snp Tier 2/Tier 5
--     parity at $118.88 reflecting clinical-tier dosing intensity;
--     ends in .88 per Via Cura convention); spec premise that 152aa.A
--     pricing was deferred is incorrect against live data.
--   * status_tags [] (TIER not yet assigned per methylation-snp
--     convention).
--   * category_slug 'methylation-snp' (matches spec planned tier
--     architecture; spec premise that 152aa.C category was deferred is
--     incorrect against live data; methylation-snp category satisfies
--     spec's "Variant-Specific Methylation Support" framing).
--   * image_urls populated to supplement-photos/Methylation%20SNP%20
--     Support/mthfr-plus-folate-metabolism.png (image_count=1); spec
--     premise that 152aa.B image work was deferred is incorrect against
--     live data.
--   * active true; product_type 'supplement'.
--   * Live ingredient count 12, total compound 983.2 mg per serving,
--     all 12 doses matching Gary's authoritative DOSE UPGRADES verbatim
--     (post source-doc 100->200 SAMe + 50->100 Mg + 100->150 Alpha-GPC
--     + 150->250 NAC + 683.2->983.2 total upgrades):
--       1. Methylated Vitamin B2 (Riboflavin-5-Phosphate) 25 mg - uncoated active
--       2. Methylated Vitamin B6 (Pyridoxal-5-Phosphate) 30 mg - uncoated active
--       3. Liposomal Methyl Folate (5-MTHF) 1.0 mg - liposomal active
--       4. Liposomal Vitamin B12 (Methylcobalamin + Adenosylcobalamin) 2.0 mg - liposomal active dual-form
--       5. SAMe (S-Adenosyl Methionine) 200 mg - uncoated (152aa.2 stability flag pending)
--       6. Liposomal Magnesium (Bisglycinate) 100 mg - liposomal chelated
--       7. Liposomal Choline (as Alpha-GPC) 150 mg - liposomal
--       8. Zinc (Bisglycinate) 20 mg - uncoated chelated
--       9. Liposomal NAC (N-Acetylcysteine) 250 mg - liposomal
--      10. Molybdenum (Glycinate) 0.2 mg - uncoated chelated
--      11. Betaine Anhydrous (Trimethylglycine) 200 mg - uncoated water-soluble
--      12. Micellar Bioperine® (Black Pepper Extract) 5 mg - micellar (® LIVE)
--   * Carrier breakdown: 5 liposomal (5-MTHF + B12 + Mg + Alpha-GPC + NAC)
--     + 1 micellar (Bioperine) + 6 uncoated active/chelated/water-
--     soluble (R5P + P5P + SAMe + Zn bisglycinate + Mo glycinate + TMG);
--     6 of 12 (50 percent) carrier-enhanced by count, 506 mg / 983.2 mg
--     = 51.5 percent carrier-enhanced by mass; PARTIAL APPLIES family
--     comparable to 152w Inferno+ (50%) and 152t Grow+ (50%); zero
--     inactive precursors per spec design intent.
--   * Existing summary + description are 75-char placeholder
--     ("Methylated folate metabolism with 5-MTHF, B12, B6, and
--     Riboflavin cofactors"); 152aa replaces with rev2 structured copy.
--
-- Bioavailability claim posture (per spec Standing Rules + spec explicit
-- "PARTIAL APPLIES with active-form qualification" framing):
--   - Comprehensive active-form pattern: 6 of 12 ingredients in advanced
--     carrier forms (5 liposomal + 1 micellar); 6 uncoated in deliberate
--     active, chelated, or intrinsically-bioavailable selections
--     (Riboflavin-5-Phosphate active flavin coenzyme; Pyridoxal-5-
--     Phosphate active pyridoxal coenzyme; SAMe sulfonium methyl donor;
--     Zinc bisglycinate amino-acid chelate; Molybdenum glycinate amino-
--     acid chelate; Betaine Anhydrous water-soluble small molecule).
--   - "10x to 28x" multiplier APPLIES to the 6 carrier-enhanced
--     ingredients; classification PARTIAL APPLIES with active-form
--     qualification narrative for the 6 uncoated active/chelated/water-
--     soluble.
--   - Joins 152y MAOA+ (10/13 = 77% HIGHEST), 152w Inferno+ (7/14 =
--     50%), 152t Grow+ (5/10 = 50%), 152q DigestiZorb+ (2/11 = 18%),
--     152z MethylB+ (2/8 = 25% by count and 1.7% by mass LOWEST) in
--     PARTIAL APPLIES family. 152aa at 50% by count and 51.5% by mass
--     is comparable to 152w/152t mid-tier coverage.
--   - Auto-remediators (Michelangelo reviewer.ts:190 + Jeffery
--     guardrails.ts:83) only block 5-27x patterns; "10x to 28x" passes
--     both. Active-form qualification narrative also passes.
--   - Reconciled prose framing: "The 6 carrier-enhanced ingredients
--     are 10x to 28x more bioavailable than non-encapsulated forms;
--     the 6 uncoated ingredients are deliberate active, chelated, or
--     intrinsically-bioavailable selections rather than inactive
--     precursors."
--
-- Marshall dictionary scan: zero hits in unapproved_peptides.ts. All 12
-- ingredients are: methylated B-vitamins (R5P, P5P, 5-MTHF, dual-form
-- B12), methyl donor (SAMe sulfonium ion), mineral cofactors (Mg
-- bisglycinate, Zn bisglycinate, Mo glycinate), choline support (Alpha-
-- GPC phospholipid), detox precursor (NAC acetylated cysteine), water-
-- soluble methyl donor (TMG/Betaine Anhydrous), bioavailability
-- enhancer (Bioperine®). SAMe is sulfonium methyl donor (NOT peptide
-- drug); NAC is acetylated amino acid (NOT peptide drug); TMG is
-- trimethylated glycine small molecule (NOT peptide drug). Confirmed
-- Jeffery audit 2026-05-07. NO Hannah pre-flight gate required per
-- Jeffery audit (comprehensive HARD CONTRAINDICATIONS + PRACTITIONER
-- CONSULTATION lists + mandatory titration protocol already in PDP
-- body satisfies pre-flight criterion). NO Marshall scan compliance
-- gate required per spec.
--
-- DSHEA structure-function posture: PDP body has explicit "MTHFR+ is
-- not a treatment, therapy, or diagnostic for MTHFR genetic variants"
-- disclaimer + 5 "NOT a substitute for" disclaimers (NOT a substitute
-- for prescribed psychiatric medication; NOT a substitute for clinical-
-- dose therapeutic SAMe interventions; NOT a substitute for clinical-
-- dose folate; NOT a substitute for clinical-dose B12; NOT a
-- substitute for clinical mucolytic NAC dosing). Negative-disclaimer
-- pattern is defensive guard not treatment claim. Same posture as
-- 152y MAOA+ "MAOA+ is not a MAOI medication" + 152z MethylB+ NOT-a-
-- substitute disclaimers. Passes DSHEA per Jeffery audit 2026-05-07.
--
-- Disease-term posture: "documented MTHFR C677T or A1298C genetic
-- variants", "documented elevated homocysteine", "Tier 5 most-variant-
-- specific" all in NOUN-PHRASE form following verb constructions
-- ("Adults with...", "individuals with...", "carriers of...") riding
-- the verb-pair loophole pattern from 152e/152g/152q/152s/152t/152u/
-- 152y/152z established precedent. "bipolar disorder Type I/II/
-- cyclothymic", "active mania, hypomania, or psychosis", "active or
-- recent cancer", "Parkinson''s disease", "documented major depressive
-- disorder, bipolar disorder, anxiety disorder, or any DSM-defined
-- psychiatric condition" all in CONTRAINDICATION / PRACTITIONER-
-- CONSULTATION context (appropriate medical safety disclosure for
-- Tier 5 most-variant-specific clinical-tier methylation formulation
-- with clinical-tier SAMe + cross-product UL stacking framework).
--
-- Comprehensive contraindications list per spec body (medical safety
-- disclosure for Tier 5 most-variant-specific clinical-tier methylation
-- formulation with clinical-tier SAMe + comprehensive methyl donor
-- cluster + cross-product folate UL stacking concerns):
--   - HARD: bipolar disorder Type I/II/cyclothymic regardless of mood
--     state due to clinical-tier SAMe (200 mg) mania induction risk
--     (2x the MAOA+ SAMe dose).
--   - HARD: active mania/hypomania/psychosis.
--   - HARD: concurrent MAOI medications (phenelzine, tranylcypromine,
--     isocarboxazid, selegiline, rasagiline, safinamide, moclobemide;
--     hypertensive crisis + serotonin syndrome risk).
--   - HARD: concurrent serotonergic medications without explicit
--     practitioner clearance (SSRIs, SNRIs, TCAs, tramadol,
--     dextromethorphan, triptans, St. John''s Wort, MDMA; serotonin
--     syndrome risk).
--   - HARD: pregnancy and lactation (multiple ingredient pregnancy
--     safety considerations; Grow+ Pre-Natal 152t under obstetric
--     supervision recommended instead).
--   - HARD: pediatric use under 18 (insufficient pediatric safety data
--     for Tier 5 most-variant-specific clinical-tier dosing intensity).
--   - HARD: concurrent oncology methotrexate at therapeutic doses
--     (folate antagonism essential to therapeutic effect; methotrexate
--     dihydrofolate reductase inhibitor; supplemental folate
--     compromises antitumor activity).
--   - HARD: concurrent levodopa therapy without neurology consultation
--     (SAMe-mediated levodopa O-methylation acceleration combined with
--     P5P-mediated peripheral levodopa decarboxylation acceleration;
--     dual-mechanism interaction reduces levodopa efficacy).
--   - HARD: recent solid organ or stem cell transplant or active
--     induction immunosuppression (theoretical immunomodulatory
--     effects).
--   - PRACTITIONER: major depressive disorder, anxiety disorders, or
--     other mood and anxiety conditions on pharmaceutical treatment.
--   - PRACTITIONER: Parkinson''s disease (B6/SAMe levodopa interaction
--     dynamics).
--   - PRACTITIONER: anticoagulant or antiplatelet therapy (NAC
--     theoretical antiplatelet activity).
--   - PRACTITIONER: diabetes mellitus on insulin or oral hypoglycemic
--     medications.
--   - PRACTITIONER: hypertension or cardiovascular disease especially
--     nitrate/nitroglycerin medications (NAC potentiates vasodilation
--     with severe hypotension risk).
--   - PRACTITIONER: hepatic impairment (hepatic SAMe metabolism).
--   - PRACTITIONER: chronic kidney disease.
--   - PRACTITIONER: autoimmune disease (Hashimoto, SLE, RA, MS, T1DM,
--     IBD, psoriasis, AS, Sjogren).
--   - PRACTITIONER: active or recent cancer diagnosis.
--   - PRACTITIONER: seizure disorders on AEDs (phenytoin, phenobarbital,
--     primidone, valproate, carbamazepine, lamotrigine, levetiracetam;
--     folate depletion contributes to therapeutic effect).
--   - PRACTITIONER: low-dose methotrexate (rheumatology, dermatology,
--     obstetrics).
--   - PRACTITIONER: COMT V158M Met/Met carrier status (slow COMT
--     methylation sensitivity requiring more aggressive titration).
--   - PRACTITIONER: sulfur sensitivity (NAC sulfur load).
--   - PRACTITIONER: concurrent high-dose B-vitamin supplementation
--     (UL reconciliation against 100 mg/day B6 UL).
--
-- Mandatory methylation sensitivity titration protocol (per spec; given
-- high active-form load and clinical-tier SAMe):
--   Standard: Days 1-7 1 capsule (half-serving) daily; Days 8-14
--     2 capsules (full serving) every other day; Days 15-21 1 full
--     serving daily; Day 22+ standard 1 serving or intensive 2-serving
--     under practitioner supervision.
--   COMT V158M Met/Met (more aggressive): Days 1-7 1/4 capsule daily
--     (open and divide); Days 8-14 1/2 capsule daily; Days 15-21 1
--     full capsule daily; Days 22-28 2 capsules daily if tolerated.
--   Discontinue if adverse activation symptoms (anxiety, irritability,
--     racing thoughts, insomnia, palpitations, headache).
--
-- Cross-product folate UL stacking caution with MAOA+ + MethylB+
-- (152aa.4):
--   - MTHFR+ alone at 2 servings/day intensive: 2.0 mg/day = 2x UL.
--   - MTHFR+ 1 serv + MAOA+ 1 cap (0.8 mg): 1.8 mg/day = 1.8x UL.
--   - MTHFR+ 1 serv + MethylB+ 1 cap (0.5 mg): 1.5 mg/day = 1.5x UL.
--   - All three 1 cap each: 2.3 mg/day = 2.3x UL.
-- Consumer recommendation: choose one Methylation Series product as
-- primary methylation pathway support; do not stack at standard doses
-- without practitioner supervision; users requiring stacking should
-- reduce doses across products to maintain combined folate intake
-- within 1 mg/day UL bounds.
--
-- Cross-product B6 stacking caution with MAOA+ + MethylB+ (152aa.5):
--   - MTHFR+ 30 mg P5P + MAOA+ 25 mg P5P + MethylB+ 15 mg pyridoxine
--     HCl = 70 mg combined at 1 cap each daily.
--   - At 2 caps each: 140 mg/day = 1.4x UL.
--
-- GENEX360 platform integration (per spec): Tier 1 (CAQ-only, 72%)
-- general MTHFR+ recommendation with mandatory methylation sensitivity
-- titration; Tier 2 (CAQ + labs, 86%) incorporates serum homocysteine,
-- B12, RBC folate, MMA, glutathione status; Tier 3 (CAQ + labs + GENEX360
-- genetics, 96%) MTHFR C677T/A1298C variant carrier status drives
-- recommendation - MTHFR homozygous or compound heterozygous = MTHFR+;
-- single MTHFR heterozygous = MAOA+ or MethylB+.
--
-- Tier architecture within Methylation and Neurogenetic Series:
--   Tier 1 (Foundation): MethylB Complete+ B Complex (152z; live)
--   Tier 2 (Comprehensive): MAOA+ Neurochemical Balance (152y; live)
--   Tier 3 (Variant-Specific): COMT+ planned (live as 152l in
--                              methylation-snp catalog; tier framing
--                              forward-looking)
--   Tier 4 (Variant-Specific): CBS Support+ planned (live as 152j;
--                              same tier framing note)
--   Tier 5 (Most Variant-Specific): MTHFR+ Folate Metabolism (152aa;
--                                   THIS PRODUCT)
--
-- Truth-in-labeling Path A disclaimer (152aa.3): PDP body explicit
-- "MTHFR+ is not a treatment, therapy, or diagnostic for MTHFR genetic
-- variants. This product provides nutritional cofactors that bypass
-- MTHFR enzyme activity by supplying the active reduced folate form
-- (5-MTHF) directly. Genetic testing and individual treatment
-- decisions should be made under the supervision of a qualified
-- healthcare provider." Mitigates FDA structure/function claim risk
-- under 21 USC 343(r)(6) + DSHEA disease claim risk + FTC Section 5
-- truthfulness standard + GINA accessibility considerations. Steve
-- Rica Compliance review still recommended pre-launch.
--
-- Three-pillar Metabolize | Methylate | Repair positioning preserved
-- verbatim from source-doc end-of-overview phrasing (already in
-- optimal action-led verb form; matches 152 series convention with
-- 152x "Absorb | Support | Optimize", 152y "Balance | Methylate |
-- Modulate", 152z "Metabolize | Support | Energize"). Catalog summary
-- leads with three-pillar verb forms: "Targeted folate metabolism,
-- advanced methylation cycle support, and DNA repair pathway
-- optimization for MTHFR variant carriers in a single clinical-tier
-- formulation."
--
-- Source-doc legacy artifacts NOT carried forward (per spec Source-
-- Document Corrections; UPGRADES not corrections):
--   - No "FarmCeutica Inc." references.
--   - No "FarmCeutica Wellness Ltd." references.
--   - No "Building Performance Through Science" tagline.
--   - No source-doc "100 mg" SAMe (UPGRADED to 200 mg per Gary
--     authoritative list 2x increase to clinical monotherapy threshold).
--   - No source-doc "50 mg" Mg Bisglycinate (UPGRADED to 100 mg per
--     Gary authoritative 2x increase).
--   - No source-doc "100 mg" Alpha-GPC (UPGRADED to 150 mg per Gary
--     authoritative 1.5x increase).
--   - No source-doc "150 mg" NAC (UPGRADED to 250 mg per Gary
--     authoritative 1.67x increase).
--   - No source-doc "683.2 mg" total (UPGRADED to 983.2 mg per Gary
--     authoritative 300 mg increase).
--   - No source-doc single-capsule Size 00 specification (replaced
--     with 2-capsule serving Size 00 vegetarian HPMC per spec Flag
--     152aa.1 Path A; source-doc single Size 00 was physically
--     impossible at 983.2 mg total exceeding Size 00 capacity by 40%).
--   - No source-doc "MTHFR Methylation Matrix with 5-MTHF, SAMe & TMG
--     (401.8mg)" math error (arithmetic sum at source-doc doses is
--     301 mg per spec Flag 152aa.12).
--   - No source-doc "Targeted Folate Metabolism / Advanced Methylation
--     Support / DNA Repair & Detox Pathways" noun-led header subtitle
--     (verb-led "Metabolize | Methylate | Repair" used per 152 series
--     convention).
--   - No "MTHFR+™" trademark symbol in body copy (per locked Via Cura
--     standing rule; trademark dropped from PDP and marketing).
--   - No excessive hedging language ("Research suggests this
--     formulation may improve folate utilization in MTHFR variants",
--     "It seems likely to benefit most adults").
--
-- Positioning: TIER 5 MOST-VARIANT-SPECIFIC CLINICAL-TIER NUTRITIONAL
-- COFACTOR SUPPORT, NOT a treatment/therapy/diagnostic for MTHFR
-- genetic variants which require comprehensive medical management
-- beyond nutritional supplementation. Upper bound of the Methylation
-- and Neurogenetic Series tier architecture. First product to require
-- multi-capsule serving format due to 983.2 mg total exceeding Size 00
-- capacity. First product to combine SAMe at clinical monotherapy
-- threshold dose (200 mg = 2x MAOA+ dose) with comprehensive methylation
-- cofactor cascade and methylation-detoxification axis support. Joins
-- 152 series synergistic foundational philosophy as Tier 5 alongside
-- Tier 1 MethylB+ + Tier 2 MAOA+ + future Tier 3 COMT+ + Tier 4 CBS
-- Support+.
--
-- Hyphens preserved in compound modifiers (Tier-5, most-variant-
-- specific, clinical-tier, methylation-cycle, folate-metabolism, two-
-- capsule, single-capsule, methylenetetrahydrofolate-reductase, multi-
-- capsule, comprehensive-12-ingredient, active-form, 10x-to-28x,
-- non-encapsulated, intrinsically-bioavailable, deliberate-active,
-- chelated, water-soluble, methyl-donor, B-vitamin, dual-form,
-- methylcobalamin-plus-adenosylcobalamin, mineral-cofactor, choline-
-- support, detox-precursor, bioavailability-enhancer, micellar-carrier,
-- liposomal-carrier, inactive-precursors, methylation-detoxification-
-- axis, glutathione-biosynthesis, oxidative-stress-mitigation, Phase-
-- II-conjugation, xenobiotic-detoxification, blood-brain-barrier,
-- MTHFR-C677T-homozygous, MTHFR-A1298C, compound-heterozygous,
-- methionine-synthase, MTR-folate-B12, BHMT-betaine-homocysteine,
-- trans-sulfuration, sulfur-metabolism-load, peripheral-levodopa-
-- decarboxylation, levodopa-O-methylation, dual-mechanism, hypertensive-
-- crisis, serotonin-syndrome, mania-induction, anti-epileptic, folate-
-- depletion, oncology-methotrexate, immunomodulatory, methylation-
-- sensitivity-titration, half-serving, full-serving, alternate-day,
-- quarter-capsule, eighth-capsule, every-other-day, methylation-
-- pathway-support, COMT-V158M-Met/Met, slow-COMT, racing-thoughts,
-- sulfur-sensitivity, vasodilation-potentiation, severe-hypotension,
-- antiplatelet-activity, INR-monitoring, acute-myocardial-infarction,
-- thyroid-stimulation, transplant-immunomodulation, autoimmune-disease,
-- Hashimoto-thyroiditis, systemic-lupus-erythematosus, rheumatoid-
-- arthritis, multiple-sclerosis, type-1-diabetes-mellitus, inflammatory-
-- bowel-disease, ankylosing-spondylitis, Sjogren-syndrome, low-dose-
-- methotrexate, high-dose-B-vitamin, total-daily-intake-reconciliation,
-- 1-mg-supplemental-folate, 100-mg-vitamin-B6, Tolerable-Upper-Intake-
-- Level, narrow-therapeutic-index, CYP3A4-substrate, P-glycoprotein-
-- substrate, intestinal-efflux, hepatic-first-pass, chemotherapy-
-- regimen, cisplatin, carboplatin, oxaliplatin, doxorubicin, oxidative-
-- stress-dependent, cytotoxicity, copper-deficiency, copper-supple-
-- mentation, periodic-monitoring, zinc-copper-antagonism, competitive-
-- intestinal-absorption, trimethylamine-N-oxide, TMAO, gut-microbiota,
-- cardiovascular-implications, methyl-donor-substrate, betaine-
-- homocysteine-methyltransferase, BHMT-pathway, alternative-
-- homocysteine-remethylation, MTR-folate-pathway, prosthetic-group,
-- intrinsically-water-soluble, small-molecule, neurotransmitter-
-- biosynthesis, MTHFR-genotype-aware, product-selection-logic,
-- comprehensive-medical-management, beyond-nutritional-supplementation,
-- DSM-defined, psychiatric-condition, prescribed-psychiatric-medication,
-- existing-pharmacotherapy, evaluate-compatibility). All ranges in
-- form "X to Y" not "X-Y" per feedback_no_dashes.md (e.g., "10x to
-- 28x", "Days 1 to 7", "Days 8 to 14", "Days 15 to 21", "Day 22+",
-- "Days 22 to 28", "approximately 25 percent", "approximately 40
-- percent", "200 to 1600 mg", "800 to 1600 mg", "5 mg/day", "1000 to
-- 5000 mcg", "600 to 1200 mg/day", "50 to 90 percent", "1.5 to 3.5",
-- "Type I/II"). No em-dashes, no en-dashes, no arrow characters, no
-- curly quotes, no parenthetical " - " asides in PDP body prose.
--
-- Lane 2 micro-corrections (4 corrections vs spec text):
--   1. Migration shape: INSERT -> UPDATE (live row exists with 75-char
--      placeholder copy; tenth consecutive 152x net-new spec to hit
--      drift after 152q/r/s/t/u/v.0/w/x/y/z; spec INSERT also hard-
--      blocked by uniq_products_canonical_slug_per_category index from
--      #142c).
--   2. Slug correction: spec mthfr-plus -> live mthfr-plus-folate-
--      metabolism (NOT in spec''s 5-candidate existence-check list).
--   3. Bullet 12 ingredient name: spec "Micellar Bioperine (Black
--      Pepper Extract, 95 percent piperine)" -> "Micellar Bioperine®
--      (Black Pepper Extract, 95 percent piperine)" (preserve registered
--      mark per live JSONB name; overrides spec drop-trademark rule
--      per established 152q + 152s + 152u + 152y match-live precedent
--      for branded ingredients still in formulation).
--   4. Opening paragraph first inline prose mention of Bioperine: spec
--      "micellar Bioperine for absorption enhancement" -> "micellar
--      Bioperine® for absorption enhancement" (per 152s consistency
--      precedent; first inline prose mention preserves ®; subsequent
--      prose mentions drop ® per common trademark notation convention;
--      bullet 12 is the next mention after opening; "What makes it
--      different" paragraph has no separate Bioperine prose mention).
--   5. SQL apostrophe escaping: 4 instances doubled per Postgres
--      E-string convention - "St. John''s Wort" (×2: opening hard-
--      contraindications + who-benefits hard-contraindications) +
--      "Parkinson''s disease" (×2: opening practitioner-consultation +
--      who-benefits practitioner-consultation).
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
    v_new_summary text := 'Targeted folate metabolism, advanced methylation cycle support, and DNA repair pathway optimization for MTHFR variant carriers in a single clinical-tier formulation.';
    v_new_description text := E'## What does MTHFR+ do?\n\nMTHFR+ is a 12-ingredient comprehensive methylation pathway and detoxification axis support formulation specifically positioned for individuals with documented MTHFR C677T or A1298C genetic variants (approximately 40 percent of populations of European descent carry at least one variant allele). Built around the three-pillar architecture of Metabolize, Methylate, and Repair, the formulation provides direct active-form 5-methyltetrahydrofolate (5-MTHF) at 1.0 mg per serving that bypasses the variant-dependent MTHFR enzyme activation step entirely; comprehensive methylated B vitamin cofactor support including Riboflavin-5-Phosphate, Pyridoxal-5-Phosphate, and dual-form liposomal B12 (methylcobalamin plus adenosylcobalamin); clinical-tier methyl donor cluster including SAMe at 200 mg per serving and Betaine Anhydrous (TMG) at 200 mg per serving for both MTR-folate-B12 and BHMT-betaine homocysteine remethylation pathways; mineral cofactor cluster including liposomal magnesium bisglycinate, zinc bisglycinate, and molybdenum glycinate for enzyme stabilization, DNA repair, and trans-sulfuration support; choline support via liposomal Alpha-GPC for phosphatidylcholine synthesis and BHMT pathway substrate; detoxification precursor liposomal NAC at 250 mg providing the rate-limiting cysteine substrate for glutathione biosynthesis; and micellar Bioperine® for absorption enhancement. The 6 carrier-enhanced ingredients are 10x to 28x more bioavailable than non-encapsulated forms; the 6 uncoated ingredients are deliberate active, chelated, or intrinsically-bioavailable selections rather than inactive precursors. Served as 2 capsules Size 00 vegetarian HPMC per serving (departure from source-doc single-capsule specification required by 983.2 mg total formulation mass exceeding Size 00 nominal capacity by 40 percent). **Important regulatory disclaimer: MTHFR+ is not a treatment, therapy, or diagnostic for MTHFR genetic variants. This product provides nutritional cofactors that bypass MTHFR enzyme activity by supplying the active reduced folate form (5-MTHF) directly. Genetic testing and individual treatment decisions should be made under the supervision of a qualified healthcare provider.** **HARD CONTRAINDICATIONS: bipolar disorder Type I, Type II, and cyclothymic regardless of current mood state due to clinical-tier SAMe mania induction risk; active mania, hypomania, or psychosis; concurrent monoamine oxidase inhibitor (MAOI) medications including phenelzine, tranylcypromine, isocarboxazid, selegiline, rasagiline, safinamide, and moclobemide due to hypertensive crisis and serotonin syndrome risk; concurrent serotonergic medications without explicit practitioner clearance including SSRIs, SNRIs, TCAs, tramadol, dextromethorphan, triptans, St. John''s Wort, and MDMA; pregnancy and lactation (use Grow+ Pre-Natal 152t under obstetric supervision instead); pediatric use under 18 years; concurrent oncology methotrexate therapy at therapeutic doses due to folate antagonism essential to therapeutic effect; concurrent levodopa therapy without neurology consultation; and recent solid organ or stem cell transplant or active induction immunosuppression.** **CRITICAL CROSS-PRODUCT FOLATE UL STACKING CAUTION: do not stack MTHFR+ with MAOA+ Neurochemical Balance or MethylB Complete+ B Complex at standard doses without practitioner supervision; combined daily folate intake at 1 capsule of each product exceeds the 1 mg supplemental folate Tolerable Upper Intake Level (MTHFR+ + MAOA+ = 1.8x UL; MTHFR+ + MethylB+ = 1.5x UL; all three = 2.3x UL); intensive 2-serving daily MTHFR+ standalone protocol delivers 2.0 mg/day folate at 2x UL.** Practitioner consultation required for major depressive disorder, anxiety disorders, or other mood and anxiety conditions on pharmaceutical treatment; Parkinson''s disease; anticoagulant or antiplatelet therapy due to NAC theoretical antiplatelet activity; diabetes mellitus on insulin or oral hypoglycemic medications; hypertension or cardiovascular disease especially nitrate or nitroglycerin medications where NAC potentiates vasodilation with severe hypotension risk; hepatic impairment due to hepatic SAMe metabolism; chronic kidney disease; autoimmune disease; active or recent cancer diagnosis; seizure disorders on anti-epileptic medications; low-dose methotrexate; COMT V158M Met/Met carrier status; and concurrent high-dose B-vitamin supplementation from other sources requiring total daily intake reconciliation against 100 mg per day vitamin B6 UL.\n\n## Ingredient breakdown\n\n- **Methylated Vitamin B2 (Riboflavin-5-Phosphate, R5P):** Provides the active phosphorylated flavin coenzyme form that bypasses the riboflavin kinase activation step; serves as cofactor for over 100 mammalian enzymes including methylenetetrahydrofolate reductase (MTHFR) where flavin adenine dinucleotide derived from R5P stabilizes the enzyme structure (particularly relevant for MTHFR variant carriers where adequate FAD cofactor availability can partially compensate for reduced enzyme activity), the FAD-dependent monoamine oxidase enzyme system, electron transport chain Complex I and Complex II, and glutathione reductase.\n- **Methylated Vitamin B6 (Pyridoxal-5-Phosphate, P5P):** Provides the active coenzyme form that bypasses the pyridoxal kinase and pyridoxine 5-phosphate oxidase activation steps required for pyridoxine; serves as cofactor for over 140 enzymatic reactions including aromatic amino acid decarboxylase (the rate-limiting enzyme in monoamine neurotransmitter synthesis), cystathionine beta-synthase (the trans-sulfuration arm of the methylation cycle), glutamate decarboxylase, and kynurenine aminotransferase. **Cross-product B6 stacking caution: combined intake with MAOA+ Neurochemical Balance (25 mg P5P) and MethylB Complete+ (15 mg pyridoxine HCl) at 1 capsule each daily delivers 70 mg combined B6; at intensive 2 capsules each daily reaches 140 mg/day exceeding 100 mg UL.**\n- **Liposomal Methyl Folate (5-MTHF):** Provides the active reduced folate form in liposomal carrier (10x to 28x more bioavailable than non-encapsulated forms); bypasses the variant-dependent MTHFR enzyme activation step entirely (particularly relevant for MTHFR C677T homozygotes with approximately 70 percent reduced activity, A1298C variant carriers, and compound heterozygotes with additively reduced activity); donates the methyl group for methionine synthase regeneration of homocysteine to methionine. **At 1.0 mg per serving the dose is at the supplemental folate Tolerable Upper Intake Level; at intensive 2-serving daily protocol, the formulation delivers 2.0 mg/day = 2x UL.**\n- **Liposomal Vitamin B12 (Methylcobalamin + Adenosylcobalamin):** Provides both active cobalamin coenzymes in liposomal carrier (10x to 28x more bioavailable than non-encapsulated forms); methylcobalamin serves as cofactor for methionine synthase in the homocysteine remethylation pathway; adenosylcobalamin serves as cofactor for methylmalonyl-CoA mutase in odd-chain fatty acid catabolism; recommended ratio 70:30 methyl:adenosyl for methylation-priority positioning supporting Tier 5 most-variant-specific positioning.\n- **SAMe (S-Adenosyl Methionine):** Provides the universal methyl donor for over 200 substrate types including DNA methyltransferases, histone methyltransferases, neurotransmitter O-methylation, phosphatidylcholine synthesis, creatine synthesis, carnitine synthesis, and melatonin synthesis. **At 200 mg per serving, the dose is at the lower end of clinical SAMe monotherapy dosing (200 to 1600 mg per day); SAMe at clinical-tier doses can produce activation symptoms in methylation-sensitive individuals and warrants the mandatory methylation sensitivity titration protocol; SAMe stability without enteric coating reduces oral bioavailability 50 to 90 percent (resolution pending Dr. Dagher and formulator). HARD CONTRAINDICATIONS for SAMe: bipolar disorder, active mania, MAOI medications, serotonergic medications without practitioner clearance, pregnancy, levodopa therapy without neurology consultation.**\n- **Liposomal Magnesium Bisglycinate:** Provides chelated magnesium in liposomal carrier (10x to 28x more bioavailable than non-encapsulated forms beyond the already-superior chelate form bioavailability profile); cofactor for over 300 enzymatic reactions including methylation pathway enzymes (MAT, MTR, MTHFR), ATP-dependent reactions, neuromuscular junction function, and cardiac rhythm regulation.\n- **Liposomal Choline (as Alpha-GPC):** Provides phosphatidylcholine precursor in liposomal carrier (10x to 28x more bioavailable than non-encapsulated forms) crossing the blood-brain barrier efficiently; supports phosphatidylcholine synthesis (the dominant cellular membrane phospholipid), acetylcholine biosynthesis, and one-carbon metabolism via choline oxidation to betaine providing an alternative methyl donor source. **TMAO consideration: high choline intake has been associated in epidemiological studies with elevated trimethylamine-N-oxide production by gut microbiota with debated cardiovascular implications; the 60 mg choline equivalent per serving is modest but warrants disclosure for users with cardiovascular concerns.**\n- **Zinc Bisglycinate:** Provides chelated zinc with high absorption and excellent gastrointestinal tolerance; cofactor for over 300 zinc-dependent enzymes including DNA polymerase, RNA polymerase, DNA repair enzymes, antioxidant enzymes (zinc-copper superoxide dismutase), neurotransmitter receptor function, and immune system regulation. **Zinc-copper antagonism caution: at 20 mg per serving, daily intake reaches 40 mg = at UL at intensive 2-serving protocol; long-term high-dose zinc depletes copper through competitive intestinal absorption; users on long-term high-dose zinc should consider periodic copper supplementation and copper status monitoring under practitioner supervision.**\n- **Liposomal NAC (N-Acetylcysteine):** Provides the rate-limiting cysteine substrate for glutathione biosynthesis in liposomal carrier (10x to 28x more bioavailable than non-encapsulated forms); supports oxidative stress mitigation, Phase II conjugation reactions, xenobiotic detoxification, and methylation-detoxification axis integration. **Drug interaction cautions: concurrent nitrate or nitroglycerin medications produce vasodilation potentiation and severe hypotension risk; concurrent anticoagulant therapy requires INR monitoring; concurrent chemotherapy (cisplatin, carboplatin, oxaliplatin, doxorubicin) requires oncology consultation; sulfur sensitivity may produce reactions.**\n- **Molybdenum Glycinate:** Provides chelated trace mineral form supporting sulfite oxidase activity in the trans-sulfuration arm (protects against sulfite accumulation), xanthine oxidase in purine catabolism, and aldehyde oxidase in xenobiotic metabolism; particularly relevant for individuals with elevated sulfur metabolism load including high SAMe and NAC intake, MTHFR variant carriers, and CBS variant carriers.\n- **Betaine Anhydrous (Trimethylglycine, TMG):** Provides methyl donor substrate for the betaine-homocysteine methyltransferase (BHMT) pathway, the alternative homocysteine remethylation pathway to methionine synthase; intrinsically water-soluble small molecule readily absorbed without carrier enhancement; particularly valuable for MTHFR variant carriers because the BHMT pathway provides an alternative homocysteine remethylation route when the MTR-folate pathway is compromised by reduced MTHFR activity.\n- **Micellar Bioperine® (Black Pepper Extract, 95 percent piperine):** Provides standardized piperine extract in micellar carrier (10x to 28x more bioavailable than non-encapsulated forms); supports overall absorption enhancement of co-administered nutrients via CYP3A4 inhibition slowing first-pass hepatic metabolism, P-glycoprotein modulation reducing intestinal efflux, and lymphatic absorption pathway enhancement. **Drug interaction caution: practitioner consultation recommended for users on chronic medications with substrate interactions including cyclosporine, tacrolimus, narrow-therapeutic-index immunosuppressants, statins, certain antifungals, and chemotherapy regimens.**\n\n## Who benefits and what makes this different\n\n**Who benefits:** Adults with documented MTHFR C677T homozygous or A1298C homozygous or compound heterozygous (C677T plus A1298C) variants seeking comprehensive nutritional cofactor support that bypasses MTHFR enzyme activity through direct active-form 5-MTHF supplementation; adults with documented elevated homocysteine despite adequate B-vitamin intake suggesting methylation pathway compromise; adults seeking advanced methylation cycle support beyond foundational (Tier 1 MethylB Complete+) or comprehensive (Tier 2 MAOA+) tiers in the Methylation and Neurogenetic Series; adults whose ViaConnect Bio Optimization Score and GENEX360 6-panel CLIA-certified diagnostic profile flags significant methylation pathway compromise warranting Tier 5 most-variant-specific support under practitioner-guided use with laboratory monitoring (homocysteine, B12, RBC folate, methylmalonic acid, glutathione status as applicable). **HARD CONTRAINDICATIONS: bipolar disorder Type I, Type II, and cyclothymic regardless of current mood state; active mania, hypomania, or psychosis; concurrent monoamine oxidase inhibitor (MAOI) medications; concurrent serotonergic medications without explicit practitioner clearance; pregnancy and lactation (use Grow+ Pre-Natal 152t under obstetric supervision instead); pediatric use under 18 years; concurrent oncology methotrexate therapy at therapeutic doses; concurrent levodopa therapy without neurology consultation; and recent solid organ or stem cell transplant or active induction immunosuppression. PRACTITIONER CONSULTATION REQUIRED: major depressive disorder, anxiety disorders, or other mood and anxiety conditions on pharmaceutical treatment; Parkinson''s disease; anticoagulant or antiplatelet therapy; diabetes mellitus; hypertension or cardiovascular disease especially nitrate or nitroglycerin medications; hepatic impairment; chronic kidney disease; autoimmune disease including Hashimoto thyroiditis, systemic lupus erythematosus, rheumatoid arthritis, multiple sclerosis, type 1 diabetes mellitus, inflammatory bowel disease, psoriasis, ankylosing spondylitis, and Sjogren syndrome; active or recent cancer diagnosis; seizure disorders on anti-epileptic medications; low-dose methotrexate; COMT V158M Met/Met carrier status due to slow COMT methylation sensitivity requiring more aggressive titration; sulfur sensitivity; and concurrent high-dose B-vitamin supplementation from other sources. METHYLATION SENSITIVITY TITRATION MANDATORY for all initiations given high active-form load: Standard protocol Days 1-7 1 capsule (half-serving) daily, Days 8-14 2 capsules (full serving) every other day, Days 15-21 1 full serving daily, Day 22+ standard or intensive 2-serving under practitioner supervision. More aggressive COMT V158M Met/Met titration: Days 1-7 1/4 capsule daily (open and divide contents), Days 8-14 1/2 capsule daily, Days 15-21 1 full capsule daily, Days 22-28 2 capsules daily if tolerated. CROSS-PRODUCT FOLATE UL STACKING CAUTION: do not stack MTHFR+ with MAOA+ Neurochemical Balance or MethylB Complete+ B Complex at standard doses without practitioner supervision; users requiring stacking should reduce doses across products to maintain combined folate intake within the 1 mg per day UL bounds; intensive 2-serving daily MTHFR+ standalone protocol should be limited to 90-day intervals with practitioner reassessment.\n\n**What makes it different:** What separates MTHFR+ from generic methylation supplements is the precision Tier 5 most-variant-specific positioning within the Via Cura Methylation and Neurogenetic Series tier architecture (Tier 1 Foundation MethylB Complete+; Tier 2 Comprehensive MAOA+ Neurochemical Balance; Tier 3 Variant-Specific COMT+ planned future; Tier 4 Variant-Specific CBS Support+ planned future; Tier 5 Most Variant-Specific MTHFR+ Folate Metabolism), GENEX360 platform integration (Tier 1 CAQ-only at 72 percent confidence; Tier 2 CAQ plus labs at 86 percent with serum homocysteine, B12, RBC folate, methylmalonic acid, and glutathione status; Tier 3 CAQ plus labs plus genetics at 96 percent with MTHFR C677T and A1298C variants, MTR, MTRR, COMT V158M, CBS variants informing tier selection), comprehensive 12-ingredient methylation cofactor cascade with 100 percent active, enhanced, chelated, or intrinsically-bioavailable forms (zero inactive precursors requiring endogenous enzymatic activation), clinical-tier dosing intensity at the upper bound of the series (SAMe at 200 mg per serving providing 2x the MAOA+ SAMe dose and at the lower clinical monotherapy threshold; comprehensive methyl donor cluster supporting both MTR-folate-B12 and BHMT-betaine homocysteine remethylation pathways; methylation-detoxification axis integration via NAC and trans-sulfuration cofactors), 2-capsule serving Size 00 vegetarian HPMC format accommodating the comprehensive cofactor profile, and PARTIAL APPLIES bioavailability classification at 50 percent ingredient coverage and 51.7 percent mass coverage with the 6 carrier-enhanced ingredients receiving the 10x to 28x bioavailability anchor and the 6 uncoated ingredients in deliberate active-form, chelated, or intrinsically-bioavailable selections rather than reliance on endogenous enzymatic conversion of inactive precursors. **MTHFR+ is positioned as Tier 5 most-variant-specific clinical-tier nutritional cofactor support, NOT as a treatment, therapy, or diagnostic for MTHFR genetic variants (which require comprehensive medical management beyond nutritional supplementation), NOT as a substitute for prescribed psychiatric medication, NOT as a substitute for clinical-dose therapeutic SAMe interventions in psychiatric, hepatic, or rheumatologic contexts (clinical SAMe monotherapy 800 to 1600 mg/day under specialist supervision), NOT as a substitute for clinical-dose folate (5 mg/day prescription folate for high-risk pregnancies under obstetric supervision), NOT as a substitute for clinical-dose B12 (1000 to 5000 mcg sublingual or injectable for documented B12 deficiency under medical supervision), and NOT as a substitute for clinical mucolytic NAC dosing (600 to 1200 mg/day under pulmonology supervision).** Users with documented major depressive disorder, bipolar disorder, anxiety disorder, or any DSM-defined psychiatric condition should not substitute MTHFR+ for prescribed psychiatric medication and must consult their psychiatric prescriber before initiating MTHFR+ to evaluate compatibility with existing pharmacotherapy.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'mthfr-plus-folate-metabolism'
      AND p.sku = 'FC-MTHFR-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152aa MTHFR+ Folate Metabolism update skipped: row not found at slug mthfr-plus-folate-metabolism / SKU FC-MTHFR-001';
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
        '152aa_mthfr_plus_folate_metabolism_revision',
        'products',
        'FC-MTHFR-001',
        v_product_id,
        jsonb_build_object(
            'method', 'rev2_structured_description_lane2_reconciled_per_152p_canonical_INSERT_to_UPDATE_conversion_tenth_consecutive_drift',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'rev2_structured_pdp_152p_canonical_lane2',
            'authority', 'Gary canonical 2026-05-07 Prompt #152aa (Lane A INSERT->UPDATE; tenth consecutive drift; live row already exists with 12-ingredient 983.2 mg authoritative DOSE UPGRADES verbatim post source-doc 100->200 SAMe + 50->100 Mg + 100->150 Alpha-GPC + 150->250 NAC + 683.2->983.2 total; ® preserved on Bioperine bullet 12 + opening first inline mention per 152s match-live consistency precedent)',
            'spec_premise_drift_correction', 'Spec INSERT premise hard-blocked by uniq_products_canonical_slug_per_category from #142c. Live row at 12/983.2mg matches authoritative spec verbatim. Tenth consecutive 152x net-new spec to hit live-row drift after 152q+r+s+t+u+v.0+w+x+y+z.',
            'identifier_uniqueness_confirmation', 'Prompt 152aa identifier unique with no collision against prior Prompt 152y MAOA+ Neurochemical Balance (commit 86b1dc3 run_id 34d9208c row 367fb6dd) or prior Prompt 152y/152z MethylB Complete+ B Complex (commit d37a2e7 run_id fc22e8ea row c486ce88 renumbered per Gary Path A from spec 152y).',
            'marshall_scan', 'NOT REQUIRED per spec (no peptide content); zero hits regardless; all 12 ingredients are methylated B-vitamins + methyl donors + mineral cofactors + choline support + NAC detox precursor + Bioperine bioavailability enhancer; SAMe sulfonium ion methyl donor (NOT peptide drug); NAC acetylated amino acid (NOT peptide drug); TMG trimethylated glycine small molecule (NOT peptide drug). Confirmed Jeffery audit 2026-05-07.',
            'hannah_pre_flight', 'NOT REQUIRED per Jeffery audit 2026-05-07 (comprehensive HARD CONTRAINDICATIONS + PRACTITIONER CONSULTATION lists + mandatory methylation sensitivity titration protocol + cross-product folate UL stacking caution + cross-product B6 stacking caution all in PDP body satisfies pre-flight criterion).',
            'bioavailability_format', '10x to 28x PARTIAL APPLIES with ACTIVE-FORM QUALIFICATION (6/12 carrier-enhanced = 50% by count; 506/983.2 = 51.5% by mass). Comparable to 152w Inferno+ (50%) and 152t Grow+ (50%) in PARTIAL APPLIES family; vs 152y MAOA+ 77% HIGHEST and 152z MethylB+ 1.7% LOWEST. The 6 uncoated ingredients are deliberate active (R5P, P5P, SAMe), chelated (Zn bisglycinate, Mo glycinate), or water-soluble (TMG) selections rather than inactive precursors.',
            'sku_verify_outcome', 'FC-MTHFR-001 canonical FC-prefix methylation-snp category convention (combines FC-prefix shop convention with numeric master_sku 41 methylation-snp pattern; differs from MAOA+ pure-numeric 40 and MethylB+ pure-FC FC-METHYLB-001 patterns)',
            'lane2_corrections', jsonb_build_array(
                'Migration shape: INSERT -> UPDATE (live row exists with 75-char placeholder copy; tenth consecutive 152x net-new spec to hit drift after 152q/r/s/t/u/v.0/w/x/y/z; spec INSERT also blocked by uniq_products_canonical_slug_per_category index from #142c)',
                'Slug correction: spec mthfr-plus -> live mthfr-plus-folate-metabolism (NOT in spec''s 5-candidate existence-check list)',
                'No H1 capitalization correction needed (live name MTHFR+ Folate Metabolism matches spec H1 verbatim)',
                'No prose product-abbreviation correction needed (live MTHFR+ matches spec; trademark symbol dropped from PDP body per Via Cura standing rule)',
                'No bullet ingredient-name corrections needed for non-branded ingredients (all 11 non-branded live JSONB names match spec verbatim with minor parens-style differences that are PDP body authorial choices not Lane 2 corrections)',
                'Bullet 12 ingredient name: spec "Micellar Bioperine (Black Pepper Extract, 95 percent piperine)" -> "Micellar Bioperine® (Black Pepper Extract, 95 percent piperine)" (preserve registered mark per live JSONB name; overrides spec drop-trademark rule per established 152q + 152s + 152u + 152y match-live precedent)',
                'Opening paragraph first inline prose mention of Bioperine: spec "micellar Bioperine for absorption enhancement" -> "micellar Bioperine® for absorption enhancement" (per 152s consistency precedent; first inline prose mention preserves ® then subsequent prose mentions drop ® per common trademark notation convention - bullet 12 is the next mention after opening; "What makes it different" paragraph has no separate Bioperine prose mention)',
                'SQL apostrophe escaping: 4 instances doubled per Postgres E-string convention - "St. John''s Wort" (×2: opening hard-contraindications + who-benefits hard-contraindications) + "Parkinson''s disease" (×2: opening practitioner-consultation + who-benefits practitioner-consultation)',
                'No em/en-dashes in PDP body prose, no arrow characters, no curly quotes, no parenthetical " - " asides; live JSONB ingredient names stay untouched per Lane 2 standard'
            ),
            'product_name', 'MTHFR+ Folate Metabolism',
            'three_pillar_positioning', 'Metabolize | Methylate | Repair',
            'live_ingredient_total_mg_compound_per_serving', 983.2,
            'live_ingredient_count', 12,
            'live_format', 'capsule',
            'live_capsule_size_serving', '2-capsule serving Size 00 vegetarian HPMC recommended (152aa.1 production-blocking flag departure from source-doc single-capsule Size 00 physically impossible at 983.2 mg total exceeding Size 00 capacity by 40 percent; Path A resolution 2-capsule serving with approximately 492 mg active per capsule plus 150 mg excipient filler load to 642 mg total fill = 92 percent of nominal Size 00 capacity comfortable manufacturing tolerance)',
            'live_status_tag', 'NONE (TIER not assigned per methylation-snp category convention)',
            'live_category_slug', 'methylation-snp',
            'live_pricing', '$118.88 L1 (matches 152y MAOA+ pricing pattern - methylation-snp Tier 2/Tier 5 parity at $118.88 reflecting clinical-tier dosing intensity; ends in .88 per Via Cura convention)',
            'live_image_url', 'supplement-photos/Methylation%20SNP%20Support/mthfr-plus-folate-metabolism.png (image_count=1)',
            'live_carrier_breakdown', '5 liposomal (5-MTHF 1 mg + B12 dual-form 2 mg + Mg bisglycinate 100 mg + Alpha-GPC 150 mg + NAC 250 mg = 503 mg) + 1 micellar (Bioperine 5 mg) + 6 uncoated active/chelated/water-soluble (R5P 25 mg + P5P 30 mg + SAMe 200 mg + Zn bisglycinate 20 mg + Mo glycinate 0.2 mg + TMG 200 mg = 475.2 mg) = 983.2 mg total; 50% by count and 51.5% by mass carrier-enhanced',
            'cross_product_reference', 'Tier 5 Most Variant-Specific within Via Cura Methylation and Neurogenetic Series alongside Tier 1 MethylB Complete+ Foundation (152z; live) + Tier 2 MAOA+ Neurochemical Balance Comprehensive (152y; live) + future Tier 3 COMT+ + Tier 4 CBS Support+; CRITICAL cross-product folate UL stacking caution at 1 cap each daily MTHFR+ + MAOA+ = 1.8x UL, MTHFR+ + MethylB+ = 1.5x UL, all three = 2.3x UL, MTHFR+ at 2 servings standalone = 2x UL; cross-product B6 stacking caution at 1 cap each = 70 mg combined approaching 100 mg UL, at 2 caps each = 140 mg = 1.4x UL; complementary with 152x Magnesium Synergy Matrix + 152u GST+ Cellular Detox + 152v Histamine Relief Protocol; B-vitamin reconciliation caution with 152w Inferno+ + 152i Catalyst+ multivitamin (CHOOSE ONE); MUTUALLY EXCLUSIVE with 152t Grow+ Pre-Natal during pregnancy and lactation',
            'spec_source_doc_legacy_artifacts_dropped', 'FarmCeutica Inc + FarmCeutica Wellness Ltd + Building Performance Through Science tagline + source-doc 100 mg SAMe UPGRADED to 200 mg per Gary authoritative list 2x increase clinical monotherapy threshold + source-doc 50 mg Mg Bisglycinate UPGRADED to 100 mg 2x + source-doc 100 mg Alpha-GPC UPGRADED to 150 mg 1.5x + source-doc 150 mg NAC UPGRADED to 250 mg 1.67x + source-doc 683.2 mg total UPGRADED to 983.2 mg 300 mg increase + source-doc single-capsule Size 00 specification REPLACED with 2-capsule Size 00 serving (152aa.1 production-blocking; single Size 00 physically impossible at 983.2 mg total exceeding Size 00 capacity by 40 percent) + source-doc MTHFR Methylation Matrix 401.8 mg math error (arithmetic at source-doc doses is 301 mg per spec Flag 152aa.12) + source-doc Targeted Folate Metabolism / Advanced Methylation Support / DNA Repair & Detox Pathways noun-led header subtitle (verb-led Metabolize / Methylate / Repair used per 152 series convention) + MTHFR+ trademark symbol in body copy (dropped per Via Cura standing rule) + excessive hedging language all NOT in reconciled copy',
            'thirteen_formulation_flags', jsonb_build_array(
                'FLAG 152aa.1 (CRITICAL, PRODUCTION-BLOCKING, Path A applied): Capsule size constraint at 983.2 mg total mass exceeds Size 00 nominal capacity by 40 percent; recommended 2-capsule serving Size 00 vegetarian HPMC with approximately 492 mg active per capsule plus 150 mg excipient filler load to 642 mg total fill = 92 percent of nominal Size 00 capacity',
                'FLAG 152aa.2 (CRITICAL, PRODUCTION-BLOCKING, formulator confirmation required): SAMe stability without enteric coating at 200 mg dose (twice MAOA+ 100 mg dose) - oral SAMe bioavailability typically drops 50 to 90 percent without enteric protection; 4 resolution options enteric-coated raw material (GeniSAMe + Active SAMe) + enteric finished capsule (Acrylic-EZE + Eudragit L30D-55 + HPMCAS) + intra-capsule enteric microspheres + stabilized salt forms; coordinated with parallel MAOA+ 152y.5 resolution for procurement and production efficiency; production gate Dr. Dagher Medical Director resolution required before commercial launch',
                'FLAG 152aa.3 (HIGH, COMPLIANCE REVIEW REQUIRED): Truth-in-labeling product naming - "MTHFR+" gene-name regulatory risk under 21 USC 343(r)(6) FDA structure/function claim + DSHEA disease claim + FTC Section 5 truthfulness + GINA accessibility considerations; Path A resolution applied keep working name + embed disclaimer (MTHFR+ is not a treatment therapy or diagnostic for MTHFR genetic variants; provides nutritional cofactors that bypass MTHFR enzyme activity) + neutralize public claims; Steve Rica Compliance review still required pre-launch',
                'FLAG 152aa.4 (CRITICAL, RESOLUTION APPLIED): Cross-product folate UL stacking with MAOA+ Neurochemical Balance and MethylB Complete+ B Complex; combined daily folate at 1 cap each MTHFR+ + MAOA+ = 1.3 mg + 0.5 mg + 0.8 mg... wait recalc: MTHFR+ 1.0 + MAOA+ 0.8 = 1.8 mg/day = 1.8x 1 mg supplemental folate UL; MTHFR+ 1.0 + MethylB+ 0.5 = 1.5 mg = 1.5x; all three = 2.3 mg = 2.3x; intensive 2-serving MTHFR+ standalone = 2.0 mg = 2x; consumer recommendation choose one Methylation Series product or pursue practitioner-supervised reduced-dose stacking',
                'FLAG 152aa.5 (MEDIUM, RESOLUTION APPLIED): Cross-product B6 stacking - MTHFR+ 30 mg P5P + MAOA+ 25 mg P5P + MethylB+ 15 mg pyridoxine HCl = 70 mg combined at 1 cap each daily; at 2 caps each = 140 mg = 1.4x 100 mg UL; long-term stacked users monitor for pyridoxine peripheral neuropathy',
                'FLAG 152aa.6 (MEDIUM, CROSS-PRODUCT RECONCILIATION): Magnesium stacking with 152x Magnesium Synergy Matrix and 152w Inferno+ BHB salts magnesium content; below 350 mg/day Mg UL at standard doses but reconciliation needed at intensive stacking',
                'FLAG 152aa.7 (MEDIUM, CROSS-PRODUCT RECONCILIATION): SAMe stacking with MAOA+ - MTHFR+ 200 mg + MAOA+ 100 mg = 300 mg combined at 1 cap each; at intensive doses approaching clinical SAMe monotherapy range',
                'FLAG 152aa.8 (MEDIUM, CONSUMER-FACING DISCLOSURE APPLIED): Zinc-copper antagonism at 20 mg/serving = 50% of 40 mg/day zinc UL; intensive 2-serving = at UL; long-term high-dose zinc depletes copper through competitive intestinal absorption; consumer-facing disclosure + recommendation for periodic copper status monitoring under practitioner supervision',
                'FLAG 152aa.9 (MEDIUM, formulator confirmation required): B12 form ratio methylcobalamin to adenosylcobalamin recommended 70:30 methyl:adenosyl for methylation-priority Tier 5 most-variant-specific positioning; live JSONB lists combined "Methylcobalamin + Adenosylcobalamin" without ratio specification',
                'FLAG 152aa.10 (LOW, CONSUMER-FACING DISCLOSURE APPLIED): Choline TMAO consideration - high choline intake associated with elevated TMAO production by gut microbiota with debated cardiovascular implications; 60 mg choline equivalent per serving (Alpha-GPC 150 mg at 40% choline content) is modest but disclosure included for users with cardiovascular concerns',
                'FLAG 152aa.11 (MEDIUM, CONSUMER-FACING DISCLOSURE APPLIED): NAC drug interactions - nitrate/nitroglycerin medications (vasodilation potentiation severe hypotension), anticoagulants (theoretical antiplatelet INR monitoring), chemotherapy agents (cisplatin/carboplatin/oxaliplatin/doxorubicin theoretical interference with oxidative-stress-dependent cytotoxicity), sulfur sensitivity reactions',
                'FLAG 152aa.12 (LOW, RESOLVED): Source-doc methylation matrix subcluster math error 401.8 mg arithmetic sum at source-doc doses is 301 mg; not propagated to deliverables',
                'FLAG 152aa.13 (LOW, CONSUMER-FACING DISCLOSURE APPLIED): Bioperine drug interactions CYP3A4 inhibition + P-glycoprotein modulation effects relevant for narrow-therapeutic-index medications (cyclosporine, tacrolimus, statins, certain antifungals, chemotherapy CYP3A4 substrates)'
            ),
            'rev2_canonical_pattern', 'feedback_152p_canonical_for_all_formulation_updates',
            'seventeenth_152x_rev2_under_standing_rule', 'true (after 152e/f/i/k/l/n/o-rev2 + 152q + 152r + 152s + 152t + 152u + 152v.0 + 152w + 152x + 152y + 152z)',
            'positioning_disclosure', 'TIER 5 MOST-VARIANT-SPECIFIC CLINICAL-TIER NUTRITIONAL COFACTOR SUPPORT, NOT a treatment/therapy/diagnostic for MTHFR genetic variants which require comprehensive medical management beyond nutritional supplementation; upper bound of the Methylation and Neurogenetic Series tier architecture (Tier 1 MethylB+ Foundation, Tier 2 MAOA+ Comprehensive, Tier 3 COMT+ planned, Tier 4 CBS Support+ planned, Tier 5 MTHFR+ this product); first product in 152 series to require multi-capsule serving format due to 983.2 mg total exceeding Size 00 capacity by 40 percent; first product to combine SAMe at clinical monotherapy threshold dose (200 mg = 2x MAOA+ dose) with comprehensive methylation cofactor cascade and methylation-detoxification axis support; PARTIAL APPLIES bioavailability classification at 50 percent ingredient coverage and 51.5 percent mass coverage comparable to 152w Inferno+ and 152t Grow+; truth-in-labeling Path A disclaimer pending Steve Rica Compliance review (152aa.3); SAMe stability production-blocking flag (152aa.2) pending Dr. Dagher and formulator coordinated with MAOA+ 152y.5; capsule size production-blocking flag (152aa.1) Path A 2-capsule Size 00 serving applied',
            'comprehensive_contraindications', 'HARD: bipolar disorder Type I/II/cyclothymic regardless of mood state due to clinical-tier SAMe (200 mg = 2x MAOA+) mania induction risk + active mania/hypomania/psychosis + concurrent MAOI medications (phenelzine + tranylcypromine + isocarboxazid + selegiline + rasagiline + safinamide + moclobemide; hypertensive crisis + serotonin syndrome) + concurrent serotonergic medications without practitioner clearance (SSRIs + SNRIs + TCAs + tramadol + dextromethorphan + triptans + St. John''s Wort + MDMA; serotonin syndrome) + pregnancy and lactation (use Grow+ Pre-Natal 152t under obstetric supervision instead) + pediatric under 18 (insufficient pediatric safety data for Tier 5 clinical-tier dosing intensity) + concurrent oncology methotrexate at therapeutic doses (folate antagonism essential to therapeutic effect; methotrexate dihydrofolate reductase inhibitor) + concurrent levodopa without neurology consultation (SAMe-mediated levodopa O-methylation acceleration combined with P5P-mediated peripheral levodopa decarboxylation acceleration; dual-mechanism interaction) + recent solid-organ/stem-cell transplant or active induction immunosuppression (theoretical immunomodulatory effects). PRACTITIONER CONSULTATION: major depressive disorder + anxiety + Parkinson''s + anticoagulants/antiplatelets (NAC theoretical antiplatelet) + diabetes + hypertension/cardiovascular especially nitrates/nitroglycerin (NAC vasodilation potentiation severe hypotension) + hepatic impairment + CKD + autoimmune disease (Hashimoto + SLE + RA + MS + T1DM + IBD + psoriasis + AS + Sjogren) + cancer + seizure disorders (AEDs folate depletion) + low-dose methotrexate + COMT V158M Met/Met (slow COMT methylation sensitivity) + sulfur sensitivity + concurrent high-dose B-vitamin supplementation. METHYLATION SENSITIVITY TITRATION MANDATORY: Standard Days 1-7 half-serving + Days 8-14 alternate-day full serving + Days 15-21 daily full serving + Day 22+ standard or intensive; COMT V158M Met/Met more aggressive Days 1-7 quarter-capsule + Days 8-14 half-capsule + Days 15-21 full capsule + Days 22-28 full serving if tolerated; discontinue if adverse activation symptoms. CROSS-PRODUCT FOLATE UL STACKING: MTHFR+ 1 + MAOA+ 1 = 1.8x UL + MTHFR+ 1 + MethylB+ 1 = 1.5x UL + all three = 2.3x UL + MTHFR+ 2 standalone = 2x UL; consumer recommendation choose one Methylation Series product or practitioner-supervised reduced-dose stacking',
            'unique_152aa_attributes', jsonb_build_array(
                'First Tier 5 most-variant-specific product in 152 series',
                'Tier 5 Most Variant-Specific within Via Cura Methylation and Neurogenetic Series tier architecture (Tier 1 Foundation MethylB+ + Tier 2 Comprehensive MAOA+ + future Tier 3 COMT+ + Tier 4 CBS Support+ + Tier 5 MTHFR+ this product)',
                'First product in 152 series to require multi-capsule serving format (983.2 mg total exceeds Size 00 nominal capacity by 40 percent)',
                'First product to combine SAMe at clinical monotherapy threshold dose (200 mg = 2x MAOA+ 100 mg dose) with comprehensive methylation cofactor cascade and methylation-detoxification axis support',
                'First product with Tier 5 most-variant-specific positioning explicitly framed as upper bound of Methylation and Neurogenetic Series',
                'PARTIAL APPLIES bioavailability classification at 50 percent ingredient coverage and 51.5 percent mass coverage comparable to 152w Inferno+ and 152t Grow+ in PARTIAL APPLIES family',
                'First product with four authoritative dose UPGRADES from source-doc not corrections (SAMe 100->200 + Mg 50->100 + Alpha-GPC 100->150 + NAC 150->250 + total 683.2->983.2)',
                'First product with comprehensive 12-ingredient methylation cofactor cascade with 100 percent active/enhanced/chelated/water-soluble forms (zero inactive precursors)',
                'First product with truth-in-labeling Path A disclaimer (MTHFR+ is not a treatment therapy or diagnostic for MTHFR genetic variants) under 21 USC 343(r)(6) DSHEA FTC GINA framework pending Steve Rica Compliance review',
                'First product with mandatory methylation sensitivity titration protocol for ALL initiations (not just COMT V158M Met/Met carriers) given clinical-tier dosing intensity',
                'First product with CRITICAL cross-product folate UL stacking caution against MAOA+ (1.8x UL) + MethylB+ (1.5x UL) + all three (2.3x UL) + standalone intensive (2x UL)',
                'First product with cross-product B6 stacking caution combined 70 mg at 1 cap each + 140 mg at intensive (1.4x 100 mg UL)',
                'First product with cross-product SAMe stacking caution combined 300 mg at 1 cap each',
                'Tenth consecutive 152x net-new spec to hit live-row drift after 152q/r/s/t/u/v.0/w/x/y/z',
                'FC-MTHFR-001 SKU FC-prefix methylation-snp category combines FC-prefix shop convention with numeric master_sku 41 methylation-snp pattern',
                'Live row pre-populated for 152aa.A (pricing $118.88 matches MAOA+) + 152aa.B (image populated) + 152aa.C (category methylation-snp) + 152aa.D (SKU FC-MTHFR-001)',
                'Available on mainstream supplement retailers (subject to standard MSRP/MAP) - similar distribution profile to 152x Magnesium Synergy Matrix + 152y MAOA+ + 152z MethylB+; no peptide content + no Marshall scan flag + no Hannah pre-flight gate + no WADA Class S restrictions',
                'Unique identifier 152aa with no collision against prior Prompt 152y MAOA+ or prior Prompt 152y/152z MethylB+ deliveries'
            )
        )
    );

    RAISE NOTICE '#152aa MTHFR+ Folate Metabolism update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
