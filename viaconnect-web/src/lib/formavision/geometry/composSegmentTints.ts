// Build the avatar's 5-segment tint record from the canonical 5-region composition
// data (Prompt 210b, OV-T2; sourcing corrected per the OV-T1 review).
//
// HONESTY + AGREEMENT: the tint is sourced from the SAME canonical 5-region data the
// metric CARDS read, the RegionMap on the CompositionSnapshot (regionFatPct /
// regionMuscleLbs), through the SAME status + heat-map-color helpers the cards use
// (getSegmentStatus -> getOvalColorFromStatus -> OVAL_HEX green/yellow/red). So the
// 3D tint and the cards agree by construction. This does NOT reduce the 2D heat map's
// finer 13-mask regions; it reads the canonical 5-region RegionMap directly, one
// region per avatar segment. A region with a null (UNKNOWN) value yields null (no
// tint, neutral) rather than a guessed color, preserving the honest-scan invariant.

import {
  getSegmentStatus,
  type SegmentStatus,
} from '@/lib/body-tracker/calculations';
import { OVAL_HEX, getOvalColorFromStatus } from '@/lib/body-tracker/heatmap-colors';
import type { RegionMap } from '@/lib/body-tracker/composition/types';
import { SEGMENT_INDEX, type SegmentName } from './buildBodyGeometry';
import { type SegmentTintRecord } from './segmentTints';

// getSegmentStatus expects the coarse segment type, not the 5-region name. The two
// arms share the 'arm' thresholds and the two legs share 'leg'; the trunk is its own.
const SEGMENT_TYPE: Record<SegmentName, 'arm' | 'trunk' | 'leg'> = {
  right_arm: 'arm',
  left_arm: 'arm',
  trunk: 'trunk',
  right_leg: 'leg',
  left_leg: 'leg',
};

// SEGMENT_INDEX is the single source of the 5 segment names, so the tint record can
// never drift from the geometry / overlay segment set.
const ALL_SEGMENTS = Object.keys(SEGMENT_INDEX) as SegmentName[];

// Resolve one region value (fat percent or muscle pounds) to a heat-map hex via the
// card status path, or null when the value is UNKNOWN.
function tintForValue(
  value: number | null,
  segment: SegmentName,
  mode: 'fat' | 'muscle',
  gender: 'male' | 'female',
): string | null {
  if (value === null) {
    return null;
  }
  const status: SegmentStatus = getSegmentStatus(value, SEGMENT_TYPE[segment], mode, gender);
  return OVAL_HEX[getOvalColorFromStatus(status)];
}

// Build the per-segment tint record for the active mode from the canonical RegionMap.
// fat mode reads regionFatPct, muscle mode reads regionMuscleLbs; either way each of
// the 5 segments gets the card status color for its region, or null when UNKNOWN.
export function buildSegmentTints(
  region: RegionMap | null | undefined,
  mode: 'fat' | 'muscle',
  gender: 'male' | 'female',
): SegmentTintRecord {
  const tints: SegmentTintRecord = {};
  if (!region) {
    return tints;
  }
  for (const segment of ALL_SEGMENTS) {
    const tint = tintForValue(region[segment], segment, mode, gender);
    if (tint !== null) {
      tints[segment] = tint;
    }
  }
  return tints;
}
