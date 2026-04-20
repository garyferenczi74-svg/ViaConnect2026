// Prompt #102 Workstream B — #94 margin-floor defense-in-depth.
// Accrual logic in #98 already enforces the floor; this layer is a
// second check before money moves.

export const MARGIN_FLOOR_PCT = 0.42;

export interface MarginCheckInput {
  orderNetRevenueCents: number;
  orderCostCents: number;
  proposedCommissionCents: number;
}

/** Pure: returns true if paying out `proposedCommissionCents` would
 *  leave the post-commission contribution margin at or above 42%. */
export function wouldPreserveMarginFloor({
  orderNetRevenueCents,
  orderCostCents,
  proposedCommissionCents,
}: MarginCheckInput): boolean {
  if (orderNetRevenueCents <= 0) return false;
  const contribution = orderNetRevenueCents - orderCostCents - proposedCommissionCents;
  const marginPct = contribution / orderNetRevenueCents;
  return marginPct >= MARGIN_FLOOR_PCT;
}

/** Pure: the max commission that would still preserve the floor. */
export function maxCommissionPreservingFloorCents({
  orderNetRevenueCents,
  orderCostCents,
}: Pick<MarginCheckInput, 'orderNetRevenueCents' | 'orderCostCents'>): number {
  if (orderNetRevenueCents <= 0) return 0;
  const floorContribution = orderNetRevenueCents * MARGIN_FLOOR_PCT;
  const max = orderNetRevenueCents - orderCostCents - floorContribution;
  return Math.max(0, Math.floor(max));
}
