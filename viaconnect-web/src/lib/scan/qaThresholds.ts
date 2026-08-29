// Prompt 231 pose-QA thresholds. Starting values; calibrated in Phase 5 on real devices at 6 to 8 ft.
export const VISIBILITY_MIN = 0.5;          // a landmark counts as present above this visibility
export const SHOULDER_VIS_MIN = 0.6;        // per-pose shoulder confidence floor
export const HEAD_Y_MIN = 0.04;             // nose must sit below the top 4 percent of frame
export const FEET_Y_MAX = 0.96;             // ankles must sit above the bottom 4 percent of frame
export const BODY_HEIGHT_MIN = 0.45;        // nose-to-ankle span as fraction of frame height (too far below)
export const BODY_HEIGHT_MAX = 0.85;        // too close above
export const HIP_CENTER_MIN = 0.35;         // hip midpoint horizontal window (on the mark)
export const HIP_CENTER_MAX = 0.65;        // hip midpoint upper bound of the on-the-mark window
export const ARMS_OUT_MIN = 0.06;           // a wrist must clear its same-side hip by this fraction of width
export const FRONT_SHOULDER_WIDTH_MIN = 0.18; // frontal shoulders are wide
export const NOSE_CENTER_TOL = 0.15;        // nose x within this many shoulder-widths of the shoulder midpoint
export const SIDE_SHOULDER_WIDTH_MAX = 0.12;  // a true side view narrows the shoulders
export const SIDE_VIS_ASYMMETRY_MIN = 0.15;   // near-side shoulder must out-visible the far side by this
export const BACK_NOSE_EAR_DIFF_MIN = 0.2;    // on a back view the nose is much less visible than the ears
export const BLUR_VARIANCE_MIN = 90;          // variance-of-Laplacian floor on the downscaled grayscale still
