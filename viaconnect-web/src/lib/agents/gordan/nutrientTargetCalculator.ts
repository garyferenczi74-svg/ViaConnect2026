// Genetically adjusted nutrient target calculator (Prompt #62i).
// Adjusts standard RDAs based on gene variants and lab results.

import type { NutrientTarget } from './generateNutritionalGuide';
import type { MethylationVariant } from './methylationAnalyzer';

interface LabMarker {
  name: string;
  value: number;
  unit: string;
  referenceRange: [number, number];
}

interface BaseTarget {
  nutrient: string;
  rda: number;
  unit: string;
  topSources: string[];
}

const BASE_TARGETS: BaseTarget[] = [
  { nutrient: 'Methylfolate', rda: 400, unit: 'mcg', topSources: ['Spinach (262 mcg/cup cooked)', 'Lentils (358 mcg/cup)', 'Asparagus (268 mcg/cup)'] },
  { nutrient: 'Vitamin B12', rda: 2.4, unit: 'mcg', topSources: ['Clams (84 mcg/3oz)', 'Beef liver (70 mcg/3oz)', 'Salmon (4.8 mcg/3oz)'] },
  { nutrient: 'Choline', rda: 450, unit: 'mg', topSources: ['Egg yolks (147 mg/yolk)', 'Beef liver (356 mg/3oz)', 'Salmon (75 mg/3oz)'] },
  { nutrient: 'Vitamin D', rda: 600, unit: 'IU', topSources: ['Salmon (570 IU/3oz)', 'Sardines (164 IU/can)', 'Egg yolks (41 IU/yolk)'] },
  { nutrient: 'Magnesium', rda: 400, unit: 'mg', topSources: ['Pumpkin seeds (168 mg/oz)', 'Spinach (157 mg/cup)', 'Dark chocolate (65 mg/oz)'] },
  { nutrient: 'Iron', rda: 18, unit: 'mg', topSources: ['Beef liver (5 mg/3oz)', 'Lentils (3.3 mg/cup)', 'Spinach (6.4 mg/cup cooked)'] },
  { nutrient: 'Omega 3 (DHA+EPA)', rda: 500, unit: 'mg', topSources: ['Salmon (1,200 mg/3oz)', 'Sardines (900 mg/can)', 'Mackerel (1,000 mg/3oz)'] },
  { nutrient: 'Zinc', rda: 11, unit: 'mg', topSources: ['Oysters (74 mg/3oz)', 'Beef (7 mg/3oz)', 'Pumpkin seeds (2.2 mg/oz)'] },
  { nutrient: 'Vitamin A (preformed)', rda: 900, unit: 'mcg RAE', topSources: ['Beef liver (6,582 mcg/3oz)', 'Egg yolks (75 mcg/yolk)', 'Butter (97 mcg/tbsp)'] },
  { nutrient: 'Selenium', rda: 55, unit: 'mcg', topSources: ['Brazil nuts (544 mcg/oz)', 'Tuna (92 mcg/3oz)', 'Eggs (20 mcg/egg)'] },
];

const GENE_ADJUSTMENTS: Record<string, { nutrient: string; multiplier: number; reason: string }[]> = {
  MTHFR: [{ nutrient: 'Methylfolate', multiplier: 2.0, reason: 'MTHFR variant reduces folate conversion by 30 to 70%; requires 2x standard RDA' }],
  PEMT: [{ nutrient: 'Choline', multiplier: 1.3, reason: 'PEMT variant reduces choline synthesis; dietary choline becomes critical' }],
  VDR: [{ nutrient: 'Vitamin D', multiplier: 1.5, reason: 'VDR variant reduces receptor efficiency; higher intake needed for same effect' }],
  BCMO1: [{ nutrient: 'Vitamin A (preformed)', multiplier: 1.5, reason: 'BCMO1 variant impairs beta carotene conversion; must rely on preformed sources' }],
  COMT: [{ nutrient: 'Magnesium', multiplier: 1.3, reason: 'Slow COMT benefits from extra magnesium to support enzyme function' }],
};

export function calculateNutrientTargets(
  methylationVariants: MethylationVariant[],
  labs: LabMarker[],
  supplementCoverage: Record<string, number>,
): NutrientTarget[] {
  const activeGenes = new Set(methylationVariants.map((v) => v.gene.toUpperCase().replace('-', '_')));

  return BASE_TARGETS.map((base) => {
    let multiplier = 1.0;
    let adjustmentReason = 'Standard RDA; no genetic adjustments';
    let geneticAdjustment = 'Standard';

    for (const [gene, adjustments] of Object.entries(GENE_ADJUSTMENTS)) {
      if (!activeGenes.has(gene)) continue;
      for (const adj of adjustments) {
        if (adj.nutrient === base.nutrient && adj.multiplier > multiplier) {
          multiplier = adj.multiplier;
          adjustmentReason = adj.reason;
          geneticAdjustment = `${adj.multiplier}x standard RDA`;
        }
      }
    }

    const labMarker = labs.find((l) => l.name.toLowerCase().includes(base.nutrient.toLowerCase()));
    if (labMarker && labMarker.value < labMarker.referenceRange[0]) {
      multiplier = Math.max(multiplier, 1.5);
      adjustmentReason += `. Lab results show ${labMarker.name} is below reference range`;
      geneticAdjustment = `${multiplier}x (lab adjusted)`;
    }

    const dailyTarget = Math.round(base.rda * multiplier);
    const suppPct = supplementCoverage[base.nutrient] ?? 0;
    const dietGap = Math.max(0, 100 - suppPct);

    return {
      nutrient: base.nutrient,
      dailyTarget,
      unit: base.unit,
      standardRDA: base.rda,
      geneticAdjustment,
      adjustmentReason,
      topFoodSources: base.topSources,
      supplementCoverage: suppPct,
      dietGap,
    };
  });
}
