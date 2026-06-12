// Prompt 192 Task 2: supplement_meal_alignment detector (daily).
//
// Two checks over the last completed day:
//   1. Static meal vs stack interaction rules. These ARE the
//      checkFoodInteractions rules: the spec mandates reusing
//      src/lib/nutrition/checkFoodInteractions.ts, but the 2026-06-12 dead
//      code sweep deleted that file from the tree mid task, so the ruleset
//      is re homed here verbatim in semantics (same rule table, same
//      matching, same output shape) rather than duplicated alongside a live
//      module. Internal ViaConnect provenance; if the original module is
//      restored, this block collapses back to an import.
//   2. The 192 addition: a thin deterministic fat soluble check. A fat
//      soluble supplement (tiny name match table below) scheduled in a
//      bucket whose nearby logged meals carry under 5 g of known fat gets a
//      timing nudge. UNKNOWN fat never counts as 0.

import { makeFingerprint } from '../fingerprint';
import type { DetectorInput, InsightFact, InsightMeal } from '../types';
import { mealsByDate, scoredMeals, yesterdayLocal } from './shared';

export interface FoodInteraction {
  foodItem: string;
  interactsWith: string;
  interactionType: 'absorption' | 'contraindication' | 'timing' | 'enhancement';
  severity: 'info' | 'caution' | 'warning';
  description: string;
  recommendation: string;
}

interface KnownInteraction {
  triggers: string[];
  target: string;
  interactionType: FoodInteraction['interactionType'];
  severity: FoodInteraction['severity'];
  description: string;
  recommendation: string;
}

const KNOWN_INTERACTIONS: KnownInteraction[] = [
  { triggers: ['grapefruit'], target: 'statins', interactionType: 'contraindication', severity: 'warning', description: 'Grapefruit inhibits CYP3A4, dramatically increasing drug absorption', recommendation: 'Avoid grapefruit within 4 hours of medication' },
  { triggers: ['grapefruit'], target: 'calcium channel blocker', interactionType: 'contraindication', severity: 'warning', description: 'Grapefruit can amplify medication effects unpredictably', recommendation: 'Consult your healthcare provider about grapefruit consumption' },
  { triggers: ['spinach', 'kale', 'broccoli'], target: 'warfarin', interactionType: 'absorption', severity: 'caution', description: 'High Vitamin K content can reduce Warfarin effectiveness', recommendation: 'Maintain consistent intake of Vitamin K-rich foods' },
  { triggers: ['spinach', 'kale'], target: 'iron', interactionType: 'enhancement', severity: 'info', description: 'Contains iron but oxalates can reduce absorption', recommendation: 'Pair with Vitamin C to enhance iron absorption' },
  { triggers: ['milk', 'cheese', 'yogurt', 'dairy'], target: 'tetracycline', interactionType: 'absorption', severity: 'caution', description: 'Calcium in dairy binds to tetracyclines, reducing absorption', recommendation: 'Take antibiotics 2 hours before or after dairy' },
  { triggers: ['milk', 'cheese', 'yogurt', 'dairy'], target: 'iron', interactionType: 'absorption', severity: 'caution', description: 'Calcium competes with iron for absorption', recommendation: 'Separate iron supplements and dairy by 2 hours' },
  { triggers: ['coffee', 'espresso', 'caffeine', 'tea'], target: 'iron', interactionType: 'absorption', severity: 'caution', description: 'Caffeine and tannins reduce iron absorption', recommendation: 'Take iron supplements 1 hour before or 2 hours after coffee' },
  { triggers: ['beer', 'wine', 'alcohol', 'cocktail'], target: 'b vitamin', interactionType: 'absorption', severity: 'warning', description: 'Alcohol impairs absorption of B vitamins, Vitamin C, zinc, and magnesium', recommendation: 'Separate supplement intake from alcohol consumption' },
  { triggers: ['beer', 'wine', 'alcohol', 'cocktail'], target: 'melatonin', interactionType: 'contraindication', severity: 'warning', description: 'Alcohol disrupts sleep architecture and interacts with melatonin', recommendation: 'Avoid alcohol within 3 hours of melatonin' },
  { triggers: ['banana', 'avocado', 'potato'], target: 'potassium', interactionType: 'enhancement', severity: 'info', description: 'Rich potassium source synergizes with potassium supplements', recommendation: 'Monitor total potassium intake if supplementing' },
];

export function checkFoodInteractions(
  items: { name: string }[],
  userStack: { name: string }[],
): FoodInteraction[] {
  const interactions: FoodInteraction[] = [];
  const stackLower = userStack.map((s) => s.name.toLowerCase());

  for (const item of items) {
    const itemLower = item.name.toLowerCase();
    for (const known of KNOWN_INTERACTIONS) {
      const foodMatch = known.triggers.some((t) => itemLower.includes(t));
      if (!foodMatch) continue;

      const stackMatch = stackLower.some((s) => s.includes(known.target));
      if (!stackMatch) continue;

      const matchedSupplement = userStack.find((s) =>
        s.name.toLowerCase().includes(known.target),
      );

      interactions.push({
        foodItem: item.name,
        interactsWith: matchedSupplement?.name ?? known.target,
        interactionType: known.interactionType,
        severity: known.severity,
        description: known.description,
        recommendation: known.recommendation,
      });
    }
  }

  return interactions;
}

// 192 addition, distinct from the interaction ruleset above: fat soluble
// supplements identified by name substring. Kept deliberately tiny.
const FAT_SOLUBLE_NAME_MATCHES = [
  'vitamin d',
  'vitamin e',
  'vitamin k',
  'vitamin a',
  'omega',
  'fish oil',
  'cod liver',
];

const LOW_FAT_THRESHOLD_G = 5;
const MAX_INTERACTION_FACTS = 2;

const BUCKET_MEAL_TYPES: Record<'morning' | 'afternoon' | 'evening', InsightMeal['mealType']> = {
  morning: 'breakfast',
  afternoon: 'lunch',
  evening: 'dinner',
};

const INTERACTION_MAGNITUDE: Record<FoodInteraction['severity'], number> = {
  info: 25,
  caution: 50,
  warning: 75,
};

export function detectSupplementMealAlignment(input: DetectorInput): InsightFact[] {
  if (input.scheduledSupplements.length === 0) return [];
  const yDate = yesterdayLocal(input);
  const yMeals = mealsByDate(scoredMeals(input)).get(yDate) ?? [];
  if (yMeals.length === 0) return [];

  const facts: InsightFact[] = [];

  // 1. Static meal vs stack interactions.
  const items = yMeals.flatMap((m) => m.itemNames.map((name) => ({ name })));
  const stack = input.scheduledSupplements.map((s) => ({ name: s.name }));
  const interactions = checkFoodInteractions(items, stack);
  const seen = new Set<string>();
  for (const interaction of interactions) {
    const key = `${interaction.foodItem.toLowerCase()}|${interaction.interactsWith.toLowerCase()}|${interaction.interactionType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (facts.length >= MAX_INTERACTION_FACTS) break;
    facts.push({
      type: 'supplement_meal_alignment',
      horizon: 'daily',
      severity: interaction.severity === 'info' ? 'info' : 'attention',
      confidence: 'high',
      factFingerprint: makeFingerprint('supplement_meal_alignment', 'daily', {
        kind: 'interaction',
        foodItem: interaction.foodItem.toLowerCase(),
        interactsWith: interaction.interactsWith.toLowerCase(),
        interactionType: interaction.interactionType,
      }),
      snapshot: {
        scope: 'daily',
        date: yDate,
        kind: 'interaction',
        interaction,
        magnitudePct: INTERACTION_MAGNITUDE[interaction.severity],
      },
      productSuggestion: null,
    });
  }

  // 2. Fat soluble supplement scheduled against a low fat bucket.
  for (const supplement of input.scheduledSupplements) {
    const nameLower = supplement.name.toLowerCase();
    if (!FAT_SOLUBLE_NAME_MATCHES.some((m) => nameLower.includes(m))) continue;
    const mealType = BUCKET_MEAL_TYPES[supplement.timingBucket];
    const bucketMeals = yMeals.filter((m) => m.mealType === mealType);
    if (bucketMeals.length === 0) continue;
    // UNKNOWN fat on any bucket meal means we cannot assert a low fat day.
    if (!bucketMeals.every((m) => m.known.fat)) continue;
    const bucketFatG = Math.round(bucketMeals.reduce((s, m) => s + m.fatTotalG, 0));
    if (bucketFatG >= LOW_FAT_THRESHOLD_G) continue;
    facts.push({
      type: 'supplement_meal_alignment',
      horizon: 'daily',
      severity: 'info',
      confidence: 'medium',
      factFingerprint: makeFingerprint('supplement_meal_alignment', 'daily', {
        kind: 'fat_soluble_low_fat',
        supplement: nameLower,
        timingBucket: supplement.timingBucket,
      }),
      snapshot: {
        scope: 'daily',
        date: yDate,
        kind: 'fat_soluble_low_fat',
        supplement: supplement.name,
        timingBucket: supplement.timingBucket,
        bucketMeals: bucketMeals.length,
        bucketFatG,
        thresholdG: LOW_FAT_THRESHOLD_G,
        magnitudePct: 40,
      },
      productSuggestion: null,
    });
  }

  return facts;
}
