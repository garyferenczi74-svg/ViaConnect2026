// Prompt #102 Workstream B — reconciliation pipeline pure core.
// The edge function wraps DB IO around this function.

import type { ReconciliationLineType } from './types';
import { clampHoldAgainstAccrued } from './holds';
import { computeRefundClawbackCents } from './clawbacks';

export interface PipelineAccrual {
  accrualId: string;
  orderId: string | null;
  accrualAmountCents: number;
  orderTotalCents: number;
  orderRefundedAmountCents: number;
}

export interface PipelineHold {
  violationId: string;
  amountCents: number;
}

export interface PipelineInput {
  accruals: readonly PipelineAccrual[];
  holds: readonly PipelineHold[];
}

export interface PipelineLineDraft {
  sourceAccrualId: string | null;
  sourceOrderId: string | null;
  lineType: ReconciliationLineType;
  amountCents: number;
  relatedViolationId: string | null;
  description: string;
}

export interface PipelineOutcome {
  lines: PipelineLineDraft[];
  grossAccruedCents: number;
  totalClawbacksCents: number;
  totalHoldsCents: number;
  netPayableCents: number;
  carryForwardHoldCents: number;
}

/** Pure: given accruals + holds, produce the line drafts the caller
 *  writes as commission_reconciliation_lines + the aggregate figures
 *  for the run row. */
export function runReconciliationPipeline(input: PipelineInput): PipelineOutcome {
  const lines: PipelineLineDraft[] = [];
  let grossAccrued = 0;
  let totalClawbacks = 0;

  for (const a of input.accruals) {
    lines.push({
      sourceAccrualId: a.accrualId,
      sourceOrderId: a.orderId,
      lineType: 'accrual',
      amountCents: a.accrualAmountCents,
      relatedViolationId: null,
      description: 'Commission accrual',
    });
    grossAccrued += a.accrualAmountCents;

    const clawback = computeRefundClawbackCents({
      accrualAmountCents: a.accrualAmountCents,
      refundedAmountCents: a.orderRefundedAmountCents,
      orderTotalCents: a.orderTotalCents,
    });
    if (clawback > 0) {
      lines.push({
        sourceAccrualId: a.accrualId,
        sourceOrderId: a.orderId,
        lineType: 'refund_clawback',
        amountCents: -clawback,
        relatedViolationId: null,
        description: 'Refund claw-back',
      });
      totalClawbacks += clawback;
    }
  }

  const rawHoldTotal = input.holds.reduce((sum, h) => sum + h.amountCents, 0);
  const { appliedCents: appliedHolds, carryForwardCents: holdCarryForward } = clampHoldAgainstAccrued({
    periodAccruedCents: grossAccrued,
    rawHoldCents: rawHoldTotal,
    existingClawbackCents: totalClawbacks,
  });

  if (appliedHolds > 0) {
    // Distribute applied holds across the source violations proportionally.
    let remaining = appliedHolds;
    for (const h of input.holds) {
      if (remaining <= 0) break;
      const share = Math.min(remaining, h.amountCents);
      if (share > 0) {
        lines.push({
          sourceAccrualId: null,
          sourceOrderId: null,
          lineType: 'map_violation_hold',
          amountCents: -share,
          relatedViolationId: h.violationId,
          description: 'MAP violation hold',
        });
        remaining -= share;
      }
    }
  }

  const netPayable = Math.max(0, grossAccrued - totalClawbacks - appliedHolds);
  return {
    lines,
    grossAccruedCents: grossAccrued,
    totalClawbacksCents: totalClawbacks,
    totalHoldsCents: appliedHolds,
    netPayableCents: netPayable,
    carryForwardHoldCents: holdCarryForward,
  };
}
