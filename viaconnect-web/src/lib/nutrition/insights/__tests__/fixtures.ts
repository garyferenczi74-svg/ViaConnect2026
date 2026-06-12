// Prompt 192 Task 2: shared test fixtures for the Gordon insight engine core.
// Pure builders only. now is always injected; timezone UTC keeps local date
// math deterministic in node. No em or en dashes anywhere in this file.

import type {
  DetectorInput,
  HydrationDay,
  InsightFact,
  InsightMeal,
  InsightTargets,
  MealKnownFlags,
  MicronutrientDay,
} from '../types';

export const NOW = '2026-06-12T15:00:00.000Z';
export const TZ = 'UTC';
// With NOW + TZ above: today local is 2026-06-12, yesterday is 2026-06-11,
// and the 7 day window is 2026-06-05 through 2026-06-11.
export const YESTERDAY = '2026-06-11';
export const WINDOW_DATES = [
  '2026-06-05',
  '2026-06-06',
  '2026-06-07',
  '2026-06-08',
  '2026-06-09',
  '2026-06-10',
  '2026-06-11',
];

export const TARGETS: InsightTargets = {
  dailyKcal: 2200,
  dailyProteinG: 120,
  dailyCarbsG: 250,
  dailyFatTotalG: 70,
  dailyFiberG: 30,
};

let mealSeq = 0;

type MealOverrides = Omit<Partial<InsightMeal>, 'known'> & {
  date: string;
  known?: Partial<MealKnownFlags>;
};

export function mkMeal(over: MealOverrides): InsightMeal {
  mealSeq += 1;
  const base: InsightMeal = {
    mealId: `meal_${mealSeq}`,
    date: over.date,
    loggedAt: `${over.date}T12:00:00.000Z`,
    mealType: 'lunch',
    caloriesKcal: 600,
    proteinG: 30,
    carbsG: 60,
    fatTotalG: 20,
    fiberG: 8,
    known: { calories: true, protein: true, carbs: true, fat: true, fiber: true },
    qualityScore: 70,
    itemNames: [],
  };
  return {
    ...base,
    ...over,
    known: { ...base.known, ...(over.known ?? {}) },
  };
}

export function mkHydrationDay(over: Partial<HydrationDay> & { date: string }): HydrationDay {
  return { totalMl: 2000, targetMl: 2500, ...over };
}

export function mkMicronutrientDay(
  over: Partial<MicronutrientDay> & { date: string },
): MicronutrientDay {
  return { totals: {}, fullyScored: true, ...over };
}

export function mkInput(over: Partial<DetectorInput> = {}): DetectorInput {
  return {
    scoredMeals: [],
    micronutrientDays: [],
    hydrationDays: [],
    scheduledSupplements: [],
    targets: TARGETS,
    priorActiveInsights: [],
    productCandidates: [],
    now: NOW,
    timezone: TZ,
    ...over,
  };
}

export function mkFact(over: Partial<InsightFact> = {}): InsightFact {
  return {
    type: 'macro_gap',
    horizon: 'daily',
    severity: 'info',
    confidence: 'medium',
    factFingerprint: over.factFingerprint ?? 'fp_default',
    snapshot: { magnitudePct: 10 },
    productSuggestion: null,
    ...over,
  };
}

// Three meals a day across the full window: protein 60 g per day against a
// 120 g target (a 50 percent recurring gap), steady quality 70, dinner at
// 19:00 so no timing pattern fires. The engine end to end test builds on this.
export function fullWeekMeals(): InsightMeal[] {
  const meals: InsightMeal[] = [];
  for (const date of WINDOW_DATES) {
    meals.push(
      mkMeal({
        date,
        mealType: 'breakfast',
        loggedAt: `${date}T08:00:00.000Z`,
        proteinG: 15,
        caloriesKcal: 500,
        itemNames: date === YESTERDAY ? ['Greek Yogurt'] : ['oatmeal'],
      }),
      mkMeal({
        date,
        mealType: 'lunch',
        loggedAt: `${date}T13:00:00.000Z`,
        proteinG: 20,
        caloriesKcal: 700,
        itemNames: ['chicken salad'],
      }),
      mkMeal({
        date,
        mealType: 'dinner',
        loggedAt: `${date}T19:00:00.000Z`,
        proteinG: 25,
        caloriesKcal: 800,
        itemNames: ['salmon and rice'],
      }),
    );
  }
  return meals;
}

export function fullWeekInput(): DetectorInput {
  return mkInput({
    scoredMeals: fullWeekMeals(),
    micronutrientDays: WINDOW_DATES.map((date, i) =>
      mkMicronutrientDay({
        date,
        // iron low on 6 of 7 fully scored days (day index 3 is the OK day).
        totals: { iron_mg: i === 3 ? 20 : 8 },
      }),
    ),
    hydrationDays: WINDOW_DATES.map((date) =>
      mkHydrationDay({ date, totalMl: 1500, targetMl: 2500 }),
    ),
    scheduledSupplements: [{ name: 'Iron Bisglycinate', timingBucket: 'morning' }],
    productCandidates: [
      { slug: 'iron-support', name: 'Iron Support', nutrientKeys: ['iron_mg'] },
    ],
  });
}
