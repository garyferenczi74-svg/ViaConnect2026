-- ============================================================
-- FarmCeutica branded peptides — peptide_registry seed
-- ============================================================
-- Adds 20 FarmCeutica branded peptides to the peptide_registry table.
-- Source: src/config/peptide-database/categories-{1-3,4-6,7-8}.ts
--
-- The 9 branded items in the static config that are explicit brand
-- wrappers around compounds already in the registry are intentionally
-- skipped (no crossovers per the data spec):
--
--   epitalon, pinealon, tb500-oral, retatrutide  (exact name matches)
--   regenbpc       → BPC-157 brand wrapper  (already as bpc157-*)
--   gutrepair      → "BPC-157-based"        (already as bpc157-*)
--   immuneguard    → "Thymosin Alpha-1"     (already as ta1)
--   neuroshield    → "GHK-Cu based"         (already as ghkcu-*)
--   moodlift       → "Selank-based"         (already as selank)
--
-- Category IDs 20–26 are allocated for the new branded categories
-- to keep them visually grouped and avoid colliding with the
-- existing 1–16 industry category space:
--
--   20  Longevity & Core Bioregulator     (vesugen, bronchogen)
--   21  Adrenal/HPA Axis & Stress         (adrenopeptide, hpa-balance, stressshield, recoverypulse)
--   22  Mitochondrial/Energy              (mitopeptide, energycore, coq10-peptide, atp-regen, slu-pp-332)
--   23  Immune & Regenerative             (antiinflam, vilon)
--   24  Neuro/Cognitive & Mood            (cerebropeptide)
--   25  Hormonal Balance & Endocrine      (ovapeptide, thyroreg, progestobalance, endoharmonize)
--   26  Gut & Detox Support               (detoxpeptide, histaminebalance)
--
-- All inserts use ON CONFLICT (peptide_id) DO NOTHING so the
-- migration is safe to re-run on environments that already have
-- the rows applied.

-- Vesugen™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'vesugen', 'Vesugen™', 100,
  20, 'Longevity & Core Bioregulator', 'Dna', '#7C3AED',
  'Khavinson vascular bioregulator peptide', 'Endothelial health, microcirculation support', 'Your blood vessels are the delivery highways of every nutrient and peptide in your protocol. Vesugen supports endothelial health and microcirculation, ensuring every system gets the ''delivery service'' it needs.',
  ARRAY['Studied for vascular endothelial function support in Khavinson clinical cohorts','Targets microcirculation, the tiny vessels that deliver nutrients to every tissue','Part of the core bioregulator series with decades of clinical observation']::text[], 'Moderate',
  'APOE variants -> vascular protection optimization with NutrigenDX data', ARRAY['APOE']::text[], 'NutrigenDX',
  false, true, false,
  '$129-$159/month', 'Month 9',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'Your blood vessels are the delivery highways of every nutrient and peptide in your protocol. Vesugen supports endothelial health and microcirculation, ensuring every system gets the ''delivery service'' it needs.', ARRAY['vesugen','farmceutica-branded','liposomal-default','apoe']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- Bronchogen™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'bronchogen', 'Bronchogen™', 101,
  20, 'Longevity & Core Bioregulator', 'Dna', '#7C3AED',
  'Khavinson respiratory bioregulator peptide', 'Bronchial epithelial health, mucosal resilience', 'Your lungs are the gateway for oxygen, the fuel every cell needs. Bronchogen supports bronchial epithelial health and mucosal resilience, keeping the gateway clear and efficient.',
  ARRAY['Respiratory tissue bioregulation in multi-tissue Khavinson cohorts','Bronchial epithelial health and mucosal resilience support','Emerging 2026 protocols stack with neuropeptides for systemic oxygenation','Foundational bioregulator for respiratory system optimization']::text[], 'Moderate',
  'SOD2 variants -> respiratory tissue protection', ARRAY['SOD2']::text[], 'NutrigenDX',
  false, true, false,
  '$119-$149/month', 'Month 9',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'Your lungs are the gateway for oxygen, the fuel every cell needs. Bronchogen supports bronchial epithelial health and mucosal resilience, keeping the gateway clear and efficient.', ARRAY['bronchogen','farmceutica-branded','liposomal-default','sod2']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- AdrenoPeptide™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'adrenopeptide', 'AdrenoPeptide™', 102,
  21, 'Adrenal/HPA Axis & Stress', 'Zap', '#DC2626',
  'Khavinson pineal-adrenal axis bioregulator', 'HPA-axis rhythm restoration, cortisol normalization, fatigue reduction', 'Your adrenals are like a phone battery that''s been running on 18% for months. This peptide helps the charger work better, supporting your body''s natural stress-response rhythm so the battery can actually recharge.',
  ARRAY['Based on Khavinson pineal-adrenal axis research with normalized cortisol/melatonin rhythms','6-year longitudinal study: significant fatigue reduction and stress resilience improvement','Designed for HPA-axis rhythm restoration, not stimulation, supports your natural pattern']::text[], 'Moderate',
  'COMT Val/Met status -> stress response calibration with GeneX-M data', ARRAY['COMT']::text[], 'GeneX-M',
  false, true, false,
  '$119-$149/month', 'Month 9',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'Your adrenals are like a phone battery that''s been running on 18% for months. This peptide helps the charger work better, supporting your body''s natural stress-response rhythm so the battery can actually recharge.', ARRAY['adrenopeptide','farmceutica-branded','liposomal-default','comt']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- HPA-Balance™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'hpa-balance', 'HPA-Balance™', 103,
  21, 'Adrenal/HPA Axis & Stress', 'Zap', '#DC2626',
  'Khavinson HPA-axis bioregulator', 'Hypothalamic-pituitary-adrenal communication recalibration', 'Think of the HPA axis as a thermostat connecting your brain to your adrenals. When stress keeps turning up the heat, the thermostat gets stuck. This peptide helps recalibrate the dial, so your system stops overheating and finds its natural set point.',
  ARRAY['Targets the hypothalamic-pituitary-adrenal communication pathway','Studied for cortisol rhythm normalization without suppression','Designed to complement adaptogenic herbs like Ashwagandha and Rhodiola']::text[], 'Moderate',
  'CYP1A2 metabolizer status -> cortisol clearance optimization', ARRAY['CYP1A2']::text[], 'GeneX-M',
  false, true, false,
  '$119-$149/month', 'Month 9',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'Think of the HPA axis as a thermostat connecting your brain to your adrenals. When stress keeps turning up the heat, the thermostat gets stuck. This peptide helps recalibrate the dial, so your system stops overheating and finds its natural set point.', ARRAY['hpa-balance','farmceutica-branded','liposomal-default','cyp1a2']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- StressShield™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'stressshield', 'StressShield™', 104,
  21, 'Adrenal/HPA Axis & Stress', 'Zap', '#DC2626',
  'Neuropeptide resilience compound', 'Parasympathetic nervous system tone support without sedation', 'When stress hits, your nervous system can get ''stuck in alarm mode.'' StressShield supports the calming branch of your nervous system, like adding sound insulation to a room so the noise outside doesn''t keep rattling the windows.',
  ARRAY['Neuropeptide-based approach to acute stress response modulation','Supports parasympathetic nervous system tone without sedation','Complements adaptogenic and anxiolytic herbal protocols']::text[], 'Moderate',
  'COMT + MTHFR status -> neurotransmitter resilience calibration', ARRAY['COMT','MTHFR']::text[], 'GeneX-M',
  false, true, false,
  '$99-$129/month', 'Month 9',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'When stress hits, your nervous system can get ''stuck in alarm mode.'' StressShield supports the calming branch of your nervous system, like adding sound insulation to a room so the noise outside doesn''t keep rattling the windows.', ARRAY['stressshield','farmceutica-branded','liposomal-default','comt','mthfr']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- RecoveryPulse™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'recoverypulse', 'RecoveryPulse™', 105,
  21, 'Adrenal/HPA Axis & Stress', 'Zap', '#DC2626',
  'Tissue recovery and HPA restoration peptide', 'Recovery phase support, tissue repair during rest', 'Recovery is where growth happens, your body rebuilds stronger during rest, not during stress. This peptide supports the recovery phase of your daily rhythm, helping your system bounce back faster from physical and mental demands.',
  ARRAY['Targets the recovery phase of the HPA stress cycle','Supports tissue repair processes studied in Khavinson bioregulator research','Designed for active individuals who push hard and need faster recovery']::text[], 'Moderate',
  'COL1A1 collagen variants -> tissue recovery optimization with PeptideIQ data', ARRAY['COL1A1']::text[], 'PeptideIQ',
  false, true, false,
  '$119-$149/month', 'Month 9',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'Recovery is where growth happens, your body rebuilds stronger during rest, not during stress. This peptide supports the recovery phase of your daily rhythm, helping your system bounce back faster from physical and mental demands.', ARRAY['recoverypulse','farmceutica-branded','liposomal-default','col1a1']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- MitoPeptide™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'mitopeptide', 'MitoPeptide™', 106,
  22, 'Mitochondrial/Energy', 'Battery', '#F59E0B',
  'Khavinson mitochondrial bioregulator + Epitalon-inspired', 'Mitochondrial membrane protection and ATP efficiency', 'Your mitochondria are tiny power plants inside every cell. When they run inefficiently, everything downstream suffers, energy, focus, mood. MitoPeptide supports the membrane integrity of these power plants so they produce cleaner, more efficient energy.',
  ARRAY['Targets mitochondrial membrane protection and ATP efficiency','Human pilot data supports ATP/telomere synergy with Epitalon-based peptides','Animal lifespan extension demonstrated with mitochondrial bioregulators']::text[], 'Moderate',
  'SOD2 variants -> oxidative stress protection for mitochondria', ARRAY['SOD2']::text[], 'NutrigenDX',
  false, true, false,
  '$129-$159/month', 'Month 8',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'Your mitochondria are tiny power plants inside every cell. When they run inefficiently, everything downstream suffers, energy, focus, mood. MitoPeptide supports the membrane integrity of these power plants so they produce cleaner, more efficient energy.', ARRAY['mitopeptide','farmceutica-branded','liposomal-default','sod2']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- EnergyCore™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'energycore', 'EnergyCore™', 107,
  22, 'Mitochondrial/Energy', 'Battery', '#F59E0B',
  'SS-31/Elamipretide wellness analog', 'Inner mitochondrial membrane targeting, where 90% of cellular energy is produced', 'Imagine your cells'' power plants running on old spark plugs. EnergyCore is inspired by research that targets the inner membrane of these power plants, where 90% of your cellular energy is actually made. Note: EnergyCore is a wellness analog, NOT the FDA-approved drug.',
  ARRAY['SS-31/Elamipretide: Phase 2/3 RCTs with improved 6-minute walk test (up to +96m)','FDA approved for Barth syndrome in 2025 based on long-term data','Sustained mitochondrial energetics improvement over long-term extension','Cardiac stroke volume improved; cardiolipin levels stabilized']::text[], 'Strong',
  'COMT + flattened cortisol -> Mitochondrial Fog pattern support', ARRAY['COMT']::text[], 'GeneX-M',
  false, true, false,
  '$149-$199/month', 'Month 8',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'Imagine your cells'' power plants running on old spark plugs. EnergyCore is inspired by research that targets the inner membrane of these power plants, where 90% of your cellular energy is actually made. Note: EnergyCore is a wellness analog, NOT the FDA-approved drug.', ARRAY['energycore','farmceutica-branded','liposomal-default','comt']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- CoQ10-Peptide™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'coq10-peptide', 'CoQ10-Peptide™', 108,
  22, 'Mitochondrial/Energy', 'Battery', '#F59E0B',
  'CoQ10 biosynthesis support peptide', 'Endogenous CoQ10 production optimization, not just supplementing from outside, but optimizing production from within', 'CoQ10 is the spark plug in your mitochondria''s engine. When biosynthesis declines with age or genetic variants, this peptide supports the pathway that makes your body''s own CoQ10, not just supplementing from outside, but optimizing production from within.',
  ARRAY['SS-31 heart failure data supports mitochondrial energetics benefits in cardiac tissue','Improved ATP production efficiency in preclinical + human pilot research','Complements exogenous CoQ10 (Ubiquinol) supplementation for dual-pathway support']::text[], 'Moderate',
  'CoQ10 biosynthesis SNPs -> targeted enzyme support', ARRAY['CoQ10_SNPs']::text[], 'NutrigenDX',
  false, true, false,
  '$119-$149/month', 'Month 8',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'CoQ10 is the spark plug in your mitochondria''s engine. When biosynthesis declines with age or genetic variants, this peptide supports the pathway that makes your body''s own CoQ10, not just supplementing from outside, but optimizing production from within.', ARRAY['coq10-peptide','farmceutica-branded','liposomal-default','coq10_snps']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- ATP-Regen™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'atp-regen', 'ATP-Regen™', 109,
  22, 'Mitochondrial/Energy', 'Battery', '#F59E0B',
  'Cellular ATP regeneration pathway compound', 'ATP synthesis and recycling pathway support, recycling spent energy molecules back into usable fuel', 'ATP is the actual energy currency your cells spend every second. When demand exceeds production, you feel it as fatigue, brain fog, and slow recovery. ATP-Regen supports the recycling of spent energy molecules back into usable fuel.',
  ARRAY['Targets ATP synthesis and recycling pathways in mitochondria','Complements SS-31 research showing sustained mitochondrial energetics improvement','Designed for high-demand individuals: athletes, high-stress professionals, recovery-focused users']::text[], 'Moderate',
  'CYP metabolizer status -> energy compound processing optimization', ARRAY['CYP2D6','CYP3A4']::text[], 'GeneX-M',
  false, true, false,
  '$119-$149/month', 'Month 8',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'ATP is the actual energy currency your cells spend every second. When demand exceeds production, you feel it as fatigue, brain fog, and slow recovery. ATP-Regen supports the recycling of spent energy molecules back into usable fuel.', ARRAY['atp-regen','farmceutica-branded','liposomal-default','cyp2d6','cyp3a4']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- SLU-PP-332
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'slu-pp-332', 'SLU-PP-332', 110,
  22, 'Mitochondrial/Energy', 'Battery', '#F59E0B',
  'Synthetic pan-ERR agonist (ERRα/β/γ), exercise mimetic', 'Activates estrogen-related receptors to replicate aerobic exercise gene program. Upregulates PGC-1α, PDK4, fatty acid oxidation enzymes, and mitochondrial biogenesis pathways.', 'SLU-PP-332 is a groundbreaking exercise mimetic that replicates the cellular and physiological effects of aerobic exercise without physical exertion. It activates the same nuclear receptors (ERRα/β/γ) that exercise turns on, triggering mitochondrial biogenesis, increased fatty acid oxidation, and enhanced muscle fiber conversion.',
  ARRAY['Pan-ERR agonist with highest potency for ERRα (EC50 = 98 nM)','Exercise mimetic: replicates aerobic exercise gene program in sedentary mice','Increased Type IIa oxidative muscle fibers and enhanced exercise endurance','Increased energy expenditure, decreased fat mass, improved glucose tolerance + insulin sensitivity','50% increase in brown adipose tissue (BAT) activity','Orally bioavailable, one of the first ERR agonists viable for in vivo oral use','Neuroprotective: ERRγ pathway may delay synuclein toxicity (Parkinson''s research)','Cardioprotective: improved cardiac metabolism, reversed heart failure pathology','Anti-aging: reversed inflammation + mitochondrial damage in aging kidney tissue']::text[], 'Emerging',
  'SOD2 oxidative stress variants + CYP metabolizer status -> mitochondrial exercise response optimization', ARRAY['SOD2','CYP2D6','CYP3A4']::text[], 'NutrigenDX',
  false, true, false,
  '$149-$199/month', 'Month 10',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'SLU-PP-332 is a groundbreaking exercise mimetic that replicates the cellular and physiological effects of aerobic exercise without physical exertion. It activates the same nuclear receptors (ERRα/β/γ) that exercise turns on, triggering mitochondrial biogenesis, increased fatty acid oxidation, and enhanced muscle fiber conversion.', ARRAY['slu-pp-332','farmceutica-branded','liposomal-default','sod2','cyp2d6','cyp3a4']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- AntiInflam™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'antiinflam', 'AntiInflam™', 111,
  23, 'Immune & Regenerative', 'Shield', '#059669',
  'Anti-inflammatory bioregulator peptide', 'Inflammation resolution phase support, targets the ''all clear'' signal, not suppression', 'Inflammation is your body''s fire alarm. Sometimes the alarm keeps ringing after the fire is out. AntiInflam supports the ''all clear'' signal, helping your system resolve inflammation and return to a calm, repair-focused state.',
  ARRAY['Targets the resolution phase of inflammation (not suppression)','Khavinson clinical data on immune and inflammatory bioregulation','Designed to complement, not replace, anti-inflammatory nutraceuticals like curcumin and omega-3']::text[], 'Moderate',
  'IL-6/TNF-α inflammation variants -> resolution pathway calibration', ARRAY['IL-6','TNF-α']::text[], 'NutrigenDX',
  false, true, false,
  '$119-$149/month', 'Month 9',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'Inflammation is your body''s fire alarm. Sometimes the alarm keeps ringing after the fire is out. AntiInflam supports the ''all clear'' signal, helping your system resolve inflammation and return to a calm, repair-focused state.', ARRAY['antiinflam','farmceutica-branded','liposomal-default','il-6','tnf-α']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- Vilon™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'vilon', 'Vilon™', 112,
  23, 'Immune & Regenerative', 'Shield', '#059669',
  'Khavinson thymus dipeptide bioregulator', 'Thymus function support, immune cell maturation, like reopening classrooms in the immune training academy', 'Your thymus gland is like a training academy for immune cells, it shrinks with age, reducing your immune ''graduates.'' This dipeptide is studied for supporting thymus function and immune cell maturation, like reopening more classrooms in the academy.',
  ARRAY['Khavinson clinical data shows immune system restoration in elderly patients','Reduced systemic inflammation markers in longitudinal follow-up','Part of the thymus bioregulator series with lifespan benefits observed in clinical cohorts']::text[], 'Moderate',
  'Immune panel variants -> thymus-mediated immune calibration', ARRAY['Immune_panel']::text[], 'NutrigenDX',
  false, true, false,
  '$129-$159/month', 'Month 9',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'Your thymus gland is like a training academy for immune cells, it shrinks with age, reducing your immune ''graduates.'' This dipeptide is studied for supporting thymus function and immune cell maturation, like reopening more classrooms in the academy.', ARRAY['vilon','farmceutica-branded','liposomal-default','immune_panel']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- CerebroPeptide™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'cerebropeptide', 'CerebroPeptide™', 113,
  24, 'Neuro/Cognitive & Mood', 'Brain', '#2563EB',
  'Cerebral cortex bioregulator peptide', 'Executive function support, concentration, cognitive endurance, targeting the brain''s executive suite', 'The cerebral cortex is the executive suite of your brain. CerebroPeptide targets the tissue running your highest-level thinking, supporting clarity, concentration, and cognitive endurance.',
  ARRAY['Cerebral cortex tissue-specific gene expression bioregulation','Part of the Khavinson organ-specific bioregulator series','Multi-region brain support when paired with Pinealon']::text[], 'Moderate',
  'BDNF variants -> neuroplasticity enhancement', ARRAY['BDNF']::text[], 'EpigenHQ',
  false, true, false,
  '$99-$129/month', 'Month 7',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'The cerebral cortex is the executive suite of your brain. CerebroPeptide targets the tissue running your highest-level thinking, supporting clarity, concentration, and cognitive endurance.', ARRAY['cerebropeptide','farmceutica-branded','liposomal-default','bdnf']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- OvaPeptide™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'ovapeptide', 'OvaPeptide™', 114,
  25, 'Hormonal Balance & Endocrine', 'Heart', '#EC4899',
  'Khavinson ovarian bioregulator (Ovagen-based)', 'Ovarian function support during hormonal transitions, maintaining balanced signaling between ovaries and brain', 'Your ovaries communicate with your brain via a hormonal conversation. OvaPeptide supports the clarity of that signal, helping maintain balanced ovarian function during hormonal transitions.',
  ARRAY['Ovagen: normalized ovarian metabolites in dysregulation cohorts','Tied to Epitalon''s pineal-endocrine axis regulation for upstream support','Designed for women in hormonal transitions (perimenopause, cycle irregularity)']::text[], 'Moderate',
  'CYP19A1/ESR1 (HormoneIQ) -> estrogen metabolism optimization', ARRAY['CYP19A1','ESR1']::text[], 'HormoneIQ',
  false, true, false,
  '$129-$159/month', 'Month 10',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'Your ovaries communicate with your brain via a hormonal conversation. OvaPeptide supports the clarity of that signal, helping maintain balanced ovarian function during hormonal transitions.', ARRAY['ovapeptide','farmceutica-branded','liposomal-default','cyp19a1','esr1']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- ThyroReg™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'thyroreg', 'ThyroReg™', 115,
  25, 'Hormonal Balance & Endocrine', 'Heart', '#EC4899',
  'Khavinson thyroid bioregulator peptide', 'Thyroid tissue calibration at the cellular level, for subclinical hypothyroid patterns', 'Your thyroid is the master thermostat of metabolism. When it runs cold, everything slows, energy, weight management, mood. ThyroReg supports thyroid tissue calibration at the cellular level.',
  ARRAY['Thyroid function normalization in subclinical hypothyroid cohorts','Tissue-specific gene expression bioregulation','Complements selenium and iodine supplementation for comprehensive thyroid support']::text[], 'Moderate',
  'DIO2 T4->T3 conversion (HormoneIQ) -> thyroid optimization', ARRAY['DIO2']::text[], 'HormoneIQ',
  false, true, false,
  '$129-$159/month', 'Month 10',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'Your thyroid is the master thermostat of metabolism. When it runs cold, everything slows, energy, weight management, mood. ThyroReg supports thyroid tissue calibration at the cellular level.', ARRAY['thyroreg','farmceutica-branded','liposomal-default','dio2']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- ProgestoBalance™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'progestobalance', 'ProgestoBalance™', 116,
  25, 'Hormonal Balance & Endocrine', 'Heart', '#EC4899',
  'Hormonal bioregulation / progesterone pathway peptide', 'Progesterone-producing tissue support, optimizing the calming hormonal counterweight', 'Progesterone is the calming hormone, it balances estrogen, supports deep sleep, and steadies mood. ProgestoBalance supports the tissue that produces progesterone, optimizing this critical hormonal counterweight.',
  ARRAY['Progesterone-producing tissue bioregulation','Complements OvaPeptide for comprehensive female hormonal balance','Part of the Khavinson endocrine bioregulator framework']::text[], 'Moderate',
  'ESR1/PGR -> progesterone signaling optimization', ARRAY['ESR1','PGR']::text[], 'HormoneIQ',
  false, true, false,
  '$129-$159/month', 'Month 10',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'Progesterone is the calming hormone, it balances estrogen, supports deep sleep, and steadies mood. ProgestoBalance supports the tissue that produces progesterone, optimizing this critical hormonal counterweight.', ARRAY['progestobalance','farmceutica-branded','liposomal-default','esr1','pgr']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- EndoHarmonize™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'endoharmonize', 'EndoHarmonize™', 117,
  25, 'Hormonal Balance & Endocrine', 'Heart', '#EC4899',
  'Multi-endocrine bioregulation and metabolic balance peptide', 'Multi-gland coordination, tuning the whole endocrine orchestra rather than a single instrument', 'Your endocrine system is an orchestra of glands, thyroid, adrenals, pancreas, gonads. EndoHarmonize supports the coordination between them, tuning the whole orchestra rather than a single instrument.',
  ARRAY['Multi-endocrine communication support between hormonal glands','SS-31 cross-support: mitochondrial energetics benefit endocrine organ function','For complex metabolic + hormonal patterns identified by Ultrathink engine','Retatrutide investigational reference: clinical trials only, discuss with prescribing practitioner']::text[], 'Moderate',
  'AR/CYP19A1 (HormoneIQ) -> multi-endocrine calibration', ARRAY['AR','CYP19A1']::text[], 'HormoneIQ',
  false, true, false,
  '$149-$189/month', 'Month 10',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'Your endocrine system is an orchestra of glands, thyroid, adrenals, pancreas, gonads. EndoHarmonize supports the coordination between them, tuning the whole orchestra rather than a single instrument.', ARRAY['endoharmonize','farmceutica-branded','liposomal-default','ar','cyp19a1']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- DetoxPeptide™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'detoxpeptide', 'DetoxPeptide™', 118,
  26, 'Gut & Detox Support', 'Leaf', '#84CC16',
  'Hepatoprotective peptide bioregulator', 'Phase I and Phase II liver detox pathway enzyme support, helping the body''s processing plant work smarter', 'Your liver is the body''s processing plant, filtering toxins through Phase I and Phase II detox pathways. DetoxPeptide supports these pathways at the tissue level, helping your liver work smarter under toxic load.',
  ARRAY['Hepatoprotective peptide bioregulation studies','Support for Phase I/II liver detox pathway enzyme function','Khavinson liver bioregulator series with decades of observational data']::text[], 'Moderate',
  'NAT2/GSTM1 detox pathway variants -> Phase I/II enzyme support', ARRAY['NAT2','GSTM1']::text[], 'NutrigenDX',
  false, true, false,
  '$119-$149/month', 'Month 9',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'Your liver is the body''s processing plant, filtering toxins through Phase I and Phase II detox pathways. DetoxPeptide supports these pathways at the tissue level, helping your liver work smarter under toxic load.', ARRAY['detoxpeptide','farmceutica-branded','liposomal-default','nat2','gstm1']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;

-- HistamineBalance™
INSERT INTO peptide_registry (
  peptide_id, product_name, product_number,
  category_id, category_name, category_icon, category_color,
  peptide_type, mechanism_of_action, how_it_works,
  key_highlights, evidence_level,
  genex_synergy_description, genex_target_variants, genex_panel,
  requires_practitioner_consult, is_farmceutica, is_investigational,
  price_range, market_launch,
  delivery_form, tier, description, ingredient_tags
) VALUES (
  'histaminebalance', 'HistamineBalance™', 119,
  26, 'Gut & Detox Support', 'Leaf', '#84CC16',
  'Histamine metabolism and mast cell stabilization peptide', 'DAO and HNMT histamine degradation enzyme support + mast cell stabilization for systemic histamine management', 'Histamine is essential for immune signaling, but when it accumulates from poor breakdown, gut issues, or genetic variants, it triggers widespread symptoms: headaches, skin flushing, digestive distress, anxiety. HistamineBalance supports the enzymes that keep histamine in check.',
  ARRAY['Targets DAO and HNMT histamine degradation enzyme pathways','Mast cell stabilization support for systemic histamine management','Designed for histamine intolerance patterns identified via CAQ + genetic data']::text[], 'Moderate',
  'DAO/HNMT histamine variants -> targeted histamine metabolism support', ARRAY['DAO','HNMT']::text[], 'NutrigenDX',
  false, true, false,
  '$119-$149/month', 'Month 9',
  'Oral (Liposomal)', 'Tier 1: DTC Wellness', 'Histamine is essential for immune signaling, but when it accumulates from poor breakdown, gut issues, or genetic variants, it triggers widespread symptoms: headaches, skin flushing, digestive distress, anxiety. HistamineBalance supports the enzymes that keep histamine in check.', ARRAY['histaminebalance','farmceutica-branded','liposomal-default','dao','hnmt']::text[]
)
ON CONFLICT (peptide_id) DO NOTHING;
