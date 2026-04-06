/**
 * Ultrathink Context Builder
 * Accepts a Supabase client as parameter — works in both server and client contexts.
 */

export interface SymptomEntry { score: number; description?: string; }

export interface UltrathinkContext {
  userId: string;
  confidenceTier: 1 | 2 | 3;
  confidencePct: number;
  dataSourcesUsed: string[];
  dataCompleteness: number;
  demographics: { age: number | null; sex: string | null; height_cm: number | null; weight_kg: number | null; bmi: number | null; bodyType: string | null; };
  healthConcerns: string[];
  familyHistory: string[];
  physicalSymptoms: Record<string, SymptomEntry>;
  neuroSymptoms: Record<string, SymptomEntry>;
  emotionalSymptoms: Record<string, SymptomEntry>;
  physicalSymptomAvg: number;
  neuroSymptomAvg: number;
  emotionalSymptomAvg: number;
  topSymptoms: { name: string; score: number; category: string }[];
  lifestyle: Record<string, string | null>;
  goals: string[];
  medications: string[];
  currentSupplements: { name: string; brand: string; dosage: string; frequency: string; deliveryMethod: string }[];
  allergies: string[];
  bioScore: number | null;
  bioTier: string | null;
  bioStrengths: string[];
  bioOpportunities: string[];
  bioBreakdown: Record<string, number> | null;
}

// Accept any Supabase client — server or browser
export async function buildUltrathinkContext(userId: string, supabase: any): Promise<UltrathinkContext> {
  const [phasesRes, profileRes, suppsRes, bioRes] = await Promise.allSettled([
    supabase.from('assessment_results').select('phase, data').eq('user_id', userId),
    supabase.from('profiles').select('bio_optimization_score, bio_optimization_tier, bio_optimization_strengths, bio_optimization_opportunities').eq('id', userId).single(),
    supabase.from('user_current_supplements').select('supplement_name, brand, product_name, dosage, dosage_form, frequency').eq('user_id', userId).eq('is_current', true),
    supabase.from('bio_optimization_history').select('score, breakdown').eq('user_id', userId).order('date', { ascending: false }).limit(1).single(),
  ]);

  const phases = phasesRes.status === 'fulfilled' ? (phasesRes.value.data || []) : [];
  const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
  const supps = suppsRes.status === 'fulfilled' ? (suppsRes.value.data || []) : [];
  const bioHistory = bioRes.status === 'fulfilled' ? bioRes.value.data : null;

  const getPhase = (p: number): Record<string, unknown> => (phases.find((a: any) => a.phase === p)?.data || {}) as Record<string, unknown>;

  const demo = getPhase(1);
  const concerns = getPhase(6);
  const physical = getPhase(7);
  const neuro = getPhase(8);
  const emotional = getPhase(9);
  const lifestyle = getPhase(3);
  const medsPhase = getPhase(4);

  const parseSymptoms = (data: Record<string, unknown>): Record<string, SymptomEntry> => {
    const result: Record<string, SymptomEntry> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && 'score' in (val as any)) {
        const entry = val as { score: number; description?: string };
        result[key.replace('_severity', '')] = { score: entry.score, description: entry.description };
      }
    }
    return result;
  };

  const physicalSymptoms = parseSymptoms(physical);
  const neuroSymptoms = parseSymptoms(neuro);
  const emotionalSymptoms = parseSymptoms(emotional);

  const avgSymptoms = (syms: Record<string, SymptomEntry>): number => {
    const vals = Object.values(syms).map(s => s.score);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const topSymptoms: { name: string; score: number; category: string }[] = [];
  for (const [name, entry] of Object.entries(physicalSymptoms)) if (entry.score >= 4) topSymptoms.push({ name, score: entry.score, category: 'physical' });
  for (const [name, entry] of Object.entries(neuroSymptoms)) if (entry.score >= 4) topSymptoms.push({ name, score: entry.score, category: 'neuro' });
  for (const [name, entry] of Object.entries(emotionalSymptoms)) if (entry.score >= 4) topSymptoms.push({ name, score: entry.score, category: 'emotional' });
  topSymptoms.sort((a, b) => b.score - a.score);

  const heightCm = demo.height ? parseFloat(String(demo.height)) : null;
  const weightKg = demo.weight ? parseFloat(String(demo.weight)) : null;
  const bmi = heightCm && weightKg && heightCm > 0 ? parseFloat((weightKg / ((heightCm / 100) ** 2)).toFixed(1)) : null;

  const dataSourcesUsed: string[] = [];
  if (phases.length > 0) dataSourcesUsed.push('caq');
  if (supps.length > 0) dataSourcesUsed.push('supplements');
  if (profile?.bio_optimization_score) dataSourcesUsed.push('biomarkers');

  const bioScore = profile?.bio_optimization_score ? parseFloat(String(profile.bio_optimization_score)) : null;

  return {
    userId, confidenceTier: 1, confidencePct: 72, dataSourcesUsed,
    dataCompleteness: dataSourcesUsed.length / 7,
    demographics: { age: demo.age ? parseInt(String(demo.age)) : null, sex: demo.sex ? String(demo.sex) : null, height_cm: heightCm, weight_kg: weightKg, bmi, bodyType: demo.bodyType ? String(demo.bodyType) : null },
    healthConcerns: ((concerns.healthConcerns as string[]) || []).filter(c => c !== 'none_of_the_above'),
    familyHistory: ((concerns.familyHistory as any[]) || []).filter(f => f.condition !== 'none_known').map(f => typeof f === 'string' ? f : f.condition || ''),
    physicalSymptoms, neuroSymptoms, emotionalSymptoms,
    physicalSymptomAvg: avgSymptoms(physicalSymptoms),
    neuroSymptomAvg: avgSymptoms(neuroSymptoms),
    emotionalSymptomAvg: avgSymptoms(emotionalSymptoms),
    topSymptoms: topSymptoms.slice(0, 10),
    lifestyle: { diet: ls(lifestyle.diet), exercise: ls(lifestyle.exercise), sleepHours: ls(lifestyle.sleepHours), stressLevel: ls(lifestyle.stressLevel), alcohol: ls(lifestyle.alcohol), smoking: ls(lifestyle.smoking), caffeine: ls(lifestyle.caffeine), waterIntake: ls(lifestyle.waterIntake), screenTime: ls(lifestyle.screenTime), sunExposure: ls(lifestyle.sunExposure) },
    goals: (lifestyle.goals as string[]) || [],
    medications: ((medsPhase.medications as string[]) || []).filter(m => m !== 'None'),
    currentSupplements: supps.map((s: any) => ({ name: s.product_name || s.supplement_name || '', brand: s.brand || '', dosage: s.dosage || '', frequency: s.frequency || 'daily', deliveryMethod: s.dosage_form || 'standard' })),
    allergies: ((medsPhase.allergies as string[]) || []).filter(a => a !== 'None'),
    bioScore, bioTier: profile?.bio_optimization_tier || null,
    bioStrengths: (profile?.bio_optimization_strengths as string[]) || [],
    bioOpportunities: (profile?.bio_optimization_opportunities as string[]) || [],
    bioBreakdown: bioHistory?.breakdown as Record<string, number> | null,
  };
}

function ls(v: unknown): string | null { return v ? String(v) : null; }
