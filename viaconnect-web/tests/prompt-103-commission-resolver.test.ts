// Prompt #103 Phase 6: Commission resolver tests.

import { describe, it, expect } from 'vitest';
import { resolveCommissionRate } from '@/lib/categories/commission-resolver';

describe('resolveCommissionRate', () => {
  it('prefers product override when set', () => {
    expect(resolveCommissionRate({
      product_override_rate_pct: 22.5,
      category_default_rate_pct: 15,
    })).toEqual({ rate_pct: 22.5, source: 'product_override' });
  });

  it('falls back to category default when product override is null', () => {
    expect(resolveCommissionRate({
      product_override_rate_pct: null,
      category_default_rate_pct: 18,
    })).toEqual({ rate_pct: 18, source: 'category_default' });
  });

  it('returns none when both are null', () => {
    expect(resolveCommissionRate({
      product_override_rate_pct: null,
      category_default_rate_pct: null,
    })).toEqual({ rate_pct: null, source: 'none' });
  });

  it('treats zero as a valid override (not a null fallback)', () => {
    expect(resolveCommissionRate({
      product_override_rate_pct: 0,
      category_default_rate_pct: 15,
    })).toEqual({ rate_pct: 0, source: 'product_override' });
  });

  it('treats zero as a valid category default', () => {
    expect(resolveCommissionRate({
      product_override_rate_pct: null,
      category_default_rate_pct: 0,
    })).toEqual({ rate_pct: 0, source: 'category_default' });
  });
});
