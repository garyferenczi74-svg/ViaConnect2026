// Prompt #102 Workstream B — refund claw-back pure logic.

export interface ClawbackInput {
  accrualAmountCents: number;
  refundedAmountCents: number;
  orderTotalCents: number;
}

/** Pure: compute the claw-back amount proportional to the refund.
 *  Full refund claws the whole accrual; 30% refund claws 30% of the
 *  accrual. Clamps at the accrual amount (never negative claw-back,
 *  never more than 100% of what was accrued). */
export function computeRefundClawbackCents({
  accrualAmountCents,
  refundedAmountCents,
  orderTotalCents,
}: ClawbackInput): number {
  if (orderTotalCents <= 0 || accrualAmountCents <= 0) return 0;
  if (refundedAmountCents <= 0) return 0;
  const refundRatio = Math.min(1, refundedAmountCents / orderTotalCents);
  const clawback = Math.floor(accrualAmountCents * refundRatio);
  return Math.min(clawback, accrualAmountCents);
}
