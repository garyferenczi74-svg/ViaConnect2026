// Body Scanner: Shared TypeScript types.
//
// Pure type declarations; no runtime logic, no imports.
// Consumed by quality-check, fusion, calibration, and UI modules.

// === Quality gate output ===

export interface QualityScores {
  lighting:       number; // 0-100
  pose:           number; // 0-100
  clothing:       number; // 0-100
  bgClutter:      number; // 0-100
  cameraLevel:    number; // 0-100
  frameCoverage:  number; // 0-100
  overallPass:    boolean;
  blockingIssues: string[]; // hard-fail messages (lighting, pose, clothing, cameraLevel, frameCoverage)
  advisoryNotes:  string[]; // informational only; does NOT affect overallPass (e.g. background clutter)
}

// === Multi-frame fusion ===

export interface Keypoint3D {
  x:          number;
  y:          number;
  z:          number;
  confidence: number;
}

export interface FrameFusionInput {
  frames: Array<{
    silhouetteMask: ImageData;
    keypoints:      Keypoint3D[];
    capturedAt:     number;
  }>;
}

export interface FrameFusionResult {
  consensusMask:      ImageData;
  averagedKeypoints:  Keypoint3D[];
}

// === Calibration ===

export interface CalibrationResult {
  source:                   'credit_card' | 'user_height' | 'camera_intrinsics';
  scaleFactorPxPerCm:       number;
  floorPlaneInclinationDeg: number | null;
}

// === Personal baseline drift ===

export interface PersonalBaseline {
  userId:          string;
  measurementType: string;
  stdDev:          number;
  sampleSize:      number;
  computedAt:      string; // ISO-8601
}

// === Scan insights ===

export interface ScanInsight {
  kind:                  'recommendation' | 'observation' | 'flag';
  message:               string;
  sourceProtocolItemId:  string | null;
  severity:              'low' | 'medium' | 'high';
}
