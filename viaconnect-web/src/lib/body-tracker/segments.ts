// Prompt #153: segment ID enum + adapter for the SVG-based Segmental
// Body Fat Analysis panel. The enum covers 13 anatomical segments
// rendered as pills on the avatar figure. The toCanonicalSegmentId
// adapter normalizes the data layer's BODY_PARTS keys (12 regions
// fanned out from 5 source segments) into the 13-segment canonical
// space; the data layer itself is unchanged per the prompt's
// out-of-scope clause.

export type SegmentId =
  | 'head'
  | 'face'
  | 'neck'
  | 'chest'
  | 'abdomen'
  | 'left_upper_arm'
  | 'right_upper_arm'
  | 'left_forearm'
  | 'right_forearm'
  | 'left_thigh'
  | 'right_thigh'
  | 'left_calf'
  | 'right_calf';

export type SegmentStatus = 'fat_loss' | 'no_change' | 'fat_gain';

export type Sex = 'male' | 'female';

export const ALL_SEGMENTS: readonly SegmentId[] = [
  'head', 'face', 'neck', 'chest', 'abdomen',
  'left_upper_arm', 'right_upper_arm', 'left_forearm', 'right_forearm',
  'left_thigh', 'right_thigh', 'left_calf', 'right_calf',
] as const;

export const SEGMENT_DISPLAY_NAMES: Record<SegmentId, string> = {
  head:             'Head',
  face:             'Face',
  neck:             'Neck',
  chest:            'Chest',
  abdomen:          'Abdomen',
  left_upper_arm:   'Left Upper Arm',
  right_upper_arm:  'Right Upper Arm',
  left_forearm:     'Left Forearm',
  right_forearm:    'Right Forearm',
  left_thigh:       'Left Thigh',
  right_thigh:      'Right Thigh',
  left_calf:        'Left Calf',
  right_calf:       'Right Calf',
};

// Single shared SVG viewBox for both genders. Avatar assets are
// 720x1152 (male) and 720x1008 (female); they fill this 400x800
// viewBox via preserveAspectRatio="none" on the BodyFigureSvg
// <image> element so pills positioned in viewBox coords always sit
// on the same anatomical landmarks regardless of gender. The
// horizontal compression (~20%) is uniform across the avatar and
// the pill positions, so they stay aligned together.
export const FIGURE_VIEWBOX = {
  width: 400,
  height: 800,
} as const;

// Adapter from the data layer's BODY_PARTS keys to the canonical
// SegmentId space. The data layer fans 5 source segments
// (trunk + 4 limbs) out across 12 anatomical regions; this adapter
// re-fans those 12 keys to the 13 canonical IDs:
//
//   trunk source   -> head, face, neck (via input neck), chest, abdomen (via input waist)
//   shoulders      -> dropped (no canonical equivalent in v153)
//   l_bicep        -> left_upper_arm
//   r_bicep        -> right_upper_arm
//   l_forearm      -> left_forearm
//   r_forearm      -> right_forearm
//   l_quad         -> left_thigh
//   r_quad         -> right_thigh
//   l_calf         -> left_calf
//   r_calf         -> right_calf
//
// head + face borrow trunk data via the buildFatSegmentStatuses
// fan-out helper below; the data layer's "shoulders" key is dropped
// because v153 chose 13 segments without a shoulders pill.
export function toCanonicalSegmentId(input: string): SegmentId | null {
  switch (input) {
    case 'neck':      return 'neck';
    case 'chest':     return 'chest';
    case 'waist':     return 'abdomen';
    case 'l_bicep':   return 'left_upper_arm';
    case 'r_bicep':   return 'right_upper_arm';
    case 'l_forearm': return 'left_forearm';
    case 'r_forearm': return 'right_forearm';
    case 'l_quad':    return 'left_thigh';
    case 'r_quad':    return 'right_thigh';
    case 'l_calf':    return 'left_calf';
    case 'r_calf':    return 'right_calf';
    case 'shoulders':
    default:          return null;
  }
}

// Prompt #153: convert the data layer's RegionChangeData (12 keys
// fanned out from 5 source segments) into the 13-segment canonical
// pill status map. 1:1 mappings flow through toCanonicalSegmentId
// (so the canonical adapter is actually exercised, not dead code);
// trunk fan-out for head + face is handled explicitly because no
// per-region head or face fat exists in the data layer yet (head +
// face inherit the trunk source, read via the neck input key).
//
// TODO: when per-region head/face fat data lands, drop the
// trunkSourceChange fan-out and let head + face flow through their
// own change-data keys via the canonical adapter.
import { CHANGE_THRESHOLD, type RegionChangeData } from './heatmap-colors';

function fatChangeToStatus(change: number | null | undefined): SegmentStatus {
  if (change === null || change === undefined) return 'no_change';
  if (Math.abs(change) < CHANGE_THRESHOLD) return 'no_change';
  return change > 0 ? 'fat_gain' : 'fat_loss';
}

export function buildFatSegmentStatuses(
  changeData: RegionChangeData,
): Partial<Record<SegmentId, SegmentStatus>> {
  const result: Partial<Record<SegmentId, SegmentStatus>> = {};

  // Trunk fan-out: head + face have no dedicated source key, so they
  // inherit the trunk's change via the neck input key. neck itself
  // flows through the canonical adapter loop below.
  const trunkSourceChange = changeData['neck']?.change ?? null;
  result.head = fatChangeToStatus(trunkSourceChange);
  result.face = fatChangeToStatus(trunkSourceChange);

  // 1:1 + small-fan mappings via the canonical adapter. shoulders
  // returns null and is dropped silently per the v153 13-segment scheme.
  for (const [inputKey, regionChange] of Object.entries(changeData)) {
    const canonical = toCanonicalSegmentId(inputKey);
    if (canonical === null) continue;
    result[canonical] = fatChangeToStatus(regionChange.change);
  }

  return result;
}
