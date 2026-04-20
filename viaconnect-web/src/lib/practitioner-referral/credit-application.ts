// Prompt #98 Phase 5: Pure credit-application cap + signing.
//
// Given a practitioner, the transaction they want to apply credits
// against, and the requested + available + total amounts, returns
// the final applied amount (capped at min of all three) and the
// signed ledger delta (negative for applications) the route layer
// should insert.
//
// Integer cents end-to-end; no floats.

import type { CreditLedgerEntryType } from './schema-types';

export type ApplicationEntryType = Extract<
  CreditLedgerEntryType,
  | 'applied_to_subscription'
  | 'applied_to_wholesale_order'
  | 'applied_to_certification_fee'
  | 'applied_to_level_3_fee'
  | 'applied_to_level_4_fee'
>;

export const VALID_APPLICATION_ENTRY_TYPES: readonly ApplicationEntryType[] = [
  'applied_to_subscription',
  'applied_to_wholesale_order',
  'applied_to_certification_fee',
  'applied_to_level_3_fee',
  'applied_to_level_4_fee',
];

export interface CreditApplicationInput {
  practitioner_id: string;
  transaction_type: ApplicationEntryType;
  transaction_reference_id: string;
  requested_cents: number;
  available_balance_cents: number;
  transaction_total_cents: number;
}

export interface CreditApplicationResult {
  ok: boolean;
  reason?: string;
  applied_cents: number;
  remaining_due_cents: number;
  ledger_amount_cents: number;     // signed; negative on applications
  new_balance_cents: number;
}

export function computeCreditApplication(input: CreditApplicationInput): CreditApplicationResult {
  const fallback = (reason: string): CreditApplicationResult => ({
    ok: false,
    reason,
    applied_cents: 0,
    remaining_due_cents: input.transaction_total_cents,
    ledger_amount_cents: 0,
    new_balance_cents: input.available_balance_cents,
  });

  if (!(VALID_APPLICATION_ENTRY_TYPES as readonly string[]).includes(input.transaction_type)) {
    return fallback(`Unknown transaction_type ${input.transaction_type}`);
  }
  if (input.requested_cents <= 0) {
    return fallback('Requested amount must be positive.');
  }
  if (input.available_balance_cents <= 0) {
    return fallback('No credit balance available.');
  }
  if (input.transaction_total_cents <= 0) {
    return fallback('Transaction total must be positive.');
  }

  const applied = Math.min(
    input.requested_cents,
    input.available_balance_cents,
    input.transaction_total_cents,
  );
  return {
    ok: true,
    applied_cents: applied,
    remaining_due_cents: input.transaction_total_cents - applied,
    ledger_amount_cents: -applied,
    new_balance_cents: input.available_balance_cents - applied,
  };
}
