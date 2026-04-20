// Prompt #96 Phase 6: First-Expire-First-Out lot picker.
//
// Pure function. Given a list of lots (units_available + expiration
// date) and a units_requested count, returns the per-lot picks needed
// to fulfill the order. Skips expired lots. Returns the maximum it can
// satisfy when total available is short of the request; the caller
// decides whether to allow partial fulfillment or roll the order to
// the next production run.

export interface FefoLot {
  lot_id: string;
  units_available: number;
  expiration_date: string;
  expired?: boolean;        // optional pre-classified flag
}

export interface FefoPick {
  lot_id: string;
  units: number;
}

export function pickLotsFefo(lots: FefoLot[], unitsRequested: number): FefoPick[] {
  if (unitsRequested <= 0) return [];
  const eligible = lots
    .filter((l) => !l.expired && l.units_available > 0)
    .sort((a, b) => a.expiration_date.localeCompare(b.expiration_date));

  const picks: FefoPick[] = [];
  let remaining = unitsRequested;
  for (const lot of eligible) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, lot.units_available);
    picks.push({ lot_id: lot.lot_id, units: take });
    remaining -= take;
  }
  return picks;
}
