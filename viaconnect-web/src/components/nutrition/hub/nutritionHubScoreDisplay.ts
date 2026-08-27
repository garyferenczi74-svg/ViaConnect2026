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

/** True when a hub ring may paint a numeric score. NaN / Infinity stay UNKNOWN. */
export function isFiniteHubRingValue(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
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
