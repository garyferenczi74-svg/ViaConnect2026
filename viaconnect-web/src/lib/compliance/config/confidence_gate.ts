/**
 * Marshall confidence-gate configuration.
 * The gate decides what happens to a set of candidate findings after rules
 * evaluate but before anything is persisted.
 */

import type { Severity } from "../engine/types";

export type GateDecision =
  | "auto_open"         // confidence >= 0.85 AND severity <= P2
  | "queue_steve"       // confidence >= 0.85 AND severity >= P1 (never auto-notify practitioner)
  | "queue_review"      // confidence 0.60 - 0.85
  | "below_threshold";  // confidence < 0.60 (no finding)

export interface GateInput {
  severity: Severity;
  confidence: number;
}

export const CONFIDENCE_THRESHOLDS = {
  AUTO: 0.85,
  REVIEW: 0.60,
} as const;

/**
 * Pure gate function. Given the worst severity across candidate findings and
 * their aggregate confidence, return the gate decision.
 *
 * Rules:
 *  - P0 never auto-opens, regardless of confidence (life-safety class).
 *  - P1 never auto-opens; requires Steve's manual confirmation.
 *  - P2/P3/ADVISORY auto-open at >= 0.85 confidence.
 *  - 0.60 - 0.85 -> human review queue.
 *  - < 0.60 -> log-only, no finding.
 */
export function gate(input: GateInput): GateDecision {
  const { severity, confidence } = input;
  if (confidence < CONFIDENCE_THRESHOLDS.REVIEW) return "below_threshold";
  if (confidence < CONFIDENCE_THRESHOLDS.AUTO) return "queue_review";
  // confidence >= 0.85
  if (severity === "P0" || severity === "P1") return "queue_steve";
  return "auto_open";
}

/**
 * Convenience: pick the highest severity from a list. Mirrors the engine
 * helper but lives here so the gate has no coupling to the finding type.
 */
const SEVERITY_ORDER: Severity[] = ["ADVISORY", "P3", "P2", "P1", "P0"];
export function worstSeverity(sevs: Severity[]): Severity {
  if (sevs.length === 0) return "ADVISORY";
  return sevs.reduce((acc, s) =>
    SEVERITY_ORDER.indexOf(s) > SEVERITY_ORDER.indexOf(acc) ? s : acc,
  );
}
