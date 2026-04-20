// Prompt #100 — MAP severity classifier tests.

import { describe, it, expect } from 'vitest';
import {
  classifyMAPSeverity,
  discountPctBelowMAP,
  SEVERITY_LABEL,
  SEVERITY_TONE,
} from '@/lib/map/severity';

describe('classifyMAPSeverity', () => {
  it('returns null for at-MAP and above-MAP', () => {
    expect(classifyMAPSeverity({
      observedPriceCents: 10499, mapPriceCents: 10499, ingredientCostFloorCents: 4000,
    })).toBeNull();
    expect(classifyMAPSeverity({
      observedPriceCents: 12000, mapPriceCents: 10499, ingredientCostFloorCents: 4000,
    })).toBeNull();
  });

  it('returns yellow for 1 to 5% below MAP', () => {
    expect(classifyMAPSeverity({
      observedPriceCents: 9999, mapPriceCents: 10499, ingredientCostFloorCents: 4000,
    })).toBe('yellow');
  });

  it('returns orange for 5 to 15% below MAP', () => {
    expect(classifyMAPSeverity({
      observedPriceCents: 9500, mapPriceCents: 10499, ingredientCostFloorCents: 4000,
    })).toBe('orange');
  });

  it('returns red for more than 15% below MAP', () => {
    expect(classifyMAPSeverity({
      observedPriceCents: 8000, mapPriceCents: 10499, ingredientCostFloorCents: 4000,
    })).toBe('red');
  });

  it('returns black when observed is below ingredient cost floor', () => {
    expect(classifyMAPSeverity({
      observedPriceCents: 3500, mapPriceCents: 10499, ingredientCostFloorCents: 4000,
    })).toBe('black');
  });

  it('black beats red when both could apply', () => {
    // Observed 3500, MAP 10499 (67% below = red territory),
    // but ingredient floor is 4000 (below floor = black).
    expect(classifyMAPSeverity({
      observedPriceCents: 3500, mapPriceCents: 10499, ingredientCostFloorCents: 4000,
    })).toBe('black');
  });

  it('returns null for invalid inputs', () => {
    expect(classifyMAPSeverity({
      observedPriceCents: -100, mapPriceCents: 10499, ingredientCostFloorCents: 4000,
    })).toBeNull();
    expect(classifyMAPSeverity({
      observedPriceCents: 9999, mapPriceCents: 0, ingredientCostFloorCents: 4000,
    })).toBeNull();
  });
});

describe('discountPctBelowMAP', () => {
  it('computes percentage below MAP', () => {
    expect(discountPctBelowMAP(9000, 10000)).toBe(10);
    expect(discountPctBelowMAP(8500, 10000)).toBe(15);
  });
  it('returns 0 when observed >= MAP', () => {
    expect(discountPctBelowMAP(10000, 10000)).toBe(0);
    expect(discountPctBelowMAP(12000, 10000)).toBe(0);
  });
  it('rounds to 2 decimals', () => {
    expect(discountPctBelowMAP(9873, 10000)).toBe(1.27);
  });
  it('returns 0 for invalid MAP', () => {
    expect(discountPctBelowMAP(5000, 0)).toBe(0);
  });
});

describe('severity tone tokens', () => {
  it('covers every severity level', () => {
    expect(Object.keys(SEVERITY_TONE).sort()).toEqual(['black', 'orange', 'red', 'yellow']);
    expect(Object.keys(SEVERITY_LABEL).sort()).toEqual(['black', 'orange', 'red', 'yellow']);
  });
});
