// Prompt #96 Phase 6: Storage fee calculator.
//
// Per spec: 60 day free window at the ViaCura warehouse, then $0.02
// per unit per day. Both numbers are governed pricing parameters per
// Prompt #95 (Phase 7 wires them to the white_label_parameters table);
// callers may pass overrides for per-practitioner contractual variance.

export const FREE_STORAGE_DAYS_DEFAULT = 60;
export const STORAGE_FEE_CENTS_PER_UNIT_DAY_DEFAULT = 2;

export interface StorageFeeInput {
  units: number;
  daysAtViacura: number;
  freeDays?: number;
  centsPerUnitDay?: number;
}

export interface StorageFeeResult {
  chargeable_days: number;
  fee_cents: number;
}

export function calculateStorageFee(input: StorageFeeInput): StorageFeeResult {
  const freeDays = input.freeDays ?? FREE_STORAGE_DAYS_DEFAULT;
  const cpud = input.centsPerUnitDay ?? STORAGE_FEE_CENTS_PER_UNIT_DAY_DEFAULT;

  const chargeableDays = Math.max(0, input.daysAtViacura - freeDays);
  const fee = Math.max(0, input.units) * chargeableDays * cpud;

  return { chargeable_days: chargeableDays, fee_cents: fee };
}
