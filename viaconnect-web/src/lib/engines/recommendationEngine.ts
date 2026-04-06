// FarmCeutica Product Recommendation Engine
// Generates personalized supplement recommendations from CAQ assessment data

export interface FarmCeuticaRecommendation {
  id: string;
  productName: string;
  brand: 'FarmCeutica';
  dosage: string;
  timing: string;
  deliveryMethod: string;
  price: number; // .88 convention
  reason: string;
  triggeringFactors: string[];
  priority: 'essential' | 'recommended' | 'optional';
  category: string;
  confidenceScore: number; // 0-1
}

// FarmCeutica product catalog with .88 pricing
const FARMCEUTICA_CATALOG = [
  // ═══ STRESS & ADAPTOGENIC ═══
  {
    id: 'fc-ashwagandha',
    productName: 'Liposomal Ashwagandha KSM-66®',
    dosage: '1 capsule daily',
    timing: 'Morning with food',
    deliveryMethod: 'Liposomal',
    price: 38.88,
    category: 'Adaptogenic',
    targets: ['stress', 'anxiety', 'cortisol', 'sleep', 'energy'],
    symptoms: ['stress_severity', 'anxiety_severity', 'irritability_severity'],
    goals: ['Reduce Stress', 'Improve Sleep', 'Hormonal Balance'],
    lifestyle: { stressLevel: ['High', 'Very High'] },
    reason: 'KSM-66® ashwagandha reduces cortisol by up to 30%. Liposomal delivery provides 10x bioavailability vs standard extracts.',
  },
  {
    id: 'fc-rhodiola',
    productName: 'Liposomal Rhodiola Rosea',
    dosage: '1 capsule daily',
    timing: 'Morning, empty stomach',
    deliveryMethod: 'Liposomal',
    price: 34.88,
    category: 'Adaptogenic',
    targets: ['fatigue', 'stress', 'focus', 'endurance'],
    symptoms: ['fatigue_severity', 'stress_severity', 'focus_severity'],
    goals: ['Increase Energy', 'Reduce Stress', 'Build Muscle'],
    lifestyle: { exercise: ['1-2x/week', 'Rarely'] },
    reason: 'Rhodiola rosea supports physical endurance and mental stamina. Ideal for high-stress, low-exercise lifestyles.',
  },
  // ═══ COGNITIVE & FOCUS ═══
  {
    id: 'fc-lions-mane',
    productName: "Liposomal Lion's Mane Complex",
    dosage: '2 capsules daily',
    timing: 'Morning with breakfast',
    deliveryMethod: 'Liposomal',
    price: 42.88,
    category: 'Cognitive',
    targets: ['cognition', 'focus', 'memory', 'brain_fog', 'neuroprotection'],
    symptoms: ['brain_fog_severity', 'focus_severity', 'memory_severity'],
    goals: ['Sharpen Cognition', 'Anti-Aging'],
    lifestyle: {},
    reason: "Lion's Mane stimulates NGF (nerve growth factor) production. Liposomal delivery crosses the blood-brain barrier more efficiently.",
  },
  {
    id: 'fc-omega3',
    productName: 'Liposomal Omega-3 DHA/EPA',
    dosage: '2 softgels daily',
    timing: 'Morning with food',
    deliveryMethod: 'Liposomal',
    price: 44.88,
    category: 'Cognitive',
    targets: ['cognition', 'inflammation', 'cardiovascular', 'mood'],
    symptoms: ['brain_fog_severity', 'inflammation_severity', 'cardiovascular_severity'],
    goals: ['Sharpen Cognition', 'Anti-Aging', 'Joint & Mobility'],
    lifestyle: {},
    reason: 'High-potency DHA supports neuronal membrane integrity. EPA reduces systemic inflammation. Essential for brain and heart health.',
  },
  // ═══ SLEEP & RECOVERY ═══
  {
    id: 'fc-magnesium-threonate',
    productName: 'Liposomal Magnesium L-Threonate',
    dosage: '2 capsules daily',
    timing: 'Evening, 1 hour before bed',
    deliveryMethod: 'Liposomal',
    price: 38.88,
    category: 'Sleep & Recovery',
    targets: ['sleep', 'relaxation', 'cognition', 'recovery'],
    symptoms: ['sleep_quality_severity', 'sleep_onset_severity', 'anxiety_severity'],
    goals: ['Improve Sleep', 'Sharpen Cognition', 'Reduce Stress'],
    lifestyle: {},
    reason: 'L-Threonate is the only form of magnesium proven to cross the blood-brain barrier. Supports deep sleep architecture and cognitive function.',
  },
  {
    id: 'fc-melatonin',
    productName: 'Liposomal Melatonin + L-Theanine',
    dosage: '1 capsule nightly',
    timing: '30 min before bed',
    deliveryMethod: 'Liposomal',
    price: 28.88,
    category: 'Sleep & Recovery',
    targets: ['sleep', 'sleep_onset', 'relaxation'],
    symptoms: ['sleep_onset_severity', 'sleep_quality_severity'],
    goals: ['Improve Sleep'],
    lifestyle: { caffeine: ['Heavy', 'Moderate'] },
    reason: 'Low-dose melatonin with L-theanine promotes natural sleep onset without morning grogginess. Ideal for heavy caffeine users.',
  },
  // ═══ ENERGY & PERFORMANCE ═══
  {
    id: 'fc-coq10',
    productName: 'Liposomal CoQ10 Ubiquinol',
    dosage: '1 softgel daily',
    timing: 'Morning with food',
    deliveryMethod: 'Liposomal',
    price: 48.88,
    category: 'Energy',
    targets: ['energy', 'cardiovascular', 'mitochondria', 'anti-aging'],
    symptoms: ['fatigue_severity', 'cardiovascular_severity'],
    goals: ['Increase Energy', 'Anti-Aging', 'Build Muscle'],
    lifestyle: {},
    reason: 'Ubiquinol (active CoQ10) fuels mitochondrial ATP production. Liposomal form ensures 8x higher absorption than standard CoQ10.',
  },
  {
    id: 'fc-nad',
    productName: 'Liposomal NAD+ Precursor (NMN)',
    dosage: '1 capsule daily',
    timing: 'Morning, empty stomach',
    deliveryMethod: 'Liposomal',
    price: 68.88,
    category: 'Longevity',
    targets: ['anti-aging', 'energy', 'DNA_repair', 'mitochondria'],
    symptoms: ['fatigue_severity'],
    goals: ['Anti-Aging', 'Increase Energy'],
    lifestyle: {},
    reason: 'NMN restores NAD+ levels that decline with age. Supports DNA repair, mitochondrial function, and cellular energy production.',
  },
  // ═══ GUT & DIGESTION ═══
  {
    id: 'fc-probiotics',
    productName: 'Liposomal Probiotics Complex',
    dosage: '1 capsule daily',
    timing: 'Morning, empty stomach',
    deliveryMethod: 'Liposomal',
    price: 38.88,
    category: 'Digestive',
    targets: ['digestion', 'gut', 'immune', 'inflammation'],
    symptoms: ['digestive_severity', 'immune_severity', 'inflammation_severity'],
    goals: ['Improve Digestion', 'Detoxification'],
    lifestyle: {},
    reason: 'Targeted probiotic strains survive stomach acid via liposomal protection. Supports gut-brain axis and immune function.',
  },
  {
    id: 'fc-nac',
    productName: 'Liposomal NAC (N-Acetyl Cysteine)',
    dosage: '1 capsule daily',
    timing: 'Morning with food',
    deliveryMethod: 'Liposomal',
    price: 32.88,
    category: 'Detox',
    targets: ['detox', 'liver', 'glutathione', 'immune', 'respiratory'],
    symptoms: ['respiratory_severity', 'immune_severity', 'inflammation_severity'],
    goals: ['Detoxification', 'Anti-Aging'],
    lifestyle: { alcohol: ['Moderate', 'Heavy'] },
    reason: 'NAC is the #1 glutathione precursor — your body\'s master antioxidant. Supports liver detox, respiratory health, and immune defense.',
  },
  // ═══ JOINT & INFLAMMATION ═══
  {
    id: 'fc-curcumin',
    productName: 'Liposomal Curcumin + Boswellia',
    dosage: '1 capsule daily',
    timing: 'Morning with food',
    deliveryMethod: 'Liposomal',
    price: 36.88,
    category: 'Anti-Inflammatory',
    targets: ['inflammation', 'joints', 'pain', 'recovery'],
    symptoms: ['pain_severity', 'inflammation_severity'],
    goals: ['Joint & Mobility', 'Anti-Aging'],
    lifestyle: {},
    reason: 'Curcumin + Boswellia is the most studied natural anti-inflammatory combination. Liposomal delivery solves curcumin\'s poor absorption problem.',
  },
  // ═══ HAIR, SKIN & BEAUTY ═══
  {
    id: 'fc-collagen',
    productName: 'Liposomal Collagen Peptides + Biotin',
    dosage: '1 scoop daily',
    timing: 'Morning in smoothie or water',
    deliveryMethod: 'Liposomal Powder',
    price: 44.88,
    category: 'Beauty',
    targets: ['skin', 'hair', 'nails', 'joints', 'anti-aging'],
    symptoms: ['hair_nail_severity', 'skin_severity'],
    goals: ['Skin & Hair Health', 'Anti-Aging', 'Joint & Mobility'],
    lifestyle: {},
    reason: 'Type I, II, and III collagen peptides with biotin support skin elasticity, hair strength, and joint cartilage regeneration.',
  },
  // ═══ HORMONAL ═══
  {
    id: 'fc-dim',
    productName: 'Liposomal DIM + Calcium D-Glucarate',
    dosage: '1 capsule daily',
    timing: 'Morning with food',
    deliveryMethod: 'Liposomal',
    price: 34.88,
    category: 'Hormonal',
    targets: ['hormonal', 'estrogen', 'detox', 'weight'],
    symptoms: ['hormonal_severity', 'weight_severity'],
    goals: ['Hormonal Balance', 'Lose Weight', 'Detoxification'],
    lifestyle: {},
    reason: 'DIM supports healthy estrogen metabolism. Calcium D-Glucarate aids hormonal detoxification pathways.',
  },
  // ═══ WEIGHT & METABOLISM ═══
  {
    id: 'fc-berberine',
    productName: 'Liposomal Berberine HCl',
    dosage: '1 capsule twice daily',
    timing: 'Before meals',
    deliveryMethod: 'Liposomal',
    price: 38.88,
    category: 'Metabolic',
    targets: ['metabolism', 'blood_sugar', 'weight', 'gut'],
    symptoms: ['weight_severity'],
    goals: ['Lose Weight', 'Improve Digestion'],
    lifestyle: {},
    reason: 'Berberine activates AMPK (the metabolic master switch). Clinical studies show effects comparable to metformin for blood sugar support.',
  },
] as const;

type CatalogProduct = typeof FARMCEUTICA_CATALOG[number];

interface AssessmentData {
  physical: Record<string, { score: number; description?: string }>;
  neuro: Record<string, { score: number; description?: string }>;
  emotional: Record<string, { score: number; description?: string }>;
  lifestyle: Record<string, unknown>;
  goals: string[];
  currentSupplements: string[];
}

function getSymptomScore(data: AssessmentData, symptomKey: string): number {
  const all = { ...data.physical, ...data.neuro, ...data.emotional };
  const entry = all[symptomKey];
  return entry?.score ?? 0;
}

function scoreProduct(product: CatalogProduct, data: AssessmentData): number {
  let score = 0;

  // 1. Symptom match (0-40 points)
  for (const symptom of product.symptoms) {
    const val = getSymptomScore(data, symptom);
    if (val >= 7) score += 15;
    else if (val >= 4) score += 8;
    else if (val >= 1) score += 3;
  }

  // 2. Goal match (0-36 points — 3 pts per matched goal)
  for (const goal of product.goals) {
    if (data.goals.includes(goal)) score += 3;
  }

  // 3. Lifestyle match (0-15 points)
  const ls = product.lifestyle as Record<string, string[]>;
  for (const [key, values] of Object.entries(ls)) {
    const userVal = String(data.lifestyle[key] || '');
    if (values.includes(userVal)) score += 15;
  }

  // 4. Universal baseline (everyone benefits from these)
  const universalProducts = ['fc-omega3', 'fc-coq10', 'fc-probiotics', 'fc-nac'];
  if (universalProducts.includes(product.id)) score += 5;

  // 5. Penalty if user already takes something similar
  const productNameLower = product.productName.toLowerCase();
  for (const existing of data.currentSupplements) {
    const existingLower = existing.toLowerCase();
    // Check for overlap — e.g., user takes "Organika Magnesium", don't recommend another magnesium
    const overlapKeywords = ['magnesium', 'omega', 'vitamin d', 'b complex', 'ashwagandha', 'coq10', 'melatonin', 'collagen', 'probiot'];
    for (const kw of overlapKeywords) {
      if (productNameLower.includes(kw) && existingLower.includes(kw)) {
        score -= 50; // Strong penalty to exclude
      }
    }
  }

  return score;
}

export function generateFarmCeuticaRecommendations(
  assessmentPhases: Record<number, Record<string, unknown>>,
  currentSupplementNames: string[]
): FarmCeuticaRecommendation[] {
  const physical = (assessmentPhases[7] || {}) as Record<string, { score: number; description?: string }>;
  const neuro = (assessmentPhases[8] || {}) as Record<string, { score: number; description?: string }>;
  const emotional = (assessmentPhases[9] || {}) as Record<string, { score: number; description?: string }>;
  const lifestyleData = (assessmentPhases[3] || {}) as Record<string, unknown>;
  const goals = (lifestyleData.goals as string[]) || [];

  const data: AssessmentData = {
    physical,
    neuro,
    emotional,
    lifestyle: lifestyleData,
    goals,
    currentSupplements: currentSupplementNames,
  };

  // Score every product
  const scored = FARMCEUTICA_CATALOG.map((product) => ({
    product,
    score: scoreProduct(product, data),
  }));

  // Sort by score, filter out negative (already taking)
  scored.sort((a, b) => b.score - a.score);

  // Take top recommendations (exclude products with negative scores)
  const recs = scored
    .filter((s) => s.score > 0)
    .slice(0, 8)
    .map((s, i): FarmCeuticaRecommendation => ({
      id: s.product.id,
      productName: s.product.productName,
      brand: 'FarmCeutica',
      dosage: s.product.dosage,
      timing: s.product.timing,
      deliveryMethod: s.product.deliveryMethod,
      price: s.product.price,
      reason: s.product.reason,
      triggeringFactors: [
        ...s.product.goals.filter((g) => goals.includes(g)),
        ...s.product.symptoms
          .filter((sym) => getSymptomScore(data, sym) >= 4)
          .map((sym) => sym.replace('_severity', '').replace(/_/g, ' ')),
      ],
      priority: i < 3 ? 'essential' : i < 6 ? 'recommended' : 'optional',
      category: s.product.category,
      confidenceScore: Math.min(1, s.score / 50),
    }));

  return recs;
}
