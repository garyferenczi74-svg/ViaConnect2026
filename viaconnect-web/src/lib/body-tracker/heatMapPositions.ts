// Prompt #154 §5.2 + Gary directive 2026-05-08 silhouette swap:
// per-gender pill coordinate table for the Body Tracker > Segmental
// Body Fat / Muscle Analysis panel.
//
// Keys are the snake_case BODY_PARTS IDs from composition/page.tsx
// (the actual data-layer IDs, not the display labels). Values are
// percentage strings of the BodyAvatarWithIndicators wrapper, with
// pills centered on the coordinate via transform: translate(-50%,
// -50%) at the call site.
//
//   top:  0% = top of container, 100% = bottom of container
//   left: 0% = left edge of container, 100% = right edge
//
// Values are calibrated against the inline teal-line silhouette in
// BodyTrackerSilhouette.tsx (viewBox 400x800), NOT the prior
// rasterized photo from the Supabase Body Tracker bucket. Anatomy
// landmarks per the silhouette geometry:
//
//   head ellipse:    cy=72 (~9%)
//   neck rect:       y=120-152 mid ~17%
//   shoulder line:   y=152 (~19%)
//   chest mid:       y=240 (~30%)
//   waist narrow:    y=370 (~46%)
//   hip widest:      y=448 (~56%)
//   thigh mid:       y=525 (~66%)
//   knee crease:     y=612 (~76%)
//   calf mid:        y=695 (~87%)
//
// Visual calibration on localhost is the standing maintenance loop
// (#154 §5.3). Adjust values here in place using the DevTools ruler
// procedure.
//
// Orientation: positions assume MIRROR style rendering, so the user's
// right arm appears on screen-right. r_bicep at left: 68% sits over
// the user's right bicep on the silhouette, l_bicep at left: 32%
// sits over the user's left bicep. If a future asset swap reveals
// portrait orientation, swap the four r_/l_ pairs' left percentages.

export interface HeatMapPosition {
  readonly top: string;
  readonly left: string;
}

export type HeatMapPositionTable = Record<string, HeatMapPosition>;

export const MALE_HEATMAP_POSITIONS: HeatMapPositionTable = {
  neck:      { top: '17%',   left: '50%' },
  shoulders: { top: '20%',   left: '50%' },
  chest:     { top: '30%',   left: '50%' },
  waist:     { top: '46%',   left: '50%' },
  l_bicep:   { top: '29%',   left: '32%' },
  r_bicep:   { top: '29%',   left: '68%' },
  l_forearm: { top: '49%',   left: '28%' },
  r_forearm: { top: '49%',   left: '72%' },
  l_quad:    { top: '66%',   left: '44%' },
  r_quad:    { top: '66%',   left: '56%' },
  l_calf:    { top: '87%',   left: '44%' },
  r_calf:    { top: '87%',   left: '56%' },
};

export const FEMALE_HEATMAP_POSITIONS: HeatMapPositionTable = {
  neck:      { top: '17%',   left: '50%' },
  shoulders: { top: '20%',   left: '50%' },
  chest:     { top: '30%',   left: '50%' },
  waist:     { top: '46%',   left: '50%' },
  l_bicep:   { top: '29%',   left: '36%' },
  r_bicep:   { top: '29%',   left: '64%' },
  l_forearm: { top: '49%',   left: '30%' },
  r_forearm: { top: '49%',   left: '70%' },
  l_quad:    { top: '66%',   left: '44%' },
  r_quad:    { top: '66%',   left: '56%' },
  l_calf:    { top: '87%',   left: '44%' },
  r_calf:    { top: '87%',   left: '56%' },
};

export const HEATMAP_POSITIONS_BY_SEX: Record<'male' | 'female', HeatMapPositionTable> = {
  male:   MALE_HEATMAP_POSITIONS,
  female: FEMALE_HEATMAP_POSITIONS,
};
