// Tests for the canonical 5-region -> avatar segment tint (Prompt 210b, OV-T2).
//
// The contract: the tint is sourced from the canonical 5-region RegionMap (the SAME
// data the metric cards read) through the SAME getSegmentStatus ->
// getOvalColorFromStatus -> OVAL_HEX path, so the 3D tint agrees with the cards. A
// null (UNKNOWN) region stays neutral (omitted, no guessed color). The segment key
// space is pinned to OV-T1's SEGMENT_INDEX so the tint can never drift from geometry.

import { describe, it, expect } from 'vitest';
import { buildSegmentTints, buildSegmentTintsFromChange } from '../composSegmentTints';
import { SEGMENT_INDEX, type SegmentName } from '../buildBodyGeometry';
import type { RegionMap } from '@/lib/body-tracker/composition/types';
import {
  OVAL_HEX,
  getOvalColorFromStatus,
  getOvalColorFromChange,
} from '@/lib/body-tracker/heatmap-colors';
import { getSegmentStatus } from '@/lib/body-tracker/calculations';

const ALL_SEGMENTS = Object.keys(SEGMENT_INDEX) as SegmentName[];

const FULL_FAT: RegionMap = {
  right_arm: 10, // male arm: low band -> green
  left_arm: 22, // male arm: > high(25)? no, standard..high -> see helper
  trunk: 30, // male trunk: > high(28) -> Very High -> red
  right_leg: 18, // male leg: standard band -> yellow
  left_leg: 11, // male leg: < low(14) -> green
};

describe('buildSegmentTints', () => {
  it('returns an empty (all neutral) record for a null region', () => {
    expect(buildSegmentTints(null, 'fat', 'male')).toEqual({});
  });

  it('maps a known fat region to the card status color for that segment', () => {
    const tints = buildSegmentTints(FULL_FAT, 'fat', 'male');
    // Each segment color must equal exactly what the card status path yields.
    for (const segment of ALL_SEGMENTS) {
      const segType = segment.includes('arm') ? 'arm' : segment.includes('leg') ? 'leg' : 'trunk';
      const expected = OVAL_HEX[getOvalColorFromStatus(getSegmentStatus(FULL_FAT[segment]!, segType, 'fat', 'male'))];
      expect(tints[segment]).toBe(expected);
    }
  });

  it('leaves a null (UNKNOWN) region neutral (omitted, never a guessed color)', () => {
    const region: RegionMap = {
      right_arm: 10,
      left_arm: null,
      trunk: null,
      right_leg: null,
      left_leg: null,
    };
    const tints = buildSegmentTints(region, 'fat', 'male');
    expect(tints.right_arm).toBe(OVAL_HEX.green);
    expect(tints.left_arm).toBeUndefined();
    expect(tints.trunk).toBeUndefined();
    expect(tints.right_leg).toBeUndefined();
    expect(tints.left_leg).toBeUndefined();
  });

  it('only ever emits keys from OV-T1 SEGMENT_INDEX (drift-proof)', () => {
    const tints = buildSegmentTints(FULL_FAT, 'fat', 'female');
    for (const key of Object.keys(tints)) {
      expect(ALL_SEGMENTS).toContain(key as SegmentName);
    }
  });

  it('agrees with the heat-map color helper the cards use for the same region value (3D == cards)', () => {
    // A single low-fat arm: the tint must be exactly OVAL_HEX of the card status,
    // proving the 3D tint and the cards never diverge for the same RegionMap value.
    const region: RegionMap = { right_arm: 9, left_arm: null, trunk: null, right_leg: null, left_leg: null };
    const status = getSegmentStatus(9, 'arm', 'fat', 'male');
    const tints = buildSegmentTints(region, 'fat', 'male');
    expect(tints.right_arm).toBe(OVAL_HEX[getOvalColorFromStatus(status)]);
  });
});

// Arnold OV-T2 review: the muscle tint is CHANGE based, mirroring the 2D muscle
// floor (getOvalColorFromChange(change, 'muscle')) so the 3D and 2D can never show
// opposite colors for the same region on the same screen.
describe('buildSegmentTintsFromChange (muscle)', () => {
  const FIRST: RegionMap = {
    right_arm: 10,
    left_arm: 10,
    trunk: 50,
    right_leg: 20,
    left_leg: 20,
  };

  it('returns empty (neutral) when first or latest is missing (single-scan account)', () => {
    expect(buildSegmentTintsFromChange(null, FIRST, 'muscle')).toEqual({});
    expect(buildSegmentTintsFromChange(FIRST, null, 'muscle')).toEqual({});
  });

  it('colors each segment by the latest - first delta via the muscle change helper', () => {
    const latest: RegionMap = {
      right_arm: 12, // +2 gained muscle -> green
      left_arm: 8, // -2 lost muscle -> red
      trunk: 50, // 0 change -> yellow (neutral)
      right_leg: 20.1, // +0.1 below CHANGE_THRESHOLD -> yellow (neutral)
      left_leg: 24, // +4 gained -> green
    };
    const tints = buildSegmentTintsFromChange(FIRST, latest, 'muscle');
    expect(tints.right_arm).toBe(OVAL_HEX.green);
    expect(tints.left_arm).toBe(OVAL_HEX.red);
    expect(tints.trunk).toBe(OVAL_HEX.yellow);
    expect(tints.right_leg).toBe(OVAL_HEX.yellow);
    expect(tints.left_leg).toBe(OVAL_HEX.green);
  });

  it('omits a segment when EITHER end is null (UNKNOWN delta -> neutral, never fabricated)', () => {
    const first: RegionMap = { right_arm: 10, left_arm: null, trunk: 50, right_leg: null, left_leg: 20 };
    const latest: RegionMap = { right_arm: 12, left_arm: 11, trunk: null, right_leg: 22, left_leg: 24 };
    const tints = buildSegmentTintsFromChange(first, latest, 'muscle');
    expect(tints.right_arm).toBe(OVAL_HEX.green); // both present
    expect(tints.left_arm).toBeUndefined(); // first null
    expect(tints.trunk).toBeUndefined(); // latest null
    expect(tints.right_leg).toBeUndefined(); // first null
    expect(tints.left_leg).toBe(OVAL_HEX.green); // both present
  });

  it('3D muscle tint == 2D muscle floor for the same region (same getOvalColorFromChange helper)', () => {
    // The 2D muscle floor colors a region by getOvalColorFromChange(change, 'muscle').
    // The 3D tint MUST equal OVAL_HEX of that exact call for the latest-first delta,
    // so a region that lost muscle is red in BOTH, never green in 3D and red in 2D.
    const first: RegionMap = { right_arm: 14, left_arm: 14, trunk: 60, right_leg: 24, left_leg: 24 };
    const latest: RegionMap = { right_arm: 11, left_arm: 16, trunk: 60.05, right_leg: 28, left_leg: 21 };
    const tints = buildSegmentTintsFromChange(first, latest, 'muscle');
    for (const segment of ALL_SEGMENTS) {
      const delta = latest[segment]! - first[segment]!;
      expect(tints[segment]).toBe(OVAL_HEX[getOvalColorFromChange(delta, 'muscle')]);
    }
  });
});
