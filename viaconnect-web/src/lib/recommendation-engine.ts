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

export function calculateBioOptimizationScore(caq: CAQResponses): number {
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
  // Use enriched view to get financial toolchain data (tier, score, margins)
  // Falls back to product_catalog if view unavailable
  let products: any[] | null = null;
  const { data: enriched, error: enrichedErr } = await supabase
    .from('product_catalog_enriched').select('*').eq('active', true);
  if (!enrichedErr && enriched) {
    products = enriched;
  } else {
    const { data: fallback, error } = await supabase.from('product_catalog').select('*').eq('active', true);
    if (error || !fallback) throw new Error('Could not load product catalog');
    products = fallback;
  }

  const symptomTags: string[] = [];
  if (caq.symptoms) { for (const [sym, sev] of Object.entries(caq.symptoms)) { if (sev >= 4) symptomTags.push(...(SYMPTOM_TO_TAGS[sym] || [])); } }
  const lifestyleTags = extractLifestyleTags(caq);
  const goalTags: string[] = [];
  if (caq.wellness_goals) { for (const goal of caq.wellness_goals) goalTags.push(...(GOAL_TO_TAGS[goal] || [goal])); }
  const geneticTags = geneticProfile ? extractGeneticTags(geneticProfile) : [];
  const hasGenetics = geneticTags.length > 0;

  // Build a set of SKUs that replace the user's current supplements
  // (used to boost products the user is already taking in generic form)
  const currentSuppReplacementSkus = new Set<string>();
  if (caq.current_supplements?.length) {
    const SUPP_SKU_MAP: Record<string, string> = {
      'vitamin d': 'FC-VDR-001', 'vitamin d3': 'FC-VDR-001', 'd3': 'FC-VDR-001',
      'b complex': 'FC-MTHFR-001', 'b12': 'FC-MTHFR-001', 'folic acid': 'FC-MTHFR-001', 'folate': 'FC-MTHFR-001',
      'magnesium': 'FC-COMT-001', 'magnesium glycinate': 'FC-RELAX-001', 'magnesium citrate': 'FC-RELAX-001',
      'fish oil': 'FC-APOE-001', 'omega 3': 'FC-APOE-001', 'omega-3': 'FC-APOE-001',
      'coq10': 'FC-RISE-001', 'ubiquinol': 'FC-RISE-001',
      'probiotic': 'FC-BALANCE-001', 'probiotics': 'FC-BALANCE-001',
      'turmeric': 'FC-FLEX-001', 'curcumin': 'FC-FLEX-001',
      'iron': 'FC-IRON-001', 'ashwagandha': 'FC-CALM-001',
      'creatine': 'FC-CREATINE-001', 'nac': 'FC-CLEAN-001',
      'melatonin': 'FC-RELAX-001', 'multivitamin': 'FC-RISE-001',
      'bcaa': 'FC-AMINO-001', 'amino acids': 'FC-AMINO-001',
      'pre workout': 'FC-BLAST-001', 'pre-workout': 'FC-BLAST-001',
      'digestive enzymes': 'FC-DIGEST-001', 'berberine': 'FC-SHRED-001',
      'lions mane': 'FC-FOCUS-001', "lion's mane": 'FC-FOCUS-001',
      'nmn': 'FC-NAD-001', 'resveratrol': 'FC-NAD-001',
      'zinc': 'FC-DESIRE-001', '5-htp': 'FC-MAOA-001',
      'milk thistle': 'FC-CLEAN-001',
    };
    for (const supp of caq.current_supplements) {
      const norm = supp.toLowerCase().trim();
      const sku = SUPP_SKU_MAP[norm];
      if (sku) { currentSuppReplacementSkus.add(sku); continue; }
      for (const [key, val] of Object.entries(SUPP_SKU_MAP)) {
        if (norm.includes(key) || key.includes(norm)) { currentSuppReplacementSkus.add(val); break; }
      }
    }
  }

  const scored: ProductMatch[] = [];
  for (const product of products) {
    if (hasContraindication(product.sku, caq)) continue;
    const mSym = (product.symptom_tags||[]).filter((t:string) => symptomTags.includes(t));
    const mLife = (product.lifestyle_tags||[]).filter((t:string) => lifestyleTags.includes(t));
    const mGoal = (product.goal_tags||[]).filter((t:string) => goalTags.includes(t));
    const mGen = (product.genetic_tags||[]).filter((t:string) => geneticTags.includes(t));
    const isReplacement = currentSuppReplacementSkus.has(product.sku);
    const totalMatches = mSym.length + mLife.length + mGoal.length + mGen.length;

    // Allow replacement products through even with fewer tag matches
    if (totalMatches < 2 && !isReplacement) continue;

    // Base match score from tag matching
    let matchScore = (mSym.length*25)+(mGoal.length*20)+(mLife.length*10)+(mGen.length*35)+((product.priority_weight||50)/5);

    // Boost products that replace user's current supplements (they already take this category)
    if (isReplacement) matchScore += 30;

    // Boost from financial toolchain data (Star SKUs get priority)
    const tier = product.rationalization_tier;
    if (tier === 'Star') matchScore += 20;       // Star products boosted
    else if (tier === 'Core') matchScore += 5;    // Core gets slight boost
    else if (tier === 'Watch') matchScore -= 10;  // Watch deprioritized
    else if (tier === 'Sunset') continue;          // Never recommend Sunset SKUs

    // Composite score bonus (products scoring >75 get additional boost)
    const compositeScore = product.composite_score ? Number(product.composite_score) : 0;
    if (compositeScore > 75) matchScore += Math.round((compositeScore - 75) / 5);

    let confidenceLevel: 'questionnaire'|'genetic'|'combined' = 'questionnaire';
    let confidenceScore = 55 + Math.min(23, totalMatches * 3);
    if (hasGenetics && mGen.length > 0) { confidenceLevel = 'combined'; confidenceScore = 90 + Math.min(8, mGen.length*2); }
    else if (hasGenetics) { confidenceLevel = 'genetic'; confidenceScore = 85; }

    // Boost confidence if product is Star-tier (validated by financial analysis)
    if (tier === 'Star') confidenceScore = Math.min(98, confidenceScore + 3);

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

export async function runPostCAQPipeline(supabase: SupabaseClient, userId: string, caq: CAQResponses, assessmentId?: string): Promise<{bioScore: number; recommendations: ProductMatch[]}> {
  const bioScore = calculateBioOptimizationScore(caq);
  await supabase.from('profiles').update({ bio_optimization_score: bioScore, assessment_completed: true, updated_at: new Date().toISOString() }).eq('id', userId);
  const { data: geneticData } = await supabase.from('genetic_profiles').select('*').eq('user_id', userId).single();
  const recommendations = await generateRecommendations(supabase, userId, caq, geneticData || undefined);
  await saveRecommendations(supabase, userId, recommendations, assessmentId);
  return { bioScore, recommendations };
}
