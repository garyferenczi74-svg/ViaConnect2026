// Prompt #102 Workstream B — tax reporting thresholds.

/** IRS 1099-NEC reporting threshold for US practitioners. */
export const US_1099_NEC_THRESHOLD_CENTS = 600_00;

/** CRA T4A reporting threshold for Canadian practitioners. */
export const CA_T4A_THRESHOLD_CENTS = 500_00;

export type TaxJurisdiction = 'US' | 'CA' | 'other';

export function reportingThresholdCents(jurisdiction: TaxJurisdiction): number {
  switch (jurisdiction) {
    case 'US': return US_1099_NEC_THRESHOLD_CENTS;
    case 'CA': return CA_T4A_THRESHOLD_CENTS;
    case 'other': return Number.POSITIVE_INFINITY;
  }
}

export function requiresYearEndDocument(
  totalPaidCents: number,
  jurisdiction: TaxJurisdiction,
): boolean {
  return totalPaidCents >= reportingThresholdCents(jurisdiction);
}
