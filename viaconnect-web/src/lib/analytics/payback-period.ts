// Prompt #94 Phase 2.2: Payback period calculator.
//
// Pure function. Walks the per-month contribution-margin curve and returns
// the (fractional) month at which cumulative margin first equals or exceeds
// CAC. Linear interpolation within the crossing month gives sub-month
// precision useful when comparing scenarios.

export interface PaybackResult {
  cac_cents: number;
  monthly_contribution_margins_cents: number[];
  payback_month: number | null;
  exceeds_36_months: boolean;
}

export function calculatePaybackPeriod(
  cacCents: number,
  monthlyContributionMargins: number[],
): PaybackResult {
  if (cacCents <= 0) {
    return {
      cac_cents: cacCents,
      monthly_contribution_margins_cents: monthlyContributionMargins,
      payback_month: 0,
      exceeds_36_months: false,
    };
  }

  let cumulative = 0;
  for (let i = 0; i < monthlyContributionMargins.length; i++) {
    cumulative += monthlyContributionMargins[i];
    if (cumulative >= cacCents) {
      const overshoot = cumulative - cacCents;
      const monthContribution = monthlyContributionMargins[i];
      // If the crossing month had zero margin we treat the boundary as the
      // integer; sub-month interpolation only makes sense when margin > 0.
      const fraction = monthContribution > 0
        ? 1 - overshoot / monthContribution
        : 1;
      return {
        cac_cents: cacCents,
        monthly_contribution_margins_cents: monthlyContributionMargins,
        payback_month: roundFraction(i + fraction),
        exceeds_36_months: false,
      };
    }
  }

  return {
    cac_cents: cacCents,
    monthly_contribution_margins_cents: monthlyContributionMargins,
    payback_month: null,
    exceeds_36_months: monthlyContributionMargins.length >= 36,
  };
}

function roundFraction(n: number): number {
  return Math.round(n * 100) / 100;
}
