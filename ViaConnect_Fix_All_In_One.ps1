# ════════════════════════════════════════════════════════════════════════════
# ViaConnect Fix All-In-One Script
# Creates: product_catalog, recommendations, recommendation engine,
#          API route, useCAQCompletion hook, VitalityScoreGauge, SupplementProtocol
# ════════════════════════════════════════════════════════════════════════════

$SUPABASE_PROJECT_REF = "nnhkcufyqjojdbvdrpky"
$PROJECT_ROOT = Get-Location  # Run from your ViaConnect project root

# ════════════════════════════════════════════════════════════════════════════
# STEP 1: CREATE DIRECTORIES
# ════════════════════════════════════════════════════════════════════════════

Write-Host "[1/7] Creating directories..." -ForegroundColor Yellow

$dirs = @(
    "lib",
    "lib\hooks",
    "components",
    "app\api\recommendations\generate",
    "supabase\migrations"
)

foreach ($dir in $dirs) {
    $fullPath = Join-Path $PROJECT_ROOT $dir
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "  + Created: $dir" -ForegroundColor Green
    }
}

Write-Host "  Directories ready." -ForegroundColor Green
Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# STEP 2: WRITE SQL MIGRATION
# ════════════════════════════════════════════════════════════════════════════

Write-Host "[2/7] Writing SQL migration..." -ForegroundColor Yellow

$migrationPath = Join-Path $PROJECT_ROOT "supabase\migrations\20260322000000_fix_recommendations_and_vitality.sql"

$migrationSQL = @'
-- ViaConnect Fix: product_catalog + recommendations + profiles patch + RLS + seed 21 SKUs

CREATE TABLE IF NOT EXISTS product_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  price NUMERIC(8,2) NOT NULL,
  delivery_form TEXT DEFAULT 'capsule',
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  symptom_tags TEXT[] DEFAULT '{}',
  genetic_tags TEXT[] DEFAULT '{}',
  lifestyle_tags TEXT[] DEFAULT '{}',
  goal_tags TEXT[] DEFAULT '{}',
  contraindication_tags TEXT[] DEFAULT '{}',
  priority_weight INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES product_catalog(id),
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  reason TEXT NOT NULL,
  confidence_level TEXT DEFAULT 'questionnaire',
  confidence_score INTEGER DEFAULT 68,
  priority_rank INTEGER DEFAULT 1,
  dosage TEXT,
  frequency TEXT,
  time_of_day TEXT,
  monthly_price NUMERIC(8,2),
  status TEXT DEFAULT 'recommended',
  source TEXT DEFAULT 'caq',
  assessment_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_status ON recommendations(user_id, status);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='assessment_completed') THEN
    ALTER TABLE profiles ADD COLUMN assessment_completed BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='vitality_score') THEN
    ALTER TABLE profiles ADD COLUMN vitality_score INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='constitutional_type') THEN
    ALTER TABLE profiles ADD COLUMN constitutional_type TEXT;
  END IF;
END $$;

ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view products" ON product_catalog;
CREATE POLICY "Anyone can view products" ON product_catalog FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users view own recommendations" ON recommendations;
CREATE POLICY "Users view own recommendations" ON recommendations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert recommendations" ON recommendations;
CREATE POLICY "System can insert recommendations" ON recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own recommendations" ON recommendations;
CREATE POLICY "Users can update own recommendations" ON recommendations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recommendations" ON recommendations;
CREATE POLICY "Users can delete own recommendations" ON recommendations FOR DELETE USING (auth.uid() = user_id);

INSERT INTO product_catalog (sku, name, category, subcategory, price, delivery_form, symptom_tags, genetic_tags, lifestyle_tags, goal_tags, priority_weight, description) VALUES
('FC-RELAX-001','RELAX+','core','sleep',34.99,'capsule','{poor_sleep,insomnia,restlessness,anxiety,muscle_tension}','{COMT_slow,GABAergic}','{high_stress,poor_sleep_quality,screen_time_high}','{sleep,stress_relief,relaxation}',85,'Dual liposomal-micellar sleep formula. L-Theanine, Magnesium Bisglycinate, GABA, Passionflower. 10-27x bioavailability.'),
('FC-CALM-001','CALM+','core','stress',34.99,'capsule','{anxiety,stress,irritability,mood_swings,racing_thoughts}','{COMT_slow,MAOA_low,GABAergic}','{high_stress,high_caffeine,poor_work_life_balance}','{stress_relief,mood,mental_clarity}',82,'Adaptogenic stress response. Ashwagandha KSM-66, Rhodiola Rosea, L-Theanine, Holy Basil.'),
('FC-FOCUS-001','FOCUS+','core','cognitive',39.99,'capsule','{brain_fog,poor_concentration,memory_issues,mental_fatigue,lack_of_motivation}','{COMT_fast,BDNF_variant,APOE}','{high_screen_time,sedentary,poor_diet}','{cognition,focus,memory,mental_clarity}',88,'Nootropic formula. Lions Mane, Alpha-GPC, Bacopa Monnieri, Phosphatidylserine.'),
('FC-FLEX-001','FLEX+','core','musculoskeletal',34.99,'capsule','{joint_pain,inflammation,stiffness,muscle_soreness,reduced_mobility}','{COX2_variant,IL6_variant}','{heavy_exercise,physical_labor,aging}','{joint_health,inflammation,mobility,recovery}',72,'Joint mobility. Curcumin Phytosome, Boswellia, UC-II Collagen, Hyaluronic Acid.'),
('FC-RISE-001','RISE+','core','energy',39.99,'capsule','{fatigue,low_energy,afternoon_crash,poor_stamina,slow_recovery}','{MTHFR_any,COMT_fast,MTR_variant}','{poor_diet,low_exercise,high_stress,poor_sleep_quality}','{energy,vitality,endurance,recovery}',90,'Mitochondrial energy. CoQ10 Ubiquinol, PQQ, Methylated B-Complex, D-Ribose, Acetyl-L-Carnitine.'),
('FC-DESIRE-001','DESIRE+','core','hormonal',44.99,'capsule','{low_libido,hormonal_imbalance,fatigue,mood_changes,poor_recovery}','{CYP19A1,SRD5A2,AR_variant}','{high_stress,aging,sedentary}','{libido,hormonal_balance,vitality}',65,'Hormone optimization. Tongkat Ali, Fenugreek, Zinc Picolinate, DIM, Boron.'),
('FC-NAD-001','NAD+','core','longevity',59.99,'capsule','{fatigue,aging_concerns,poor_recovery,cognitive_decline,low_energy}','{SIRT1,PARP1,NQO1}','{aging,high_stress,poor_sleep_quality}','{longevity,energy,cellular_health,recovery}',78,'NAD+ precursor. NMN, Resveratrol, Quercetin, TMG. Sirtuin activation.'),
('FC-CREATINE-001','CREATINE HCL+','core','performance',29.99,'powder','{low_energy,poor_performance,muscle_weakness,brain_fog,slow_recovery}','{GAMT,GATM,SLC6A8}','{heavy_exercise,athletic,physical_labor}','{performance,muscle,energy,cognition}',70,'Pharmaceutical-grade Creatine HCL. ATP regeneration, cognitive function.'),
('FC-BLAST-001','BLAST+','core','performance',44.99,'powder','{low_energy,poor_performance,lack_of_motivation,poor_endurance}','{NOS3,AMPD1,ACE}','{athletic,heavy_exercise}','{performance,energy,endurance}',60,'Pre-workout. Citrulline Malate, Beta-Alanine, Betaine, Caffeine + L-Theanine.'),
('FC-SHRED-001','SHRED+','core','metabolic',39.99,'capsule','{weight_gain,slow_metabolism,poor_body_composition,sugar_cravings,bloating}','{FTO_variant,MC4R,ADRB2}','{sedentary,poor_diet,high_sugar}','{weight_loss,metabolism,body_composition}',75,'Metabolic optimization. Berberine HCL, Green Tea EGCG, Grains of Paradise, Chromium.'),
('FC-BALANCE-001','BALANCE+','core','digestive',34.99,'capsule','{bloating,digestive_issues,irregular_bowel,food_sensitivities,gut_discomfort}','{FUT2,HLA_DQ}','{poor_diet,high_stress,alcohol}','{gut_health,digestion,immune,microbiome}',80,'Gut restoration. Spore Probiotics, Prebiotic GOS, L-Glutamine, Zinc Carnosine.'),
('FC-CLEAN-001','CLEAN+','core','detox',34.99,'capsule','{toxin_exposure,skin_issues,liver_stress,brain_fog,fatigue}','{GST_null,NAT2_slow,CYP1A2_slow}','{alcohol,poor_diet,environmental_exposure}','{detox,liver_health,skin,clarity}',68,'Phase I/II detox. NAC, Milk Thistle Phytosome, Calcium-D-Glucarate, Sulforaphane.'),
('FC-IRON-001','IRON+','core','blood_health',24.99,'capsule','{fatigue,pale_skin,dizziness,cold_extremities,hair_loss}','{HFE,TMPRSS6}','{vegetarian,heavy_menstruation,athletic}','{energy,blood_health,iron_status}',55,'Gentle iron. Iron Bisglycinate, Vitamin C, Lactoferrin. Non-constipating.'),
('FC-AMINO-001','AMINO ACID MATRIX+','core','performance',44.99,'powder','{muscle_loss,poor_recovery,low_protein,fatigue,poor_body_composition}','{BCAA_metabolism}','{athletic,aging,vegetarian,low_protein_diet}','{muscle,recovery,performance,body_composition}',62,'Complete EAA profile. Optimized BCAA ratios, HMB, Electrolytes.'),
('FC-DIGEST-001','DigestiZorb+','core','digestive',29.99,'capsule','{bloating,gas,food_sensitivities,poor_absorption,digestive_discomfort}','{MCM6_lactase,SI_sucrase}','{poor_diet,food_sensitivities,aging}','{digestion,absorption,gut_comfort}',73,'Comprehensive enzymes. Protease, Lipase, Amylase, Lactase, DPP-IV, Ox Bile.'),
('FC-MTHFR-001','MTHFR+','genetic','methylation',39.99,'capsule','{fatigue,brain_fog,mood_changes,anxiety,homocysteine_high}','{MTHFR_heterozygous,MTHFR_homozygous,MTR_variant,MTRR_variant,MTHFR_any}','{poor_diet,high_stress,alcohol}','{methylation,energy,mood,cognition}',95,'Methylation support. 5-MTHF Quatrefolic, Methylcobalamin, P-5-P, Riboflavin-5-Phosphate, TMG.'),
('FC-COMT-001','COMT+','genetic','neurotransmitter',39.99,'capsule','{anxiety,stress_sensitivity,insomnia,irritability,overstimulation}','{COMT_slow,COMT_Val158Met}','{high_stress,high_caffeine,overstimulated}','{stress_relief,calm,sleep,mood}',92,'COMT-optimized. Magnesium Threonate, SAMe micro-dose, EGCG, DIM.'),
('FC-MAOA-001','MAOA+','genetic','neurotransmitter',39.99,'capsule','{mood_swings,irritability,impulsivity,emotional_reactivity}','{MAOA_low,MAOA_high}','{high_stress,poor_sleep_quality}','{mood,emotional_balance,calm}',88,'MAO-A pathway support. 5-HTP micro-dose, P-5-P, Magnesium, SAMe.'),
('FC-VDR-001','VDR+','genetic','vitamin_d',34.99,'capsule','{bone_weakness,immune_issues,fatigue,mood_changes,muscle_weakness}','{VDR_Taq,VDR_Bsm,VDR_Fok,GC_variant}','{indoor_lifestyle,northern_climate,dark_skin}','{immune,bone_health,mood,energy}',80,'VDR-optimized D formula. D3 5000IU, K2 MK-7, Magnesium, Boron.'),
('FC-APOE-001','APOE+','genetic','cardiovascular',44.99,'capsule','{cognitive_decline,cholesterol_high,cardiovascular_risk,inflammation}','{APOE4_carrier,APOE3_4,APOE4_4}','{poor_diet,sedentary,aging}','{cardiovascular,cognition,longevity,lipids}',85,'APOE4-optimized neuroprotective. DHA high-dose, Curcumin Phytosome, Resveratrol, Lion''s Mane.'),
('FC-CYP-001','CYP450+','genetic','detox',39.99,'capsule','{medication_sensitivity,caffeine_sensitivity,toxin_buildup,liver_stress}','{CYP1A2_slow,CYP2D6_poor,CYP2C19_poor,CYP3A4_variant}','{medication_use,alcohol,environmental_exposure}','{detox,liver_health,drug_metabolism}',75,'CYP450 enzyme support. Riboflavin, Niacin, Molybdenum, NAC, Glycine, Taurine.')
ON CONFLICT (sku) DO UPDATE SET
  symptom_tags=EXCLUDED.symptom_tags, genetic_tags=EXCLUDED.genetic_tags,
  lifestyle_tags=EXCLUDED.lifestyle_tags, goal_tags=EXCLUDED.goal_tags,
  priority_weight=EXCLUDED.priority_weight, price=EXCLUDED.price,
  description=EXCLUDED.description, updated_at=now();
'@

Set-Content -Path $migrationPath -Value $migrationSQL -Encoding UTF8
Write-Host "  + Written: supabase\migrations\20260322000000_fix_recommendations_and_vitality.sql" -ForegroundColor Green
Write-Host ""
Write-Host "  >> NOW RUN THIS SQL in Supabase SQL Editor:" -ForegroundColor Red
Write-Host "     https://supabase.com/dashboard/project/nnhkcufyqjojdbvdrpky/sql" -ForegroundColor White
Write-Host "     Open the file above, copy all contents, paste and click Run." -ForegroundColor White
Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# STEP 3: WRITE lib/recommendation-engine.ts
# ════════════════════════════════════════════════════════════════════════════

Write-Host "[3/7] Writing lib/recommendation-engine.ts..." -ForegroundColor Yellow

$enginePath = Join-Path $PROJECT_ROOT "lib\recommendation-engine.ts"

$engineCode = @'
import { SupabaseClient } from '@supabase/supabase-js';

export interface CAQResponses {
  age?: number; sex?: string; height_cm?: number; weight_kg?: number;
  primary_concerns?: string[]; family_history?: string[];
  symptoms?: Record<string, number>;
  diet_type?: string; exercise_frequency?: string; sleep_hours?: number;
  stress_level?: number; alcohol_intake?: string; smoking_status?: string;
  caffeine_intake?: string; water_intake?: number; screen_time?: number;
  sun_exposure?: string; medications?: string[]; current_supplements?: string[];
  allergies?: string[]; adverse_reactions?: string[];
  wellness_goals?: string[]; health_priorities?: string[];
  preferred_form?: string; budget_range?: string;
}

export interface GeneticProfile { [key: string]: any; }

export interface ProductMatch {
  sku: string; product_name: string; category: string; reason: string;
  confidence_score: number; confidence_level: 'questionnaire'|'genetic'|'combined';
  priority_rank: number; dosage: string; frequency: string;
  time_of_day: 'morning'|'afternoon'|'evening';
  monthly_price: number; source: 'caq'|'genetic'|'practitioner'|'ai';
  match_score: number;
}

const SYMPTOM_TO_TAGS: Record<string, string[]> = {
  energy:['fatigue','low_energy','afternoon_crash','slow_recovery'],
  sleep:['poor_sleep','insomnia','restlessness'],
  mood:['mood_swings','mood_changes','irritability'],
  digestion:['bloating','digestive_issues','gut_discomfort','irregular_bowel'],
  cognition:['brain_fog','poor_concentration','memory_issues','mental_fatigue'],
  pain:['joint_pain','muscle_soreness','inflammation'],
  skin:['skin_issues'], hair:['hair_loss'], immune:['immune_issues'],
  hormonal:['hormonal_imbalance','low_libido'],
  cardiovascular:['cardiovascular_risk','cholesterol_high'],
  musculoskeletal:['joint_pain','stiffness','reduced_mobility','muscle_weakness'],
  metabolic:['weight_gain','slow_metabolism','sugar_cravings'],
  stress:['anxiety','stress','racing_thoughts','stress_sensitivity'],
  anxiety:['anxiety','stress_sensitivity','overstimulation'],
  libido:['low_libido','hormonal_imbalance'],
};

const GOAL_TO_TAGS: Record<string, string[]> = {
  energy:['energy','vitality','endurance'],
  weight_loss:['weight_loss','metabolism','body_composition'],
  cognition:['cognition','focus','memory','mental_clarity'],
  sleep:['sleep','relaxation','stress_relief'],
  stress:['stress_relief','calm','mood'],
  muscle:['muscle','performance','recovery'],
  joint_health:['joint_health','mobility','inflammation'],
  immune:['immune','cellular_health'],
  gut_health:['gut_health','digestion','microbiome'],
  longevity:['longevity','cellular_health','recovery'],
  hormonal_balance:['hormonal_balance','libido','vitality'],
  detox:['detox','liver_health','clarity'],
  skin:['skin','clarity'], cardiovascular:['cardiovascular','lipids'],
};

const DOSAGE_MAP: Record<string, {dosage:string;frequency:string;time_of_day:'morning'|'afternoon'|'evening'}> = {
  'FC-RELAX-001':{dosage:'2 capsules',frequency:'daily',time_of_day:'evening'},
  'FC-CALM-001':{dosage:'2 capsules',frequency:'daily',time_of_day:'morning'},
  'FC-FOCUS-001':{dosage:'2 capsules',frequency:'daily',time_of_day:'morning'},
  'FC-FLEX-001':{dosage:'2 capsules',frequency:'daily',time_of_day:'morning'},
  'FC-RISE-001':{dosage:'2 capsules',frequency:'daily',time_of_day:'morning'},
  'FC-DESIRE-001':{dosage:'2 capsules',frequency:'daily',time_of_day:'morning'},
  'FC-NAD-001':{dosage:'2 capsules',frequency:'daily',time_of_day:'morning'},
  'FC-CREATINE-001':{dosage:'5g (1 scoop)',frequency:'daily',time_of_day:'morning'},
  'FC-BLAST-001':{dosage:'1 scoop',frequency:'pre-workout',time_of_day:'morning'},
  'FC-SHRED-001':{dosage:'2 capsules',frequency:'daily',time_of_day:'morning'},
  'FC-BALANCE-001':{dosage:'2 capsules',frequency:'daily',time_of_day:'morning'},
  'FC-CLEAN-001':{dosage:'2 capsules',frequency:'daily',time_of_day:'evening'},
  'FC-IRON-001':{dosage:'1 capsule',frequency:'daily',time_of_day:'morning'},
  'FC-AMINO-001':{dosage:'10g (1 scoop)',frequency:'daily',time_of_day:'morning'},
  'FC-DIGEST-001':{dosage:'1 capsule',frequency:'with meals',time_of_day:'morning'},
  'FC-MTHFR-001':{dosage:'2 capsules',frequency:'daily',time_of_day:'morning'},
  'FC-COMT-001':{dosage:'2 capsules',frequency:'daily',time_of_day:'evening'},
  'FC-MAOA-001':{dosage:'2 capsules',frequency:'daily',time_of_day:'morning'},
  'FC-VDR-001':{dosage:'1 capsule',frequency:'daily',time_of_day:'morning'},
  'FC-APOE-001':{dosage:'2 capsules',frequency:'daily',time_of_day:'morning'},
  'FC-CYP-001':{dosage:'2 capsules',frequency:'daily',time_of_day:'evening'},
};

const CONTRAINDICATIONS: Record<string, string[]> = {
  'FC-IRON-001':['hemochromatosis','iron_overload'],
  'FC-DESIRE-001':['hormone_sensitive_cancer','prostate_cancer'],
  'FC-BLAST-001':['heart_condition','arrhythmia','pregnancy'],
  'FC-SHRED-001':['pregnancy','breastfeeding','diabetes_type1'],
  'FC-NAD-001':['active_cancer'],
  'FC-FOCUS-001':['bipolar_disorder'],
};

function extractLifestyleTags(caq: CAQResponses): string[] {
  const tags: string[] = [];
  if (caq.stress_level && caq.stress_level >= 7) tags.push('high_stress');
  if (!caq.exercise_frequency || caq.exercise_frequency === 'none' || caq.exercise_frequency === '1-2x') tags.push('sedentary','low_exercise');
  if (caq.exercise_frequency === '5+') tags.push('athletic','heavy_exercise');
  if (caq.sleep_hours && caq.sleep_hours < 6) tags.push('poor_sleep_quality');
  if (caq.alcohol_intake === 'heavy' || caq.alcohol_intake === 'moderate') tags.push('alcohol');
  if (caq.caffeine_intake === 'high') tags.push('high_caffeine');
  if (caq.smoking_status === 'current') tags.push('environmental_exposure');
  if (caq.screen_time && caq.screen_time > 8) tags.push('high_screen_time','screen_time_high');
  if (caq.sun_exposure === 'minimal') tags.push('indoor_lifestyle','northern_climate');
  if (caq.diet_type === 'vegetarian' || caq.diet_type === 'vegan') tags.push('vegetarian','low_protein_diet');
  if (caq.water_intake && caq.water_intake < 6) tags.push('dehydrated');
  if (caq.age && caq.age > 50) tags.push('aging');
  return tags;
}

function extractGeneticTags(g: GeneticProfile): string[] {
  const tags: string[] = [];
  if (g.mthfr_c677t === 'heterozygous') tags.push('MTHFR_heterozygous','MTHFR_any');
  if (g.mthfr_c677t === 'homozygous') tags.push('MTHFR_homozygous','MTHFR_any');
  if (g.mthfr_a1298c && g.mthfr_a1298c !== 'normal') tags.push('MTHFR_any');
  if (g.comt_val158met === 'met_met') tags.push('COMT_slow','COMT_Val158Met');
  if (g.comt_val158met === 'val_val') tags.push('COMT_fast');
  if (g.maoa_status === 'low') tags.push('MAOA_low');
  if (g.maoa_status === 'high') tags.push('MAOA_high');
  if (g.apoe_genotype?.includes('e4')) tags.push('APOE4_carrier');
  if (g.vdr_status) tags.push('VDR_Taq','VDR_variant');
  if (g.cyp1a2_status === 'slow') tags.push('CYP1A2_slow');
  if (g.fto_variant) tags.push('FTO_variant');
  if (g.gst_null) tags.push('GST_null');
  return tags;
}

function hasContraindication(sku: string, caq: CAQResponses): boolean {
  const contras = CONTRAINDICATIONS[sku] || [];
  const conditions = [...(caq.primary_concerns||[]),...(caq.family_history||[]),...(caq.medications||[]),...(caq.allergies||[])].map(c => c.toLowerCase().replace(/\s+/g,'_'));
  return contras.some(c => conditions.some(uc => uc.includes(c)));
}

function generateReason(mSym: string[], mGoal: string[], mGen: string[], mLife: string[]): string {
  const parts: string[] = [];
  if (mGen.length) parts.push(`Targeted for your ${mGen.slice(0,2).map(t=>t.replace(/_/g,' ')).join(', ')} genetic profile`);
  if (mSym.length) parts.push(`Addresses your reported ${mSym.slice(0,3).map(t=>t.replace(/_/g,' ')).join(', ')}`);
  if (mGoal.length) parts.push(`Supports your ${mGoal.slice(0,2).map(t=>t.replace(/_/g,' ')).join(' and ')} goals`);
  if (mLife.length) parts.push(`Optimized for your ${mLife.slice(0,2).map(t=>t.replace(/_/g,' ')).join(', ')} lifestyle`);
  return parts.join('. ') + '.';
}

export function calculateVitalityScore(caq: CAQResponses): number {
  let score = 50;
  const symptoms = caq.symptoms || {};
  const keys = Object.keys(symptoms);
  if (keys.length > 0) {
    const avg = keys.reduce((s, k) => s + (symptoms[k] || 0), 0) / keys.length;
    score += Math.round(30 - (avg * 4));
  }
  if (caq.exercise_frequency === '5+') score += 10;
  else if (caq.exercise_frequency === '3-4x') score += 7;
  else if (caq.exercise_frequency === '1-2x') score += 3;
  if (caq.sleep_hours && caq.sleep_hours >= 7 && caq.sleep_hours <= 9) score += 8;
  else if (caq.sleep_hours && caq.sleep_hours >= 6) score += 4;
  if (caq.stress_level) score += Math.round(10 - caq.stress_level);
  if (caq.alcohol_intake === 'none') score += 3;
  if (caq.smoking_status === 'never') score += 3;
  if (caq.water_intake && caq.water_intake >= 8) score += 2;
  return Math.max(0, Math.min(100, score));
}

export async function generateRecommendations(supabase: SupabaseClient, userId: string, caq: CAQResponses, geneticProfile?: GeneticProfile): Promise<ProductMatch[]> {
  const { data: products, error } = await supabase.from('product_catalog').select('*').eq('active', true);
  if (error || !products) throw new Error('Could not load product catalog');

  const symptomTags: string[] = [];
  if (caq.symptoms) { for (const [sym, sev] of Object.entries(caq.symptoms)) { if (sev >= 4) symptomTags.push(...(SYMPTOM_TO_TAGS[sym] || [])); } }
  const lifestyleTags = extractLifestyleTags(caq);
  const goalTags: string[] = [];
  if (caq.wellness_goals) { for (const goal of caq.wellness_goals) goalTags.push(...(GOAL_TO_TAGS[goal] || [goal])); }
  const geneticTags = geneticProfile ? extractGeneticTags(geneticProfile) : [];
  const hasGenetics = geneticTags.length > 0;

  const scored: ProductMatch[] = [];
  for (const product of products) {
    if (hasContraindication(product.sku, caq)) continue;
    const mSym = (product.symptom_tags||[]).filter((t:string) => symptomTags.includes(t));
    const mLife = (product.lifestyle_tags||[]).filter((t:string) => lifestyleTags.includes(t));
    const mGoal = (product.goal_tags||[]).filter((t:string) => goalTags.includes(t));
    const mGen = (product.genetic_tags||[]).filter((t:string) => geneticTags.includes(t));
    const totalMatches = mSym.length + mLife.length + mGoal.length + mGen.length;
    if (totalMatches < 2) continue;

    const matchScore = (mSym.length*25)+(mGoal.length*20)+(mLife.length*10)+(mGen.length*35)+((product.priority_weight||50)/5);
    let confidenceLevel: 'questionnaire'|'genetic'|'combined' = 'questionnaire';
    let confidenceScore = 55 + Math.min(23, totalMatches * 3);
    if (hasGenetics && mGen.length > 0) { confidenceLevel = 'combined'; confidenceScore = 90 + Math.min(8, mGen.length*2); }
    else if (hasGenetics) { confidenceLevel = 'genetic'; confidenceScore = 85; }

    const dosage = DOSAGE_MAP[product.sku] || {dosage:'2 capsules',frequency:'daily',time_of_day:'morning' as const};
    scored.push({
      sku: product.sku, product_name: product.name, category: product.category,
      reason: generateReason(mSym, mGoal, mGen, mLife),
      confidence_score: confidenceScore, confidence_level: confidenceLevel, priority_rank: 0,
      dosage: dosage.dosage, frequency: dosage.frequency, time_of_day: dosage.time_of_day,
      monthly_price: product.price, source: hasGenetics ? 'genetic' : 'caq', match_score: matchScore,
    });
  }

  scored.sort((a, b) => b.match_score - a.match_score);
  scored.forEach((item, idx) => { item.priority_rank = idx + 1; });
  let maxProducts = 8;
  if (caq.budget_range === 'under_50') maxProducts = 3;
  else if (caq.budget_range === '50_100') maxProducts = 5;
  else if (caq.budget_range === '100_200') maxProducts = 7;
  return scored.slice(0, maxProducts);
}

export async function saveRecommendations(supabase: SupabaseClient, userId: string, recs: ProductMatch[], assessmentId?: string): Promise<void> {
  await supabase.from('recommendations').delete().eq('user_id', userId).in('source', ['caq','genetic']);
  const rows = recs.map(r => ({
    user_id: userId, sku: r.sku, product_name: r.product_name, category: r.category,
    reason: r.reason, confidence_level: r.confidence_level, confidence_score: r.confidence_score,
    priority_rank: r.priority_rank, dosage: r.dosage, frequency: r.frequency,
    time_of_day: r.time_of_day, monthly_price: r.monthly_price, status: 'recommended',
    source: r.source, assessment_id: assessmentId || null,
  }));
  const { error } = await supabase.from('recommendations').insert(rows);
  if (error) throw new Error('Could not save recommendations: ' + error.message);
  await supabase.from('profiles').update({ assessment_completed: true }).eq('id', userId);
}

export async function runPostCAQPipeline(supabase: SupabaseClient, userId: string, caq: CAQResponses, assessmentId?: string): Promise<{vitalityScore: number; recommendations: ProductMatch[]}> {
  const vitalityScore = calculateVitalityScore(caq);
  await supabase.from('profiles').update({ vitality_score: vitalityScore, assessment_completed: true, updated_at: new Date().toISOString() }).eq('id', userId);
  const { data: geneticData } = await supabase.from('genetic_profiles').select('*').eq('user_id', userId).single();
  const recommendations = await generateRecommendations(supabase, userId, caq, geneticData || undefined);
  await saveRecommendations(supabase, userId, recommendations, assessmentId);
  return { vitalityScore, recommendations };
}
'@

Set-Content -Path $enginePath -Value $engineCode -Encoding UTF8
Write-Host "  + Written: lib\recommendation-engine.ts" -ForegroundColor Green
Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# STEP 4: WRITE API ROUTE
# ════════════════════════════════════════════════════════════════════════════

Write-Host "[4/7] Writing API route..." -ForegroundColor Yellow

$routePath = Join-Path $PROJECT_ROOT "app\api\recommendations\generate\route.ts"

$routeCode = @'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { runPostCAQPipeline, type CAQResponses } from '@/lib/recommendation-engine';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: phases } = await supabase
      .from('assessment_results').select('*').eq('user_id', user.id).order('phase', { ascending: true });
    if (!phases?.length) return NextResponse.json({ error: 'No assessment data found.' }, { status: 404 });

    const caqResponses: CAQResponses = {};
    for (const phase of phases) Object.assign(caqResponses, phase.responses || phase.data || phase.answers || {});

    const body = await request.json().catch(() => ({}));
    const result = await runPostCAQPipeline(supabase, user.id, caqResponses, body.assessment_id);

    return NextResponse.json({
      success: true, vitality_score: result.vitalityScore,
      recommendations_count: result.recommendations.length,
      recommendations: result.recommendations.map(r => ({
        product_name: r.product_name, reason: r.reason, confidence_score: r.confidence_score,
        dosage: r.dosage, time_of_day: r.time_of_day, monthly_price: r.monthly_price, priority_rank: r.priority_rank,
      })),
    });
  } catch (error: any) {
    console.error('Recommendation generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
'@

Set-Content -Path $routePath -Value $routeCode -Encoding UTF8
Write-Host "  + Written: app\api\recommendations\generate\route.ts" -ForegroundColor Green
Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# STEP 5: WRITE lib/hooks/useCAQCompletion.ts
# ════════════════════════════════════════════════════════════════════════════

Write-Host "[5/7] Writing useCAQCompletion hook..." -ForegroundColor Yellow

$hookPath = Join-Path $PROJECT_ROOT "lib\hooks\useCAQCompletion.ts"

$hookCode = @'
'use client';
import { useState, useCallback } from 'react';

interface CompletionResult {
  success: boolean; vitality_score: number; recommendations_count: number;
  recommendations: Array<{ product_name: string; reason: string; confidence_score: number; dosage: string; time_of_day: string; monthly_price: number; priority_rank: number; }>;
}

export function useCAQCompletion() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompletionResult | null>(null);

  const completeAssessment = useCallback(async (assessmentId?: string): Promise<CompletionResult | null> => {
    setIsProcessing(true); setError(null);
    try {
      const res = await fetch('/api/recommendations/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_id: assessmentId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      const data: CompletionResult = await res.json();
      setResult(data); return data;
    } catch (err: any) { setError(err.message); return null; }
    finally { setIsProcessing(false); }
  }, []);

  return { completeAssessment, isProcessing, error, result };
}
'@

Set-Content -Path $hookPath -Value $hookCode -Encoding UTF8
Write-Host "  + Written: lib\hooks\useCAQCompletion.ts" -ForegroundColor Green
Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# STEP 6: WRITE components/VitalityScoreGauge.tsx + SupplementProtocol.tsx
# ════════════════════════════════════════════════════════════════════════════

Write-Host "[6/7] Writing VitalityScoreGauge + SupplementProtocol..." -ForegroundColor Yellow

$gaugePath = Join-Path $PROJECT_ROOT "components\VitalityScoreGauge.tsx"

$gaugeCode = @'
'use client';
import { useEffect, useState, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function VitalityScoreGauge() {
  const supabase = createClientComponentClient();
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animatedScore, setAnimatedScore] = useState(0);
  const animRef = useRef<number|null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles')
        .select('vitality_score, assessment_completed').eq('id', user.id).single();
      setScore(profile?.vitality_score || 0);
      setCompleted(profile?.assessment_completed || false);
      setLoading(false);
    }
    load();
    const channel = supabase.channel('vitality-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          if (payload.new.vitality_score !== undefined) {
            setScore(payload.new.vitality_score);
            setCompleted(payload.new.assessment_completed ?? false);
          }
        }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  useEffect(() => {
    if (loading || score === 0) return;
    const duration = 1500; const start = Date.now();
    function animate() {
      const progress = Math.min((Date.now() - start) / duration, 1);
      setAnimatedScore(Math.round(score * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [score, loading]);

  const color = score >= 80 ? '#4ADE80' : score >= 60 ? '#22D3EE' : score >= 40 ? '#FBBF24' : '#F87171';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Moderate' : score > 0 ? 'Needs Attention' : 'Not Assessed';
  const r = 90; const circ = 2 * Math.PI * r; const offset = circ - (animatedScore / 100) * circ;

  if (loading) return (<div className="flex flex-col items-center p-6"><div className="w-[220px] h-[220px] rounded-full bg-white/5 animate-pulse" /></div>);

  if (score === 0 && !completed) return (
    <div className="flex flex-col items-center p-6">
      <div className="relative w-[220px] h-[220px]">
        <svg viewBox="0 0 220 220" className="w-full h-full">
          <circle cx="110" cy="110" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
          <text x="110" y="105" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="48" fontWeight="700">0</text>
          <text x="110" y="130" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="12">Vitality Score</text>
        </svg>
      </div>
      <p className="text-white/50 text-sm mt-3">Complete your assessment to unlock your score</p>
      <a href="/onboarding/1" className="mt-3 px-6 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold hover:opacity-90">Take Assessment</a>
    </div>
  );

  return (
    <div className="flex flex-col items-center p-6">
      <div className="relative w-[220px] h-[220px]">
        <svg viewBox="0 0 220 220" className="w-full h-full -rotate-90">
          <circle cx="110" cy="110" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round" />
          <circle cx="110" cy="110" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${color}40)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold" style={{ color }}>{animatedScore}</span>
          <span className="text-white/50 text-xs mt-1">Vitality Score</span>
        </div>
      </div>
      <span className="mt-3 text-sm font-medium px-3 py-1 rounded-full" style={{ color, backgroundColor: `${color}15` }}>{label}</span>
    </div>
  );
}
'@

Set-Content -Path $gaugePath -Value $gaugeCode -Encoding UTF8
Write-Host "  + Written: components\VitalityScoreGauge.tsx" -ForegroundColor Green

$protocolPath = Join-Path $PROJECT_ROOT "components\SupplementProtocol.tsx"

$protocolCode = @'
'use client';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Rec { id:string; sku:string; product_name:string; category:string; reason:string; confidence_score:number; confidence_level:string; priority_rank:number; dosage:string; frequency:string; time_of_day:string; monthly_price:number; status:string; }

export default function SupplementProtocol() {
  const supabase = createClientComponentClient();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchRecs(); }, []);

  async function fetchRecs() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('recommendations').select('*')
      .eq('user_id', user.id).in('status', ['recommended','accepted']).order('priority_rank', { ascending: true });
    setRecs(data || []); setLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch('/api/recommendations/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (res.ok) await fetchRecs();
    } catch (e) { console.error(e); }
    finally { setGenerating(false); }
  }

  const grouped = recs.reduce<Record<string, Rec[]>>((acc, r) => { const t = r.time_of_day || 'morning'; if (!acc[t]) acc[t] = []; acc[t].push(r); return acc; }, {});
  const total = recs.reduce((s, r) => s + (r.monthly_price || 0), 0);
  const cfg: Record<string, {label:string;icon:string;color:string}> = {
    morning:{label:'Morning',icon:'\u2600\uFE0F',color:'#FBBF24'},
    afternoon:{label:'Afternoon',icon:'\uD83C\uDF24\uFE0F',color:'#22D3EE'},
    evening:{label:'Evening',icon:'\uD83C\uDF19',color:'#A78BFA'},
  };

  if (loading) return (<div className="rounded-xl bg-white/5 border border-white/10 p-5">{[1,2,3].map(i => <div key={i} className="h-14 bg-white/5 rounded-lg mb-2 animate-pulse" />)}</div>);

  if (recs.length === 0) return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4"><span className="text-2xl">{'\uD83E\uDDEA'}</span></div>
      <p className="text-white/50 text-sm mb-4">No supplements in your protocol yet.</p>
      <button onClick={handleGenerate} disabled={generating}
        className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
        {generating ? '\u23F3 Analyzing Your Profile...' : '\u26A1 Generate My Protocol'}
      </button>
      <a href="/supplements" className="block mt-2 text-white/40 text-xs hover:text-white/60">Browse Supplements</a>
    </div>
  );

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-lg">Your Personalized Protocol</h3>
        <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">{recs.length} products</span>
      </div>
      <div className="mb-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 w-fit">
        <div className="w-2 h-2 rounded-full bg-cyan-400" />
        <span className="text-cyan-300 text-xs font-medium">
          {recs[0]?.confidence_score || 68}% Confidence ({recs[0]?.confidence_level === 'combined' ? 'Genetic + Assessment' : 'Assessment-Based'})
        </span>
      </div>
      {(['morning','afternoon','evening'] as const).map(time => {
        const items = grouped[time] || []; if (!items.length) return null;
        const c = cfg[time];
        return (
          <div key={time} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span>{c.icon}</span><span className="text-sm font-medium" style={{ color: c.color }}>{c.label}</span>
            </div>
            {items.map(rec => (
              <div key={rec.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors mb-1.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: `${c.color}15`, color: c.color }}>{rec.product_name.charAt(0)}</div>
                  <div><p className="text-white text-sm font-medium">{rec.product_name}</p>
                    <p className="text-white/40 text-xs">{rec.dosage} &middot; {rec.frequency}</p></div>
                </div>
                <span className="text-white/30 text-xs">${rec.monthly_price?.toFixed(2)}/mo</span>
              </div>
            ))}
          </div>
        );
      })}
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
        <div><span className="text-white/50 text-sm">Monthly: </span><span className="text-white font-semibold">${total.toFixed(2)}</span>
          <span className="text-emerald-400 text-xs ml-2">Save 20%: ${(total * 0.8).toFixed(2)}</span></div>
        <a href="/supplements/checkout" className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold">Build My Protocol</a>
      </div>
      {recs[0]?.confidence_level === 'questionnaire' && (
        <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20">
          <p className="text-white text-sm font-medium mb-1">{'\uD83E\uDDEC'} Unlock 94%+ confidence with genetic testing</p>
          <p className="text-white/50 text-xs mb-2">GENEX360 adds 80+ genetic markers for precision targeting.</p>
          <a href="/genex360" className="text-purple-300 text-xs font-medium hover:text-purple-200">Upgrade to GENEX360 &rarr;</a>
        </div>
      )}
    </div>
  );
}
'@

Set-Content -Path $protocolPath -Value $protocolCode -Encoding UTF8
Write-Host "  + Written: components\SupplementProtocol.tsx" -ForegroundColor Green
Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# STEP 7: MANUAL INTEGRATION STEPS
# ════════════════════════════════════════════════════════════════════════════

Write-Host "[7/7] Manual integration steps..." -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " ALL FILES WRITTEN. Complete these manual steps:" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  STEP A: Run the SQL migration" -ForegroundColor White
Write-Host "    Open: https://supabase.com/dashboard/project/nnhkcufyqjojdbvdrpky/sql" -ForegroundColor Gray
Write-Host "    Paste contents of: supabase\migrations\20260322000000_fix_recommendations_and_vitality.sql" -ForegroundColor Gray
Write-Host "    Click 'Run'" -ForegroundColor Gray
Write-Host ""
Write-Host "  STEP B: Update your dashboard page imports" -ForegroundColor White
Write-Host "    In: app/(app)/(consumer)/dashboard/page.tsx" -ForegroundColor Gray
Write-Host "    Add:" -ForegroundColor Gray
Write-Host "      import VitalityScoreGauge from '@/components/VitalityScoreGauge';" -ForegroundColor DarkGray
Write-Host "      import SupplementProtocol from '@/components/SupplementProtocol';" -ForegroundColor DarkGray
Write-Host "    Replace old gauge with: <VitalityScoreGauge />" -ForegroundColor Gray
Write-Host "    Replace old supplements panel with: <SupplementProtocol />" -ForegroundColor Gray
Write-Host ""
Write-Host "  STEP C: Wire CAQ Phase 5 completion" -ForegroundColor White
Write-Host "    In your Phase 5 submit handler, add:" -ForegroundColor Gray
Write-Host "      import { useCAQCompletion } from '@/lib/hooks/useCAQCompletion';" -ForegroundColor DarkGray
Write-Host "      const { completeAssessment, isProcessing } = useCAQCompletion();" -ForegroundColor DarkGray
Write-Host "      // After saving Phase 5 answers:" -ForegroundColor DarkGray
Write-Host "      const result = await completeAssessment();" -ForegroundColor DarkGray
Write-Host "      router.push('/dashboard');" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  STEP D: Test" -ForegroundColor White
Write-Host "    npm run dev" -ForegroundColor Gray
Write-Host "    Complete CAQ as test user" -ForegroundColor Gray
Write-Host "    Verify gauge shows score + supplements populate" -ForegroundColor Gray
Write-Host ""
Write-Host "  STEP E: Commit and push" -ForegroundColor White
Write-Host "    git add -A" -ForegroundColor Gray
Write-Host "    git commit -m 'fix: vitality score gauge + recommendation engine'" -ForegroundColor Gray
Write-Host "    git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "  Edge Function 'generate-recommendations' is already LIVE on Supabase." -ForegroundColor Green
Write-Host "  URL: https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/generate-recommendations" -ForegroundColor Gray
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Files created:" -ForegroundColor Cyan
Write-Host "   supabase\migrations\20260322000000_fix_recommendations_and_vitality.sql" -ForegroundColor White
Write-Host "   lib\recommendation-engine.ts" -ForegroundColor White
Write-Host "   lib\hooks\useCAQCompletion.ts" -ForegroundColor White
Write-Host "   app\api\recommendations\generate\route.ts" -ForegroundColor White
Write-Host "   components\VitalityScoreGauge.tsx" -ForegroundColor White
Write-Host "   components\SupplementProtocol.tsx" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
