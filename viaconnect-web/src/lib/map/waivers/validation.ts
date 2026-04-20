// Prompt #101 Workstream B — pure waiver validation.
// Mirrors the DB CHECK constraints + trigger logic so the UI rejects
// invalid submissions before the DB does.

import {
  MAPWaiverType,
  WAIVER_TYPE_RULES,
  WAIVER_JUSTIFICATION_MIN_CHARS,
  WAIVER_JUSTIFICATION_MAX_CHARS,
  MAX_CONCURRENT_ACTIVE_WAIVERS_PER_PRACTITIONER,
} from './types';
import { MARGIN_MULTIPLIER, marginPreservingFloorCents } from '@/lib/map/guardrails';

export interface WaiverWindowValidationInput {
  waiverType: MAPWaiverType;
  startAt: Date;
  endAt: Date;
}

export type WaiverValidationError =
  | 'MAP_WAIVER_INVALID_TIER'
  | 'MAP_WAIVER_WINDOW_INVALID'
  | 'MAP_WAIVER_WINDOW_EXCEEDS_MAX'
  | 'MAP_WAIVER_MARGIN_BREACH'
  | 'MAP_WAIVER_JUSTIFICATION_TOO_SHORT'
  | 'MAP_WAIVER_JUSTIFICATION_TOO_LONG'
  | 'MAP_WAIVER_CONCURRENCY_EXCEEDED'
  | 'MAP_WAIVER_MAX_DISCOUNT_EXCEEDED';

export interface WaiverValidationResult {
  ok: boolean;
  errors: WaiverValidationError[];
}

/** Pure: window is strictly positive and within the rule's cap. */
export function validateWaiverWindow({
  waiverType,
  startAt,
  endAt,
}: WaiverWindowValidationInput): WaiverValidationError | null {
  if (endAt.getTime() <= startAt.getTime()) return 'MAP_WAIVER_WINDOW_INVALID';
  const rule = WAIVER_TYPE_RULES[waiverType];
  const maxMs = rule.maxDurationDays * 24 * 60 * 60 * 1000;
  if (endAt.getTime() - startAt.getTime() > maxMs) return 'MAP_WAIVER_WINDOW_EXCEEDS_MAX';
  return null;
}

/** Pure: margin floor check — waived price >= ingredient cost floor × 1.72. */
export function validateWaiverMargin(
  waivedPriceCents: number,
  ingredientCostFloorCents: number,
): WaiverValidationError | null {
  if (ingredientCostFloorCents <= 0) return 'MAP_WAIVER_MARGIN_BREACH';
  if (waivedPriceCents < marginPreservingFloorCents(ingredientCostFloorCents)) {
    return 'MAP_WAIVER_MARGIN_BREACH';
  }
  return null;
}

/** Pure: depth of discount below MAP within the waiver-type limit. */
export function validateWaiverDiscountDepth(
  waiverType: MAPWaiverType,
  waivedPriceCents: number,
  mapPriceCents: number,
): WaiverValidationError | null {
  if (mapPriceCents <= 0) return 'MAP_WAIVER_MARGIN_BREACH';
  if (waivedPriceCents >= mapPriceCents) return null;
  const pct = ((mapPriceCents - waivedPriceCents) / mapPriceCents) * 100;
  const limit = WAIVER_TYPE_RULES[waiverType].maxDiscountPctBelowMAP;
  if (pct > limit) return 'MAP_WAIVER_MAX_DISCOUNT_EXCEEDED';
  return null;
}

/** Pure: justification length bounds. */
export function validateJustification(text: string): WaiverValidationError | null {
  if (text.length < WAIVER_JUSTIFICATION_MIN_CHARS) return 'MAP_WAIVER_JUSTIFICATION_TOO_SHORT';
  if (text.length > WAIVER_JUSTIFICATION_MAX_CHARS) return 'MAP_WAIVER_JUSTIFICATION_TOO_LONG';
  return null;
}

/** Pure: concurrency gate for the 4th active waiver. */
export function validateConcurrency(currentActiveCount: number): WaiverValidationError | null {
  if (currentActiveCount >= MAX_CONCURRENT_ACTIVE_WAIVERS_PER_PRACTITIONER) {
    return 'MAP_WAIVER_CONCURRENCY_EXCEEDED';
  }
  return null;
}

/** Pure: scope-URL matching. Returns true if the observation URL
 *  falls under any scope entry. An empty scope array means global. */
export function observationInWaiverScope(
  observationUrl: string,
  scopeUrls: string[],
): boolean {
  if (scopeUrls.length === 0) return true;
  for (const scopeUrl of scopeUrls) {
    if (observationUrl === scopeUrl) return true;
    if (observationUrl.startsWith(scopeUrl)) return true;
  }
  return false;
}

export { MARGIN_MULTIPLIER };
