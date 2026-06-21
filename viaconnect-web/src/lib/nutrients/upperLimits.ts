/**
 * Nutrient Tolerable Upper Intake Levels (ULs) - adult values.
 * Source: IOM Dietary Reference Intakes / NIH Office of Dietary Supplements.
 * These are published IOM/NIH figures - do NOT modify without a clinical review.
 */

export interface NutrientUL {
  ul: number;
  unit: string;
  basis: string;
  source: string;
}

export interface NutrientAmount {
  nutrient: string;
  /** Amount in the same unit as the nutrient's UL entry. Caller normalizes units before calling. */
  amount: number;
}

export interface ULCheck {
  nutrient: string;
  total: number;
  ul: number;
  unit: string;
  exceeds: boolean;
}

/**
 * Adult Tolerable Upper Intake Levels.
 * Keys are lowercase canonical nutrient names.
 * All values verbatim from IOM DRI / NIH ODS.
 */
export const NUTRIENT_UPPER_LIMITS: Record<string, NutrientUL> = {
  vitamin_a_preformed: {
    ul: 3000,
    unit: 'mcg',
    basis: 'preformed retinol',
    source: 'IOM DRI / NIH ODS',
  },
  vitamin_d: {
    ul: 100,
    unit: 'mcg',
    // 100 mcg = 4000 IU
    basis: 'total intake',
    source: 'IOM DRI / NIH ODS',
  },
  vitamin_e: {
    ul: 1000,
    unit: 'mg',
    basis: 'supplemental alpha-tocopherol',
    source: 'IOM DRI / NIH ODS',
  },
  vitamin_c: {
    ul: 2000,
    unit: 'mg',
    basis: '',
    source: 'IOM DRI / NIH ODS',
  },
  vitamin_b6: {
    ul: 100,
    unit: 'mg',
    basis: '',
    source: 'IOM DRI / NIH ODS',
  },
  folic_acid: {
    ul: 1000,
    unit: 'mcg',
    basis: 'synthetic folic acid from supplements and fortified food',
    source: 'IOM DRI / NIH ODS',
  },
  niacin: {
    ul: 35,
    unit: 'mg',
    basis: 'nicotinic acid',
    source: 'IOM DRI / NIH ODS',
  },
  choline: {
    ul: 3500,
    unit: 'mg',
    basis: '',
    source: 'IOM DRI / NIH ODS',
  },
  calcium: {
    ul: 2500,
    unit: 'mg',
    basis: '',
    source: 'IOM DRI / NIH ODS',
  },
  iron: {
    ul: 45,
    unit: 'mg',
    basis: '',
    source: 'IOM DRI / NIH ODS',
  },
  zinc: {
    ul: 40,
    unit: 'mg',
    basis: '',
    source: 'IOM DRI / NIH ODS',
  },
  copper: {
    ul: 10000,
    unit: 'mcg',
    basis: '',
    source: 'IOM DRI / NIH ODS',
  },
  selenium: {
    ul: 400,
    unit: 'mcg',
    basis: '',
    source: 'IOM DRI / NIH ODS',
  },
  iodine: {
    ul: 1100,
    unit: 'mcg',
    basis: '',
    source: 'IOM DRI / NIH ODS',
  },
  magnesium_supplemental: {
    ul: 350,
    unit: 'mg',
    basis: 'supplemental only, excludes food/water',
    source: 'IOM DRI / NIH ODS',
  },
  manganese: {
    ul: 11,
    unit: 'mg',
    basis: '',
    source: 'IOM DRI / NIH ODS',
  },
};

/**
 * Sum nutrient amounts across the current stack and the proposed additions,
 * then check each nutrient that has a UL entry against its limit.
 *
 * Nutrients with no UL entry are omitted from the result (no ceiling to check).
 * Caller is responsible for unit normalization before calling this function.
 */
export function sumAgainstUL(
  currentStack: NutrientAmount[],
  proposed: NutrientAmount[],
): ULCheck[] {
  // Aggregate totals by nutrient key across both lists
  const totals = new Map<string, number>();

  for (const item of [...currentStack, ...proposed]) {
    totals.set(item.nutrient, (totals.get(item.nutrient) ?? 0) + item.amount);
  }

  const results: ULCheck[] = [];

  for (const [nutrient, total] of totals.entries()) {
    const ulEntry = NUTRIENT_UPPER_LIMITS[nutrient];
    if (ulEntry === undefined) {
      // No UL defined for this nutrient - omit from result
      continue;
    }
    results.push({
      nutrient,
      total,
      ul: ulEntry.ul,
      unit: ulEntry.unit,
      exceeds: total > ulEntry.ul,
    });
  }

  return results;
}
