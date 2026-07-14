// Task 211b-W3c - Pure-logic tests for PersonalPrecisionPanel's honesty rules.
//
// These test the EXPORTED pure functions directly (no JSX render), matching the
// repo's split between pure-logic .test.ts files and renderToStaticMarkup
// .bare.test.tsx files (see NoisePresentation.test.ts / ClipCreatorSurface for
// each style). The load-bearing honesty rules under test:
//   1. status is read directly from perRegion, never re-derived from cm numbers.
//   2. NO digit ever appears in any status copy, aria label, or scale note.
//   3. hip/under_bust/waist_navel (absent from perRegion) render 'insufficient',
//      never hidden and never promoted to any other status.
//   4. 'unreliable' never blends (no personalBandCm read, no averaged value).
//   5. 'insufficient' never fabricates a band.
//   6. scale-only adoption never yields a region band.
//   7. the panel is default OFF (hidden) with zero anchor activity.

import { describe, it, expect } from 'vitest';
import {
  ALL_PERSONAL_PRECISION_REGIONS,
  PERSONAL_PRECISION_REGION_LABEL,
  resolvePersonalPrecisionRows,
  shouldShowPersonalPrecisionPanel,
  personalPrecisionStatusCopy,
  personalPrecisionRegionAriaLabel,
  personalPrecisionScaleCopy,
} from '../PersonalPrecisionPanel';
import type {
  BandStatus,
  PersonalFusionResult,
  PersonalFusionRegionResult,
} from '@/lib/arnold/scanning/accuracy/fusion/personalFusionService';

const ALL_STATUSES: BandStatus[] = ['tightened', 'not-tightened', 'insufficient', 'unreliable'];

function regionResult(over: Partial<PersonalFusionRegionResult>): PersonalFusionRegionResult {
  return {
    region: 'waist_natural',
    status: 'insufficient',
    personalBandCm: null,
    globalBandCm: 3,
    nPairs: 0,
    ...over,
  };
}

function fusionResult(over: Partial<PersonalFusionResult>): PersonalFusionResult {
  return {
    calibrationVersion: 'v1-uncalibrated-2026-06',
    fusionVersion: null,
    correctionStatus: 'insufficient',
    perRegion: [],
    flaggedAnchors: [],
    scaleAnchorCount: 0,
    ...over,
  };
}

const DIGIT = /\d/;

describe('PersonalPrecisionPanel copy: NO digit ever, for any status', () => {
  it('personalPrecisionStatusCopy has zero digits for every BandStatus', () => {
    for (const status of ALL_STATUSES) {
      expect(personalPrecisionStatusCopy(status)).not.toMatch(DIGIT);
    }
  });

  it('personalPrecisionRegionAriaLabel has zero digits for every region label x status pair', () => {
    for (const region of ALL_PERSONAL_PRECISION_REGIONS) {
      const label = PERSONAL_PRECISION_REGION_LABEL[region];
      expect(label).not.toMatch(DIGIT);
      for (const status of ALL_STATUSES) {
        expect(personalPrecisionRegionAriaLabel(label, status)).not.toMatch(DIGIT);
      }
    }
  });

  it('personalPrecisionScaleCopy has zero digits and never states the raw adoption count', () => {
    for (const count of [1, 2, 5, 40]) {
      const copy = personalPrecisionScaleCopy(count);
      expect(copy).not.toBeNull();
      expect(copy as string).not.toMatch(DIGIT);
    }
  });

  it('personalPrecisionScaleCopy returns null (nothing rendered) at zero adoption', () => {
    expect(personalPrecisionScaleCopy(0)).toBeNull();
  });
});

describe('PersonalPrecisionPanel: status is read directly, never re-derived', () => {
  it('resolvePersonalPrecisionRows copies status VERBATIM from perRegion, does not compare bands', () => {
    const result = fusionResult({
      correctionStatus: 'fitted',
      perRegion: [
        regionResult({ region: 'chest', status: 'tightened', personalBandCm: 1.1, globalBandCm: 3 }),
        // A deliberately "backwards" fixture: personalBandCm is NUMERICALLY
        // tighter than globalBandCm, but status says 'not-tightened' -- the
        // component must trust status, not re-derive from the numbers.
        regionResult({ region: 'neck', status: 'not-tightened', personalBandCm: 0.5, globalBandCm: 2 }),
      ],
    });
    const rows = resolvePersonalPrecisionRows(result);
    expect(rows.find((r) => r.region === 'chest')!.status).toBe('tightened');
    expect(rows.find((r) => r.region === 'neck')!.status).toBe('not-tightened');
  });

  it('every region in the fixed 11-region taxonomy gets exactly one row', () => {
    const result = fusionResult({ perRegion: [regionResult({ region: 'calf', status: 'tightened' })] });
    const rows = resolvePersonalPrecisionRows(result);
    expect(rows.map((r) => r.region).sort()).toEqual([...ALL_PERSONAL_PRECISION_REGIONS].sort());
  });
});

describe('PersonalPrecisionPanel: hip/under_bust/waist_navel honesty (no scan source today)', () => {
  it('regions absent from perRegion render insufficient, never hidden, regardless of other regions tightening', () => {
    const result = fusionResult({
      correctionStatus: 'fitted',
      perRegion: [regionResult({ region: 'waist_natural', status: 'tightened' })],
    });
    const rows = resolvePersonalPrecisionRows(result);
    for (const region of ['hip', 'under_bust', 'waist_navel'] as const) {
      const row = rows.find((r) => r.region === region);
      expect(row).toBeDefined();
      expect(row!.status).toBe('insufficient');
    }
  });
});

describe('PersonalPrecisionPanel: unreliable never blends, insufficient never fabricates', () => {
  it('unreliable rows carry no band information the component could read (personalBandCm stays null in the fixture)', () => {
    const result = fusionResult({
      correctionStatus: 'unreliable',
      perRegion: [regionResult({ region: 'chest', status: 'unreliable', personalBandCm: null })],
      flaggedAnchors: [
        { region: 'chest', source: 'tape', takenAt: '2026-07-01T00:00:00Z', value: 100, reason: 'conflicts-with-other-source' },
      ],
    });
    const rows = resolvePersonalPrecisionRows(result);
    const copy = personalPrecisionStatusCopy(rows.find((r) => r.region === 'chest')!.status);
    // The unreliable copy never mentions a value, average, or blended figure.
    expect(copy.toLowerCase()).not.toContain('average');
    expect(copy.toLowerCase()).not.toContain('blend into');
    expect(copy).not.toMatch(DIGIT);
  });

  it('insufficient rows never surface any band (component never reads personalBandCm)', () => {
    const result = fusionResult({
      correctionStatus: 'insufficient',
      perRegion: [regionResult({ region: 'bicep', status: 'insufficient', personalBandCm: null, nPairs: 1 })],
    });
    const rows = resolvePersonalPrecisionRows(result);
    const row = rows.find((r) => r.region === 'bicep')!;
    expect(row.status).toBe('insufficient');
    // resolvePersonalPrecisionRows's return shape carries no personalBandCm field
    // at all -- the type itself proves no band can leak through this seam.
    expect('personalBandCm' in row).toBe(false);
  });
});

describe('PersonalPrecisionPanel: scale-only adoption never produces a region band', () => {
  it('scale-only result (perRegion empty, scaleAnchorCount > 0) yields zero region rows with anything but insufficient', () => {
    const result = fusionResult({ perRegion: [], scaleAnchorCount: 4 });
    const rows = resolvePersonalPrecisionRows(result);
    expect(rows.every((r) => r.status === 'insufficient')).toBe(true);
    expect(shouldShowPersonalPrecisionPanel(result)).toBe(true);
    expect(personalPrecisionScaleCopy(result.scaleAnchorCount)).not.toBeNull();
  });
});

describe('PersonalPrecisionPanel: default OFF with zero anchor activity', () => {
  it('shouldShowPersonalPrecisionPanel is false with no pairs and no scale anchors', () => {
    expect(shouldShowPersonalPrecisionPanel(fusionResult({}))).toBe(false);
  });

  it('shouldShowPersonalPrecisionPanel is true once any region pair exists', () => {
    expect(
      shouldShowPersonalPrecisionPanel(
        fusionResult({ perRegion: [regionResult({ region: 'thigh', status: 'insufficient' })] }),
      ),
    ).toBe(true);
  });
});
