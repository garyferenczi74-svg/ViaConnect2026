import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { runPostCAQPipeline, type CAQResponses } from '@/lib/recommendation-engine';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

/**
 * Normalize raw assessment_results phase data into the CAQResponses shape
 * the recommendation engine expects. The onboarding form saves each phase
 * with its own field names; this function maps them.
 */
function normalizePhaseData(phases: Array<{ phase: number; data: any }>): CAQResponses {
  const caq: CAQResponses = {};

  for (const { phase, data } of phases) {
    if (!data) continue;

    switch (phase) {
      case 1: {
        // Demographics
        if (data.age) caq.age = parseInt(data.age) || undefined;
        if (data.sex) caq.sex = data.sex;
        if (data.height) caq.height_cm = parseFloat(data.height) || undefined;
        if (data.weight) caq.weight_kg = parseFloat(data.weight) || undefined;
        if (data.concerns?.length) caq.primary_concerns = data.concerns;
        if (data.familyHistory?.length) caq.family_history = data.familyHistory;
        break;
      }
      case 2: {
        // Symptoms — stored as { Energy: 5, Sleep: 7, ... }
        // Engine expects lowercase keys: { energy: 5, sleep: 7 }
        const symptoms: Record<string, number> = {};
        for (const [key, val] of Object.entries(data)) {
          if (typeof val === 'number') {
            symptoms[key.toLowerCase()] = val;
          }
        }
        if (Object.keys(symptoms).length > 0) caq.symptoms = symptoms;
        break;
      }
      case 3: {
        // Lifestyle — map form field names → CAQResponses field names
        if (data.diet) caq.diet_type = data.diet.toLowerCase();
        if (data.exercise) {
          // Convert "3-4x/week" → "3-4x", "Never" → "none", "Daily" → "5+"
          const ex = data.exercise.toLowerCase();
          if (ex === 'never') caq.exercise_frequency = 'none';
          else if (ex.includes('1-2')) caq.exercise_frequency = '1-2x';
          else if (ex.includes('3-4')) caq.exercise_frequency = '3-4x';
          else if (ex.includes('5-6') || ex === 'daily') caq.exercise_frequency = '5+';
          else caq.exercise_frequency = ex;
        }
        if (data.sleepHours) caq.sleep_hours = parseFloat(data.sleepHours) || undefined;
        if (data.stressLevel) {
          // Convert "Very Low"→1, "Low"→3, "Moderate"→5, "High"→7, "Very High"→9
          const stressMap: Record<string, number> = {
            'very low': 1, 'low': 3, 'moderate': 5, 'high': 7, 'very high': 9,
          };
          caq.stress_level = stressMap[data.stressLevel.toLowerCase()] ?? 5;
        }
        if (data.alcohol) caq.alcohol_intake = data.alcohol.toLowerCase();
        if (data.smoking) caq.smoking_status = data.smoking.toLowerCase() === 'none' ? 'never' : data.smoking.toLowerCase();
        if (data.caffeine) caq.caffeine_intake = data.caffeine.toLowerCase() === 'heavy' ? 'high' : data.caffeine.toLowerCase();
        if (data.waterIntake) caq.water_intake = parseInt(data.waterIntake) || undefined;
        if (data.screenTime) caq.screen_time = parseInt(data.screenTime) || undefined;
        if (data.sunExposure) {
          const mins = parseInt(data.sunExposure) || 0;
          caq.sun_exposure = mins < 15 ? 'minimal' : mins < 60 ? 'moderate' : 'high';
        }
        break;
      }
      case 4: {
        // Medications & Supplements
        if (data.medications?.length) caq.medications = data.medications;
        if (data.supplements?.length) caq.current_supplements = data.supplements;
        if (data.allergies?.length) caq.allergies = data.allergies;
        if (data.adverseReactions) caq.adverse_reactions = [data.adverseReactions];
        break;
      }
      case 5: {
        // Goals & Preferences
        if (data.goals?.length) {
          // Convert "Increase Energy" → "energy", "Improve Sleep" → "sleep", etc.
          caq.wellness_goals = data.goals.map((g: string) => {
            const map: Record<string, string> = {
              'increase energy': 'energy', 'improve sleep': 'sleep',
              'sharpen cognition': 'cognition', 'lose weight': 'weight_loss',
              'build muscle': 'muscle', 'reduce stress': 'stress',
              'improve digestion': 'gut_health', 'boost immunity': 'immune',
              'hormonal balance': 'hormonal_balance', 'anti-aging': 'longevity',
              'detoxification': 'detox', 'cardiovascular health': 'cardiovascular',
              'joint & mobility': 'joint_health', 'skin & hair health': 'skin',
              'mood support': 'stress', 'athletic performance': 'muscle',
            };
            return map[g.toLowerCase()] || g.toLowerCase().replace(/\s+/g, '_');
          });
        }
        if (data.supplementForm) caq.preferred_form = data.supplementForm.toLowerCase();
        if (data.budgetRange !== undefined) {
          const b = parseInt(data.budgetRange) || 50;
          if (b < 50) caq.budget_range = 'under_50';
          else if (b <= 100) caq.budget_range = '50_100';
          else if (b <= 200) caq.budget_range = '100_200';
          else caq.budget_range = '200_plus';
        }
        break;
      }
      // Phase 0 = summary, skip
    }
  }

  return caq;
}

/**
 * Maps common supplement names to ViaConnect replacement SKUs.
 * Returns a list of { original, replacement_sku, replacement_name, reason }.
 */
const SUPPLEMENT_REPLACEMENT_MAP: Record<string, { sku: string; name: string; reason: string }> = {
  // Vitamin D / D3
  'vitamin d': { sku: 'FC-VDR-001', name: 'VDR+', reason: 'VDR+ provides D3 5000IU with K2 MK-7, Magnesium & Boron for 10-28x better absorption than standard Vitamin D' },
  'vitamin d3': { sku: 'FC-VDR-001', name: 'VDR+', reason: 'VDR+ optimizes Vitamin D receptor pathways with cofactors standard D3 lacks' },
  'd3': { sku: 'FC-VDR-001', name: 'VDR+', reason: 'VDR+ combines D3 with K2 MK-7 and Magnesium for complete absorption' },
  // B vitamins / methylation
  'b complex': { sku: 'FC-MTHFR-001', name: 'MTHFR+', reason: 'MTHFR+ uses methylated B-vitamins (5-MTHF, Methylcobalamin, P-5-P) for superior bioavailability over standard B-complex' },
  'b12': { sku: 'FC-MTHFR-001', name: 'MTHFR+', reason: 'MTHFR+ includes Methylcobalamin (active B12) plus methylation cofactors' },
  'folic acid': { sku: 'FC-MTHFR-001', name: 'MTHFR+', reason: 'MTHFR+ replaces synthetic folic acid with 5-MTHF Quatrefolic — critical if you have MTHFR variants' },
  'folate': { sku: 'FC-MTHFR-001', name: 'MTHFR+', reason: 'MTHFR+ provides active folate (5-MTHF) plus full methylation support' },
  'methylfolate': { sku: 'FC-MTHFR-001', name: 'MTHFR+', reason: 'MTHFR+ combines methylfolate with Methylcobalamin, P-5-P, and TMG for complete methylation' },
  // Magnesium
  'magnesium': { sku: 'FC-COMT-001', name: 'COMT+', reason: 'COMT+ uses Magnesium Threonate (crosses blood-brain barrier) plus EGCG and DIM for neurotransmitter balance' },
  'magnesium glycinate': { sku: 'FC-RELAX-001', name: 'RELAX+', reason: 'RELAX+ includes Magnesium Bisglycinate with L-Theanine, GABA & Passionflower for comprehensive relaxation' },
  'magnesium citrate': { sku: 'FC-RELAX-001', name: 'RELAX+', reason: 'RELAX+ upgrades magnesium with dual liposomal delivery and calming cofactors' },
  // Fish oil / Omega
  'fish oil': { sku: 'FC-APOE-001', name: 'APOE+', reason: 'APOE+ provides high-dose DHA with Curcumin Phytosome and Resveratrol for neuroprotection' },
  'omega 3': { sku: 'FC-APOE-001', name: 'APOE+', reason: 'APOE+ combines concentrated DHA/EPA with Lion\'s Mane and Curcumin for brain + heart support' },
  'omega-3': { sku: 'FC-APOE-001', name: 'APOE+', reason: 'APOE+ pairs omega-3s with neuroprotective botanicals for enhanced cardiovascular and cognitive benefit' },
  'dha': { sku: 'FC-APOE-001', name: 'APOE+', reason: 'APOE+ provides high-dose DHA with synergistic brain-protective compounds' },
  // CoQ10
  'coq10': { sku: 'FC-RISE-001', name: 'RISE+', reason: 'RISE+ combines CoQ10 Ubiquinol with PQQ, D-Ribose and Acetyl-L-Carnitine for complete mitochondrial energy' },
  'ubiquinol': { sku: 'FC-RISE-001', name: 'RISE+', reason: 'RISE+ includes Ubiquinol plus 4 mitochondrial cofactors standard CoQ10 lacks' },
  // Probiotics
  'probiotic': { sku: 'FC-BALANCE-001', name: 'BALANCE+', reason: 'BALANCE+ uses Spore Probiotics (survives stomach acid) with Prebiotic GOS, L-Glutamine & Zinc Carnosine' },
  'probiotics': { sku: 'FC-BALANCE-001', name: 'BALANCE+', reason: 'BALANCE+ combines spore-based probiotics with gut-healing L-Glutamine for microbiome restoration' },
  // Turmeric / Curcumin
  'turmeric': { sku: 'FC-FLEX-001', name: 'FLEX+', reason: 'FLEX+ uses Curcumin Phytosome (29x absorption vs standard turmeric) with Boswellia and UC-II Collagen' },
  'curcumin': { sku: 'FC-FLEX-001', name: 'FLEX+', reason: 'FLEX+ delivers Curcumin Phytosome with joint-specific cofactors for complete mobility support' },
  // Iron
  'iron': { sku: 'FC-IRON-001', name: 'IRON+', reason: 'IRON+ uses Iron Bisglycinate with Vitamin C and Lactoferrin — non-constipating with enhanced absorption' },
  // Ashwagandha
  'ashwagandha': { sku: 'FC-CALM-001', name: 'CALM+', reason: 'CALM+ combines KSM-66 Ashwagandha with Rhodiola, L-Theanine & Holy Basil for comprehensive stress adaptation' },
  // Creatine
  'creatine': { sku: 'FC-CREATINE-001', name: 'CREATINE HCL+', reason: 'CREATINE HCL+ is pharmaceutical-grade with better solubility and no bloating vs monohydrate' },
  'creatine monohydrate': { sku: 'FC-CREATINE-001', name: 'CREATINE HCL+', reason: 'CREATINE HCL+ absorbs faster with smaller doses and zero bloating vs monohydrate' },
  // NAC
  'nac': { sku: 'FC-CLEAN-001', name: 'CLEAN+', reason: 'CLEAN+ pairs NAC with Milk Thistle Phytosome, Calcium-D-Glucarate & Sulforaphane for Phase I/II detox' },
  'n-acetyl cysteine': { sku: 'FC-CLEAN-001', name: 'CLEAN+', reason: 'CLEAN+ enhances NAC with a complete liver detox protocol' },
  // Melatonin / Sleep
  'melatonin': { sku: 'FC-RELAX-001', name: 'RELAX+', reason: 'RELAX+ supports natural sleep with L-Theanine, GABA & Passionflower — no dependency risk like melatonin' },
  // Multivitamin
  'multivitamin': { sku: 'FC-RISE-001', name: 'RISE+', reason: 'RISE+ targets mitochondrial energy with methylated B-Complex, CoQ10, PQQ & D-Ribose — precision over generic multi' },
  'multi vitamin': { sku: 'FC-RISE-001', name: 'RISE+', reason: 'RISE+ replaces generic multivitamin with targeted mitochondrial and methylation support' },
  // Protein / Amino
  'bcaa': { sku: 'FC-AMINO-001', name: 'AMINO ACID MATRIX+', reason: 'AMINO ACID MATRIX+ provides complete EAAs with optimized BCAA ratios and HMB' },
  'amino acids': { sku: 'FC-AMINO-001', name: 'AMINO ACID MATRIX+', reason: 'AMINO ACID MATRIX+ delivers the full essential amino acid profile with HMB for recovery' },
  'eaa': { sku: 'FC-AMINO-001', name: 'AMINO ACID MATRIX+', reason: 'AMINO ACID MATRIX+ optimizes EAA ratios with added HMB and electrolytes' },
  // Pre-workout
  'pre workout': { sku: 'FC-BLAST-001', name: 'BLAST+', reason: 'BLAST+ combines Citrulline Malate, Beta-Alanine & smart caffeine (with L-Theanine) for clean energy' },
  'pre-workout': { sku: 'FC-BLAST-001', name: 'BLAST+', reason: 'BLAST+ delivers research-dosed pre-workout compounds without jitters' },
  // Digestive enzymes
  'digestive enzymes': { sku: 'FC-DIGEST-001', name: 'DigestiZorb+', reason: 'DigestiZorb+ provides comprehensive enzyme coverage including DPP-IV for gluten and Ox Bile for fats' },
  'enzymes': { sku: 'FC-DIGEST-001', name: 'DigestiZorb+', reason: 'DigestiZorb+ covers all enzyme categories (Protease, Lipase, Amylase, Lactase, DPP-IV)' },
  // Berberine
  'berberine': { sku: 'FC-SHRED-001', name: 'SHRED+', reason: 'SHRED+ pairs Berberine HCL with Green Tea EGCG, Grains of Paradise & Chromium for metabolic optimization' },
  // Lion's Mane
  'lions mane': { sku: 'FC-FOCUS-001', name: 'FOCUS+', reason: 'FOCUS+ combines Lion\'s Mane with Alpha-GPC, Bacopa & Phosphatidylserine for complete nootropic support' },
  "lion's mane": { sku: 'FC-FOCUS-001', name: 'FOCUS+', reason: 'FOCUS+ delivers Lion\'s Mane alongside 3 clinically-studied cognitive enhancers' },
  // NMN / NAD
  'nmn': { sku: 'FC-NAD-001', name: 'NAD+', reason: 'NAD+ combines NMN with Resveratrol, Quercetin & TMG for complete sirtuin activation and longevity support' },
  'nad': { sku: 'FC-NAD-001', name: 'NAD+', reason: 'NAD+ provides NMN precursor with synergistic longevity compounds' },
  'resveratrol': { sku: 'FC-NAD-001', name: 'NAD+', reason: 'NAD+ pairs Resveratrol with NMN, Quercetin & TMG for maximum sirtuin activation' },
  // Zinc
  'zinc': { sku: 'FC-DESIRE-001', name: 'DESIRE+', reason: 'DESIRE+ includes Zinc Picolinate with Tongkat Ali, Fenugreek, DIM & Boron for hormonal optimization' },
  // 5-HTP
  '5-htp': { sku: 'FC-MAOA-001', name: 'MAOA+', reason: 'MAOA+ provides micro-dosed 5-HTP with P-5-P, Magnesium & SAMe for balanced serotonin support' },
  '5 htp': { sku: 'FC-MAOA-001', name: 'MAOA+', reason: 'MAOA+ safely modulates serotonin with cofactors that prevent peripheral conversion' },
  // Milk Thistle
  'milk thistle': { sku: 'FC-CLEAN-001', name: 'CLEAN+', reason: 'CLEAN+ uses Milk Thistle Phytosome (10x absorption) with NAC and Sulforaphane for complete detox' },
};

function findSupplementReplacements(currentSupplements: string[]): Array<{
  current_supplement: string;
  replacement_sku: string;
  replacement_name: string;
  reason: string;
}> {
  const replacements: Array<{
    current_supplement: string;
    replacement_sku: string;
    replacement_name: string;
    reason: string;
  }> = [];
  const usedSkus = new Set<string>();

  for (const supp of currentSupplements) {
    const normalized = supp.toLowerCase().trim();
    // Try exact match first, then partial
    let match = SUPPLEMENT_REPLACEMENT_MAP[normalized];
    if (!match) {
      for (const [key, val] of Object.entries(SUPPLEMENT_REPLACEMENT_MAP)) {
        if (normalized.includes(key) || key.includes(normalized)) {
          match = val;
          break;
        }
      }
    }
    if (match && !usedSkus.has(match.sku)) {
      usedSkus.add(match.sku);
      replacements.push({
        current_supplement: supp,
        replacement_sku: match.sku,
        replacement_name: match.name,
        reason: match.reason,
      });
    }
  }

  return replacements;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: phases } = await supabase
      .from('assessment_results')
      .select('*')
      .eq('user_id', user.id)
      .order('phase', { ascending: true });
    if (!phases?.length) return NextResponse.json({ error: 'No assessment data found.' }, { status: 404 });

    // Normalize phase data into the shape the recommendation engine expects
    const caqResponses = normalizePhaseData(phases.map(p => ({ phase: p.phase, data: p.data })));

    const body = await request.json().catch(() => ({}));
    let result;
    try {
      result = await withTimeout(
        runPostCAQPipeline(supabase, user.id, caqResponses, body.assessment_id),
        20000,
        'api.recommendations.generate.pipeline',
      );
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.recommendations.generate', 'pipeline timeout', { userId: user.id, error: err });
        return NextResponse.json({ error: 'Recommendation generation took too long. Please try again.' }, { status: 504 });
      }
      throw err;
    }

    // Find ViaConnect replacements for user's current supplements
    const replacements = findSupplementReplacements(caqResponses.current_supplements || []);

    // Boost priority of replacement products in recommendations
    const recSkus = new Set(result.recommendations.map(r => r.sku));
    const replacementSkus = replacements.map(r => r.replacement_sku).filter(sku => !recSkus.has(sku));

    // Save replacement mapping to assessment_results phase 0 for dashboard display
    if (replacements.length > 0) {
      await supabase.from('assessment_results').upsert({
        user_id: user.id,
        phase: 0,
        data: {
          bio_optimization_score: result.bioScore,
          completed_at: new Date().toISOString(),
          current_supplements: caqResponses.current_supplements,
          supplement_replacements: replacements,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,phase' });
    }

    return NextResponse.json({
      success: true,
      bio_optimization_score: result.bioScore,
      recommendations_count: result.recommendations.length,
      recommendations: result.recommendations.map(r => ({
        product_name: r.product_name,
        sku: r.sku,
        reason: r.reason,
        confidence_score: r.confidence_score,
        dosage: r.dosage,
        time_of_day: r.time_of_day,
        monthly_price: r.monthly_price,
        priority_rank: r.priority_rank,
      })),
      supplement_replacements: replacements,
      replacement_count: replacements.length,
    });
  } catch (error: any) {
    safeLog.error('api.recommendations.generate', 'unexpected error', { error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
