// Prompt #100 MAP Enforcement — row + domain types.

export type MAPPricingTier = 'L1' | 'L2';
export type MAPSeverity = 'yellow' | 'orange' | 'red' | 'black';
export type MAPViolationStatus =
  | 'active'
  | 'notified'
  | 'acknowledged'
  | 'remediated'
  | 'escalated'
  | 'dismissed'
  | 'investigating';
export type MAPMonitorSource =
  | 'practitioner_website'
  | 'amazon'
  | 'instagram_shop'
  | 'shopify'
  | 'google_shopping'
  | 'ebay';
export type MAPComplianceTier = 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Probation';

/** Revenue Intelligence pricing-status pill states.
 *  #100 §4.6 introduced the first six. Prompt #101 adds `waived`
 *  (active MAP waiver) and `vip_exempt` (active VIP exemption). */
export type MAPPillState =
  | 'compliant'
  | 'monitored'
  | 'warning'
  | 'violation'
  | 'critical'
  | 'exempt'
  | 'waived'
  | 'vip_exempt';

/** Pill precedence: higher-priority states win when multiple apply
 *  to the same SKU. Exempt (L3/L4) always wins; absolute-floor Black
 *  beats every suppression mechanism. */
export const MAP_PILL_PRECEDENCE: Record<MAPPillState, number> = {
  exempt: 100,
  critical: 90,
  violation: 80,
  warning: 70,
  waived: 60,
  vip_exempt: 50,
  monitored: 40,
  compliant: 10,
};

export function resolveHigherPriorityPill(a: MAPPillState, b: MAPPillState): MAPPillState {
  return MAP_PILL_PRECEDENCE[a] >= MAP_PILL_PRECEDENCE[b] ? a : b;
}

export interface MAPViolationRow {
  violationId: string;
  observationId: string;
  productId: string;
  practitionerId: string | null;
  policyId: string;
  severity: MAPSeverity;
  observedPriceCents: number;
  mapPriceCents: number;
  discountPctBelowMap: number;
  status: MAPViolationStatus;
  gracePeriodEndsAt: string;
  remediationDeadlineAt: string;
  notifiedAt: string | null;
  acknowledgedAt: string | null;
  remediatedAt: string | null;
  escalatedAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
}

export interface MAPComplianceScoreRow {
  scoreId: string;
  practitionerId: string;
  score: number;
  mapComplianceTier: MAPComplianceTier;
  yellowViolations90d: number;
  orangeViolations90d: number;
  redViolations90d: number;
  blackViolations90d: number;
  daysSinceLastViolation: number;
  selfReportedRemediations: number;
  calculatedAt: string;
  calculatedDate: string;
}
