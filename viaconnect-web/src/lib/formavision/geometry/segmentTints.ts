// Segment tint ordering helper for the FormaVision overlay (Prompt 210b, OV-T1).
//
// The overlay material takes 5 per-segment tints in SEGMENT_INDEX order. The avatar
// receives them as a per-segment record of status color strings (or null where the
// segment is UNKNOWN). This converts that record into the ordered (Color | null)[]
// the material setter expects, using SEGMENT_INDEX as the single ordering source so
// the 3D overlay always lines up with the 2D heat map and the composition data. A
// null or missing segment stays null, which the material neutralizes (no guessed
// color), preserving the honest-scan invariant.
//
// Pure and deterministic: no three color is constructed when a parse is impossible,
// and the same record always yields the same ordered array.

import { Color } from 'three';
import { SEGMENT_INDEX, type SegmentName } from './buildBodyGeometry';

export type SegmentTintRecord = Partial<Record<SegmentName, string | null>>;

// Whether the per-segment overlay should be shown: only on the Body Fat or Muscle
// tab AND when per-segment colors are provided. On the measurements tab or with no
// colors the overlay is off and the avatar looks unchanged. Pure so the apply-by-tab
// gate is testable without the canvas.
export function shouldShowOverlay(
  activeTab: 'bodyFat' | 'muscleMass' | 'measurements' | undefined,
  segmentTints: SegmentTintRecord | null | undefined,
): boolean {
  if (activeTab !== 'bodyFat' && activeTab !== 'muscleMass') {
    return false;
  }
  return segmentTints != null;
}

// The 5 segment names in SEGMENT_INDEX order, derived from the map so the ordering
// can never drift from the index source.
const ORDERED_SEGMENTS: SegmentName[] = (
  Object.keys(SEGMENT_INDEX) as SegmentName[]
).sort((a, b) => SEGMENT_INDEX[a] - SEGMENT_INDEX[b]);

// Convert a per-segment status color record into the ordered tint array for the
// material. A missing, null or unparseable color becomes null (neutral, no tint).
export function segmentTintArray(
  record: SegmentTintRecord | null | undefined,
): (Color | null)[] {
  return ORDERED_SEGMENTS.map((name) => {
    const value = record ? record[name] : null;
    if (!value) {
      return null;
    }
    try {
      return new Color(value);
    } catch {
      // An unparseable string is treated as UNKNOWN rather than a guessed color.
      return null;
    }
  });
}
