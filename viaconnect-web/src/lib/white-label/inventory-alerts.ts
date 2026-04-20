// Prompt #96 Phase 6: Low-inventory classifier.
//
// Pure function. Maps current inventory + recent sales velocity to one
// of four alert levels. The daily Edge Function dispatches notifications
// based on the result; the practitioner inventory dashboard renders the
// same status as a badge.

export const LOW_INVENTORY_THRESHOLDS_DAYS = {
  low: 45,
  urgent: 21,
  out: 0,
} as const;

// Per spec: recommend 90 to 120 days of velocity on reorder. We
// pick the midpoint so the recommendation is consistent.
const REORDER_RECOMMEND_DAYS = 105;

export type LowInventoryStatus = 'ok' | 'low' | 'urgent' | 'out_of_stock' | 'indeterminate';

export interface LowInventoryInput {
  units_available: number;
  daily_velocity: number;       // 30-day rolling units sold per day
}

export interface LowInventoryResult {
  status: LowInventoryStatus;
  days_remaining: number | null;
  reorder_recommended_units: number;
}

export function classifyLowInventory(input: LowInventoryInput): LowInventoryResult {
  const units = input.units_available;
  const velocity = input.daily_velocity;

  if (units <= 0) {
    return { status: 'out_of_stock', days_remaining: 0, reorder_recommended_units: 0 };
  }
  if (velocity <= 0) {
    return { status: 'indeterminate', days_remaining: null, reorder_recommended_units: 0 };
  }

  const daysRemaining = units / velocity;
  let status: LowInventoryStatus;
  if (daysRemaining < LOW_INVENTORY_THRESHOLDS_DAYS.urgent) status = 'urgent';
  else if (daysRemaining < LOW_INVENTORY_THRESHOLDS_DAYS.low) status = 'low';
  else status = 'ok';

  return {
    status,
    days_remaining: Number(daysRemaining.toFixed(1)),
    reorder_recommended_units: Math.round(REORDER_RECOMMEND_DAYS * velocity),
  };
}
