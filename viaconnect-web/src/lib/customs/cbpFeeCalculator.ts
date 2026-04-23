// Prompt #114 P2a: CBP Part 133 recordation fee calculator.
//
// Trademark (§ 133.3): $190 per International Class filed, $80 per IC on
// renewal. Copyrights (§ 133.31): $190 flat filing, $80 flat renewal;
// copyrights have no class breakout so icCount is always 1 internally.
//
// Pure TS, pure functions, no Supabase; safe to import from client and
// server. Rates match the hardcoded DEFAULTs on customs_recordation_classes
// (fee_cents=19000, renewal_fee_cents=8000) in 20260424000200_prompt_114_customs_schema.sql.

import type { CustomsRecordationType } from './types';

export const CBP_RATE_PER_IC_CENTS_INITIAL = 19_000;   // $190.00
export const CBP_RATE_PER_IC_CENTS_RENEWAL = 8_000;    // $80.00
export const CBP_COPYRIGHT_FLAT_CENTS_INITIAL = 19_000; // $190.00 flat
export const CBP_COPYRIGHT_FLAT_CENTS_RENEWAL = 8_000;  // $80.00 flat
export const MIN_INTERNATIONAL_CLASS = 1;
export const MAX_INTERNATIONAL_CLASS = 45;

export interface RecordationFeeQuote {
  recordation_type: CustomsRecordationType;
  ic_count: number;
  initial_fee_cents: number;
  renewal_fee_cents: number;
  ceo_approval_required: boolean;
  /** Per-IC breakdown (trademarks) or single-row flat (copyrights). */
  line_items: Array<{
    label: string;
    initial_cents: number;
    renewal_cents: number;
  }>;
}

export const CEO_APPROVAL_THRESHOLD_CENTS = 100_000;  // $1,000

export function computeRecordationFees(input: {
  recordation_type: CustomsRecordationType;
  ic_count: number;
}): RecordationFeeQuote {
  const { recordation_type, ic_count } = input;

  if (recordation_type === 'copyright') {
    if (ic_count !== 1) {
      throw new Error(
        `Copyright recordations do not have International Classes; ic_count must be 1, got ${ic_count}`,
      );
    }
    return {
      recordation_type,
      ic_count: 1,
      initial_fee_cents: CBP_COPYRIGHT_FLAT_CENTS_INITIAL,
      renewal_fee_cents: CBP_COPYRIGHT_FLAT_CENTS_RENEWAL,
      ceo_approval_required: CBP_COPYRIGHT_FLAT_CENTS_INITIAL > CEO_APPROVAL_THRESHOLD_CENTS,
      line_items: [
        {
          label: 'Copyright recordation flat fee',
          initial_cents: CBP_COPYRIGHT_FLAT_CENTS_INITIAL,
          renewal_cents: CBP_COPYRIGHT_FLAT_CENTS_RENEWAL,
        },
      ],
    };
  }

  if (!Number.isInteger(ic_count) || ic_count < MIN_INTERNATIONAL_CLASS || ic_count > MAX_INTERNATIONAL_CLASS) {
    throw new Error(
      `Trademark recordations require ic_count between ${MIN_INTERNATIONAL_CLASS} and ${MAX_INTERNATIONAL_CLASS}; got ${ic_count}`,
    );
  }

  const initial = ic_count * CBP_RATE_PER_IC_CENTS_INITIAL;
  const renewal = ic_count * CBP_RATE_PER_IC_CENTS_RENEWAL;

  return {
    recordation_type,
    ic_count,
    initial_fee_cents: initial,
    renewal_fee_cents: renewal,
    ceo_approval_required: initial > CEO_APPROVAL_THRESHOLD_CENTS,
    line_items: Array.from({ length: ic_count }, (_, i) => ({
      label: `International Class slot ${i + 1}`,
      initial_cents: CBP_RATE_PER_IC_CENTS_INITIAL,
      renewal_cents: CBP_RATE_PER_IC_CENTS_RENEWAL,
    })),
  };
}

export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
