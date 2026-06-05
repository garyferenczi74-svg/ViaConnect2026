// =============================================================================
// Prompt 175h Section 2.5 (2026-06-05): Hannah timing recommendation engine.
//
// Deterministic rules over the resolved ingredient list. No ML, no
// model call: pattern-match each ingredient against the class lists in
// rules.ts, take the highest-priority class that hit, apply the
// frequency split, attach a short plain-language reason, and return
// the time-of-day slots with optional with_food + spacing conflicts.
//
// Inputs (TimingRecommendInput from types.ts):
//   * ingredients: resolved structured ingredients (name primary)
//   * frequency: once_daily / twice_daily / three_daily / weekly / as_needed
//   * userSupplements (optional): other things the user takes, for
//     spacing-conflict detection (iron + calcium, iron + caffeine)
//
// Output (TimingRecommendation):
//   * times: array of morning / afternoon / evening
//   * with_food: true for fat-soluble class
//   * reason: short plain-language sentence
//   * detectedClass: which class drove the recommendation
//   * conflicts: spacing flags the UI surfaces alongside the reason
//
// Consistent with the interaction engine + caffeine-timing logic
// per the spec: where this would silently schedule around a
// medication-spacing conflict, we surface the conflict instead.
// =============================================================================

import type {
  Frequency,
  TimeOfDay,
  TimingClass,
  TimingIngredientInput,
  TimingRecommendInput,
  TimingRecommendation,
} from './types';
import {
  CLASS_PRIORITY,
  classifyIngredient,
  nameLooksLikeCaffeine,
  nameLooksLikeCalcium,
  FAT_SOLUBLE_PATTERNS,
} from './rules';

const REASON_FOR_CLASS: Record<TimingClass, string> = {
  stimulating: 'Stimulating ingredient. Take in the morning so it does not interfere with sleep.',
  calming: 'Calming and sleep-supporting. Take in the evening, about 30 to 60 minutes before bed.',
  fat_soluble: 'Fat-soluble. Take with a meal containing some fat for absorption.',
  iron: 'Take in the morning. Space at least 2 hours from calcium, coffee, and tea.',
  general: 'No strong timing preference. Morning is a sensible default.',
};

/**
 * Detect the dominant timing class across the ingredient list. Each
 * ingredient votes; the class with the highest priority hit wins (per
 * CLASS_PRIORITY order from rules.ts). Returns 'general' when no
 * pattern hit any ingredient.
 */
export function detectDominantClass(
  ingredients: ReadonlyArray<TimingIngredientInput>,
): TimingClass {
  const hits = new Set<TimingClass>();
  for (const ing of ingredients) {
    const cls = classifyIngredient(ing.name);
    if (cls !== null) hits.add(cls);
  }
  for (const candidate of CLASS_PRIORITY) {
    if (hits.has(candidate)) return candidate;
  }
  return 'general';
}

/**
 * Pick the best single time-of-day slot for a once_daily schedule
 * given a detected class. Fat-soluble defaults to morning (most users
 * eat breakfast); user can override.
 */
function bestSlotFor(cls: TimingClass): TimeOfDay {
  switch (cls) {
    case 'calming': return 'evening';
    case 'iron': return 'morning';
    case 'stimulating': return 'morning';
    case 'fat_soluble': return 'morning';
    case 'general':
    default: return 'morning';
  }
}

/**
 * Split the recommendation into multiple slots based on frequency.
 * Twice daily morning + evening; three times daily all three. Weekly
 * and as_needed default to the single best slot from the class.
 */
export function splitByFrequency(
  cls: TimingClass,
  frequency: Frequency,
): ReadonlyArray<TimeOfDay> {
  if (frequency === 'twice_daily') return ['morning', 'evening'];
  if (frequency === 'three_daily') return ['morning', 'afternoon', 'evening'];
  return [bestSlotFor(cls)];
}

/**
 * Decide whether the recommendation includes with_food. Fat-soluble
 * class is the obvious yes. Iron has a nuance the spec does not
 * require: iron is better absorbed on an empty stomach with vitamin C,
 * so we leave with_food false for iron and surface the conflicts list
 * with a coffee/tea/calcium spacing note instead.
 */
function decideWithFood(
  cls: TimingClass,
  ingredients: ReadonlyArray<TimingIngredientInput>,
): boolean {
  if (cls === 'fat_soluble') return true;
  // Otherwise, check the entire ingredient list for any fat-soluble
  // member; a multi-ingredient bottle that contains D3 or omega-3 also
  // benefits from with_food even when the dominant class is something
  // else (e.g. a multivitamin).
  for (const ing of ingredients) {
    const lower = ing.name.toLowerCase();
    for (const p of FAT_SOLUBLE_PATTERNS) {
      if (lower.includes(p)) return true;
    }
  }
  return false;
}

/**
 * Detect spacing conflicts against other supplements the user takes.
 * Currently only iron-against-caffeine and iron-against-calcium are
 * surfaced. Returns a list of plain-language conflict strings.
 */
export function detectConflicts(
  ingredients: ReadonlyArray<TimingIngredientInput>,
  userSupplements: TimingRecommendInput['userSupplements'],
): string[] {
  if (!userSupplements || userSupplements.length === 0) return [];
  const conflicts: string[] = [];
  const ingredientNames = ingredients.map((i) => i.name.toLowerCase());
  const hasIron = ingredientNames.some((n) => {
    for (const p of ['ferrous', 'iron']) {
      if (n.includes(p)) return true;
    }
    return false;
  });
  if (hasIron) {
    for (const us of userSupplements) {
      if (nameLooksLikeCalcium(us.name)) {
        conflicts.push('Space iron at least 2 hours from your calcium supplement.');
      }
      if (nameLooksLikeCaffeine(us.name)) {
        conflicts.push('Space iron at least 2 hours from caffeine.');
      }
    }
  }
  return conflicts;
}

/**
 * Main entry. Given a list of ingredients and a frequency, return the
 * Hannah timing recommendation. Pure function; no side effects, no
 * external calls. The route layer wraps this with a fetch boundary.
 */
export function recommendTiming(input: TimingRecommendInput): TimingRecommendation {
  const cls = detectDominantClass(input.ingredients);
  const times = splitByFrequency(cls, input.frequency);
  const withFood = decideWithFood(cls, input.ingredients);
  const reason = REASON_FOR_CLASS[cls];
  const conflicts = detectConflicts(input.ingredients, input.userSupplements);
  return {
    times,
    with_food: withFood,
    reason,
    detectedClass: cls,
    conflicts,
  };
}
