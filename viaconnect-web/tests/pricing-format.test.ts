import { describe, it, expect } from 'vitest';
import {
  formatPriceFromCents,
  formatDiscountPercent,
  formatCentsDifference,
  centsToDollarsNumber,
  dollarsToCents,
} from '@/lib/pricing/format';

describe('format', () => {
  it('renders zero as "Free" by default', () => {
    expect(formatPriceFromCents(0)).toBe('Free');
  });
  it('renders zero as $0.00 when freeLabel=false', () => {
    expect(formatPriceFromCents(0, { freeLabel: false })).toBe('$0.00');
  });
  it('formats cents to USD with cents visible', () => {
    expect(formatPriceFromCents(888)).toBe('$8.88');
    expect(formatPriceFromCents(28800)).toBe('$288.00');
    expect(formatPriceFromCents(118888)).toBe('$1,188.88');
  });
  it('can hide decimals', () => {
    expect(formatPriceFromCents(2888, { showCents: false })).toBe('$29');
  });
  it('formats discount percent', () => {
    expect(formatDiscountPercent(25)).toBe('25% off');
  });
  it('formats cents difference as positive amount', () => {
    expect(formatCentsDifference(10000, 4888)).toBe('$51.12');
    expect(formatCentsDifference(4888, 10000)).toBe('$51.12');
  });
  it('converts cents to dollars number and back', () => {
    expect(centsToDollarsNumber(12345)).toBe(123.45);
    expect(dollarsToCents(123.45)).toBe(12345);
  });
});
