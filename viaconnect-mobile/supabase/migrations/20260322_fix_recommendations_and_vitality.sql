-- Migration: 20260322_fix_recommendations_and_vitality.sql
--
-- Fixes:
--   1. Creates product_catalog table with full 56-SKU FarmCeutica lineup
--   2. Creates recommendations table if missing
--   3. Ensures profiles has assessment_completed, vitality_score, constitutional_type
--   4. RLS policies for product_catalog and recommendations
--   5. Seeds core product catalog (22 SKUs)
-- ============================================================================

-- ============================================================================
-- 1. PRODUCT CATALOG (56-SKU FarmCeutica lineup)
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,  -- 'core', 'genetic', 'peptide', 'botanical'
  subcategory TEXT,        -- 'methylation', 'cognitive', 'sleep', 'energy', etc.
  description TEXT,
  price NUMERIC(8,2) NOT NULL,
  delivery_form TEXT DEFAULT 'capsule',  -- 'capsule', 'liquid', 'powder', 'nasal', 'topical', 'injectable'
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  -- Mapping fields for recommendation engine
  symptom_tags TEXT[] DEFAULT '{}',       -- e.g. {'fatigue','brain_fog','poor_sleep'}
  genetic_tags TEXT[] DEFAULT '{}',       -- e.g. {'MTHFR_heterozygous','COMT_slow'}
  lifestyle_tags TEXT[] DEFAULT '{}',     -- e.g. {'high_stress','low_exercise','poor_diet'}
  goal_tags TEXT[] DEFAULT '{}',          -- e.g. {'energy','cognition','weight_loss','sleep'}
  contraindication_tags TEXT[] DEFAULT '{}',
  priority_weight INTEGER DEFAULT 50,     -- 1-100, higher = recommended more aggressively
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. RECOMMENDATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES product_catalog(id),
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  reason TEXT NOT NULL,              -- AI-generated rationale
  confidence_level TEXT DEFAULT 'questionnaire',  -- 'questionnaire' | 'genetic' | 'combined'
  confidence_score INTEGER DEFAULT 68,            -- 0-100
  priority_rank INTEGER DEFAULT 1,   -- 1 = highest priority
  dosage TEXT,                        -- e.g. '2 capsules'
  frequency TEXT,                     -- e.g. 'daily'
  time_of_day TEXT,                   -- 'morning' | 'afternoon' | 'evening'
  monthly_price NUMERIC(8,2),
  status TEXT DEFAULT 'recommended',  -- 'recommended' | 'accepted' | 'declined' | 'in_cart'
  source TEXT DEFAULT 'caq',          -- 'caq' | 'genetic' | 'practitioner' | 'ai'
  assessment_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast dashboard queries
CREATE INDEX IF NOT EXISTS idx_recommendations_user_status
  ON recommendations(user_id, status);

-- ============================================================================
-- 3. ENSURE profiles HAS assessment_completed + vitality_score
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'assessment_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN assessment_completed BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'vitality_score'
  ) THEN
    ALTER TABLE profiles ADD COLUMN vitality_score INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'constitutional_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN constitutional_type TEXT;
  END IF;
END $$;

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Product catalog: everyone can read
DROP POLICY IF EXISTS "Anyone can view products" ON product_catalog;
CREATE POLICY "Anyone can view products" ON product_catalog
  FOR SELECT USING (true);

-- Recommendations: users see only their own
DROP POLICY IF EXISTS "Users view own recommendations" ON recommendations;
CREATE POLICY "Users view own recommendations" ON recommendations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert recommendations" ON recommendations;
CREATE POLICY "System can insert recommendations" ON recommendations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own recommendations" ON recommendations;
CREATE POLICY "Users can update own recommendations" ON recommendations
  FOR UPDATE USING (auth.uid() = user_id);

-- Practitioners can view their patients' recommendations
DROP POLICY IF EXISTS "Practitioners view patient recommendations" ON recommendations;
CREATE POLICY "Practitioners view patient recommendations" ON recommendations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM practitioner_patients pp
      WHERE pp.practitioner_id = auth.uid()
      AND pp.patient_id = recommendations.user_id
      AND pp.consent_status = 'granted'
    )
  );

-- ============================================================================
-- 5. SEED PRODUCT CATALOG (Core FarmCeutica Lineup)
-- ============================================================================

INSERT INTO product_catalog (sku, name, category, subcategory, price, delivery_form, symptom_tags, genetic_tags, lifestyle_tags, goal_tags, priority_weight, description) VALUES

-- === CORE WELLNESS LINE ===
('FC-RELAX-001', 'RELAX+', 'core', 'sleep', 34.99, 'capsule',
  '{poor_sleep,insomnia,restlessness,anxiety,muscle_tension}',
  '{COMT_slow,GABAergic}',
  '{high_stress,poor_sleep_quality,screen_time_high}',
  '{sleep,stress_relief,relaxation}',
  85,
  'Dual liposomal-micellar sleep and relaxation formula with L-Theanine, Magnesium Bisglycinate, GABA, and Passionflower. 10-27x enhanced bioavailability.'),

('FC-CALM-001', 'CALM+', 'core', 'stress', 34.99, 'capsule',
  '{anxiety,stress,irritability,mood_swings,racing_thoughts}',
  '{COMT_slow,MAOA_low,GABAergic}',
  '{high_stress,high_caffeine,poor_work_life_balance}',
  '{stress_relief,mood,mental_clarity}',
  82,
  'Adaptogenic stress response formula with Ashwagandha KSM-66, Rhodiola Rosea, L-Theanine, and Holy Basil. Cortisol modulation support.'),

('FC-FOCUS-001', 'FOCUS+', 'core', 'cognitive', 39.99, 'capsule',
  '{brain_fog,poor_concentration,memory_issues,mental_fatigue,lack_of_motivation}',
  '{COMT_fast,BDNF_variant,APOE}',
  '{high_screen_time,sedentary,poor_diet}',
  '{cognition,focus,memory,mental_clarity}',
  88,
  'Nootropic cognitive enhancement formula with Lions Mane, Alpha-GPC, Bacopa Monnieri, and Phosphatidylserine. Neuroplasticity and BDNF support.'),

('FC-FLEX-001', 'FLEX+', 'core', 'musculoskeletal', 34.99, 'capsule',
  '{joint_pain,inflammation,stiffness,muscle_soreness,reduced_mobility}',
  '{COX2_variant,IL6_variant}',
  '{heavy_exercise,physical_labor,aging}',
  '{joint_health,inflammation,mobility,recovery}',
  72,
  'Joint and mobility formula with Curcumin Phytosome, Boswellia, UC-II Collagen, and Hyaluronic Acid. Anti-inflammatory pathway support.'),

('FC-RISE-001', 'RISE+', 'core', 'energy', 39.99, 'capsule',
  '{fatigue,low_energy,afternoon_crash,poor_stamina,slow_recovery}',
  '{MTHFR_any,COMT_fast,MTR_variant}',
  '{poor_diet,low_exercise,high_stress,poor_sleep_quality}',
  '{energy,vitality,endurance,recovery}',
  90,
  'Mitochondrial energy optimization with CoQ10 Ubiquinol, PQQ, B-Complex (methylated), D-Ribose, and Acetyl-L-Carnitine. Cellular energy production.'),

('FC-DESIRE-001', 'DESIRE+', 'core', 'hormonal', 44.99, 'capsule',
  '{low_libido,hormonal_imbalance,fatigue,mood_changes,poor_recovery}',
  '{CYP19A1,SRD5A2,AR_variant}',
  '{high_stress,aging,sedentary}',
  '{libido,hormonal_balance,vitality}',
  65,
  'Hormone optimization formula with Tongkat Ali, Fenugreek, Zinc Picolinate, DIM, and Boron. Supports healthy testosterone and estrogen metabolism.'),

('FC-NAD-001', 'NAD+', 'core', 'longevity', 59.99, 'capsule',
  '{fatigue,aging_concerns,poor_recovery,cognitive_decline,low_energy}',
  '{SIRT1,PARP1,NQO1}',
  '{aging,high_stress,poor_sleep_quality}',
  '{longevity,energy,cellular_health,recovery}',
  78,
  'NAD+ precursor formula with NMN, Resveratrol, Quercetin, and TMG. Sirtuin activation and cellular repair pathway support.'),

('FC-CREATINE-001', 'CREATINE HCL+', 'core', 'performance', 29.99, 'powder',
  '{low_energy,poor_performance,muscle_weakness,brain_fog,slow_recovery}',
  '{GAMT,GATM,SLC6A8}',
  '{heavy_exercise,athletic,physical_labor}',
  '{performance,muscle,energy,cognition}',
  70,
  'Pharmaceutical-grade Creatine HCL with enhanced solubility. Supports ATP regeneration, cognitive function, and muscle performance.'),

('FC-BLAST-001', 'BLAST+', 'core', 'performance', 44.99, 'powder',
  '{low_energy,poor_performance,lack_of_motivation,poor_endurance}',
  '{NOS3,AMPD1,ACE}',
  '{athletic,heavy_exercise}',
  '{performance,energy,endurance,pump}',
  60,
  'Pre-workout performance formula with Citrulline Malate, Beta-Alanine, Betaine Anhydrous, and Caffeine + L-Theanine stack.'),

('FC-SHRED-001', 'SHRED+', 'core', 'metabolic', 39.99, 'capsule',
  '{weight_gain,slow_metabolism,poor_body_composition,sugar_cravings,bloating}',
  '{FTO_variant,MC4R,ADRB2}',
  '{sedentary,poor_diet,high_sugar}',
  '{weight_loss,metabolism,body_composition}',
  75,
  'Metabolic optimization with Berberine HCL, Green Tea EGCG, Grains of Paradise, Chromium Picolinate, and Cayenne Extract.'),

('FC-BALANCE-001', 'BALANCE+', 'core', 'digestive', 34.99, 'capsule',
  '{bloating,digestive_issues,irregular_bowel,food_sensitivities,gut_discomfort}',
  '{FUT2,HLA_DQ}',
  '{poor_diet,high_stress,alcohol}',
  '{gut_health,digestion,immune,microbiome}',
  80,
  'Gut microbiome restoration with Spore-based Probiotics, Prebiotic GOS, L-Glutamine, Zinc Carnosine, and Digestive Enzymes.'),

('FC-CLEAN-001', 'CLEAN+', 'core', 'detox', 34.99, 'capsule',
  '{toxin_exposure,skin_issues,liver_stress,brain_fog,fatigue}',
  '{GST_null,NAT2_slow,CYP1A2_slow}',
  '{alcohol,poor_diet,environmental_exposure}',
  '{detox,liver_health,skin,clarity}',
  68,
  'Phase I/II detoxification support with NAC, Milk Thistle (Silybin Phytosome), Calcium-D-Glucarate, Sulforaphane, and Glutathione precursors.'),

('FC-IRON-001', 'IRON+', 'core', 'blood_health', 24.99, 'capsule',
  '{fatigue,pale_skin,dizziness,cold_extremities,hair_loss}',
  '{HFE,TMPRSS6}',
  '{vegetarian,heavy_menstruation,athletic}',
  '{energy,blood_health,iron_status}',
  55,
  'Gentle iron formula with Iron Bisglycinate, Vitamin C, Lactoferrin, and Copper. Non-constipating with enhanced absorption.'),

('FC-AMINO-001', 'AMINO ACID MATRIX+', 'core', 'performance', 44.99, 'powder',
  '{muscle_loss,poor_recovery,low_protein,fatigue,poor_body_composition}',
  '{BCAA_metabolism}',
  '{athletic,aging,vegetarian,low_protein_diet}',
  '{muscle,recovery,performance,body_composition}',
  62,
  'Complete essential amino acid profile with optimized BCAA ratios, HMB, and Electrolytes. Muscle protein synthesis support.'),

('FC-DIGEST-001', 'DigestiZorb+', 'core', 'digestive', 29.99, 'capsule',
  '{bloating,gas,food_sensitivities,poor_absorption,digestive_discomfort}',
  '{MCM6_lactase,SI_sucrase}',
  '{poor_diet,food_sensitivities,aging}',
  '{digestion,absorption,gut_comfort}',
  73,
  'Comprehensive digestive enzyme blend with Protease, Lipase, Amylase, Lactase, DPP-IV (gluten), and Ox Bile for fat digestion.'),

-- === GENETIC-TARGETED LINE ===
('FC-MTHFR-001', 'MTHFR+', 'genetic', 'methylation', 39.99, 'capsule',
  '{fatigue,brain_fog,mood_changes,anxiety,homocysteine_high}',
  '{MTHFR_heterozygous,MTHFR_homozygous,MTR_variant,MTRR_variant}',
  '{poor_diet,high_stress,alcohol}',
  '{methylation,energy,mood,cognition}',
  95,
  'Targeted methylation support with 5-MTHF (Quatrefolic), Methylcobalamin, P-5-P, Riboflavin-5-Phosphate, and TMG. For MTHFR C677T/A1298C variants.'),

('FC-COMT-001', 'COMT+', 'genetic', 'neurotransmitter', 39.99, 'capsule',
  '{anxiety,stress_sensitivity,insomnia,irritability,overstimulation}',
  '{COMT_slow,COMT_Val158Met}',
  '{high_stress,high_caffeine,overstimulated}',
  '{stress_relief,calm,sleep,mood}',
  92,
  'COMT-optimized catecholamine support with Magnesium Threonate, SAMe micro-dose, EGCG, and DIM. For slow COMT metabolizers.'),

('FC-MAOA-001', 'MAOA+', 'genetic', 'neurotransmitter', 39.99, 'capsule',
  '{mood_swings,irritability,impulsivity,emotional_reactivity,aggression}',
  '{MAOA_low,MAOA_high}',
  '{high_stress,poor_sleep_quality}',
  '{mood,emotional_balance,calm}',
  88,
  'MAO-A pathway support with targeted serotonin precursors (5-HTP micro-dose), B6 as P-5-P, Magnesium, and SAMe. Neurotransmitter metabolism balance.'),

('FC-VDR-001', 'VDR+', 'genetic', 'vitamin_d', 34.99, 'capsule',
  '{bone_weakness,immune_issues,fatigue,mood_changes,muscle_weakness}',
  '{VDR_Taq,VDR_Bsm,VDR_Fok,GC_variant}',
  '{indoor_lifestyle,northern_climate,dark_skin}',
  '{immune,bone_health,mood,energy}',
  80,
  'VDR-optimized vitamin D formula with D3 5000IU, K2 MK-7, Magnesium, and Boron. For VDR polymorphism carriers needing enhanced D metabolism.'),

('FC-APOE-001', 'APOE+', 'genetic', 'cardiovascular', 44.99, 'capsule',
  '{cognitive_decline,cholesterol_high,cardiovascular_risk,inflammation}',
  '{APOE4_carrier,APOE3_4,APOE4_4}',
  '{poor_diet,sedentary,aging}',
  '{cardiovascular,cognition,longevity,lipids}',
  85,
  'APOE4-optimized neuroprotective formula with DHA (high-dose), Curcumin Phytosome, Resveratrol, and Lion''s Mane. Amyloid clearance support.'),

('FC-CYP-001', 'CYP450+', 'genetic', 'detox', 39.99, 'capsule',
  '{medication_sensitivity,caffeine_sensitivity,toxin_buildup,liver_stress}',
  '{CYP1A2_slow,CYP2D6_poor,CYP2C19_poor,CYP3A4_variant}',
  '{medication_use,alcohol,environmental_exposure}',
  '{detox,liver_health,drug_metabolism}',
  75,
  'CYP450 enzyme support with targeted cofactors: Riboflavin, Niacin, Molybdenum, and Phase II conjugation substrates (NAC, Glycine, Taurine).')

ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  symptom_tags = EXCLUDED.symptom_tags,
  genetic_tags = EXCLUDED.genetic_tags,
  lifestyle_tags = EXCLUDED.lifestyle_tags,
  goal_tags = EXCLUDED.goal_tags,
  priority_weight = EXCLUDED.priority_weight,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  updated_at = now();
