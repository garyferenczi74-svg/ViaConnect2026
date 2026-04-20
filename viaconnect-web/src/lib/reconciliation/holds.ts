// Prompt #102 Workstream B — MAP-violation hold pure logic.

export interface HoldInput {
  periodAccruedCents: number;
  rawHoldCents: number;
  existingClawbackCents: number;
}

/** §3.3: holds + clawbacks cannot exceed 100% of accrued. The excess
 *  rolls to the next period as NEGATIVE BALANCE, never as a debit the
 *  practitioner owes. This pure helper returns the clamped hold that
 *  should be applied this period, plus the excess to carry forward. */
export function clampHoldAgainstAccrued({
  periodAccruedCents,
  rawHoldCents,
  existingClawbackCents,
}: HoldInput): { appliedCents: number; carryForwardCents: number } {
  const roomForHold = Math.max(0, periodAccruedCents - existingClawbackCents);
  const applied = Math.min(rawHoldCents, roomForHold);
  const carry = Math.max(0, rawHoldCents - applied);
  return { appliedCents: applied, carryForwardCents: carry };
}
