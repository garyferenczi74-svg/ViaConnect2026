-- Prompt #152z: MethylB Complete+ B Complex PDP rev2 structured Lane-2
-- reconciled.
--
-- IDENTIFIER COLLISION RESOLUTION (Gary Path A 2026-05-07):
-- Source spec was authored as "Prompt 152y" but COLLIDED with MAOA+
-- Neurochemical Balance which had already been delivered as Prompt 152y
-- minutes prior (commit 86b1dc3, run_id 34d9208c on row 367fb6dd).
-- Per Gary's Path A directive 2026-05-07: renumber MethylB Complete+ to
-- Prompt 152z. Methylation series tier architecture supports the
-- assignment with MethylB Complete+ as Tier 1 (Foundation) and MAOA+ as
-- Tier 2 (Comprehensive). Future tier products (COMT+, CBS Support+,
-- MTHFR+) take subsequent identifiers. All "152y" references in spec
-- materials replaced with "152z" in this deliverable; spec's
-- "152y_mb.X" placeholder identifiers replaced with "152z.X".
--
-- SPEC DRIFT: spec authored as INSERT for "net-new product" but live
-- database already has MethylB Complete+ B Complex at slug
-- methylb-complete-plus-b-complex (id c486ce88-5f27-4f2c-9a24-1df641c1420e,
-- SKU FC-METHYLB-001). NINTH consecutive 152x net-new spec to hit live-
-- row drift after 152q + 152r + 152s + 152t + 152u + 152v.0 + 152w +
-- 152x + 152y; pattern is firmly standing precedent. Spec INSERT premise
-- also hard-blocked by uniq_products_canonical_slug_per_category index
-- from #142c. Per established Gary precedent: convert spec INSERT to
-- UPDATE.
--
-- Drift notes (verified live 2026-05-07 via Supabase MCP):
--   * Slug methylb-complete-plus-b-complex confirmed live (NOT spec
--     candidate methylb-complete-plus or any of the other 6 candidate
--     slugs in spec existence-check).
--   * SKU FC-METHYLB-001 (FC-prefix pattern; differs from MAOA+ '40'
--     numeric methylation-snp pattern; matches base-formulations
--     category convention for FC-prefix SKUs).
--   * master_sku '02' (matches base-formulations category convention).
--   * Live name "MethylB Complete+ B Complex" matches Gary's match-live
--     decision 2026-05-07 (NOT spec's "MethylB Complete+ Methylated and
--     Liposomal B Complex" longer subtitle); shorter live name also
--     sidesteps the spec's truth-in-labeling concern (152z.5 partially
--     neutralized at the catalog name level; PDP body retains Path A
--     qualification language as additional honest disclosure).
--   * Live format 'capsule'; pricing_tier L1; price_msrp $48.88 ends
--     in .88 per Via Cura convention (foundational tier price; lower
--     than MAOA+ $118.88 reflecting Tier 1 vs Tier 2 architecture);
--     spec premise that 152z.A pricing was deferred is incorrect
--     against live data.
--   * status_tags [] (TIER not yet assigned per base-formulations
--     convention).
--   * category_slug 'base-formulations' (NOT methylation-snp; spec
--     assumed planned "Methylation and Neurogenetic Series" parent but
--     live placement is base-formulations; drift note: cross-product
--     tier architecture references in PDP body refer to "Methylation
--     and Neurogenetic Series" framing despite live category being
--     base-formulations - acceptable interim placement; category
--     re-architecture deferred to 152z.C follow-up).
--   * image_urls populated to supplement-photos/Base%20Formulations/
--     methylb-complete-plus-b-complex.png (image_count=1); spec premise
--     that 152z.B image work was deferred is incorrect against live
--     data.
--   * active true; product_type 'supplement'.
--   * Live ingredient count 8, total compound 76.3 mg per capsule, all
--     8 doses matching Gary's authoritative corrected list verbatim
--     (post source-doc B9 5mg->0.5mg and B12 2mg->0.8mg corrections):
--       1. B1 Thiamine 10 mg - uncoated standard
--       2. B2 Riboflavin 10 mg - uncoated standard
--       3. B3 Niacin 15 mg - uncoated (niacinamide form 152z.4 pending)
--       4. B5 Pantothenic Acid 20 mg - uncoated standard
--       5. B6 Pyridoxine 15 mg - uncoated standard
--       6. B7 Biotin 5 mg - uncoated (5000 mcg triggers FDA biotin
--          lab interference Safety Communication 2017 updated 2019)
--       7. Liposomal B9 Methyl Folate 5-MTHF 0.5 mg - liposomal active
--       8. Liposomal B12 Methylcobalamin 0.8 mg - liposomal active
--   * Live JSONB ingredient names use messy "B1 ,  Thiamine" format
--     with double-spaces and oxford-comma-prefixed names; PDP body
--     uses cleaner spec bullet headers like "Vitamin B1 (Thiamine HCl)";
--     JSONB stays untouched per Lane 2 standard (only summary +
--     description fields modified). Live JSONB ingredient name
--     formatting deferred to a future cleanup prompt.
--   * Carrier breakdown: 2 liposomal (B9 5-MTHF + B12 methylcobalamin)
--     + 6 uncoated B-vitamins; 2 of 8 (25 percent) carrier-enhanced by
--     count, 1.3 mg / 76.3 mg = 1.7 percent carrier-enhanced by mass;
--     LOWEST mass-coverage in PARTIAL APPLIES bioavailability matrix
--     family.
--   * Existing summary + description are 96-char placeholder ("Complete
--     methylated B-complex with liposomal 5-MTHF and Methylcobalamin
--     for optimal methylation"); 152z replaces with rev2 structured
--     copy.
--
-- Bioavailability claim posture (per spec Standing Rules + spec explicit
-- "PARTIAL APPLIES with minority-carrier qualification" framing for
-- LOWEST mass coverage in PARTIAL APPLIES family):
--   - Minority-carrier pattern: only 2 of 8 ingredients in liposomal
--     carrier (B9 5-MTHF and B12 methylcobalamin); 6 uncoated B-vitamins
--     in standard supplemental forms requiring endogenous enzymatic
--     activation.
--   - "10x to 28x" multiplier APPLIES to the 2 carrier-enhanced
--     ingredients only; classification PARTIAL APPLIES with minority-
--     carrier qualification narrative for the broader 6 uncoated.
--   - Joins MAOA+ (10/13 = 77%, HIGHEST), 152w Inferno+ (7/14 = 50%),
--     152t Grow+ (5/10 = 50%), 152q DigestiZorb+ (2/11 = 18%) in
--     PARTIAL APPLIES family. 152z at 25% by count and 1.7% by mass
--     is the LOWEST mass-coverage product in the PARTIAL APPLIES
--     family.
--   - Auto-remediators (Michelangelo reviewer.ts:190 + Jeffery
--     guardrails.ts:83) only block 5-27x patterns; "10x to 28x" passes
--     both. Minority-carrier qualification prose passes.
--   - Reconciled prose framing: "The 2 carrier-enhanced ingredients
--     (B9 5-MTHF and B12 methylcobalamin) are 10x to 28x more
--     bioavailable than non-encapsulated forms; the 6 uncoated B-
--     vitamins are in standard supplemental forms that rely on healthy
--     enzymatic conversion."
--
-- Marshall dictionary scan: zero hits in unapproved_peptides.ts. All 8
-- ingredients are B-vitamins (no peptide drugs). Confirmed Jeffery audit
-- 2026-05-07. NO Hannah pre-flight gate required per Jeffery audit
-- (comprehensive contraindication list + verified UL math already in
-- PDP body satisfies pre-flight criterion). NO Marshall scan compliance
-- gate required per spec ("no Marshall scan flag").
--
-- Mandatory FDA biotin laboratory test interference disclosure (152z.6):
-- 5,000 mcg biotin per capsule triggers FDA Safety Communication
-- November 2017 (updated November 2019) on biotin-streptavidin
-- immunoassay interference. Affected tests: cardiac troponin (false-low
-- can mask acute MI with potentially fatal consequences), thyroid
-- function (false-elevated free T4/T3 + false-suppressed TSH mimics
-- hyperthyroidism), HCG pregnancy (false-negative), parathyroid hormone,
-- vitamin D, hepatitis B/C screening, ferritin, and others. Consumer-
-- facing disclosure includes 72-hour hold-before-labs guidance and
-- healthcare provider notification language; included in PDP body
-- opening paragraph and bullet 6 (Vitamin B7 Biotin).
--
-- Pyridoxine peripheral neuropathy disclosure (152z.7): 15 mg
-- pyridoxine HCl per capsule at twice-daily protocol delivers 30 mg/day
-- chronic exposure; below 100 mg/day UL but in EFSA-concern zone (EFSA
-- 2023 review concluded historical 100 mg/day threshold may be too
-- generous; recent case series have reported neuropathy at chronic
-- exposure as low as 50 to 100 mg/day). Long-term users (greater than 6
-- months continuous use) advised to monitor for paresthesias, ataxia,
-- sensory symptoms; included in PDP body bullet 5 (Vitamin B6
-- Pyridoxine HCl).
--
-- Cross-product folate UL stacking caution with MAOA+ (152z.9):
-- MAOA+ provides 0.8 mg liposomal 5-MTHF per capsule; MethylB Complete+
-- provides 0.5 mg liposomal 5-MTHF per capsule.
--   - 1 capsule daily of each: combined 1.3 mg/day = 1.3x the 1 mg
--     supplemental folate UL set by Food and Nutrition Board (now
--     National Academy of Sciences, Engineering, and Medicine);
--     EXCEEDS UL by 30 percent.
--   - 2 capsules daily of each: combined 2.6 mg/day = 2.6x UL.
--   - Folate UL exists primarily to prevent masking of B12 deficiency
--     (high-dose folate normalizes megaloblastic anemia of B12
--     deficiency while allowing neurological deficits to progress
--     unrecognized). The methylated 5-MTHF form does not produce
--     unmetabolized folic acid in circulation (mitigating one secondary
--     UL concern), but the primary B12 masking concern applies to all
--     supplemental folate forms.
-- Consumer recommendation: choose either MethylB Complete+
-- (foundational tier) OR MAOA+ Neurochemical Balance (comprehensive
-- methylation tier) rather than stacking both at full doses.
-- Practitioner-supervised stacking with reduced doses (e.g., 1 capsule
-- of each daily for 1.3 mg combined which is 30% above UL) appropriate
-- in specific clinical contexts but should not be self-initiated
-- without practitioner oversight and laboratory monitoring (homocysteine,
-- B12, RBC folate, methylmalonic acid).
--
-- Cross-product B6 stacking caution with MAOA+ (152z.10):
-- MAOA+ provides 25 mg P5P per capsule; MethylB Complete+ provides 15
-- mg pyridoxine HCl per capsule.
--   - 1 capsule daily of each: combined 40 mg/day B6 = 40% of 100 mg/
--     day UL.
--   - 2 capsules daily of each: combined 80 mg/day B6 = 80% of UL,
--     APPROACHING UL with potential for chronic peripheral neuropathy
--     concern at long-term stacked use.
-- Long-term stacked users advised to monitor for pyridoxine peripheral
-- neuropathy symptoms.
--
-- Methylation sensitivity titration (per spec): COMT V158M Met/Met
-- carriers (~25% Caucasian populations) and methylation-sensitive
-- individuals start with 1 capsule every other day for 7 days, advance
-- to 1 capsule daily if tolerated; discontinue if adverse activation
-- symptoms (anxiety, irritability, racing thoughts, insomnia,
-- palpitations, headache); MAOA+ Neurochemical Balance offers dual-
-- form B12 with hydroxocobalamin component for gentler activation
-- profile as alternative.
--
-- GENEX360 platform integration (per spec): Tier 1 (CAQ-only, 72%)
-- foundational B-complex recommendation; Tier 2 (CAQ + labs, 86%)
-- incorporates serum homocysteine + B12 + RBC folate + methylmalonic
-- acid (MMA); Tier 3 (CAQ + labs + GENEX360 genetics, 96%) MTHFR
-- C677T/A1298C + COMT V158M + MTR + MTRR variants informing tier
-- selection between MethylB Complete+ (foundational) and MAOA+
-- (comprehensive).
--
-- Tier architecture within Methylation and Neurogenetic Series:
--   Tier 1 (Foundation): MethylB Complete+ B Complex (152z; this product)
--   Tier 2 (Comprehensive): MAOA+ Neurochemical Balance (152y; live)
--   Tier 3 (Variant-Specific): COMT+ planned (live as 152l in
--                              methylation-snp catalog; tier framing
--                              forward-looking for variant-specific
--                              expansion)
--   Tier 4 (Variant-Specific): CBS Support+ planned (live as 152j;
--                              same tier framing note)
--   Tier 5 (Variant-Specific): MTHFR+ planned per source-doc reference
--                              (not yet in catalog; placeholder)
--
-- Truth-in-labeling Path A qualification (152z.5): Live name "MethylB
-- Complete+ B Complex" does NOT include "Methylated and Liposomal"
-- subtitle that triggered spec's truth-in-labeling concern; live name
-- already partially neutralizes the truth-in-labeling concern at the
-- catalog name level. PDP body retains Path A qualification language
-- ("only the B9 and B12 components are in methylated active forms and
-- liposomal carriers; the other six B-vitamins are in standard
-- supplemental forms") per Jeffery audit guidance 2026-05-07: "Even
-- with shorter live name, the qualification remains useful consumer
-- disclosure given B1-B7 are unmodified forms. Removes any consumer
-- assumption all 8 are liposomal." Steve Rica Compliance review still
-- recommended as belt-and-suspenders pre-launch step.
--
-- DSHEA structure-function posture: PDP body has explicit "NOT a
-- substitute for prescribed treatment" + "NOT a substitute for
-- clinical-dose folate" + "NOT a substitute for clinical-dose B12" +
-- "NOT a substitute for comprehensive methylation cycle support"
-- disclaimers. Negative-disclaimer pattern is defensive guard, not
-- treatment claim. Same posture as 152y MAOA+ "MAOA+ is not a MAOI
-- medication" disclaimer. Passes DSHEA per Jeffery audit 2026-05-07.
--
-- Disease-term posture: "elevated environmental toxin exposure" carried
-- over to "mild homocysteine elevation", "MTHFR C677T or A1298C
-- variants", "COMT V158M Met/Met variant", "documented B-vitamin
-- deficiency states" all in NOUN-PHRASE form following verb
-- constructions ("Adults with...", "individuals with...", "carriers
-- of...") riding the verb-pair loophole pattern from 152e/152g/152q/
-- 152s/152t/152u/152y established precedent. "active or recent cancer
-- diagnosis", "major psychiatric conditions", "bipolar disorder",
-- "Parkinson''s disease", "active or recent cancer", "documented major
-- depressive disorder, bipolar disorder, anxiety disorder, or any DSM-
-- defined psychiatric condition" all in CONTRAINDICATION /
-- PRACTITIONER-CONSULTATION context (appropriate medical safety
-- disclosure for high-sensitivity foundational B-complex with biotin
-- lab interference + cross-product folate UL stacking framework).
--
-- Comprehensive contraindications list per spec body (medical safety
-- disclosure for foundational B-complex with biotin lab interference +
-- pyridoxine chronic exposure + cross-product folate UL stacking
-- concerns):
--   - HARD: concurrent oncology methotrexate (folate antagonism
--     essential to therapeutic effect; methotrexate is a
--     dihydrofolate reductase inhibitor; supplemental folate compromises
--     antitumor activity).
--   - HARD: pediatric use under 18 (insufficient pediatric safety
--     data for high-dose B-complex profile of this combination
--     formulation).
--   - PRACTITIONER: pregnancy and lactation (multiple ingredient
--     pregnancy safety considerations; pregnancy-specific Grow+ Pre-
--     Natal 152t recommended under obstetric supervision instead).
--   - PRACTITIONER: Parkinson''s disease on levodopa (B6 acceleration
--     of peripheral levodopa decarboxylation reduces blood-brain
--     barrier transit and therapeutic efficacy; pyridoxine + carbidopa
--     interaction dynamics require neurology supervision).
--   - PRACTITIONER: anti-epileptic medication use including phenytoin,
--     phenobarbital, primidone, valproate, carbamazepine, lamotrigine,
--     levetiracetam (folate depletion contributes to therapeutic
--     effect; high-dose folate supplementation may reduce seizure
--     control efficacy).
--   - PRACTITIONER: low-dose methotrexate for rheumatology (RA, SLE,
--     psoriatic arthritis), dermatology (severe psoriasis), or
--     obstetrics (ectopic pregnancy management) - folate antagonism
--     interaction.
--   - PRACTITIONER: active or recent cancer diagnosis (folate effects
--     on tumor biology depend on tumor type, timing, treatment
--     regimen; oncology consultation required).
--   - PRACTITIONER: major psychiatric conditions on pharmaceutical
--     treatment particularly bipolar disorder (methylated B-vitamins
--     can produce activation symptoms or precipitate mania in
--     susceptible individuals; methylation sensitivity titration
--     protocol partially mitigates).
--   - PRACTITIONER: concurrent high-dose B-vitamin supplementation
--     from other sources (total daily intake reconciliation against
--     established Tolerable Upper Intake Levels including 100 mg/day
--     B6 UL and 1 mg/day supplemental folate UL).
--
-- Cross-product compatibility framework (per spec):
--   - MAOA+ Neurochemical Balance (152y, live): CAUTION; CHOOSE ONE
--     OR PRACTITIONER-SUPERVISED STACKING (folate UL exceedance + B6
--     stacking; documented in PDP body).
--   - Magnesium Synergy Matrix (152x, live): COMPLEMENTARY (no folate
--     overlap; magnesium and B-vitamins synergistic for energy
--     metabolism).
--   - Inferno+ Natural Metabolic Activator (152w, live): B-VITAMIN
--     RECONCILIATION CAUTION (Inferno+ contains B-vitamins; combined
--     stack requires total daily intake check against ULs).
--   - GST+ Cellular Detox (152u, live): COMPLEMENTARY (trans-
--     sulfuration support; methylation cycle and glutathione
--     network synergistic).
--   - Histamine Relief Protocol (152v, live): COMPLEMENTARY (HNMT-
--     SAMe alignment; methylation cofactor support enables
--     histamine clearance).
--   - Grow+ Pre-Natal (152t, live): MUTUALLY EXCLUSIVE during
--     pregnancy and lactation (use Grow+ Pre-Natal under obstetric
--     supervision instead of MethylB Complete+ during pregnancy).
--   - Catalyst+ Energy Multivitamin (152i, live): CHOOSE ONE
--     (Catalyst+ contains B-vitamins; combined would exceed UL).
--
-- Three-pillar Metabolize | Support | Energize positioning preserved
-- verbatim from source-doc end-of-overview phrasing (already in
-- optimal action-led verb form; matches 152 series convention with
-- 152x "Absorb | Support | Optimize" and 152y "Balance | Methylate |
-- Modulate"). Catalog summary leads with three-pillar verb forms:
-- "B-vitamin metabolic support, methylation pathway methyl donor
-- delivery, and energy optimization in a single capsule."
--
-- Source-doc legacy artifacts NOT carried forward (per spec Source-
-- Document Corrections):
--   - No "FarmCeutica Inc." references.
--   - No "FarmCeutica Wellness Ltd." references.
--   - No "Building Performance Through Science" tagline.
--   - No source-doc "5 mg" 5-MTHF dose (corrected to 0.5 mg per Gary's
--     authoritative list; source-doc was 5x to 10x supplemental folate
--     UL violation at twice-daily protocol; production-blocking).
--   - No source-doc "2 mg" methylcobalamin dose (corrected to 0.8 mg
--     per Gary's authoritative list; source-doc was 833x RDA, excessive
--     for foundational use).
--   - No source-doc "82 mg" total formulation mass (corrected to 76.3
--     mg per Gary's authoritative list).
--   - No source-doc "Powder based formulation additive" Usage
--     Guidelines language (treated as copy-paste artifact; capsule
--     format authoritative).
--   - No source-doc "250 mg liposomal+ micellar powder" Packaging
--     Specifications language (treated as copy-paste artifact).
--   - No source-doc "One-Carbon Metabolism | Neurological Health |
--     Energy Optimization" noun-led header subtitle (verb-led
--     "Metabolize | Support | Energize" used per 152 series convention).
--   - No source-doc Size 00 capsule reference (Size 1 vegetarian HPMC
--     recommended at 67 to 83 percent capacity utilization; departure
--     from source-doc Size 00 11 percent under-fill flagged 152z.8
--     formulator confirmation pending).
--   - No excessive hedging language ("Evidence suggests this complete
--     B complex may enhance methylation in genetic variants", "It
--     seems likely to benefit most adults").
--
-- Positioning: SUB-CLINICAL FOUNDATIONAL B-COMPLEX STACK, NOT
-- comprehensive methylation cycle support; ADD-ON to dietary B-vitamin
-- foundation rather than replacement for prescribed treatment of
-- documented deficiencies or clinical-dose monotherapy intervention.
-- Tier 1 (Foundation) within Via Cura Methylation and Neurogenetic
-- Series; MAOA+ Neurochemical Balance is Tier 2 (Comprehensive). First
-- foundational tier B-complex product in 152 series. LOWEST mass-
-- coverage product in PARTIAL APPLIES bioavailability matrix family at
-- 1.7 percent mass coverage.
--
-- Hyphens preserved in compound modifiers (foundational, B-complex,
-- methylation-cycle, methylated-active-forms, liposomal-carriers,
-- non-methylated, non-liposomal, supplemental, methyltetrahydrofolate,
-- methylcobalamin, citric-acid-cycle, electron-transport-chain,
-- amino-acid, B6-dependent, keratin-synthesis, carrier-enhanced,
-- non-encapsulated, enzymatic-conversion, biotin-streptavidin,
-- 72-hour, hold-before-labs, healthcare-provider, truth-in-labeling,
-- methylated-active-forms, cross-product, MAOA-Neurochemical-Balance,
-- 1-mg-supplemental-folate, Tolerable-Upper-Intake-Level, oncology-
-- methotrexate, folate-antagonism, pediatric-safety-data, high-dose-B-
-- complex, anti-epileptic, low-dose-methotrexate, blood-brain-barrier,
-- B12-deficiency, pyridoxine-peripheral-neuropathy, MTHFR-C677T,
-- A1298C, COMT-V158M, Met/Met, methylation-sensitive, every-other-day,
-- racing-thoughts, dual-form-B12, hydroxocobalamin, gentler-activation,
-- precision-foundational, downstream-catechol, sulfur-metabolism,
-- variant-specific, dosing-protocols, CAQ-only, CAQ-plus-labs, CAQ-
-- plus-labs-plus-genetics, MTHFR-variant-carrier, COMT-V158M-genotype,
-- methylation-pathway-SNPs, focused-active-form, 5-MTHF-bypassing-
-- MTHFR, methylcobalamin-bypassing-intrinsic-factor, terminal-ileum-
-- receptor, bioavailability-enhancement, honest-truth-in-labeling,
-- explicitly-clarifies, methylated-and-liposomal, standard-supplemental,
-- requiring-healthy-enzymatic-conversion, prescribed-treatment-of-
-- documented-B-vitamin-deficiency-states, higher-doses, alternative-
-- routes-of-administration, medical-supervision, clinical-dose-folate,
-- prevention-of-neural-tube-defects, high-risk-pregnancies, obstetric-
-- supervision, sublingual-or-injectable, documented-B12-deficiency,
-- comprehensive-methylation-cycle-support, DSM-defined-psychiatric-
-- condition, prescribed-psychiatric-medication, psychiatric-prescriber,
-- existing-pharmacotherapy, thiamine-pyrophosphate, pyruvate-
-- dehydrogenase, alpha-ketoglutarate-dehydrogenase, branched-chain-
-- alpha-keto-acid-dehydrogenase, transketolase, pentose-phosphate-
-- pathway, flavin-mononucleotide, flavin-adenine-dinucleotide,
-- electron-transport-chain-Complex-I, fatty-acid-beta-oxidation, acyl-
-- CoA-dehydrogenases, glutathione-reductase, methylenetetrahydrofolate-
-- reductase, FAD-dependent, monoamine-oxidase, niacinamide, oxidative-
-- phosphorylation, glycolysis, pentose-phosphate, DNA-repair, sirtuins,
-- pantothenate-kinase-pathway, acetyl-CoA, succinyl-CoA, malonyl-CoA,
-- propionyl-CoA, HMG-CoA, fatty-acid-synthesis, cholesterol-bio-
-- synthesis, pyridoxal-kinase, pyridoxine-5-phosphate-oxidase, P5P-
-- coenzyme, aromatic-amino-acid-decarboxylase, rate-limiting-enzyme,
-- monoamine-neurotransmitter-synthesis, cystathionine-beta-synthase,
-- trans-sulfuration, methylation-cycle, glutamate-decarboxylase,
-- kynurenine-aminotransferase, biologically-active, prosthetic-group,
-- mammalian-carboxylases, gluconeogenesis, fatty-acid-synthesis,
-- propionyl-CoA-carboxylase, 3-methylcrotonyl-CoA-carboxylase,
-- methylcrotonyl-CoA-carboxylase, biotin-streptavidin-clinical-
-- laboratory-immunoassays, methylenetetrahydrofolate-reductase, methyl-
-- group, methionine-synthase-regeneration, homocysteine-to-methionine,
-- SAMe-regeneration, intrinsic-factor-requirement, saturable-terminal-
-- ileum-receptor-system, cobalamin-cofactor, myelin-sheath-synthesis).
-- All ranges in form "X to Y" not "X-Y" per feedback_no_dashes.md
-- (e.g., "10x to 28x", "67 to 83 percent", "1 to 2 percent",
-- "approximately 25 percent", "approximately 40 percent"). No em-
-- dashes, no en-dashes, no arrow characters, no curly quotes, no
-- parenthetical " - " asides in PDP body prose. Note: live JSONB
-- ingredient names contain pre-existing en-dash data condition (e.g.,
-- "B1 ,  Thiamine") that is NOT introduced by this prompt and stays
-- untouched per Lane 2 standard; deferred to a future JSONB cleanup
-- prompt.
--
-- Lane 2 micro-corrections (4 corrections vs spec text):
--   1. Identifier: 152y_mb placeholder -> 152z (per Gary Path A
--      directive 2026-05-07; resolves identifier collision with MAOA+
--      Neurochemical Balance which had already been delivered as
--      Prompt 152y; tier architecture supports the assignment with
--      MethylB Complete+ as Tier 1 Foundation and MAOA+ as Tier 2
--      Comprehensive).
--   2. Migration shape: INSERT -> UPDATE (live row exists with 96-char
--      placeholder copy; ninth consecutive 152x net-new spec to hit
--      drift after 152q/r/s/t/u/v.0/w/x/y; spec INSERT also hard-
--      blocked by uniq_products_canonical_slug_per_category index from
--      #142c).
--   3. Slug correction: spec methylb-complete-plus -> live methylb-
--      complete-plus-b-complex (NOT in spec''s 7-candidate existence-
--      check list).
--   4. Product name: spec H1 "MethylB Complete+ Methylated and
--      Liposomal B Complex" -> live "MethylB Complete+ B Complex" (per
--      Gary''s match-live decision 2026-05-07; live shorter name also
--      partially neutralizes spec''s truth-in-labeling concern 152z.5
--      at the catalog name level; PDP body retains Path A qualification
--      language as additional honest disclosure per Jeffery audit
--      guidance).
--   5. SQL apostrophe escaping: 2 instances doubled per Postgres E-
--      string convention - "Parkinson''s disease" (×2: opening
--      practitioner-consultation and who-benefits practitioner-
--      consultation lists).
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
    v_new_summary text := 'B-vitamin metabolic support, methylation pathway methyl donor delivery, and energy optimization in a single capsule.';
    v_new_description text := E'## What does MethylB Complete+ do?\n\nMethylB Complete+ provides foundational B-complex nutrition with the two methylation cycle endpoint vitamins (B9 and B12) delivered in their active methylated forms (5-methyltetrahydrofolate and methylcobalamin) in liposomal carriers, while the other six B-vitamins (B1, B2, B3, B5, B6, B7) are provided in standard supplemental forms. Built around the three-pillar architecture of Metabolize, Support, and Energize, the formulation delivers eight B-vitamins across the methylation pathway and broader B-vitamin metabolic infrastructure: liposomal 5-MTHF and liposomal methylcobalamin support methylation cycle turnover and homocysteine remethylation; thiamine, riboflavin, niacin, and pantothenic acid fuel cellular energy production through citric acid cycle and electron transport chain cofactor activity; pyridoxine (after endogenous activation to P5P) supports neurotransmitter biosynthesis and broader B6-dependent metabolism; biotin supports keratin synthesis for hair, skin, and nails. The 2 carrier-enhanced ingredients (B9 5-MTHF and B12 methylcobalamin) are 10x to 28x more bioavailable than non-encapsulated forms; the 6 uncoated B-vitamins are in standard supplemental forms that rely on healthy enzymatic conversion. **Important laboratory testing notice: this product contains biotin (vitamin B7) at 5,000 mcg per capsule. Biotin can interfere with laboratory test results for thyroid function (mimicking hyperthyroidism), cardiac troponin (potentially masking acute heart attack), pregnancy, and other tests. Discontinue this product for at least 72 hours before any scheduled laboratory testing, and inform your healthcare provider that you are taking biotin.** **Important truth-in-labeling notice: only the B9 and B12 components are in methylated active forms and liposomal carriers; the other six B-vitamins (B1, B2, B3, B5, B6, B7) are in standard supplemental forms.** **Cross-product caution: do not stack this product with MAOA+ Neurochemical Balance at full doses without practitioner supervision; combined daily folate intake at 1 capsule of each product is 1.3 mg, which exceeds the 1 mg supplemental folate Tolerable Upper Intake Level by 30 percent.** **HARD CONTRAINDICATIONS: concurrent oncology methotrexate therapy due to folate antagonism essential to therapeutic effect; pediatric use under 18 years due to insufficient pediatric safety data for the high-dose B-complex profile.** Practitioner consultation required for pregnancy and lactation (use Grow+ Pre-Natal 152t under obstetric supervision instead), Parkinson''s disease on levodopa (B6 accelerates peripheral levodopa decarboxylation and reduces blood-brain barrier transit), anti-epileptic medication use (folate depletion contributes to therapeutic effect of phenytoin, phenobarbital, primidone, valproate, carbamazepine, lamotrigine, and levetiracetam), low-dose methotrexate for rheumatology or dermatology, active or recent cancer diagnosis with concern about folate effects on tumor biology, major psychiatric conditions on pharmaceutical treatment particularly bipolar disorder where methylated B-vitamins can produce activation symptoms, and concurrent high-dose B-vitamin supplementation from other sources requiring total daily intake reconciliation against established Tolerable Upper Intake Levels.\n\n## Ingredient breakdown\n\n- **Vitamin B1 (Thiamine HCl):** Provides thiamine in the standard supplemental form that, after endogenous activation to thiamine pyrophosphate, serves as cofactor for pyruvate dehydrogenase, alpha-ketoglutarate dehydrogenase, branched-chain alpha-keto acid dehydrogenase, and transketolase to support cellular energy production through the citric acid cycle and pentose phosphate pathway.\n- **Vitamin B2 (Riboflavin):** Provides riboflavin in the standard supplemental form that, after endogenous activation to flavin mononucleotide and flavin adenine dinucleotide, serves as cofactor for over 100 mammalian enzymes including electron transport chain Complex I and Complex II, fatty acid beta-oxidation acyl-CoA dehydrogenases, glutathione reductase, methylenetetrahydrofolate reductase, and the FAD-dependent monoamine oxidase enzyme system.\n- **Vitamin B3 (Niacin as Niacinamide recommended pending formulator confirmation):** Provides niacinamide form preferred for foundational B-complex use without the niacin flush of nicotinic acid; after conversion to NAD plus and NADP plus, serves as cofactor in over 400 enzymatic reactions including oxidative phosphorylation, glycolysis, the pentose phosphate pathway, and DNA repair sirtuins.\n- **Vitamin B5 (Calcium D-Pantothenate):** Provides pantothenic acid in the calcium salt form that, after conversion to coenzyme A through the pantothenate kinase pathway, serves as substrate for acetyl-CoA, succinyl-CoA, malonyl-CoA, propionyl-CoA, and HMG-CoA in the citric acid cycle, fatty acid synthesis, fatty acid beta-oxidation, branched-chain amino acid catabolism, and cholesterol biosynthesis.\n- **Vitamin B6 (Pyridoxine HCl):** Provides pyridoxine in the standard supplemental form that, after endogenous activation through pyridoxal kinase and pyridoxine 5-phosphate oxidase to the active P5P coenzyme form, serves as cofactor for over 140 enzymatic reactions including aromatic amino acid decarboxylase (the rate-limiting enzyme in monoamine neurotransmitter synthesis), cystathionine beta-synthase (in the trans-sulfuration arm of the methylation cycle), glutamate decarboxylase, and kynurenine aminotransferase. **Long-term users (greater than 6 months continuous use) advised to monitor for early signs of pyridoxine peripheral neuropathy including paresthesias, ataxia, or sensory symptoms; discontinue and consult practitioner if these symptoms develop.**\n- **Vitamin B7 (Biotin):** Provides biotin in the standard supplemental form (biologically active without further conversion) that serves as the prosthetic group for five mammalian carboxylases including pyruvate carboxylase in gluconeogenesis, acetyl-CoA carboxylase in fatty acid synthesis, propionyl-CoA carboxylase, 3-methylcrotonyl-CoA carboxylase, and methylcrotonyl-CoA carboxylase. **The 5,000 mcg dose triggers FDA Safety Communication 2017 (updated 2019) on biotin interference with biotin-streptavidin clinical laboratory immunoassays for thyroid function, cardiac troponin, HCG pregnancy tests, and other tests; discontinue at least 72 hours before any scheduled laboratory testing.**\n- **Liposomal Vitamin B9 (5-Methyltetrahydrofolate, 5-MTHF):** Provides the active reduced folate form in liposomal carrier (10x to 28x more bioavailable than non-encapsulated forms); bypasses the methylenetetrahydrofolate reductase enzyme activation step required for folic acid and dietary folate (particularly relevant for MTHFR C677T or A1298C variant carriers approximately 40 percent of European descent populations); donates the methyl group for methionine synthase regeneration of homocysteine to methionine and SAMe regeneration.\n- **Liposomal Vitamin B12 (Methylcobalamin):** Provides the active methylated cobalamin form in liposomal carrier (10x to 28x more bioavailable than non-encapsulated forms); bypasses the intrinsic factor requirement and saturable terminal ileum receptor system that limits standard oral B12 absorption to approximately 1 to 2 percent; serves as the cobalamin cofactor for methionine synthase in homocysteine remethylation and supports myelin sheath synthesis and maintenance.\n\n## Who benefits and what makes this different\n\n**Who benefits:** Adults seeking foundational B-complex nutrition with active methylated forms of B9 and B12 in liposomal carriers; adults identified through the Via Cura GENEX360 6-panel CLIA-certified diagnostic as carriers of MTHFR C677T or A1298C variants (approximately 40 percent of European descent populations) seeking active methylated folate that bypasses the variant-dependent activation step; adults with mild homocysteine elevation seeking methylation cycle support; adults seeking everyday B-complex nutrition where active-form B9 and B12 represent an upgrade over generic B-complex products; adults whose ViaConnect Bio Optimization Score flags weakness in methylation pathway, monoamine balance, or B-vitamin metabolic infrastructure but who do not require comprehensive methylation cycle support (which is provided by MAOA+ Neurochemical Balance at higher tier). **HARD CONTRAINDICATIONS: concurrent oncology methotrexate therapy due to folate antagonism essential to therapeutic effect; pediatric use under 18 years due to insufficient pediatric safety data for the high-dose B-complex profile of this combination formulation. PRACTITIONER CONSULTATION REQUIRED: pregnancy and lactation due to multiple ingredient pregnancy safety considerations and the availability of pregnancy-specific prenatal formulations (Grow+ Pre-Natal 152t recommended under obstetric supervision instead of MethylB Complete+ during pregnancy); Parkinson''s disease on levodopa due to B6 acceleration of peripheral levodopa decarboxylation; anti-epileptic medication use including phenytoin, phenobarbital, primidone, valproate, carbamazepine, lamotrigine, and levetiracetam due to folate depletion contributing to therapeutic effect; low-dose methotrexate for rheumatology, dermatology, or obstetrics due to folate antagonism interaction; active or recent cancer diagnosis due to concerns about folate effects on tumor biology depending on tumor type and timing; major psychiatric conditions on pharmaceutical treatment particularly bipolar disorder where methylated B-vitamins can produce activation symptoms or precipitate mania in susceptible individuals; concurrent high-dose B-vitamin supplementation from other sources where total daily intake should be reconciled against established Tolerable Upper Intake Levels including the 100 mg per day UL for vitamin B6 and the 1 mg per day UL for supplemental folate. CROSS-PRODUCT STACKING CAUTION: do not stack MethylB Complete+ with MAOA+ Neurochemical Balance at full doses without practitioner supervision; combined supplemental folate intake at 1 capsule daily of each product is 1.3 mg per day, which exceeds the 1 mg per day UL by 30 percent; at 2 capsules daily of each product, combined folate intake is 2.6 mg per day, which is 2.6 times the UL; combined B6 intake at 2 capsules daily of each product is 80 mg, approaching the 100 mg per day UL with potential for chronic peripheral neuropathy concern. METHYLATION SENSITIVITY TITRATION recommended for COMT V158M Met/Met carriers (approximately 25 percent of Caucasian populations) and methylation-sensitive individuals: start with 1 capsule every other day for 7 days; if well tolerated, advance to 1 capsule daily; if adverse activation symptoms occur (anxiety, irritability, racing thoughts, insomnia, palpitations, headache), reduce frequency or discontinue and consider alternative methylation support such as MAOA+ Neurochemical Balance which offers a dual-form B12 with hydroxocobalamin component for gentler activation profile.\n\n**What makes it different:** What separates MethylB Complete+ from generic B-complex supplements is the precision foundational positioning within the Via Cura Methylation and Neurogenetic Series tier architecture (MethylB Complete+ as Tier 1 foundational tier; MAOA+ Neurochemical Balance as Tier 2 comprehensive methylation cycle support tier; future planned products COMT+ for downstream catechol metabolism support, CBS Support+ for sulfur metabolism support, and MTHFR+ for severe variant-specific dosing protocols), GENEX360 platform integration (Tier 1 CAQ-only at 72 percent confidence with general foundational recommendation; Tier 2 CAQ plus labs at 86 percent with serum homocysteine, B12, RBC folate, and methylmalonic acid functional B-vitamin status; Tier 3 CAQ plus labs plus genetics at 96 percent with MTHFR variant carrier status, COMT V158M genotype, and other methylation pathway SNPs informing tier selection), focused active-form selection at the methylation cycle endpoints (5-MTHF bypassing MTHFR activation; methylcobalamin bypassing the intrinsic factor and terminal ileum receptor saturation; both delivered in liposomal carriers with 10x to 28x bioavailability enhancement), and honest truth-in-labeling positioning that explicitly clarifies which 2 of 8 ingredients are methylated and liposomal versus which 6 are standard supplemental forms requiring healthy enzymatic conversion. **MethylB Complete+ is positioned as foundational B-complex support, NOT as a substitute for prescribed treatment of documented B-vitamin deficiency states (which typically require higher doses or alternative routes of administration under medical supervision), NOT as a substitute for clinical-dose folate (5 mg per day prescription folate for prevention of neural tube defects in high-risk pregnancies under obstetric supervision), NOT as a substitute for clinical-dose B12 (1,000 to 5,000 mcg sublingual or injectable for documented B12 deficiency under medical supervision), and NOT as a substitute for comprehensive methylation cycle support (MAOA+ Neurochemical Balance recommended for that use case).** Users with documented major depressive disorder, bipolar disorder, anxiety disorder, or any DSM-defined psychiatric condition should not substitute MethylB Complete+ for prescribed psychiatric medication and should consult their psychiatric prescriber before initiating MethylB Complete+ to evaluate compatibility with existing pharmacotherapy.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'methylb-complete-plus-b-complex'
      AND p.sku = 'FC-METHYLB-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152z MethylB Complete+ B Complex update skipped: row not found at slug methylb-complete-plus-b-complex / SKU FC-METHYLB-001';
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
        '152z_methylb_complete_plus_b_complex_revision',
        'products',
        'FC-METHYLB-001',
        v_product_id,
        jsonb_build_object(
            'method', 'rev2_structured_description_lane2_reconciled_per_152p_canonical_INSERT_to_UPDATE_conversion_ninth_consecutive_drift_with_152y_to_152z_identifier_collision_resolution',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'rev2_structured_pdp_152p_canonical_lane2',
            'authority', 'Gary canonical 2026-05-07 Prompt #152z (renumbered from spec Prompt 152y per Path A directive resolving identifier collision with MAOA+ Neurochemical Balance shipped as Prompt 152y commit 86b1dc3 run_id 34d9208c minutes prior; Lane A INSERT->UPDATE; ninth consecutive 152x net-new spec to hit live-row drift; live row already exists with 8-ingredient 76.3 mg corrected formulation matching Gary authoritative list verbatim except for messy JSONB ingredient name format which stays untouched per Lane 2 standard)',
            'identifier_collision_resolution', 'Gary Path A directive 2026-05-07: MethylB Complete+ renumbered from spec Prompt 152y to Prompt 152z. MAOA+ Neurochemical Balance preserved as Prompt 152y (already shipped commit 86b1dc3 run_id 34d9208c row 367fb6dd). Methylation series tier architecture supports the assignment with MethylB Complete+ as Tier 1 Foundation and MAOA+ as Tier 2 Comprehensive. Future tier products COMT+ Tier 3 + CBS Support+ Tier 4 + MTHFR+ Tier 5 take subsequent identifiers. All 152y_mb.X spec placeholder identifiers replaced with 152z.X in this deliverable. Lowest implementation cost vs Path B paired identifiers requiring retrofitting MAOA+ migration prompt_ref + audit log + filename to compound format and Path C overwrite which would discard MAOA+ delivery.',
            'spec_premise_drift_correction', 'Spec authored as INSERT for net-new product. Live row already at 8-ingredient 76.3 mg corrected formulation matching Gary authoritative list verbatim. Spec INSERT premise incorrect against live data (ninth consecutive 152x net-new spec to hit live-row drift after 152q + 152r + 152s + 152t + 152u + 152v.0 + 152w + 152x + 152y). Spec INSERT also hard-blocked by uniq_products_canonical_slug_per_category index from #142c. Migration converted to UPDATE Lane 2 reconciliation with identifier collision resolution + slug correction + product name match-live correction.',
            'marshall_scan', 'NOT REQUIRED per spec (no peptide content); zero hits regardless; all 8 ingredients are B-vitamins (no peptide drugs). Confirmed Jeffery audit 2026-05-07.',
            'hannah_pre_flight', 'NOT REQUIRED per Jeffery audit 2026-05-07 (comprehensive contraindication list + verified UL stacking math + biotin lab interference disclosure + pyridoxine peripheral neuropathy disclosure already in PDP body satisfies pre-flight criterion).',
            'bioavailability_format', '10x to 28x PARTIAL APPLIES with MINORITY-CARRIER QUALIFICATION (2 of 8 carrier-enhanced = 25% by count; 1.3 mg / 76.3 mg = 1.7% by mass); LOWEST mass coverage in PARTIAL APPLIES family joining MAOA+ (10/13 = 77% HIGHEST), 152w Inferno+ (7/14 = 50%), 152t Grow+ (5/10 = 50%), 152q DigestiZorb+ (2/11 = 18%). The 2 carrier-enhanced ingredients are the methylation cycle endpoint vitamins B9 5-MTHF (0.5 mg) and B12 methylcobalamin (0.8 mg). The 6 uncoated B-vitamins (B1 thiamine HCl + B2 riboflavin + B3 niacin + B5 calcium D-pantothenate + B6 pyridoxine HCl + B7 biotin = 75 mg of 76.3 mg total mass) are in standard supplemental forms requiring endogenous enzymatic activation. Prose framing: "The 2 carrier-enhanced ingredients (B9 5-MTHF and B12 methylcobalamin) are 10x to 28x more bioavailable than non-encapsulated forms; the 6 uncoated B-vitamins are in standard supplemental forms that rely on healthy enzymatic conversion." Auto-remediator allowlist: "10x to 28x" framed in standard partial-applies form passes both Michelangelo + Jeffery 5-27x blocks; minority-carrier qualification narrative also passes.',
            'sku_verify_outcome', 'FC-METHYLB-001 canonical FC-prefix base-formulations category convention; differs from MAOA+ ''40'' numeric methylation-snp pattern',
            'lane2_corrections', jsonb_build_array(
                'Identifier resolution: 152y_mb placeholder -> 152z (per Gary Path A directive 2026-05-07 resolving identifier collision with MAOA+ Neurochemical Balance shipped as Prompt 152y commit 86b1dc3 run_id 34d9208c)',
                'Migration shape: INSERT -> UPDATE (live row exists with 96-char placeholder copy; 9th consecutive 152x net-new spec to hit drift after 152q/r/s/t/u/v.0/w/x/y; spec INSERT also blocked by uniq_products_canonical_slug_per_category index from #142c)',
                'Slug correction: spec methylb-complete-plus -> live methylb-complete-plus-b-complex (NOT in spec''s 7-candidate existence-check list)',
                'Product name match-live: spec H1 "MethylB Complete+ Methylated and Liposomal B Complex" -> live "MethylB Complete+ B Complex" (per Gary''s match-live decision 2026-05-07; live shorter name partially neutralizes spec truth-in-labeling concern 152z.5 at catalog name level; PDP body retains Path A qualification language as additional honest disclosure per Jeffery audit guidance)',
                'No bullet ingredient-name corrections needed for PDP body (live JSONB has messy "B1 ,  Thiamine" format with double-spaces and oxford-comma-prefixed names; PDP body uses cleaner spec bullet headers "Vitamin B1 (Thiamine HCl)" etc.; JSONB stays untouched per Lane 2 standard - only summary + description fields modified; live JSONB ingredient name formatting deferred to a future cleanup prompt)',
                'No ® preservation needed (zero branded ingredients in MethylB Complete+ formulation; no Sensoril/Bioperine/Magtein equivalents)',
                'SQL apostrophe escaping: 2 instances doubled per Postgres E-string convention - "Parkinson''s disease" (×2: opening practitioner-consultation list + who-benefits practitioner-consultation list)',
                'No em/en-dashes in PDP body prose, no arrow characters, no curly quotes, no parenthetical " - " asides; live JSONB pre-existing en-dash data condition (e.g., "B1 ,  Thiamine") NOT introduced by this prompt and stays untouched per Lane 2 standard'
            ),
            'product_name', 'MethylB Complete+ B Complex',
            'three_pillar_positioning', 'Metabolize | Support | Energize',
            'live_ingredient_total_mg_compound_per_capsule', 76.3,
            'live_ingredient_count', 8,
            'live_format', 'capsule',
            'live_capsule_size', 'Size 1 vegetarian HPMC recommended (300 mg capacity, 67 to 83 percent utilization; departure from source-doc Size 00 11 percent under-fill; flagged 152z.8 formulator confirmation pending)',
            'live_status_tag', 'NONE (TIER not assigned per base-formulations category convention)',
            'live_category_slug', 'base-formulations',
            'live_pricing', '$48.88 L1 (foundational tier; lower than MAOA+ $118.88 Tier 2 reflecting Tier 1 vs Tier 2 architecture; ends in .88 per Via Cura convention)',
            'live_image_url', 'supplement-photos/Base%20Formulations/methylb-complete-plus-b-complex.png (image_count=1)',
            'live_carrier_breakdown', '2 liposomal (B9 5-MTHF 0.5 mg + B12 methylcobalamin 0.8 mg) + 6 uncoated B-vitamins (B1 thiamine HCl 10 mg + B2 riboflavin 10 mg + B3 niacin 15 mg + B5 calcium D-pantothenate 20 mg + B6 pyridoxine HCl 15 mg + B7 biotin 5 mg = 75 mg of 76.3 mg total); whole-formula carrier anchor 10x to 28x PARTIAL APPLIES with minority-carrier qualification (carrier-enhanced 2/8 = 25% by count; carrier-enhanced mass 1.3 mg / total 76.3 mg = 1.7% by mass; LOWEST carrier coverage in PARTIAL APPLIES family)',
            'cross_product_reference', 'Methylation portfolio architecture Tier 1 (MethylB Complete+ Foundation) and Tier 2 (MAOA+ Neurochemical Balance Comprehensive); cross-product folate UL stacking caution at 1.3 mg/day combined = 30% above 1 mg UL at 1 cap each, 2.6x UL at 2 caps each; cross-product B6 stacking caution at 80 mg/day combined approaching 100 mg UL at 2 caps each; complementary with 152x Magnesium Synergy Matrix + 152u GST+ Cellular Detox + 152v Histamine Relief Protocol; B-vitamin reconciliation caution with 152w Inferno+ + 152i Catalyst+ multivitamin (CHOOSE ONE); MUTUALLY EXCLUSIVE with 152t Grow+ Pre-Natal during pregnancy and lactation',
            'spec_source_doc_legacy_artifacts_dropped', 'FarmCeutica Inc + FarmCeutica Wellness Ltd + Building Performance Through Science tagline + source-doc 5 mg 5-MTHF dose corrected to 0.5 mg per Gary authoritative list (production-blocking 5x to 10x supplemental folate UL violation at twice-daily protocol per spec Flag 152z.1) + source-doc 2 mg methylcobalamin dose corrected to 0.8 mg per Gary authoritative list (excessive 833x RDA for foundational use per spec Flag 152z.2) + source-doc 82 mg total formulation mass corrected to 76.3 mg per Gary authoritative list + source-doc Powder based formulation additive Usage Guidelines language + source-doc 250 mg liposomal+ micellar powder Packaging Specifications language + source-doc Size 00 capsule reference (replaced with Size 1 vegetarian HPMC recommendation per spec Flag 152z.8 formulator confirmation pending) + source-doc One-Carbon Metabolism / Neurological Health / Energy Optimization noun-led header subtitle (verb-led Metabolize / Support / Energize used per 152 series convention) + excessive hedging language all NOT in reconciled copy',
            'thirteen_formulation_flags', jsonb_build_array(
                'FLAG 152z.X (CRITICAL, RESOLVED 2026-05-07): Identifier collision with MAOA+ Neurochemical Balance Prompt 152y - Gary Path A directive renumbered MethylB Complete+ to Prompt 152z; methylation series tier architecture supports Tier 1 Foundation (152z) + Tier 2 Comprehensive (152y MAOA+) assignment',
                'FLAG 152z.1 (CRITICAL, PRODUCTION-BLOCKING, RESOLVED): Source-doc B9 5-MTHF dose 5 mg corrected to 0.5 mg per Gary authoritative list (10x reduction; source-doc dose was 5x to 10x supplemental folate UL violation at twice-daily protocol; production-blocking)',
                'FLAG 152z.2 (CRITICAL, PRODUCTION-BLOCKING, RESOLVED): Source-doc B12 methylcobalamin dose 2 mg corrected to 0.8 mg per Gary authoritative list (2.5x reduction; source-doc dose was 833x RDA, excessive for foundational use)',
                'FLAG 152z.3 (LOW, RESOLVED): Source-doc internal format inconsistency (powder vs capsule vs 250mg powder) corrected to capsule format authoritative per Gary posted table',
                'FLAG 152z.4 (MEDIUM, formulator confirmation required): B3 niacin form specification - niacinamide recommended over nicotinic acid for foundational B-complex use without flush',
                'FLAG 152z.5 (HIGH, partially neutralized + Steve Rica review still recommended): Truth-in-labeling product naming - live name "MethylB Complete+ B Complex" partially neutralizes the spec concern at the catalog name level (no "Methylated and Liposomal" subtitle); PDP body retains Path A qualification language as additional honest disclosure',
                'FLAG 152z.6 (HIGH, RESOLUTION APPLIED): Mandatory FDA biotin laboratory test interference disclosure per FDA Safety Communication 2017 updated 2019; consumer-facing 72-hour hold-before-labs guidance + healthcare provider notification language included in PDP body opening paragraph and bullet 6 (Vitamin B7 Biotin)',
                'FLAG 152z.7 (HIGH, RESOLUTION APPLIED): Pyridoxine peripheral neuropathy disclosure for chronic exposure in EFSA-concern zone (15 mg HCl/cap × 2/day = 30 mg/day chronic exposure; below 100 mg/day UL but in concern zone); Long-term users (>6 months continuous) advised to monitor for paresthesias, ataxia, sensory symptoms; included in PDP body bullet 5 (Vitamin B6 Pyridoxine HCl)',
                'FLAG 152z.8 (MEDIUM, formulator confirmation required): Capsule size departure from source-doc Size 00 to Size 1 vegetarian HPMC (300 mg capacity, 67 to 83 percent utilization with excipient filler load to 200 to 250 mg total fill); source-doc Size 00 was severely under-filled at 11% capacity utilization for 76.3 mg active fill weight',
                'FLAG 152z.9 (CRITICAL, RESOLUTION APPLIED): Cross-product folate UL stacking caution with MAOA+ Neurochemical Balance - 1 capsule each daily = 1.3 mg/day combined supplemental folate (30% above 1 mg UL); 2 capsules each daily = 2.6 mg/day (2.6x UL); consumer recommendation choose one OR practitioner-supervised reduced-dose stacking with homocysteine + B12 + RBC folate + MMA monitoring',
                'FLAG 152z.10 (MEDIUM, RESOLUTION APPLIED): Cross-product B6 stacking caution with MAOA+ - 2 capsules each daily = 80 mg/day combined B6 (approaching 100 mg/day UL); long-term stacked users advised to monitor for pyridoxine peripheral neuropathy',
                'FLAG 152z.11 (LOW, formulator confirmation required): B5 pantothenate form specification (Calcium D-Pantothenate confirmed per Gary authoritative list)',
                'FLAG 152z.12 (LOW, formulator confirmation required): Riboflavin photodegradation packaging confirmation (amber/opaque packaging recommended)',
                'FLAG 152z.13 (LOW, RESOLVED): Source-doc internal format inconsistency same as 152z.3'
            ),
            'rev2_canonical_pattern', 'feedback_152p_canonical_for_all_formulation_updates',
            'sixteenth_152x_rev2_under_standing_rule', 'true (after 152e/f/i/k/l/n/o-rev2 + 152q + 152r + 152s + 152t + 152u + 152v.0 + 152w + 152x + 152y)',
            'positioning_disclosure', 'SUB-CLINICAL FOUNDATIONAL B-COMPLEX STACK, NOT comprehensive methylation cycle support; ADD-ON to dietary B-vitamin foundation rather than replacement for prescribed treatment of documented deficiencies or clinical-dose monotherapy intervention; Tier 1 Foundation within Via Cura Methylation and Neurogenetic Series; MAOA+ Neurochemical Balance is Tier 2 Comprehensive; future tier products COMT+ Tier 3 downstream catechol metabolism + CBS Support+ Tier 4 sulfur metabolism + MTHFR+ Tier 5 severe variant-specific dosing per source-doc reference; first foundational tier B-complex product in 152 series; LOWEST mass coverage in PARTIAL APPLIES bioavailability matrix family at 25% by count and 1.7% by mass; truth-in-labeling Path A qualification with live name "MethylB Complete+ B Complex" partially neutralizing spec concern at catalog name level; PDP body retains qualification language for additional honest disclosure',
            'comprehensive_contraindications', 'HARD: oncology methotrexate (folate antagonism essential to therapeutic effect; methotrexate is dihydrofolate reductase inhibitor; supplemental folate compromises antitumor activity) + pediatric under 18 (insufficient pediatric safety data for high-dose B-complex profile). PRACTITIONER CONSULTATION: pregnancy and lactation (use Grow+ Pre-Natal 152t under obstetric supervision instead) + Parkinson''s disease on levodopa (B6 acceleration of peripheral levodopa decarboxylation) + anti-epileptic medications (phenytoin + phenobarbital + primidone + valproate + carbamazepine + lamotrigine + levetiracetam folate depletion contributes to therapeutic effect) + low-dose methotrexate (rheumatology + dermatology + obstetrics folate antagonism) + active or recent cancer (folate effects on tumor biology) + bipolar disorder (methylation activation risk) + concurrent high-dose B-vitamin supplementation (UL reconciliation for 100 mg/day B6 + 1 mg/day folate). CROSS-PRODUCT STACKING CAUTION: do not stack with MAOA+ at full doses without practitioner supervision; combined folate at 1 cap each = 1.3 mg/day = 30% above UL, 2 caps each = 2.6x UL; combined B6 at 2 caps each = 80 mg/day approaching 100 mg UL. METHYLATION SENSITIVITY TITRATION: COMT V158M Met/Met carriers (~25% Caucasian) and methylation-sensitive individuals start every-other-day for 7 days, advance to daily if tolerated; if adverse activation symptoms (anxiety + irritability + racing thoughts + insomnia + palpitations + headache) reduce frequency or discontinue and consider MAOA+ dual-form B12 alternative for gentler activation profile',
            'unique_152z_attributes', jsonb_build_array(
                'First foundational tier B-complex product in 152 series',
                'Tier 1 Foundation within planned Via Cura Methylation and Neurogenetic Series tier architecture (MethylB Complete+ as Tier 1; MAOA+ Neurochemical Balance as Tier 2 Comprehensive; future tier products COMT+ + CBS Support+ + MTHFR+ Tier 3-5)',
                'LOWEST mass coverage in PARTIAL APPLIES bioavailability matrix family at 25% by count and 1.7% by mass (vs MAOA+ 77% HIGHEST)',
                'First product to flag truth-in-labeling concerns under 21 USC 343(a)(1) and FTC Section 5 (Path A resolution; live name partially neutralizes; Steve Rica review still recommended)',
                'First product with mandatory FDA biotin laboratory test interference disclosure (5,000 mcg biotin triggers FDA Safety Communication 2017 updated 2019)',
                'First product with pyridoxine peripheral neuropathy disclosure for chronic exposure',
                'First product with cross-product folate UL stacking caution (with MAOA+ Neurochemical Balance)',
                'First product with cross-product B6 stacking caution (with MAOA+ Neurochemical Balance)',
                'First product with two source-doc safety violations resolved (B9 dose 5x to 10x UL violation + B12 dose 833x RDA excessive)',
                'First product with identifier collision resolution Gary Path A directive (renumbered from spec Prompt 152y to Prompt 152z due to MAOA+ collision)',
                'Ninth consecutive 152x net-new spec to hit live-row drift (after 152q/r/s/t/u/v.0/w/x/y); spec INSERT also hard-blocked by uniq_products_canonical_slug_per_category index from #142c',
                'FC-METHYLB-001 SKU FC-prefix matches base-formulations category convention; differs from MAOA+ ''40'' numeric methylation-snp pattern',
                'Live row pre-populated for 152z.A (pricing $48.88) + 152z.B (image populated) + 152z.C (category base-formulations) + 152z.D (SKU FC-METHYLB-001) - genuinely deferred 152z.5 truth-in-labeling Steve Rica review + 152z.6 biotin lab interference label design + 152z.7 pyridoxine neuropathy label design + 152z.8 Size 1 capsule confirmation + 152z.9 AI Protocol cross-product folate UL stacking logic + 152z.10 AI Protocol cross-product B6 stacking logic + 152z.11 B5 pantothenate form + 152z.12 riboflavin photodegradation + 152z.E cross-product family integration + 152z.F GENEX360 AI implementation + 152z.G Hannah avatar foundational B-complex tutorial + 152z.H Health Canada NHP positioning + biotin lab interference label compliance + Prop 65 verification',
                'Available on mainstream supplement retailers (subject to standard MSRP/MAP) - similar distribution profile to 152x Magnesium Synergy Matrix and 152y MAOA+ Neurochemical Balance; no peptide content + no Marshall scan flag + no Hannah pre-flight gate + no WADA Class S restrictions'
            )
        )
    );

    RAISE NOTICE '#152z MethylB Complete+ B Complex update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
