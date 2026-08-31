// Brief 31: Nutrition hub score rings keep the Connections empty-score
// object. Missing stays -- / UNKNOWN, never 0. The hub paints that empty
// object on PlasmaGauge empty mode (circle + --), not Connections UnknownWell.
// The ASCII hyphen pair in CONNECTIONS_BOS_COMPOSITE is the same object
// Connections already paints (not an em or en dash).

import {
  CONNECTIONS_BOS_COMPOSITE,
  connectionsBosCompositeDisplay,
  type ConnectionsBosDisplay,
} from '@/lib/body-tracker/wearable-tiles';

export { CONNECTIONS_BOS_COMPOSITE, connectionsBosCompositeDisplay };
export type { ConnectionsBosDisplay };

/** Why a hub ring is UNKNOWN. Meals-missing copy must not run when food exists. */
export type HubGaugeEmptyReason = 'meals_missing' | 'targets_missing';

const MEALS_MISSING_SCORE_COPY = 'Log a meal to see your score';
const TARGETS_MISSING_SCORE_COPY = 'Set nutrition targets to see your score';
const MEALS_MISSING_MACROS_COPY = 'No macros logged today yet';
const TARGETS_MISSING_MACROS_COPY = 'Set nutrition targets to see Daily Macros';

/** True when a hub ring may paint a numeric score. NaN / Infinity stay UNKNOWN. */
export function isFiniteHubRingValue(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Nutrition Score empty hint. Logged food must never use the meals-missing
 * line. Missing nutrition_targets keeps -- because the hero cannot score
 * vs My Biology, but the copy names targets, not a missing meal.
 */
export function nutritionScoreEmptyCopy(
  reason: HubGaugeEmptyReason | undefined,
): string {
  if (reason === 'targets_missing') return TARGETS_MISSING_SCORE_COPY;
  return MEALS_MISSING_SCORE_COPY;
}

/**
 * Daily Macros empty hint. Same split: meals-missing copy only when
 * Today's meals has no food. Targets-missing is a different empty.
 */
export function dailyMacrosEmptyCopy(
  reason: HubGaugeEmptyReason | undefined,
): string {
  if (reason === 'targets_missing') return TARGETS_MISSING_MACROS_COPY;
  return MEALS_MISSING_MACROS_COPY;
}

/** Same -- / UNKNOWN object Connections uses. No third empty treatment. */
export function nutritionHubEmptyScoreDisplay(): ConnectionsBosDisplay {
  return connectionsBosCompositeDisplay();
}

export type NutritionHubScoreCenter =
  | { kind: 'score'; value: number; caption: 'OF 100' }
  | { kind: 'empty'; value: ConnectionsBosDisplay['value']; caption: ConnectionsBosDisplay['band'] };

export type NutritionHubMacroCenter =
  | { kind: 'macros'; value: number; caption: 'OF TARGET'; valueSuffix: '%' }
  | { kind: 'empty'; value: ConnectionsBosDisplay['value']; caption: ConnectionsBosDisplay['band'] };

export function nutritionHubScoreCenter(
  nutritionScore: number | undefined,
): NutritionHubScoreCenter {
  if (isFiniteHubRingValue(nutritionScore)) {
    return { kind: 'score', value: nutritionScore, caption: 'OF 100' };
  }
  const empty = nutritionHubEmptyScoreDisplay();
  return { kind: 'empty', value: empty.value, caption: empty.band };
}

export function nutritionHubMacroCenter(
  dailyMacrosPct: number | undefined,
): NutritionHubMacroCenter {
  if (isFiniteHubRingValue(dailyMacrosPct)) {
    return { kind: 'macros', value: dailyMacrosPct, caption: 'OF TARGET', valueSuffix: '%' };
  }
  const empty = nutritionHubEmptyScoreDisplay();
  return { kind: 'empty', value: empty.value, caption: empty.band };
}

export function nutritionHubScorePaint(center: NutritionHubScoreCenter): string {
  return `${center.value} ${center.caption}`;
}

export function nutritionHubMacroPaint(center: NutritionHubMacroCenter): string {
  if (center.kind === 'macros') {
    return `${center.value}${center.valueSuffix} ${center.caption}`;
  }
  return `${center.value} ${center.caption}`;
}
