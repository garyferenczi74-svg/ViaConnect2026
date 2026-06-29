// Task 12 (Prompt 210c): Pure helpers for displaying per-measurement confidence
// on the body-tracker surface. Maps numeric confidence scores (0-1 stored in the
// DB confidence columns added in Task 10) to human-readable tiers and design-token
// color strings.
//
// Threshold rationale - derived from the inverse of confidenceToNumeric in buildScanWrite:
//   high=0.85, moderate=0.60, low=0.35.
// Midpoints between adjacent stored values define the cut-points:
//   high threshold:     (0.85 + 0.60) / 2 = 0.725, rounded down to 0.70
//   moderate threshold: (0.60 + 0.35) / 2 = 0.475, rounded down to 0.45
//
// Design-token color mapping (confidence is INVERTED from clinical severity):
//   high confidence   -> severity 'low'      (green: --severity-low)
//   moderate          -> severity 'moderate' (yellow: --severity-moderate)
//   low / estimated   -> severity 'high'     (red: --severity-high)
//
// RULE 9: null input -> null output. Never fabricate for UNKNOWN state.
// No em-dashes, no en-dashes, no inline hex. No `any`.

import type { ConfidenceLevel } from '../types';

/**
 * Convert a numeric confidence score (0-1 from the DB) to a ConfidenceLevel.
 * Returns null for null input (UNKNOWN / not-measured state; RULE 9).
 *
 * Thresholds:
 *   >= 0.70 -> 'high'
 *   >= 0.45 -> 'moderate'
 *   < 0.45  -> 'low'
 */
export function numericToConfidenceLevel(score: number | null): ConfidenceLevel | null {
  if (score === null) return null;
  if (score >= 0.70) return 'high';
  if (score >= 0.45) return 'moderate';
  return 'low';
}

/**
 * Design-token color string for a confidence level.
 * Uses the --severity-* CSS custom properties from globals.css as space-separated
 * RGB channels wrapped in rgb(), so the value is valid in inline style props.
 *
 * Confidence is INVERTED from clinical severity:
 *   high confidence   -> green  (severity 'low'      token: --severity-low)
 *   moderate          -> yellow (severity 'moderate'  token: --severity-moderate)
 *   low / estimated   -> red    (severity 'high'      token: --severity-high)
 *
 * Returns null for null input (no color indicator for UNKNOWN state; RULE 9).
 */
export function confidenceColorVar(level: ConfidenceLevel | null): string | null {
  if (level === null) return null;
  if (level === 'high')     return 'rgb(var(--severity-low))';
  if (level === 'moderate') return 'rgb(var(--severity-moderate))';
  return 'rgb(var(--severity-high))';
}

/**
 * Body-positive display label for a confidence level.
 * Returns null for null input (UNKNOWN / not-measured state has no confidence label).
 *
 * FLAGGED FOR HANNAH REVIEW (tone) before production use.
 * 'Estimated' is the conservative label for low-confidence present measurements.
 * It acknowledges uncertainty without alarming language, per Section 9 / RULE 9 framing.
 */
export function confidenceBodyLabel(level: ConfidenceLevel | null): string | null {
  if (level === null) return null;
  if (level === 'high')     return 'Measured';
  if (level === 'moderate') return 'Good estimate';
  return 'Estimated';
}
