/**
 * src/lib/protocol/contractCompleteness.ts
 *
 * Contract-completeness check (Prompt 208b, Section 5, Task 5-T2) -- the
 * completeness guarantee.
 *
 * Before synthesis finalizes, it assesses whether the required cross-reference
 * inputs (genetics, labs, health context) are present. When any is missing, the
 * synthesis output is LABELED with a degraded confidence floor so the surface
 * can show the recommendations at lower confidence. "Missing data is visible,
 * never invisible."
 *
 * This module LABELS only. It is a PURE, DETERMINISTIC assessment:
 *   - It never removes a recommendation.
 *   - It never gates or weakens a safety interlock.
 *   - It treats an UNKNOWN input as missing (lower confidence), so the engine
 *     never over-states confidence on absent data.
 *   - assessCompleteness never throws.
 *
 * No em/en-dashes. No emojis. No new dependencies. No package.json changes.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Presence flags for the inputs that feed cross-reference synthesis. Each flag
 * is a strict boolean: callers must pass false (not undefined) when an input's
 * presence is unknown, so the assessment stays conservative.
 */
export interface CompletenessInputs {
  hasVariants: boolean;
  hasLabs: boolean;
  hasHealthContext: boolean;
  hasNutritionLedger: boolean;
  hasConnected: boolean;
}

/**
 * The inputs that are strictly required for FULL confidence: the core
 * cross-reference inputs. Nutrition ledger + connected are enriching, not
 * strictly required, so their absence reduces (informs) but never floors
 * confidence -- they are intentionally excluded here.
 */
export const REQUIRED_FOR_FULL_CONFIDENCE: Array<keyof CompletenessInputs> = [
  'hasVariants',
  'hasLabs',
  'hasHealthContext',
];

/**
 * The confidence floor a degraded contract is shown at:
 *   - 'full'    : every required input present.
 *   - 'reduced' : exactly one required input missing.
 *   - 'minimal' : two or more required inputs missing.
 */
export type ConfidenceFloor = 'full' | 'reduced' | 'minimal';

export interface CompletenessReport {
  /** Readable names of the missing REQUIRED inputs (e.g. 'genetics', 'labs'). */
  missing: string[];
  /** True when at least one required input is missing. */
  degraded: boolean;
  /** The confidence floor implied by how many required inputs are missing. */
  confidenceFloor: ConfidenceFloor;
  /** A short honest sentence when degraded; empty string when not degraded. */
  note: string;
}

// ---------------------------------------------------------------------------
// Internal: map an input key to the readable name surfaced to the user.
// ---------------------------------------------------------------------------

const READABLE_NAME: Record<keyof CompletenessInputs, string> = {
  hasVariants: 'genetics',
  hasLabs: 'labs',
  hasHealthContext: 'health_context',
  hasNutritionLedger: 'nutrition_ledger',
  hasConnected: 'connected',
};

// ---------------------------------------------------------------------------
// assessCompleteness
// ---------------------------------------------------------------------------

/**
 * Assess input completeness and produce a confidence-floor label. PURE and
 * DETERMINISTIC: the same inputs always produce the same report, and the inputs
 * object is never mutated. Never throws.
 *
 * Conservative by construction: a key is "present" ONLY when its flag is
 * strictly true. Any other value (false, or an unknown coerced to false by the
 * caller) is treated as missing, so confidence is never over-stated.
 *
 * @param inputs Presence flags for the cross-reference inputs.
 * @returns A CompletenessReport describing the missing inputs + confidence floor.
 */
export function assessCompleteness(inputs: CompletenessInputs): CompletenessReport {
  // Required inputs whose value is not strictly true are missing.
  const missing = REQUIRED_FOR_FULL_CONFIDENCE.filter(
    (key) => inputs[key] !== true,
  ).map((key) => READABLE_NAME[key]);

  const degraded = missing.length > 0;

  let confidenceFloor: ConfidenceFloor;
  if (missing.length === 0) {
    confidenceFloor = 'full';
  } else if (missing.length === 1) {
    confidenceFloor = 'reduced';
  } else {
    confidenceFloor = 'minimal';
  }

  const note = degraded
    ? `Some recommendations are shown at lower confidence because the following inputs are missing: ${missing.join(', ')}.`
    : '';

  return { missing, degraded, confidenceFloor, note };
}
