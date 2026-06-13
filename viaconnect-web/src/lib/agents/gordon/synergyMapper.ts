// Supplement to diet synergy mapper (Prompt #62i).
// Maps each active supplement to foods that enhance or conflict.

import type { SupplementDietSynergy } from './generateNutritionalGuide';

interface ActiveSupplement {
  name: string;
  category?: string;
}

interface SynergyRule {
  matchKeywords: string[];
  bestPairedWith: string[];
  avoidPairingWith: string[];
  optimalTiming: string;
  reason: string;
}

const SYNERGY_RULES: SynergyRule[] = [
  {
    matchKeywords: ['iron'],
    bestPairedWith: ['Vitamin C rich foods (bell peppers, citrus, strawberries)', 'Lean red meat (heme iron enhances non heme)'],
    avoidPairingWith: ['Dairy products (calcium competes)', 'Coffee or tea (tannins block absorption)', 'High fiber cereals (phytates bind iron)'],
    optimalTiming: 'Mid morning, 2 hours after breakfast dairy or coffee',
    reason: 'Iron absorption is highly sensitive to food pairing; Vitamin C can increase absorption by 3 to 6x',
  },
  {
    matchKeywords: ['omega', 'fish oil', 'dha', 'epa'],
    bestPairedWith: ['Any fat containing meal (enhances absorption)', 'Fatty fish (complementary omega 3s)'],
    avoidPairingWith: ['Empty stomach (may cause GI discomfort)'],
    optimalTiming: 'With your largest meal containing healthy fats',
    reason: 'Fat soluble omega 3 supplements absorb 3x better with a fat containing meal',
  },
  {
    matchKeywords: ['vitamin d', 'd3', 'k2'],
    bestPairedWith: ['Fat containing meal (D is fat soluble)', 'Eggs or avocado at breakfast'],
    avoidPairingWith: ['Low fat meals (poor absorption)'],
    optimalTiming: 'With breakfast or lunch (morning D may support circadian rhythm)',
    reason: 'Vitamin D is fat soluble; taking with dietary fat increases absorption by up to 50%',
  },
  {
    matchKeywords: ['magnesium'],
    bestPairedWith: ['Dinner or evening meal', 'Leafy greens (complementary magnesium)'],
    avoidPairingWith: ['High dose calcium supplements at same time (competition)'],
    optimalTiming: 'Evening, 1 to 2 hours before bed',
    reason: 'Evening magnesium supports sleep quality and muscle relaxation',
  },
  {
    matchKeywords: ['b complex', 'methyl b', 'b12', 'folate', 'methylfolate'],
    bestPairedWith: ['Morning meal with protein', 'Leafy greens (natural folate synergy)'],
    avoidPairingWith: ['Alcohol (impairs B vitamin absorption)', 'Empty stomach (may cause nausea)'],
    optimalTiming: 'With breakfast',
    reason: 'B vitamins support energy metabolism; morning dosing aligns with natural cortisol rhythm',
  },
  {
    matchKeywords: ['probiotic'],
    bestPairedWith: ['Light meal or snack', 'Prebiotic fiber foods (onion, garlic, asparagus)'],
    avoidPairingWith: ['Hot beverages (heat can damage cultures)', 'Antibiotics (separate by 2 hours)'],
    optimalTiming: 'With breakfast or on an empty stomach (strain dependent)',
    reason: 'Food provides a buffer that helps probiotic cultures survive stomach acid',
  },
  {
    matchKeywords: ['zinc'],
    bestPairedWith: ['Protein rich meal (amino acids enhance zinc absorption)', 'Red meat or shellfish'],
    avoidPairingWith: ['High phytate foods (whole grains, legumes) at same meal', 'Iron supplements (compete for absorption)'],
    optimalTiming: 'With lunch or dinner, separate from iron by 2 hours',
    reason: 'Zinc and iron compete for the same absorption pathway; separating them improves uptake of both',
  },
];

export function mapSupplementSynergies(
  supplements: ActiveSupplement[],
): SupplementDietSynergy[] {
  const synergies: SupplementDietSynergy[] = [];

  for (const supp of supplements) {
    const nameLower = (supp.name ?? '').toLowerCase();
    for (const rule of SYNERGY_RULES) {
      if (rule.matchKeywords.some((kw) => nameLower.includes(kw))) {
        synergies.push({
          supplement: supp.name,
          bestPairedWith: rule.bestPairedWith,
          avoidPairingWith: rule.avoidPairingWith,
          optimalTiming: rule.optimalTiming,
          geneticReason: rule.reason,
        });
        break;
      }
    }
  }

  return synergies;
}
