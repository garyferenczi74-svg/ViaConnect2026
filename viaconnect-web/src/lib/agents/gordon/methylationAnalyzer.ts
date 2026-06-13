// Methylation pathway variant interpreter (Prompt #62i).
// Pure rules: gene variant → dietary impact + recommendations.

export interface MethylationVariant {
  gene: string;
  variant: string;
  status: 'normal' | 'heterozygous' | 'homozygous';
  impact: string;
  dietaryAdjustments: string[];
  foodsToIncrease: string[];
  foodsToLimit: string[];
}

export interface GeneticResult {
  gene: string;
  variant?: string;
  status?: string;
  [key: string]: unknown;
}

const METHYLATION_RULES: Record<string, (status: string) => Omit<MethylationVariant, 'gene' | 'variant' | 'status'>> = {
  MTHFR: (status) => ({
    impact: status === 'homozygous'
      ? 'Significantly reduced folate conversion (up to 70% loss)'
      : 'Moderately reduced folate conversion (up to 40% loss)',
    dietaryAdjustments: [
      'Increase natural methylfolate food sources',
      'Avoid folic acid fortified foods (enriched flour, cereals)',
      'Pair folate foods with B12 sources for methylation support',
    ],
    foodsToIncrease: ['Spinach', 'Lentils', 'Asparagus', 'Avocado', 'Broccoli', 'Beets'],
    foodsToLimit: ['Folic acid fortified cereals', 'Enriched white flour products', 'Fortified bread'],
  }),

  COMT: (status) => ({
    impact: status === 'homozygous'
      ? 'Slow catecholamine breakdown; higher sensitivity to catechols and estrogen'
      : 'Moderately slow catecholamine metabolism',
    dietaryAdjustments: [
      'Limit high catechol foods (coffee, chocolate, wine)',
      'Increase magnesium rich foods to support COMT enzyme',
      'Favor calming foods: chamomile, leafy greens, complex carbs',
    ],
    foodsToIncrease: ['Pumpkin seeds', 'Almonds', 'Dark leafy greens', 'Whole grains', 'Bananas'],
    foodsToLimit: ['Coffee (limit to 1 cup)', 'Dark chocolate', 'Red wine', 'Green tea (excessive)'],
  }),

  CBS: (status) => ({
    impact: 'Upregulated sulfur metabolism; potential sulfur and ammonia sensitivity',
    dietaryAdjustments: [
      'Limit high sulfur foods if symptomatic',
      'Monitor cruciferous vegetable intake',
      'Increase molybdenum rich foods to support sulfite clearance',
    ],
    foodsToIncrease: ['Lentils (molybdenum)', 'Lima beans', 'Brown rice'],
    foodsToLimit: ['Garlic (high sulfur)', 'Onions', 'Cruciferous vegetables (raw)', 'Eggs (limit to 1/day)'],
  }),

  PEMT: () => ({
    impact: 'Reduced phosphatidylcholine synthesis; higher dietary choline requirement',
    dietaryAdjustments: [
      'Increase choline rich foods significantly',
      'Prioritize egg yolks (richest dietary choline source)',
      'Include organ meats if tolerated',
    ],
    foodsToIncrease: ['Egg yolks (2 to 3 daily)', 'Liver (1x/week)', 'Beef', 'Salmon', 'Soybeans'],
    foodsToLimit: [],
  }),

  BCMO1: () => ({
    impact: 'Cannot efficiently convert plant beta carotene to Vitamin A',
    dietaryAdjustments: [
      'Prioritize preformed Vitamin A (retinol) from animal sources',
      'Do not rely on carrots or sweet potatoes for Vitamin A needs',
    ],
    foodsToIncrease: ['Liver', 'Egg yolks', 'Butter (grass fed)', 'Cod liver oil', 'Full fat dairy'],
    foodsToLimit: [],
  }),

  VDR: () => ({
    impact: 'Reduced Vitamin D receptor efficiency; higher D requirement',
    dietaryAdjustments: [
      'Increase Vitamin D rich foods',
      'Pair D foods with fat for absorption',
      'Consider sun exposure recommendations from practitioner',
    ],
    foodsToIncrease: ['Fatty fish (salmon, mackerel)', 'Sardines', 'Egg yolks', 'Fortified dairy'],
    foodsToLimit: [],
  }),

  MAO_A: () => ({
    impact: 'Altered monoamine oxidase activity; potential tyramine sensitivity',
    dietaryAdjustments: [
      'Limit high tyramine foods if experiencing headaches or mood shifts',
    ],
    foodsToIncrease: ['Fresh meats', 'Fresh cheeses', 'Fresh fruits'],
    foodsToLimit: ['Aged cheeses', 'Cured meats', 'Fermented soy (miso, tempeh)', 'Sauerkraut'],
  }),

  DAO: () => ({
    impact: 'Reduced histamine clearance; potential histamine intolerance',
    dietaryAdjustments: [
      'Follow low histamine diet principles',
      'Eat fresh foods; avoid leftovers (histamine builds over time)',
      'Limit fermented and aged foods',
    ],
    foodsToIncrease: ['Fresh meat and fish', 'Fresh fruits (except citrus, strawberry)', 'Rice', 'Quinoa'],
    foodsToLimit: ['Aged cheese', 'Wine and beer', 'Canned fish', 'Fermented foods', 'Leftovers > 24hr'],
  }),
};

export function analyzeMethylation(geneticResults: GeneticResult[]): MethylationVariant[] {
  const variants: MethylationVariant[] = [];

  for (const result of geneticResults) {
    const gene = result.gene?.toUpperCase().replace('-', '_');
    const status = (result.status ?? 'normal').toLowerCase();
    if (!gene || status === 'normal') continue;

    const ruleFn = METHYLATION_RULES[gene];
    if (!ruleFn) continue;

    variants.push({
      gene: result.gene,
      variant: result.variant ?? '',
      status: status as MethylationVariant['status'],
      ...ruleFn(status),
    });
  }

  return variants;
}
