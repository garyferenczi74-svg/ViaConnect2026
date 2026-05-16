// Tests for scan-tier.ts and caq-xref.ts (Prompt #169 T1 foundation).
//
// Covers:
//   resolveScanTier: always returns 1 for all 16 boolean input combinations.
//   flagDemographicDelta: boundary precision at exactly 5.0 (NOT flagged)
//                          and at 5.01 (flagged); both fields together.

import { describe, it, expect } from 'vitest';
import { resolveScanTier } from '../scan-tier';
import { flagDemographicDelta } from '../caq-xref';

// === resolveScanTier ===

describe('resolveScanTier', () => {
  // Generate all 16 combinations of the 4 boolean flags.
  const bools = [false, true] as const;
  const combinations = bools.flatMap(hasLidar =>
    bools.flatMap(hasArCoreDepth =>
      bools.flatMap(hasTrueDepth =>
        bools.map(hasCompletedGenex360Panel => ({
          hasLidar,
          hasArCoreDepth,
          hasTrueDepth,
          hasCompletedGenex360Panel,
        }))
      )
    )
  );

  it('always returns 1 across all 16 input combinations (Phase 1 lock)', () => {
    for (const input of combinations) {
      expect(resolveScanTier(input)).toBe(1);
    }
    expect(combinations).toHaveLength(16);
  });

  it('returns 1 when all flags are false', () => {
    expect(
      resolveScanTier({
        hasLidar: false,
        hasArCoreDepth: false,
        hasTrueDepth: false,
        hasCompletedGenex360Panel: false,
      }),
    ).toBe(1);
  });

  it('returns 1 when all flags are true', () => {
    expect(
      resolveScanTier({
        hasLidar: true,
        hasArCoreDepth: true,
        hasTrueDepth: true,
        hasCompletedGenex360Panel: true,
      }),
    ).toBe(1);
  });
});

// === flagDemographicDelta ===

describe('flagDemographicDelta', () => {
  const base = { height_cm: 175, weight_kg: 75 };

  // === Height boundary ===

  it('does NOT flag when height delta is exactly 5.0 cm (boundary: strictly greater than)', () => {
    const result = flagDemographicDelta(
      { height_cm: 180, weight_kg: 75 },
      base,
    );
    expect(result.flagged).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  it('flags when height delta is 5.01 cm (just above threshold)', () => {
    const result = flagDemographicDelta(
      { height_cm: 180.01, weight_kg: 75 },
      base,
    );
    expect(result.flagged).toBe(true);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toContain('Height discrepancy');
  });

  it('does NOT flag when height delta is exactly 5.0 cm in the negative direction', () => {
    const result = flagDemographicDelta(
      { height_cm: 170, weight_kg: 75 },
      base,
    );
    expect(result.flagged).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  // === Weight boundary ===

  it('does NOT flag when weight delta is exactly 5.0 kg (boundary: strictly greater than)', () => {
    const result = flagDemographicDelta(
      { height_cm: 175, weight_kg: 80 },
      base,
    );
    expect(result.flagged).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  it('flags when weight delta is 5.01 kg (just above threshold)', () => {
    const result = flagDemographicDelta(
      { height_cm: 175, weight_kg: 80.01 },
      base,
    );
    expect(result.flagged).toBe(true);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toContain('Weight discrepancy');
  });

  it('does NOT flag when weight delta is exactly 5.0 kg in the negative direction', () => {
    const result = flagDemographicDelta(
      { height_cm: 175, weight_kg: 70 },
      base,
    );
    expect(result.flagged).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  // === Both fields exceed threshold ===

  it('flags both height and weight when both exceed threshold', () => {
    const result = flagDemographicDelta(
      { height_cm: 181, weight_kg: 82 },
      base,
    );
    expect(result.flagged).toBe(true);
    expect(result.reasons).toHaveLength(2);
    expect(result.reasons[0]).toContain('Height discrepancy');
    expect(result.reasons[1]).toContain('Weight discrepancy');
  });

  // === Identical inputs ===

  it('returns no flag when scan and CAQ values are identical', () => {
    const result = flagDemographicDelta(base, base);
    expect(result.flagged).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });
});
