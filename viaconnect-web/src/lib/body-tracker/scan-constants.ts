// Body Scanner — Pure data constants (§9, §10, §11, §13, §14, §15).
//
// Imported by quality-check, calibration, and fusion modules.
// No logic lives here; keep this file purely declarative.

// ── A-pose canonical joint-angle expectations (§9.2) ─────────────────────────
// Values in degrees. Keys match the MediaPipe Pose / BlazePose landmark naming
// convention used by @tensorflow-models/pose-detection.
export const A_POSE_TEMPLATE: Record<string, number> = {
  leftShoulderAbduction:  80,
  rightShoulderAbduction: 80,
  leftElbowFlexion:       180,
  rightElbowFlexion:      180,
  leftHipAbduction:       15,
  rightHipAbduction:      15,
  leftKneeFlexion:        180,
  rightKneeFlexion:       180,
  leftAnkleDorsiflexion:  90,
  rightAnkleDorsiflexion: 90,
};

// ── Pose tolerance (§9.3) ─────────────────────────────────────────────────────
export const POSE_TOLERANCE_DEG = {
  average:  12,
  perJoint: 25,
} as const;

// ── Lighting quality thresholds (§10) ────────────────────────────────────────
export const LIGHTING_THRESHOLDS = {
  meanLuminanceMin: 60,
  meanLuminanceMax: 220,
  stdDevMin:        25,
  stdDevMax:        80,
} as const;

// ── Clothing tightness acceptable ratio range (§11) ──────────────────────────
export const CLOTHING_TIGHTNESS_RANGE = {
  min: 1.02,
  max: 1.18,
} as const;

// ── Camera level tolerance (§9.4) ────────────────────────────────────────────
export const CAMERA_LEVEL_TOLERANCE_DEG = 3;

// ── Background clutter advisory threshold (§10.2) ────────────────────────────
export const BACKGROUND_CLUTTER_ADVISORY_MAX = 70;

// ── Multi-frame fusion parameters (§13) ──────────────────────────────────────
export const MULTI_FRAME_FUSION = {
  frameCount:  3,
  intervalMs:  100,
} as const;

// ── Auto-capture hold duration (§9.5) ────────────────────────────────────────
export const AUTO_CAPTURE_HOLD_MS = 1500;

// ── Credit card calibration dimensions — ISO 7810 ID-1 (§14) ─────────────────
export const CREDIT_CARD_DIMENSIONS_MM = {
  width:  85.60,
  height: 53.98,
} as const;

// ── Personal baseline bootstrap minimum scan count (§15.3) ───────────────────
export const PERSONAL_BASELINE_BOOTSTRAP_SCANS = 3;

// ── Copy constants ────────────────────────────────────────────────────────────
export const BIO_OPTIMIZATION_SCORE_LABEL  = 'Bio Optimization Score';
export const BUILT_FOR_YOUR_BIOLOGY_TAGLINE = 'Built For Your Biology';
export const FARMCEUTICA_ENTITY_NAME        = 'Farmceutica Wellness Ltd';
