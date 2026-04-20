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

/** Revenue Intelligence pricing-status pill states (§4.6). */
export type MAPPillState =
  | 'compliant'
  | 'monitored'
  | 'warning'
  | 'violation'
  | 'critical'
  | 'exempt';

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
