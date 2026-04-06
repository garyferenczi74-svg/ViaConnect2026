-- ============================================================
-- Prompt #49g: Testing & Diagnostics, GeneX360™ marketing copy
-- ============================================================
-- Seeds product_catalog.short_description for the 8 Testing
-- category SKUs that already exist in farmceutica_master_skus.json
-- (SKUs 57-62, 67, 68). The shop page joins product_catalog by
-- sku to enrich MASTER_SKUS with descriptions; this migration
-- ensures each test panel has its long marketing copy available.
--
-- Idempotent via ON CONFLICT (sku). Append-only, does not
-- modify existing migrations.
--
-- NOTE: This migration assumes product_catalog has a UNIQUE
-- constraint on sku. If the upsert fails, the rows can also be
-- inserted with INSERT ... WHERE NOT EXISTS pattern.
-- ============================================================

INSERT INTO product_catalog (sku, name, short_description, active)
VALUES
  (
    '61',
    'GeneX360™ Complete Genetic Panel',
    'The ultimate precision wellness blueprint, GeneX360™ combines all six of FarmCeutica''s targeted genetic panels, GeneX-M, NutrigenDX, HormoneIQ, EpigenHQ, PeptideIQ, and CannabisIQ, into a single comprehensive test analyzing over 100 clinically relevant SNPs across methylation, nutrient metabolism, hormonal pathways, biological aging, peptide response, and cannabinoid sensitivity. GeneX360™ feeds directly into FarmCeutica''s Ultrathink™ AI engine, generating a fully personalized supplement and peptide protocol calibrated to your unique genome, transforming generic wellness guesswork into precision-targeted, genetically informed formulations built for your biology alone.',
    true
  ),
  (
    '57',
    'GeneX-M™ Methylation Panel',
    'GeneX-M™ analyzes 20 of the most clinically significant methylation-pathway SNPs, including MTHFR, COMT, CBS, MTR, MTRR, BHMT, MAOA, ACHY, ACAT, VDR, DAO, GST, SOD, NOS, SUOX, NAT, TCN2, RFC1, SHMT, and ADO, to reveal exactly how your body processes B-vitamins, clears neurotransmitters, detoxifies environmental compounds, and manages homocysteine. This is the foundational genetic test behind FarmCeutica''s entire methylation support line, enabling your practitioner to prescribe the precise combination of methylated cofactors, liposomal delivery forms, and pathway-specific formulas your genetics actually require, eliminating the trial-and-error approach that leaves most methylation protocols underperforming.',
    true
  ),
  (
    '58',
    'NutrigenDX™ Genetic Nutrition Panel',
    'NutrigenDX™ maps the genetic variants that determine how your body absorbs, transports, converts, and utilizes essential vitamins, minerals, fatty acids, and antioxidants, revealing hidden inefficiencies that no blood test alone can explain. From vitamin D receptor sensitivity and omega-3 conversion capacity to iron absorption genetics and fat-soluble vitamin transport, NutrigenDX™ provides the molecular rationale behind persistent nutrient deficiencies and identifies which specific delivery forms, dosages, and nutrient pairings will overcome your unique genetic bottlenecks, powering truly personalized nutrition protocols through FarmCeutica''s Ultrathink™ AI recommendation engine.',
    true
  ),
  (
    '59',
    'HormoneIQ™ Genetic Hormone Panel',
    'HormoneIQ™ decodes the genetic architecture governing your hormonal ecosystem, analyzing SNPs that influence testosterone and estrogen metabolism, cortisol stress response, thyroid hormone conversion, insulin sensitivity, and reproductive hormone clearance pathways. Whether you''re navigating age-related hormonal shifts, optimizing athletic performance, managing weight resistance, or addressing fertility concerns, HormoneIQ™ reveals the genetic reasons behind your hormonal patterns and enables FarmCeutica''s AI engine to calibrate targeted interventions, from DIM and calcium D-glucarate dosing for estrogen dominance to adaptogenic protocols matched to your HPA axis genetics.',
    true
  ),
  (
    '60',
    'EpigenHQ™ Epigenetic Aging Panel',
    'EpigenHQ™ goes beyond chronological age to measure what truly matters, your biological age, by analyzing the genetic variants that influence telomere maintenance, DNA methylation clock markers, mitochondrial function, oxidative stress defense, and cellular senescence pathways. This panel reveals whether your cells are aging faster or slower than your birth certificate suggests, and identifies the specific genetic vulnerabilities driving accelerated aging in your body. EpigenHQ™ results feed directly into FarmCeutica''s longevity protocols, including Teloprime+ Telomere Support and Replenish NAD+, enabling genetically targeted interventions to slow your biological clock at the molecular level.',
    true
  ),
  (
    '67',
    'PeptideIQ™ Genetic Peptide Response Panel',
    'PeptideIQ™ is the first consumer genetic panel designed specifically to predict individual response to therapeutic peptides, analyzing the SNPs that govern peptide receptor density, GLP-1 pathway sensitivity, growth hormone secretagogue response, BPC-157 tissue repair capacity, and neuropeptide metabolism. As peptide therapeutics emerge as one of the most powerful tools in precision medicine, PeptideIQ™ ensures you''re not guessing which peptides will work for your biology, it maps your genetic peptide response profile so FarmCeutica''s 29-peptide portfolio can be matched to your genome, optimizing delivery form selection across liposomal, micellar, injectable, and nasal spray options.',
    true
  ),
  (
    '68',
    'CannabisIQ™ Genetic Cannabinoid Panel',
    'CannabisIQ™ analyzes the genetic variants that determine your unique endocannabinoid system, including CB1 and CB2 receptor density, FAAH enzyme activity governing anandamide breakdown, cytochrome P450 THC metabolism speed, and COMT-mediated sensitivity to cannabis-induced anxiety. Whether you use cannabinoids therapeutically for pain, sleep, inflammation, or neurological support, CannabisIQ™ reveals your genetic predisposition to specific cannabinoid ratios, optimal THC-to-CBD balancing, terpene sensitivity profiles, and metabolic clearance rates, enabling truly personalized cannabinoid protocols that maximize therapeutic benefit while minimizing adverse responses.',
    true
  ),
  (
    '62',
    '30-Day Custom Vitamin Package',
    'The culmination of FarmCeutica''s precision wellness platform, your 30-Day Custom Vitamin Package is a fully personalized, pre-portioned daily supplement protocol built entirely from your GeneX360™ genetic test results and processed through the Ultrathink™ AI recommendation engine. Each day''s packet contains the exact combination of methylated vitamins, liposomal minerals, targeted pathway support formulas, and precision-dosed peptides your genome requires, no more, no less. This isn''t a generic multivitamin with your name on the label; it''s a clinician-grade, genetically calibrated wellness protocol delivered to your door, recalibrated monthly as your Bio Optimization Score evolves.',
    true
  )
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  active = true;

-- ── Verify ──────────────────────────────────────────────────
-- SELECT sku, name, LEFT(short_description, 60) AS preview
-- FROM product_catalog
-- WHERE sku IN ('57','58','59','60','61','62','67','68')
-- ORDER BY sku;
-- Expected: 8 rows with description previews
