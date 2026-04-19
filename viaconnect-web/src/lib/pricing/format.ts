// Prompt #90 Phase 2: Price formatting utilities.
// Pure functions, no deps. Prices are stored in integer cents end-to-end.

export interface FormatPriceOptions {
  currency?: string;
  showCents?: boolean;
  /** Render zero cents as "Free" rather than "$0.00". Defaults to true. */
  freeLabel?: boolean;
}

export function formatPriceFromCents(
  cents: number,
  options: FormatPriceOptions = {},
): string {
  const { currency = 'USD', showCents = true, freeLabel = true } = options;
  if (cents === 0 && freeLabel) return 'Free';
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(dollars);
}

export function formatDiscountPercent(percent: number): string {
  return `${percent}% off`;
}

export function formatCentsDifference(a: number, b: number): string {
  return formatPriceFromCents(Math.abs(a - b));
}

export function centsToDollarsNumber(cents: number): number {
  return Math.round(cents) / 100;
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}
