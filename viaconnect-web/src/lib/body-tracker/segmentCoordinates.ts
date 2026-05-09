// Prompt #153: per-gender pill coordinate maps for the SVG-based
// Segmental Body Fat Analysis panel. Coordinates are in 400x800
// viewBox units; pillWidth + pillHeight are also viewBox units so
// pills scale exactly with the figure at every breakpoint.
//
// Female map differs from male in:
//   - Slightly wider arm spread to clear the chest geometry.
//   - Slightly narrower hip-to-thigh delta because the female figure
//     has wider hips, so pills sit further inboard to land on the
//     thigh muscle rather than the hip joint.
//   - Slightly lower trunk pills to clear the chest.
//
// These are first-pass starting values from the prompt brief and
// require visual calibration on localhost via the DebugSegmentGrid
// overlay before final tuning is committed.

import type { SegmentId, Sex } from './segments';

export interface SegmentCoordinate {
  readonly x: number;
  readonly y: number;
  readonly pillWidth: number;
  readonly pillHeight: number;
}

const PILL_W = 56;
const PILL_H = 28;

export const MALE_COORDINATES: Record<SegmentId, SegmentCoordinate> = {
  head:             { x: 200, y:  48, pillWidth: PILL_W, pillHeight: PILL_H },
  face:             { x: 200, y:  96, pillWidth: PILL_W, pillHeight: PILL_H },
  neck:             { x: 200, y: 138, pillWidth: PILL_W, pillHeight: PILL_H },
  chest:            { x: 200, y: 200, pillWidth: PILL_W, pillHeight: PILL_H },
  abdomen:          { x: 200, y: 304, pillWidth: PILL_W, pillHeight: PILL_H },
  left_upper_arm:   { x: 132, y: 220, pillWidth: PILL_W, pillHeight: PILL_H },
  right_upper_arm:  { x: 268, y: 220, pillWidth: PILL_W, pillHeight: PILL_H },
  left_forearm:     { x: 116, y: 320, pillWidth: PILL_W, pillHeight: PILL_H },
  right_forearm:    { x: 284, y: 320, pillWidth: PILL_W, pillHeight: PILL_H },
  left_thigh:       { x: 172, y: 470, pillWidth: PILL_W, pillHeight: PILL_H },
  right_thigh:      { x: 228, y: 470, pillWidth: PILL_W, pillHeight: PILL_H },
  left_calf:        { x: 172, y: 620, pillWidth: PILL_W, pillHeight: PILL_H },
  right_calf:       { x: 228, y: 620, pillWidth: PILL_W, pillHeight: PILL_H },
};

export const FEMALE_COORDINATES: Record<SegmentId, SegmentCoordinate> = {
  head:             { x: 200, y:  50, pillWidth: PILL_W, pillHeight: PILL_H },
  face:             { x: 200, y:  96, pillWidth: PILL_W, pillHeight: PILL_H },
  neck:             { x: 200, y: 138, pillWidth: PILL_W, pillHeight: PILL_H },
  chest:            { x: 200, y: 210, pillWidth: PILL_W, pillHeight: PILL_H },
  abdomen:          { x: 200, y: 312, pillWidth: PILL_W, pillHeight: PILL_H },
  left_upper_arm:   { x: 138, y: 224, pillWidth: PILL_W, pillHeight: PILL_H },
  right_upper_arm:  { x: 262, y: 224, pillWidth: PILL_W, pillHeight: PILL_H },
  left_forearm:     { x: 122, y: 322, pillWidth: PILL_W, pillHeight: PILL_H },
  right_forearm:    { x: 278, y: 322, pillWidth: PILL_W, pillHeight: PILL_H },
  left_thigh:       { x: 174, y: 478, pillWidth: PILL_W, pillHeight: PILL_H },
  right_thigh:      { x: 226, y: 478, pillWidth: PILL_W, pillHeight: PILL_H },
  left_calf:        { x: 174, y: 626, pillWidth: PILL_W, pillHeight: PILL_H },
  right_calf:       { x: 226, y: 626, pillWidth: PILL_W, pillHeight: PILL_H },
};

export const COORDINATES_BY_SEX: Record<Sex, Record<SegmentId, SegmentCoordinate>> = {
  male:   MALE_COORDINATES,
  female: FEMALE_COORDINATES,
};
