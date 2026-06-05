// Prompt 175l (2026-06-05): canonical-ingest pure-helper tests.
//
// computeIdentityKey decides which normalized identity an upsert is
// keyed by. The mapping rules are deterministic and worth pinning so a
// regression on the priority order does not silently duplicate rows.

import { describe, it, expect } from 'vitest';
import { computeIdentityKey } from '@/lib/caq/supplements/canonical-ingest';

describe('computeIdentityKey', () => {
  it('prefers UPC when a numeric 12-digit UPC is present', () => {
    expect(
      computeIdentityKey({
        upc: '850049609517',
        brand: 'Codeage',
        productName: 'Whatever',
        source: 'user_scan',
      }),
    ).toBe('upc:850049609517');
  });

  it('accepts EAN-13 length under the UPC branch', () => {
    expect(
      computeIdentityKey({
        upc: '0123456789012',
        productName: 'X',
        source: 'user_scan',
      }),
    ).toBe('upc:0123456789012');
  });

  it('falls through to NPN when UPC is absent and NPN is exactly 8 digits', () => {
    expect(
      computeIdentityKey({
        upc: null,
        npn: '80125465',
        productName: 'Alpha GPC',
        source: 'user_scan',
      }),
    ).toBe('npn:80125465');
  });

  it('rejects a non-numeric UPC and falls through to brand+name+strength', () => {
    expect(
      computeIdentityKey({
        upc: 'B0G3JP8658', // Amazon ASIN, not a real UPC
        brand: 'Vibrant Naturals',
        productName: 'Alpha GPC',
        primaryStrength: '600 mg',
        source: 'user_scan',
      }),
    ).toBe('brand:vibrant_naturals|name:alpha_gpc|strength:600_mg');
  });

  it('omits brand from the composite key when brand is absent', () => {
    expect(
      computeIdentityKey({
        productName: 'Alpha GPC',
        primaryStrength: '600 mg',
        source: 'user_scan',
      }),
    ).toBe('name:alpha_gpc|strength:600_mg');
  });

  it('returns null when no identifying information is present', () => {
    expect(
      computeIdentityKey({
        source: 'user_scan',
        productName: '',
      }),
    ).toBeNull();
  });

  it('lowercases + collapses whitespace + strips punctuation in the composite key', () => {
    expect(
      computeIdentityKey({
        brand: 'CodeAge!',
        productName: 'Liposomal Vitamin C',
        primaryStrength: '1,500 mg',
        source: 'user_scan',
      }),
    ).toBe('brand:codeage|name:liposomal_vitamin_c|strength:1500_mg');
  });
});
