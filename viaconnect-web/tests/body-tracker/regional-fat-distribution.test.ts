// Tests for the Phase 1 regional composition overlay (ViaConnect Prompt
// #169e(a), sex-only banding). Pure-logic only; the project's vitest config runs
// node-environment .test.ts, so the testable contract lives in the pure modules
// (the React hook + components are thin wrappers). Mirrors the existing
// heatmap-colors.test.ts / disordered-eating-safeguard.test.ts style.

import { describe, it, expect } from 'vitest';
import {
  MALE_DISTRIBUTION,
  FEMALE_DISTRIBUTION,
  AVERAGED_DISTRIBUTION,
  ratiosForPattern,
  sumRatios,
  BODY_REGIONS,
} from '@/lib/body-tracker/regional-distribution-ratios';
import {
  TEAL_HEX,
  ORANGE_HEX,
  segmentVolume,
  regionForKind,
  computeRegionVolumes,
  computeRegionDistribution,
  hexToHsl,
  lerpTealToOrange,
  normalizeToOwnRange,
  regionColorsFromDistribution,
  computeRegionalOverlay,
  resolveDistributionPattern,
  decideOverlaySuppression,
  type RegionVolumeSegment,
} from '@/lib/body-tracker/regional-fat-distribution';
import type { RegionalRatioSet } from '@/lib/body-tracker/regional-distribution-ratios';

// ===========================================================================
// Ratio constants (Section 4.4): each set sums to ~1.00, and the sex difference
// (male trunk-dominant, female lower-body-dominant) holds.
// ===========================================================================

describe('regional distribution ratios (Section 4.4)', () => {
  it('male set sums to ~1.00', () => {
    expect(sumRatios(MALE_DISTRIBUTION)).toBeCloseTo(1.0, 2);
  });

  it('female set sums to ~1.00 (within tolerance)', () => {
    // Spec female set is 0.400 / 0.140 / 0.350 / 0.090 = 0.980.
    expect(sumRatios(FEMALE_DISTRIBUTION)).toBeGreaterThanOrEqual(0.97);
    expect(sumRatios(FEMALE_DISTRIBUTION)).toBeLessThanOrEqual(1.01);
  });

  it('averaged set sums to ~1.00 and is the per-region mean of male+female', () => {
    expect(sumRatios(AVERAGED_DISTRIBUTION)).toBeCloseTo(0.991, 2);
    for (const region of BODY_REGIONS) {
      const mean = (MALE_DISTRIBUTION[region] + FEMALE_DISTRIBUTION[region]) / 2;
      // Spec rounds to 3 dp (e.g. trunk 0.463); allow rounding slack.
      expect(AVERAGED_DISTRIBUTION[region]).toBeCloseTo(mean, 2);
    }
  });

  it('encodes the sex difference: male trunk > female trunk; female legs > male legs', () => {
    expect(MALE_DISTRIBUTION.trunk).toBeGreaterThan(FEMALE_DISTRIBUTION.trunk);
    expect(FEMALE_DISTRIBUTION.legs).toBeGreaterThan(MALE_DISTRIBUTION.legs);
  });

  it('ratiosForPattern resolves each pattern; unknown falls back to averaged', () => {
    expect(ratiosForPattern('male')).toBe(MALE_DISTRIBUTION);
    expect(ratiosForPattern('female')).toBe(FEMALE_DISTRIBUTION);
    expect(ratiosForPattern('averaged')).toBe(AVERAGED_DISTRIBUTION);
    // @ts-expect-error  deliberately pass a bad value to prove the fallback.
    expect(ratiosForPattern('nonsense')).toBe(AVERAGED_DISTRIBUTION);
  });
});

// ===========================================================================
// Segment -> region mapping + volume (region volume comes from the primitive
// avatar geometry, NOT SMPL params).
// ===========================================================================

describe('regionForKind', () => {
  it('maps torso + joint to trunk', () => {
    expect(regionForKind('torso')).toBe('trunk');
    expect(regionForKind('joint')).toBe('trunk');
  });
  it('maps head + neck to head_neck', () => {
    expect(regionForKind('head')).toBe('head_neck');
    expect(regionForKind('neck')).toBe('head_neck');
  });
  it('maps arms (incl hands) to arms', () => {
    expect(regionForKind('upper_arm')).toBe('arms');
    expect(regionForKind('forearm')).toBe('arms');
    expect(regionForKind('hand')).toBe('arms');
  });
  it('maps legs (incl feet) to legs', () => {
    expect(regionForKind('thigh')).toBe('legs');
    expect(regionForKind('calf')).toBe('legs');
    expect(regionForKind('foot')).toBe('legs');
  });
});

describe('segmentVolume', () => {
  it('computes ellipsoid volume (4/3 pi rx ry rz)', () => {
    const v = segmentVolume({ kind: 'torso', radii: [1, 2, 3] });
    expect(v).toBeCloseTo((4 / 3) * Math.PI * 1 * 2 * 3, 6);
  });

  it('computes cylinder volume with height = halfLength*2 (mirrors renderer)', () => {
    // radii [rTop, rBottom, halfLength]; renderer uses rz*2 as height.
    const v = segmentVolume({ kind: 'thigh', radii: [2, 2, 5] });
    expect(v).toBeCloseTo(Math.PI * 2 * 2 * (5 * 2), 6);
  });

  it('treats negative / NaN radii as 0 (cannot poison the sum)', () => {
    expect(segmentVolume({ kind: 'torso', radii: [-1, 2, 3] })).toBe(0);
    expect(segmentVolume({ kind: 'torso', radii: [Number.NaN, 2, 3] })).toBe(0);
  });
});

describe('computeRegionVolumes', () => {
  it('sums segment volumes into the four regions', () => {
    const segments: RegionVolumeSegment[] = [
      { kind: 'torso', radii: [2, 2, 2] },
      { kind: 'head', radii: [1, 1, 1] },
      { kind: 'upper_arm', radii: [1, 1, 3] },
      { kind: 'forearm', radii: [1, 1, 3] },
      { kind: 'thigh', radii: [1.5, 1.5, 4] },
      { kind: 'calf', radii: [1.2, 1.2, 4] },
    ];
    const v = computeRegionVolumes(segments);
    expect(v.trunk).toBeGreaterThan(0);
    expect(v.head_neck).toBeGreaterThan(0);
    expect(v.arms).toBeGreaterThan(0);
    expect(v.legs).toBeGreaterThan(0);
    // Two arm cylinders are identical, so arms = 2 * one upper_arm volume.
    expect(v.arms).toBeCloseTo(2 * segmentVolume(segments[2]), 6);
  });
});

// ===========================================================================
// Per-region fat-mass + density (ratios sum to 1, correct per-region split).
// ===========================================================================

describe('computeRegionDistribution', () => {
  const volumes = { trunk: 100, arms: 50, legs: 80, head_neck: 20 };

  it('splits fat mass by the ratio set (share * total)', () => {
    const dist = computeRegionDistribution(20, MALE_DISTRIBUTION, volumes);
    expect(dist.trunk.fatMassKg).toBeCloseTo(0.525 * 20, 6);
    expect(dist.arms.fatMassKg).toBeCloseTo(0.16 * 20, 6);
    expect(dist.legs.fatMassKg).toBeCloseTo(0.225 * 20, 6);
    expect(dist.head_neck.fatMassKg).toBeCloseTo(0.09 * 20, 6);
  });

  it('per-region fat masses sum to ~ (sum of shares * total)', () => {
    const total = 18;
    const dist = computeRegionDistribution(total, MALE_DISTRIBUTION, volumes);
    const sum = BODY_REGIONS.reduce((acc, r) => acc + dist[r].fatMassKg, 0);
    expect(sum).toBeCloseTo(sumRatios(MALE_DISTRIBUTION) * total, 6);
    // Male set sums to 1.0, so this equals the whole-body fat mass.
    expect(sum).toBeCloseTo(total, 6);
  });

  it('density = fat mass / volume', () => {
    const dist = computeRegionDistribution(20, MALE_DISTRIBUTION, volumes);
    expect(dist.trunk.density).toBeCloseTo((0.525 * 20) / 100, 6);
  });

  it('zero / NaN volume yields density 0 (no divide-by-zero)', () => {
    const dist = computeRegionDistribution(20, MALE_DISTRIBUTION, {
      trunk: 0,
      arms: Number.NaN,
      legs: -5,
      head_neck: 10,
    });
    expect(dist.trunk.density).toBe(0);
    expect(dist.arms.density).toBe(0);
    expect(dist.legs.density).toBe(0);
    expect(dist.head_neck.density).toBeGreaterThan(0);
  });

  it('missing / NaN fat mass is treated as 0', () => {
    const dist = computeRegionDistribution(Number.NaN, MALE_DISTRIBUTION, volumes);
    for (const r of BODY_REGIONS) expect(dist[r].fatMassKg).toBe(0);
  });
});

// ===========================================================================
// User-own-range color interpolation: lowest region Teal, highest Orange,
// midpoints blend, single-value / degenerate range safe.
// ===========================================================================

describe('hexToHsl', () => {
  it('parses the teal + orange anchors into plausible hues', () => {
    const teal = hexToHsl(TEAL_HEX);
    const orange = hexToHsl(ORANGE_HEX);
    // Teal sits in the cyan/green band, orange in the warm band.
    expect(teal.h).toBeGreaterThan(150);
    expect(teal.h).toBeLessThan(195);
    expect(orange.h).toBeGreaterThan(10);
    expect(orange.h).toBeLessThan(45);
  });
});

describe('lerpTealToOrange', () => {
  it('t=0 returns the teal anchor color', () => {
    const teal = hexToHsl(TEAL_HEX);
    expect(lerpTealToOrange(0)).toBe(
      `hsl(${Math.round(teal.h)}, ${Math.round(teal.s)}%, ${Math.round(teal.l)}%)`,
    );
  });

  it('t=1 returns the orange anchor color', () => {
    const orange = hexToHsl(ORANGE_HEX);
    expect(lerpTealToOrange(1)).toBe(
      `hsl(${Math.round(orange.h)}, ${Math.round(orange.s)}%, ${Math.round(orange.l)}%)`,
    );
  });

  it('midpoint blends between the anchors (hue strictly between)', () => {
    const teal = hexToHsl(TEAL_HEX);
    const orange = hexToHsl(ORANGE_HEX);
    const mid = lerpTealToOrange(0.5);
    const hue = Number(mid.match(/hsl\((\d+)/)?.[1]);
    const lo = Math.min(teal.h, orange.h);
    const hi = Math.max(teal.h, orange.h);
    expect(hue).toBeGreaterThan(lo);
    expect(hue).toBeLessThan(hi);
  });

  it('clamps out-of-range / NaN t', () => {
    expect(lerpTealToOrange(-2)).toBe(lerpTealToOrange(0));
    expect(lerpTealToOrange(5)).toBe(lerpTealToOrange(1));
    expect(lerpTealToOrange(Number.NaN)).toBe(lerpTealToOrange(0));
  });

  it('returns ASCII-only hsl strings (no glyphs)', () => {
    // eslint-disable-next-line no-control-regex
    expect(/^[\x00-\x7F]+$/.test(lerpTealToOrange(0.4))).toBe(true);
  });
});

describe('normalizeToOwnRange', () => {
  it('maps value to [0,1] across the range', () => {
    expect(normalizeToOwnRange(5, 0, 10)).toBeCloseTo(0.5, 6);
    expect(normalizeToOwnRange(0, 0, 10)).toBe(0);
    expect(normalizeToOwnRange(10, 0, 10)).toBe(1);
  });

  it('degenerate range (max<=min) returns the midpoint 0.5', () => {
    expect(normalizeToOwnRange(7, 7, 7)).toBe(0.5);
    expect(normalizeToOwnRange(3, 9, 9)).toBe(0.5);
  });

  it('NaN inputs return 0.5 (safe)', () => {
    expect(normalizeToOwnRange(Number.NaN, 0, 10)).toBe(0.5);
  });
});

describe('regionColorsFromDistribution (user-own-range)', () => {
  it('lowest-density region is teal, highest is orange', () => {
    // Build a distribution with distinct densities by varying volume.
    const dist = computeRegionDistribution(20, MALE_DISTRIBUTION, {
      trunk: 10, // high density (lots of fat, small volume)
      arms: 1000, // low density
      legs: 200,
      head_neck: 100,
    });
    const colors = regionColorsFromDistribution(dist);
    const teal = lerpTealToOrange(0);
    const orange = lerpTealToOrange(1);
    // arms = lowest density -> teal anchor; trunk = highest density -> orange.
    expect(colors.arms).toBe(teal);
    expect(colors.trunk).toBe(orange);
  });

  it('degenerate (all equal density) maps every region to the midpoint color', () => {
    // Equal density: pick volumes proportional to fat mass so density is equal.
    const ratios: RegionalRatioSet = { trunk: 0.25, arms: 0.25, legs: 0.25, head_neck: 0.25 };
    const dist = computeRegionDistribution(20, ratios, {
      trunk: 100,
      arms: 100,
      legs: 100,
      head_neck: 100,
    });
    const colors = regionColorsFromDistribution(dist);
    const midColor = lerpTealToOrange(0.5);
    for (const r of BODY_REGIONS) expect(colors[r]).toBe(midColor);
  });
});

// ===========================================================================
// End-to-end overlay pipeline.
// ===========================================================================

describe('computeRegionalOverlay', () => {
  const segments: RegionVolumeSegment[] = [
    { kind: 'torso', radii: [3, 3, 2] },
    { kind: 'head', radii: [1, 1, 1] },
    { kind: 'neck', radii: [0.8, 0.8, 1] },
    { kind: 'upper_arm', radii: [1, 1, 3] },
    { kind: 'forearm', radii: [0.8, 0.8, 3] },
    { kind: 'thigh', radii: [2, 2, 4] },
    { kind: 'calf', radii: [1.5, 1.5, 4] },
  ];

  it('produces a color for every region and a male-pattern split', () => {
    const result = computeRegionalOverlay({
      pattern: 'male',
      wholeBodyFatMassKg: 18,
      segments,
    });
    expect(result.pattern).toBe('male');
    for (const r of BODY_REGIONS) {
      expect(result.colors[r]).toMatch(/^hsl\(/);
      expect(result.distribution[r].fatMassKg).toBeGreaterThan(0);
    }
    expect(result.distribution.trunk.fatMassKg).toBeCloseTo(0.525 * 18, 6);
  });
});

// ===========================================================================
// Pattern selection (sex -> ratios; averaged; non-binary choice). Section 5.1.
// ===========================================================================

describe('resolveDistributionPattern (Section 5.1)', () => {
  it('maps biological sex to its sex-typical pattern when no explicit choice', () => {
    expect(resolveDistributionPattern({ sex: 'male' })).toBe('male');
    expect(resolveDistributionPattern({ sex: 'female' })).toBe('female');
  });

  it('an explicit chosen pattern overrides sex', () => {
    expect(resolveDistributionPattern({ chosenPattern: 'averaged', sex: 'male' })).toBe('averaged');
    expect(resolveDistributionPattern({ chosenPattern: 'female', sex: 'male' })).toBe('female');
  });

  it('defaults to averaged when neither choice nor a usable sex is present', () => {
    expect(resolveDistributionPattern({})).toBe('averaged');
    expect(resolveDistributionPattern({ sex: null, chosenPattern: null })).toBe('averaged');
  });
});

// ===========================================================================
// Suppression decisions (missing composition; safeguard mode; pregnancy).
// Section 5.3 / 5.4 / 5.6.
// ===========================================================================

describe('decideOverlaySuppression', () => {
  it('shows the overlay in the clear case', () => {
    const r = decideOverlaySuppression({ hasReliableComposition: true });
    expect(r.suppressed).toBe(false);
    expect(r.reason).toBeNull();
  });

  it('missing / low-confidence composition hard-suppresses with no opt-in (5.6)', () => {
    const r = decideOverlaySuppression({ hasReliableComposition: false });
    expect(r.suppressed).toBe(true);
    expect(r.reason).toBe('missing_composition');
    expect(r.offerOptIn).toBe(false);
  });

  it('missing composition wins even over a pregnancy opt-in', () => {
    const r = decideOverlaySuppression({
      hasReliableComposition: false,
      isPregnancyWindow: true,
      userOptedIn: true,
    });
    expect(r.reason).toBe('missing_composition');
    expect(r.suppressed).toBe(true);
  });

  it('pregnancy window suppresses unless opted in, and offers opt-in (5.3)', () => {
    const hidden = decideOverlaySuppression({
      hasReliableComposition: true,
      isPregnancyWindow: true,
    });
    expect(hidden.suppressed).toBe(true);
    expect(hidden.reason).toBe('pregnancy_window');
    expect(hidden.offerOptIn).toBe(true);

    const shown = decideOverlaySuppression({
      hasReliableComposition: true,
      isPregnancyWindow: true,
      userOptedIn: true,
    });
    expect(shown.suppressed).toBe(false);
  });

  it('current DE history suppresses by default; opt-in reveals (5.4)', () => {
    const hidden = decideOverlaySuppression({
      hasReliableComposition: true,
      safeguardMode: 'current_de_history',
    });
    expect(hidden.suppressed).toBe(true);
    expect(hidden.reason).toBe('safeguard_current_de');
    expect(hidden.offerOptIn).toBe(true);

    const shown = decideOverlaySuppression({
      hasReliableComposition: true,
      safeguardMode: 'current_de_history',
      userOptedIn: true,
    });
    expect(shown.suppressed).toBe(false);
  });

  it('past DE history shows by default (the normal shown state + disable toggle)', () => {
    const r = decideOverlaySuppression({
      hasReliableComposition: true,
      safeguardMode: 'past_de_history',
    });
    expect(r.suppressed).toBe(false);
    expect(r.reason).toBeNull();
  });
});
