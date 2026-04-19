// Prompt #95 Phase 5: pure grandfathering helper tests.

import { describe, it, expect } from 'vitest';
import {
  computeExpirationDate,
  resolveBindingApplies,
  resolveEffectivePricePure,
} from '@/lib/governance/grandfathering';

const BASE = new Date('2026-05-01T12:00:00.000Z');

// ---- computeExpirationDate ----------------------------------------------

describe('computeExpirationDate', () => {
  it('indefinite returns null', () => {
    expect(computeExpirationDate('indefinite', BASE)).toBeNull();
  });

  it('twelve_months adds 12 calendar months (DST-agnostic UTC)', () => {
    const r = computeExpirationDate('twelve_months', BASE)!;
    expect(r.toISOString()).toBe('2027-05-01T12:00:00.000Z');
  });

  it('six_months adds 6 calendar months', () => {
    const r = computeExpirationDate('six_months', BASE)!;
    expect(r.toISOString()).toBe('2026-11-01T12:00:00.000Z');
  });

  it('thirty_days adds 30 days', () => {
    const r = computeExpirationDate('thirty_days', BASE)!;
    // May 1 + 30 days = May 31
    expect(r.toISOString()).toBe('2026-05-31T12:00:00.000Z');
  });

  it('throws on no_grandfathering (callers must skip binding creation)', () => {
    expect(() => computeExpirationDate('no_grandfathering', BASE)).toThrow(/no_grandfathering/);
  });

  it('twelve_months across a leap-year boundary is still 12 calendar months', () => {
    const leapBase = new Date('2028-02-29T00:00:00.000Z');
    const r = computeExpirationDate('twelve_months', leapBase)!;
    // Feb 29 + 12 months normalizes to Feb 29 / Mar 1 depending on year; JS Date
    // setUTCMonth jumps to Feb 28 / Mar 1. Accept either.
    expect(r.getUTCFullYear()).toBe(2029);
    expect([1, 2]).toContain(r.getUTCMonth()); // 1=Feb, 2=Mar
  });
});

// ---- resolveBindingApplies ----------------------------------------------

describe('resolveBindingApplies', () => {
  it('null expiry always applies (indefinite)', () => {
    expect(resolveBindingApplies(null, BASE)).toBe(true);
  });

  it('future expiry applies', () => {
    const future = new Date(BASE.getTime() + 86_400_000);
    expect(resolveBindingApplies(future, BASE)).toBe(true);
  });

  it('past expiry does not apply', () => {
    const past = new Date(BASE.getTime() - 86_400_000);
    expect(resolveBindingApplies(past, BASE)).toBe(false);
  });

  it('expiry exactly at now does NOT apply (strict <)', () => {
    expect(resolveBindingApplies(BASE, BASE)).toBe(false);
  });

  it('accepts ISO strings as well as Date instances', () => {
    const future = new Date(BASE.getTime() + 86_400_000).toISOString();
    expect(resolveBindingApplies(future, BASE)).toBe(true);
  });
});

// ---- resolveEffectivePricePure ------------------------------------------

describe('resolveEffectivePricePure', () => {
  it('no binding falls back to list price (cents)', () => {
    const r = resolveEffectivePricePure({
      hasActiveBinding: false,
      boundValueCents: 4900,
      boundValuePercent: null,
      currentListValueCents: 5400,
      currentListValuePercent: null,
      bindingExpiresAt: null,
    });
    expect(r.effectiveCents).toBe(5400);
    expect(r.isGrandfathered).toBe(false);
  });

  it('active indefinite binding uses bound price', () => {
    const r = resolveEffectivePricePure({
      hasActiveBinding: true,
      boundValueCents: 4900,
      boundValuePercent: null,
      currentListValueCents: 5400,
      currentListValuePercent: null,
      bindingExpiresAt: null,
    });
    expect(r.effectiveCents).toBe(4900);
    expect(r.isGrandfathered).toBe(true);
  });

  it('expired binding falls back to list price', () => {
    const past = new Date(BASE.getTime() - 86_400_000);
    const r = resolveEffectivePricePure({
      hasActiveBinding: true,
      boundValueCents: 4900,
      boundValuePercent: null,
      currentListValueCents: 5400,
      currentListValuePercent: null,
      bindingExpiresAt: past,
      now: BASE,
    });
    expect(r.effectiveCents).toBe(5400);
    expect(r.isGrandfathered).toBe(false);
  });

  it('still-valid time-bounded binding uses bound price', () => {
    const future = new Date(BASE.getTime() + 86_400_000 * 30);
    const r = resolveEffectivePricePure({
      hasActiveBinding: true,
      boundValueCents: 4900,
      boundValuePercent: null,
      currentListValueCents: 5400,
      currentListValuePercent: null,
      bindingExpiresAt: future,
      now: BASE,
    });
    expect(r.effectiveCents).toBe(4900);
    expect(r.isGrandfathered).toBe(true);
  });

  it('percent-change domains resolve against percent fields', () => {
    const r = resolveEffectivePricePure({
      hasActiveBinding: true,
      boundValueCents: null,
      boundValuePercent: 50,
      currentListValueCents: null,
      currentListValuePercent: 40,
      bindingExpiresAt: null,
    });
    expect(r.effectivePercent).toBe(50);
    expect(r.effectiveCents).toBeNull();
    expect(r.isGrandfathered).toBe(true);
  });

  it('no binding + null list price returns null effective', () => {
    const r = resolveEffectivePricePure({
      hasActiveBinding: false,
      boundValueCents: null,
      boundValuePercent: null,
      currentListValueCents: null,
      currentListValuePercent: null,
      bindingExpiresAt: null,
    });
    expect(r.effectiveCents).toBeNull();
    expect(r.effectivePercent).toBeNull();
    expect(r.isGrandfathered).toBe(false);
  });

  it('active binding with null bound values returns null effective (grandfathered but missing)', () => {
    const r = resolveEffectivePricePure({
      hasActiveBinding: true,
      boundValueCents: null,
      boundValuePercent: null,
      currentListValueCents: 5400,
      currentListValuePercent: null,
      bindingExpiresAt: null,
    });
    // isGrandfathered is true but the bound value is null; caller must
    // handle this case (e.g., fall back to list).
    expect(r.isGrandfathered).toBe(true);
    expect(r.effectiveCents).toBeNull();
  });
});
