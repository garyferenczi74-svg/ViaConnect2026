// Prompt #100 MAP Enforcement — commission claw-back event shape.
//
// Per §8, this prompt only emits the event. The #98 referral program
// (when its commission tables go live) consumes these events to
// compute the actual claw-back amount and apply it to the practitioner
// ledger.
//
// Severity → claw-back %:
//   Yellow  no claw-back
//   Orange  25% if sustained > 7 days without remediation
//   Red     50% of commission on affected SKU (current month)
//   Black   100% of commission on affected SKU + 30-day hold across
//           all SKUs (admin review required to release)

import type { MAPSeverity } from './types';

export interface ClawbackEventPayload {
  /** The map_violations.violation_id UUID. */
  violationId: string;
  /** Practitioner who owned the offending listing. Never emit
   *  anonymous violations — those are in the investigation queue. */
  practitionerId: string;
  productId: string;
  severity: MAPSeverity;
  /** Percentage of commission to claw back on the affected SKU,
   *  scoped to the current month. 0 means no claw-back. */
  clawbackPct: number;
  /** Whether a 30-day commission hold kicks in across all SKUs. */
  allSkuHold: boolean;
  /** How many days of hold to apply (only meaningful when
   *  allSkuHold is true). */
  holdDays: number;
  emittedAt: string;
}

const CLAWBACK_PCT: Record<MAPSeverity, number> = {
  yellow: 0,
  orange: 25,
  red: 50,
  black: 100,
};

/** Pure: derive the claw-back policy from a severity. The Orange
 *  25% only applies if the violation has gone unremediated beyond
 *  its grace window — the caller (escalation edge function) checks
 *  that before emitting. */
export function clawbackPolicyFor(severity: MAPSeverity): {
  clawbackPct: number;
  allSkuHold: boolean;
  holdDays: number;
} {
  return {
    clawbackPct: CLAWBACK_PCT[severity],
    allSkuHold: severity === 'black',
    holdDays: severity === 'black' ? 30 : 0,
  };
}

/** Pure: build the payload consumed by #98. Does not emit — the
 *  escalation edge function is responsible for writing it to the
 *  data_events bus. */
export function buildClawbackEventPayload(input: {
  violationId: string;
  practitionerId: string;
  productId: string;
  severity: MAPSeverity;
  now?: Date;
}): ClawbackEventPayload {
  const policy = clawbackPolicyFor(input.severity);
  return {
    violationId: input.violationId,
    practitionerId: input.practitionerId,
    productId: input.productId,
    severity: input.severity,
    clawbackPct: policy.clawbackPct,
    allSkuHold: policy.allSkuHold,
    holdDays: policy.holdDays,
    emittedAt: (input.now ?? new Date()).toISOString(),
  };
}

/** Pure: returns true if the event would be a no-op claw-back (yellow
 *  severity with no sustained-violation trigger). Used by tests. */
export function isNoOpClawback(severity: MAPSeverity): boolean {
  return CLAWBACK_PCT[severity] === 0;
}
