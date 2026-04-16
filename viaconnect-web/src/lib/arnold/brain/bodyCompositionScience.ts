// Arnold Brain — Domain 1: Body Composition Science
// Clinical classification, distribution patterns, realistic change rates.
// Sources: ACSM 11th Ed, ACE PT Manual 6th Ed, peer-reviewed meta-analyses.

export type BiologicalSex = 'male' | 'female';

export interface FatClass {
  min: number;
  max: number;
  label: string;
  risk: string;
}

export const FAT_CLASSIFICATION: Record<BiologicalSex, Record<string, FatClass>> = {
  male: {
    essential:  { min: 2,  max: 5,   label: 'Essential Fat', risk: 'Dangerously low' },
    athletic:   { min: 6,  max: 13,  label: 'Athletic',      risk: 'None' },
    fitness:    { min: 14, max: 17,  label: 'Fitness',       risk: 'None' },
    acceptable: { min: 18, max: 24,  label: 'Acceptable',    risk: 'Low' },
    obese:      { min: 25, max: 100, label: 'Obese',         risk: 'Elevated' },
  },
  female: {
    essential:  { min: 10, max: 13,  label: 'Essential Fat', risk: 'Dangerously low' },
    athletic:   { min: 14, max: 20,  label: 'Athletic',      risk: 'None' },
    fitness:    { min: 21, max: 24,  label: 'Fitness',       risk: 'None' },
    acceptable: { min: 25, max: 31,  label: 'Acceptable',    risk: 'Low' },
    obese:      { min: 32, max: 100, label: 'Obese',         risk: 'Elevated' },
  },
};

export function classifyBodyFat(sex: BiologicalSex, bodyFatPct: number): FatClass {
  const table = FAT_CLASSIFICATION[sex];
  for (const key of ['essential','athletic','fitness','acceptable','obese'] as const) {
    const c = table[key];
    if (bodyFatPct >= c.min && bodyFatPct <= c.max) return c;
  }
  return table.obese;
}

export const FAT_DISTRIBUTION = {
  android: {
    description: 'Central / abdominal fat accumulation, apple shape',
    healthRisk:  'Higher cardiovascular and metabolic disease risk',
    visualMarkers: ['Prominent midsection', 'Wider waist than hips', 'Fat concentrated above the waist'],
    improvedBy: ['Cardiovascular exercise', 'Caloric deficit', 'Stress and cortisol management'],
  },
  gynoid: {
    description: 'Peripheral fat accumulation on hips, thighs, buttocks, pear shape',
    healthRisk:  'Lower cardiovascular risk than android, but harder to mobilize',
    visualMarkers: ['Wider hips than waist', 'Fat concentrated below the waist', 'Thigh and glute prominence'],
    improvedBy: ['Resistance training', 'Sustained caloric deficit', 'Hormonal optimization'],
  },
  mixed: {
    description: 'Relatively even distribution across trunk and extremities',
    healthRisk:  'Moderate, depends on total adiposity',
    visualMarkers: ['Proportional fat across body regions'],
    improvedBy: ['Balanced training and nutrition'],
  },
} as const;

export type FatDistributionPattern = keyof typeof FAT_DISTRIBUTION;

export const CHANGE_RATES = {
  fatLoss: {
    safe_max_per_week_lbs: 2.0,
    optimal_per_week_lbs:  1.0,
    aggressive_per_week_lbs: 1.5,
    minimum_body_fat_male: 5,
    minimum_body_fat_female: 12,
    note: 'Rate slows as body fat decreases. Last 5 percent takes 2 to 3x longer than first 5 percent.',
  },
  muscleGain: {
    beginner_per_month_lbs:     { male: 2.0, female: 1.0 },
    intermediate_per_month_lbs: { male: 1.0, female: 0.5 },
    advanced_per_month_lbs:     { male: 0.5, female: 0.25 },
    note: 'Muscle gain slows dramatically with training age. Newbie gains last 6 to 12 months.',
  },
  recomposition: {
    description: 'Simultaneous fat loss and muscle gain',
    feasibleFor: ['Beginners', 'Returning trainees', 'Overweight individuals', 'Those new to resistance training'],
    infeasibleFor: ['Advanced lean athletes, must choose bulk or cut'],
    typicalDuration: '3 to 6 months before diminishing returns',
  },
} as const;

export const PHYSIOLOGICAL_FACTORS = {
  cortisol:   'Chronic elevation promotes visceral fat storage, particularly abdominal',
  sleep:      'Poor sleep under 6 hours increases ghrelin, decreases leptin, impairs fat loss by 55 percent (Nedeltcheva 2010)',
  hydration:  'Dehydration can make body fat appear lower on scales but causes muscle flatness visually',
  menstrualCycle: 'Females retain 2 to 8 lbs water during luteal phase, masking fat loss on scale',
  creatine:   'Increases intramuscular water 2 to 5 lbs, muscles appear fuller, scale weight increases',
  sodium:     'High sodium causes temporary water retention of 1 to 3 lbs',
  alcohol:    'Impairs protein synthesis 15 to 20 percent for 24 to 48 hours post consumption',
  medication: 'Corticosteroids, SSRIs, beta blockers, insulin can all affect body composition',
} as const;

export const BODY_COMPOSITION_SCIENCE_SUMMARY = `
BODY FAT CLASSIFICATION (ACE / ACSM):
  Male:   essential 2-5%, athletic 6-13%, fitness 14-17%, acceptable 18-24%, obese 25%+
  Female: essential 10-13%, athletic 14-20%, fitness 21-24%, acceptable 25-31%, obese 32%+

FAT DISTRIBUTION:
  Android (apple): central, higher CVD risk, improves with cardio + deficit
  Gynoid (pear): peripheral, lower CVD risk, harder to mobilize, responds to resistance training
  Mixed: balanced distribution

REALISTIC CHANGE RATES:
  Fat loss: safe max 2 lbs/wk, optimal 1 lb/wk. Rate slows as fat decreases.
  Muscle gain: beginner M 2 lbs/mo / F 1 lbs/mo; advanced M 0.5 / F 0.25.
  Recomp (fat loss + muscle gain simultaneously): feasible for beginners/returning, not advanced lean.

MASKING FACTORS:
  Water retention from sodium, menstrual cycle, creatine, poor sleep, high stress
  Large day-to-day scale swings almost always water, not fat
`.trim();
