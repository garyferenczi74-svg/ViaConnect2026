// Prompt #102 Workstream B — reconciliation types.

export type ReconciliationLineType =
  | 'accrual'
  | 'refund_clawback'
  | 'map_violation_hold'
  | 'manual_adjustment';

export type ReconciliationRunStatus =
  | 'reconciled'
  | 'paid_out'
  | 'rolled_to_next_period'
  | 'held_pending_dispute';

export interface ReconciliationRun {
  runId: string;
  practitionerId: string;
  periodStart: string;
  periodEnd: string;
  grossAccruedCents: number;
  totalClawbacksCents: number;
  totalHoldsCents: number;
  netPayableCents: number;
  marginFloorBreach: boolean;
  status: ReconciliationRunStatus;
}

export interface ReconciliationLine {
  lineId: string;
  runId: string;
  sourceAccrualId: string | null;
  sourceOrderId: string | null;
  lineType: ReconciliationLineType;
  amountCents: number;
  description: string | null;
  relatedViolationId: string | null;
}
