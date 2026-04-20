// Prompt #98 Phase 4: Tax-earnings aggregate updater.
//
// Pure function. Given the prior aggregate row + a new earning amount,
// returns the next aggregate. Handles the $600 threshold-crossing
// edge so the form_1099_required flag flips on the FIRST earning that
// pushes the practitioner across, not retroactively.

import { TAX_FORM_1099_THRESHOLD_CENTS_DEFAULT } from './schema-types';

export function taxYearForDate(d: Date): number {
  return d.getUTCFullYear();
}

export interface TaxYearAggregate {
  tax_year: number;
  total_earned_cents: number;
  crossed_600_threshold: boolean;
  crossed_600_threshold_at: string | null;
  form_1099_required: boolean;
}

export function applyEarningToTaxYear(
  prior: TaxYearAggregate,
  earningCents: number,
  now: Date,
  thresholdCents: number = TAX_FORM_1099_THRESHOLD_CENTS_DEFAULT,
): TaxYearAggregate {
  const total = prior.total_earned_cents + Math.max(0, earningCents);
  const justCrossed = !prior.crossed_600_threshold && total >= thresholdCents;

  return {
    tax_year: prior.tax_year,
    total_earned_cents: total,
    crossed_600_threshold: prior.crossed_600_threshold || total >= thresholdCents,
    crossed_600_threshold_at: prior.crossed_600_threshold_at
      ?? (justCrossed ? now.toISOString() : null),
    form_1099_required: prior.form_1099_required || total >= thresholdCents,
  };
}
