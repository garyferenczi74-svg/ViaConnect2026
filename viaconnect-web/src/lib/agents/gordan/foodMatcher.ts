// Food matcher: genes + labs → food recommendations and avoidances (Prompt #62i).

import type { FoodRecommendation, FoodAvoidance } from './generateNutritionalGuide';
import type { MethylationVariant } from './methylationAnalyzer';

interface AllergyEntry {
  allergen: string;
  type: 'IgE' | 'IgG' | 'self_reported';
}

interface FoodRule {
  food: string;
  category: string;
  frequency: string;
  servingSize: string;
  nutrients: string[];
  requiredGenes?: string[];
  priority: FoodRecommendation['priority'];
  reason: (genes: Set<string>) => string;
}

const PRIORITY_RULES: FoodRule[] = [
  {
    food: 'Wild caught salmon',
    category: 'Protein',
    frequency: '3 to 4x per week',
    servingSize: '4 to 6 oz',
    nutrients: ['Omega 3 DHA/EPA', 'Vitamin D', 'Selenium', 'B12'],
    priority: 'essential',
    reason: (genes) => genes.has('VDR')
      ? 'Your VDR variant means you need more Vitamin D; salmon is one of the richest food sources'
      : 'Omega 3 rich fish supports cardiovascular and brain health',
  },
  {
    food: 'Dark leafy greens (spinach, kale, Swiss chard)',
    category: 'Vegetable',
    frequency: 'Daily, 2+ servings',
    servingSize: '2 cups raw or 1 cup cooked',
    nutrients: ['Methylfolate', 'Magnesium', 'Iron', 'Vitamin K'],
    requiredGenes: ['MTHFR'],
    priority: 'essential',
    reason: () => 'Your MTHFR variant needs natural folate sources; leafy greens are the best',
  },
  {
    food: 'Pastured eggs (whole, with yolk)',
    category: 'Protein',
    frequency: 'Daily, 2 to 3 eggs',
    servingSize: '2 to 3 large eggs',
    nutrients: ['Choline', 'Preformed Vitamin A', 'B12', 'Selenium'],
    priority: 'essential',
    reason: (genes) => {
      const reasons: string[] = [];
      if (genes.has('PEMT')) reasons.push('Your PEMT variant reduces choline synthesis; eggs are the richest dietary source');
      if (genes.has('BCMO1')) reasons.push('Your BCMO1 variant means you need preformed Vitamin A from yolks, not beta carotene');
      return reasons.length > 0 ? reasons.join('. ') : 'Excellent source of complete protein, choline, and fat soluble vitamins';
    },
  },
  {
    food: 'Avocado',
    category: 'Fat',
    frequency: 'Daily',
    servingSize: '1/2 to 1 medium',
    nutrients: ['Potassium', 'Fiber', 'Folate', 'Monounsaturated fat'],
    priority: 'recommended',
    reason: () => 'Rich in potassium and natural folate; supports healthy fat intake and nutrient absorption',
  },
  {
    food: 'Grass fed beef',
    category: 'Protein',
    frequency: '2 to 3x per week',
    servingSize: '4 to 6 oz',
    nutrients: ['Heme iron', 'B12', 'Zinc', 'Creatine'],
    priority: 'recommended',
    reason: () => 'Heme iron is 2 to 3x more bioavailable than plant iron; excellent B12 and zinc source',
  },
  {
    food: 'Berries (blueberries, strawberries, raspberries)',
    category: 'Fruit',
    frequency: 'Daily',
    servingSize: '1 cup',
    nutrients: ['Vitamin C', 'Anthocyanins', 'Fiber'],
    priority: 'beneficial',
    reason: () => 'Antioxidant rich with low glycemic impact; Vitamin C enhances iron absorption',
  },
  {
    food: 'Brazil nuts',
    category: 'Fat',
    frequency: '3 to 4x per week',
    servingSize: '2 to 3 nuts',
    nutrients: ['Selenium'],
    priority: 'beneficial',
    reason: () => 'Just 2 Brazil nuts provide 100% daily selenium; supports thyroid and immune function',
  },
];

interface AvoidRule {
  food: string;
  category: string;
  severity: FoodAvoidance['severity'];
  triggerGenes?: string[];
  alternatives: string[];
  reason: string;
  geneticBasis?: string;
}

const AVOID_RULES: AvoidRule[] = [
  { food: 'Folic acid fortified foods (enriched flour, cereals)', category: 'Grain', severity: 'avoid', triggerGenes: ['MTHFR'], alternatives: ['Sourdough bread', 'Organic non fortified grains', 'Almond flour'], reason: 'Your MTHFR variant cannot efficiently convert synthetic folic acid; unmetabolized folic acid may block folate receptors', geneticBasis: 'MTHFR C677T' },
  { food: 'Aged cheeses and fermented foods', category: 'Dairy', severity: 'limit', triggerGenes: ['DAO', 'MAO_A'], alternatives: ['Fresh cheeses (mozzarella, ricotta)', 'Fresh meats', 'Fresh vegetables'], reason: 'Your DAO variant shows reduced histamine clearance; high histamine foods may trigger symptoms', geneticBasis: 'DAO/AOC1' },
  { food: 'High caffeine beverages (more than 200mg per day)', category: 'Beverage', severity: 'limit', triggerGenes: ['COMT'], alternatives: ['Green tea (lower caffeine + L theanine)', 'Decaf coffee', 'Herbal teas'], reason: 'Your slow COMT means caffeine stays in your system longer; may increase anxiety and disrupt sleep', geneticBasis: 'COMT Val158Met' },
  { food: 'High sulfur foods (raw cruciferous, garlic, onions)', category: 'Vegetable', severity: 'limit', triggerGenes: ['CBS'], alternatives: ['Cooked cruciferous (reduces sulfur content)', 'Lettuces', 'Zucchini', 'Cucumbers'], reason: 'Your CBS upregulation accelerates sulfur metabolism; excess sulfur may cause GI discomfort', geneticBasis: 'CBS C699T' },
];

export function matchPriorityFoods(
  activeGenes: Set<string>,
  allergies: AllergyEntry[],
): FoodRecommendation[] {
  const allergenLower = new Set(allergies.map((a) => a.allergen.toLowerCase()));

  return PRIORITY_RULES
    .filter((rule) => {
      if (rule.requiredGenes && !rule.requiredGenes.some((g) => activeGenes.has(g))) return false;
      const foodLower = rule.food.toLowerCase();
      for (const allergen of allergenLower) {
        if (foodLower.includes(allergen)) return false;
      }
      return true;
    })
    .map((rule, i) => ({
      id: `pf_${i}`,
      food: rule.food,
      category: rule.category,
      frequency: rule.frequency,
      servingSize: rule.servingSize,
      geneticReason: rule.reason(activeGenes),
      nutrientsProvided: rule.nutrients,
      priority: rule.priority,
    }));
}

export function matchAvoidFoods(
  activeGenes: Set<string>,
  allergies: AllergyEntry[],
): FoodAvoidance[] {
  const results: FoodAvoidance[] = [];

  for (const [i, rule] of AVOID_RULES.entries()) {
    if (rule.triggerGenes && !rule.triggerGenes.some((g) => activeGenes.has(g))) continue;
    results.push({
      id: `af_${i}`,
      food: rule.food,
      category: rule.category,
      severity: rule.severity,
      reason: rule.reason,
      geneticBasis: rule.geneticBasis,
      alternatives: rule.alternatives,
    });
  }

  for (const [i, allergy] of allergies.entries()) {
    if (allergy.type === 'IgE') {
      results.push({
        id: `al_${i}`,
        food: allergy.allergen,
        category: 'Allergen',
        severity: 'avoid',
        reason: `Confirmed ${allergy.type} allergy; absolute exclusion`,
        allergyBasis: `${allergy.type} allergy panel`,
        alternatives: [],
      });
    }
  }

  return results;
}
