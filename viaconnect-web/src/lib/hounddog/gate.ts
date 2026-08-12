/**
 * Thin wrapper around the confidence-gate config so hounddog callers don't
 * have to reach into compliance/config/. Re-exports the canonical gate.
 */

import type { Severity } from "@/lib/compliance/engine/types";
import { gate as coreGate, worstSeverity, CONFIDENCE_THRESHOLDS, type GateDecision } from "@/lib/compliance/config/confidence_gate";

export type { GateDecision };
export { CONFIDENCE_THRESHOLDS, worstSeverity };

export interface GateCandidate {
  ruleId: string;
  severity: Severity;
}

export function gateFindings(findings: GateCandidate[], confidence: number): GateDecision {
  if (findings.length === 0) return "below_threshold";
  const worst = worstSeverity(findings.map((f) => f.severity));
  return coreGate({ severity: worst, confidence });
}

export function gateReason(decision: GateDecision): string {
  switch (decision) {
    case "auto_open":
      return "High-confidence finding within auto-safe severity band.";
    case "queue_steve":
      return "High-severity finding requires Steve Rica manual confirmation.";
    case "queue_review":
      return "Mid-confidence candidate; route to human review.";
    case "below_threshold":
      return "Below confidence floor; log only, no finding.";
  }
}
