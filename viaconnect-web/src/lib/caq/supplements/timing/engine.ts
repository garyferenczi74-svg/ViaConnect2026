// =============================================================================
// Prompt 175h Section 2.5 (2026-06-05): Hannah timing recommendation engine.
// Prompt 185a slice 3 (2026-06-09): extended (not recreated) with Layer 1
// knowledge-base seeding (an optional matchedRule), Layer 2 CAQ adjustment,
// and richer output (constraint chips + matched match_key). When no rule and
// no signals are supplied the engine behaves exactly as the 175h version.
//
// Deterministic rules over the resolved ingredient list. No ML, no model call.
//   Layer 1: prefer the matched supplement_timing_rules row; else pattern-match
//            each ingredient against the class lists in rules.ts and take the
//            highest-priority class that hit.
//   Layer 2: refine the base bucket(s) using the user's CAQ signals.
//
// Inputs (TimingRecommendInput from types.ts):
//   * ingredients: resolved structured ingredients (name primary)
//   * frequency: once_daily / twice_daily / three_daily / weekly / as_needed
//   * userSupplements (optional): for spacing-conflict detection
//   * matchedRule (optional, slice 3): the knowledge-base rule
//   * caqSignals (optional, slice 3): sleep difficulty, low energy, caffeine,
//     largest-meal window
//
// Output (TimingRecommendation): times, with_food, empty_stomach, fat_soluble,
//   away_from, reason, detectedClass, match_key, conflicts.
//
// Where this would silently schedule around a medication-spacing conflict, we
// surface the conflict instead. PHI-free. No emojis. No em or en dashes.
// =============================================================================

import type {
  CaqTimingSignals,
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
  calming: 'Often preferred in the evening as part of a calming routine.',
  fat_soluble: 'Fat soluble. Take with a meal containing some fat for absorption.',
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
 * Prompt 185a slice 3: spread a rule's base bucket across the day per
 * frequency. Single-slot frequencies anchor on the rule's default bucket
 * instead of the class default.
 */
function splitTimesFromBase(base: TimeOfDay, frequency: Frequency): TimeOfDay[] {
  if (frequency === 'twice_daily') return ['morning', 'evening'];
  if (frequency === 'three_daily') return ['morning', 'afternoon', 'evening'];
  return [base];
}

/**
 * Decide whether the recommendation includes with_food. Fat-soluble
 * class is the obvious yes. Iron is better absorbed on an empty stomach,
 * so we leave with_food false for iron and surface the spacing conflicts
 * instead.
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
 * Constraint-chip away_from list for an unmatched supplement, inferred from
 * the detected class (only iron carries spacing defaults in code).
 */
function awayFromForClass(cls: TimingClass): string[] {
  if (cls === 'iron') return ['calcium', 'coffee', 'tea'];
  return [];
}

// match_keys whose items move toward / stay out of the evening on sleep
// difficulty, and which move to the morning on low energy.
const CALMING_KEYS: ReadonlySet<string> = new Set([
  'magnesium_glycinate', 'melatonin', 'ashwagandha', 'l_theanine', 'glycine',
]);
const ACTIVATING_KEYS: ReadonlySet<string> = new Set(['b_complex']);
const ENERGY_MORNING_KEYS: ReadonlySet<string> = new Set(['b_complex', 'iron', 'coq10']);

interface CaqAdjustResult {
  times: TimeOfDay[];
  reasonSuffix: string;
}

/**
 * Prompt 185a slice 3 Layer 2: refine the base bucket(s) using CAQ signals.
 * Pure; returns the possibly-narrowed time set plus a general, PHI-free
 * one-line suffix explaining the personalization. No disease or treatment
 * claims.
 */
function adjustForCaq(args: {
  times: ReadonlyArray<TimeOfDay>;
  cls: TimingClass;
  matchKey: string | null;
  withFood: boolean;
  signals: CaqTimingSignals | null;
}): CaqAdjustResult {
  const { times, cls, matchKey, withFood, signals } = args;
  if (!signals) return { times: [...times], reasonSuffix: '' };
  let next: TimeOfDay[] = [...times];
  let suffix = '';
  const isCalming = cls === 'calming' || (matchKey !== null && CALMING_KEYS.has(matchKey));
  const isActivating = cls === 'stimulating' || (matchKey !== null && ACTIVATING_KEYS.has(matchKey));
  const isIron = cls === 'iron' || matchKey === 'iron';

  if (signals.sleepDifficulty && isCalming && !next.includes('evening')) {
    next = ['evening'];
    suffix = 'Set to the evening to support your wind down.';
  }
  if (signals.sleepDifficulty && isActivating && next.includes('evening')) {
    next = next.filter((t) => t !== 'evening');
    if (next.length === 0) next = ['morning'];
    suffix = 'Kept out of the evening so it does not affect your sleep.';
  }
  if (signals.lowEnergy && matchKey !== null && ENERGY_MORNING_KEYS.has(matchKey) && !next.includes('morning')) {
    next = ['morning'];
    suffix = 'Placed in the morning to support daytime energy.';
  }
  if (signals.highMorningCaffeine && isIron && next.includes('morning')) {
    next = next.filter((t) => t !== 'morning');
    if (next.length === 0) next = ['afternoon'];
    suffix = 'Shifted off the morning so coffee does not block iron absorption.';
  }
  if (withFood && signals.largestMealWindow && !next.includes(signals.largestMealWindow)) {
    next = [signals.largestMealWindow];
    suffix = 'Aligned to your largest meal for better absorption.';
  }
  return { times: next, reasonSuffix: suffix };
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
 * Main entry. Given a list of ingredients and a frequency (plus, since slice 3,
 * an optional matched rule and CAQ signals), return the Hannah timing
 * recommendation. Pure function; no side effects, no external calls. The route
 * or orchestration layer wraps this with the DB lookup, precedence guard, and
 * persistence.
 */
export function recommendTiming(input: TimingRecommendInput): TimingRecommendation {
  const cls = detectDominantClass(input.ingredients);
  const rule = input.matchedRule ?? null;

  // Layer 1 base: the matched knowledge-base rule when present, else the
  // in-code class inference.
  const baseTimes: TimeOfDay[] = rule
    ? splitTimesFromBase(rule.default_time_of_day, input.frequency)
    : [...splitByFrequency(cls, input.frequency)];
  const withFood = rule
    ? rule.with_food ?? decideWithFood(cls, input.ingredients)
    : decideWithFood(cls, input.ingredients);
  const emptyStomach = rule ? rule.empty_stomach ?? false : cls === 'iron';
  const fatSoluble = rule ? rule.fat_soluble : cls === 'fat_soluble';
  const awayFrom = rule ? [...rule.away_from] : awayFromForClass(cls);
  const baseReason = rule ? rule.rationale_short : REASON_FOR_CLASS[cls];

  // Layer 2: CAQ adjustments.
  const adjusted = adjustForCaq({
    times: baseTimes,
    cls,
    matchKey: rule?.match_key ?? null,
    withFood,
    signals: input.caqSignals ?? null,
  });

  const reason = adjusted.reasonSuffix ? `${baseReason} ${adjusted.reasonSuffix}` : baseReason;
  const conflicts = detectConflicts(input.ingredients, input.userSupplements);

  return {
    times: adjusted.times,
    with_food: withFood,
    empty_stomach: emptyStomach,
    fat_soluble: fatSoluble,
    away_from: awayFrom,
    reason,
    detectedClass: cls,
    match_key: rule?.match_key ?? null,
    conflicts,
  };
}
