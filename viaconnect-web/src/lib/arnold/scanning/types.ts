// Shared types for Arnold's body scanning pipeline.
// Pure TS, no runtime deps.

import type { BiologicalSex } from '../brain/bodyCompositionScience';
import type { PoseId } from '../types';

export type { BiologicalSex, PoseId };

/** Body region identifiers used for circumference prediction and calibration. */
export type Region =
  | 'neck' | 'shoulder' | 'chest' | 'under_bust'
  | 'waist_natural' | 'waist_navel' | 'hip'
  | 'bicep' | 'forearm' | 'thigh' | 'calf';

export interface Point2D {
  x: number;
  y: number;
}

/** 33 MediaPipe Pose landmarks, left/right suffixed where applicable. */
export type LandmarkKey =
  | 'nose'
  | 'left_eye_inner' | 'left_eye' | 'left_eye_outer'
  | 'right_eye_inner' | 'right_eye' | 'right_eye_outer'
  | 'left_ear' | 'right_ear'
  | 'mouth_left' | 'mouth_right'
  | 'left_shoulder' | 'right_shoulder'
  | 'left_elbow' | 'right_elbow'
  | 'left_wrist' | 'right_wrist'
  | 'left_pinky' | 'right_pinky'
  | 'left_index' | 'right_index'
  | 'left_thumb' | 'right_thumb'
  | 'left_hip' | 'right_hip'
  | 'left_knee' | 'right_knee'
  | 'left_ankle' | 'right_ankle'
  | 'left_heel' | 'right_heel'
  | 'left_foot_index' | 'right_foot_index';

export type LandmarkMap = Partial<Record<LandmarkKey, Point2D & { visibility?: number }>>;

export interface PoseSilhouette {
  poseId: PoseId;
  imageWidth: number;
  imageHeight: number;
  /** Sampled body contour as clockwise-ordered points in image space. */
  contour: Point2D[];
  /** 33 MediaPipe body landmarks in image space. */
  landmarks: LandmarkMap;
  /** cm per pixel, computed from known user height and top-of-head-to-ankle distance. */
  scaleCmPerPx: number | null;
  /** Segmentation mask dimensions (for reconstruction if needed). */
  maskDimensions: { width: number; height: number };
  /** 0..1 quality score from scanQualityAssessor. */
  qualityScore: number;
  qualityIssues: string[];
}

export type ConfidenceLevel = 'high' | 'moderate' | 'low';

export interface MeasuredValue {
  /** Circumference in cm, or null when the measurement cannot be determined (UNKNOWN).
   *  null is the honest signal; 0 is NEVER a valid absent-measurement value (RULE 9). */
  cm: number | null;
  /** +/- symmetric uncertainty in cm. */
  uncertaintyCm: number;
  confidence: ConfidenceLevel;
  /** Named source, e.g., "ellipse_frontSide" | "geometric_front" | "tape_calibrated" | "missing". */
  source: string;
}

/**
 * Per-level ellipse semi-axes produced alongside each circumference (Task 8).
 * One-model guarantee: aCm and bCm are the exact inputs fed to predictCircumference,
 * so the same geometry drives both the circumference and the mesh cross-section.
 *
 * aCm = front view width divided by 2 (side-to-side half-width, cm).
 * bCm = averaged side-view depth divided by 2 (front-to-back half-depth, cm).
 * aspectRatio = bCm divided by aCm (depth-to-width ratio).
 *
 * RULE 9: null means UNKNOWN. aspectRatio is null whenever aCm or bCm is null.
 * Never fabricate: do not substitute 0 for an absent depth.
 */
export interface LevelSemiAxes {
  /** Side-to-side half-width (front view width divided by 2), cm.
   * null when front width cannot be measured (RULE 9). */
  aCm: number | null;
  /** Front-to-back half-depth (averaged side-view depth divided by 2), cm.
   * null when no side view is available at this level (RULE 9). */
  bCm: number | null;
  /** Depth-to-width ratio (bCm divided by aCm). null when aCm or bCm is null (RULE 9). */
  aspectRatio: number | null;
}

/**
 * Aggregated corroboration signals produced by Task 6 (back-view + L/R depth
 * averaging). These map directly to ConfidenceInputs.lrCorroboration and
 * ConfidenceInputs.fbCorroboration in confidenceModel.ts (higher = better).
 * Populated by extractMeasurements when multi-view silhouettes are provided.
 */
export interface CorroborationSignals {
  /** Mean L/R depth agreement across all measured levels. [0, 1] */
  lrCorroboration: number;
  /** Mean front-back width agreement across key torso levels. [0, 1] */
  fbCorroboration: number;
  /**
   * Mean L/R depth asymmetry ratio across levels where both sides are present.
   * 0 = perfectly symmetric; 1 = maximum asymmetry.
   * null when every level is single-source (no bilateral data).
   */
  lrAsymmetry: number | null;
}

/** 18+ measurements, all stored in cm. */
export interface ExtractedMeasurements {
  neckCirc: MeasuredValue;
  shoulderCirc: MeasuredValue;
  chestCirc: MeasuredValue;
  underBustCirc?: MeasuredValue;
  waistNaturalCirc: MeasuredValue;
  waistNavelCirc: MeasuredValue;
  hipCirc: MeasuredValue;
  rightBicepCirc: MeasuredValue;
  leftBicepCirc: MeasuredValue;
  rightForearmCirc: MeasuredValue;
  leftForearmCirc: MeasuredValue;
  rightThighCirc: MeasuredValue;
  leftThighCirc: MeasuredValue;
  rightCalfCirc: MeasuredValue;
  leftCalfCirc: MeasuredValue;

  /** Derived ratios. */
  waistToHipRatio: number;
  waistToHeightRatio: number;
  shoulderToWaistRatio: number;

  /** Lengths in cm. */
  inseamCm: number;
  torsoLengthCm: number;

  /**
   * Corroboration signals from back-view and L/R depth comparison (Task 6).
   * Always present in extractMeasurements() output.
   * When only a front silhouette is used, lrCorroboration is 0 and
   * fbCorroboration is SINGLE_SOURCE_CREDIT (0.5) per level.
   * Manually constructed fixtures that predate Task 6 must supply this field.
   * A future task threads these into scoreMeasurementConfidence per field.
   */
  corroborationSignals: CorroborationSignals;

  /**
   * Per-level ellipse semi-axes produced alongside each circumference (Task 8).
   * Always present in extractMeasurements() output.
   * Individual axis values may be null per RULE 9 when front width or side depth
   * is unavailable. Manually constructed fixtures that predate Task 8 must supply
   * this field (use null axes for missing levels).
   * One-model guarantee: the same aCm and bCm that feed predictCircumference
   * also feed the mesh cross-section renderer (Section 8.4 / 11.4).
   */
  semiAxes: {
    neck: LevelSemiAxes;
    shoulder: LevelSemiAxes;
    chest: LevelSemiAxes;
    waistNatural: LevelSemiAxes;
    waistNavel: LevelSemiAxes;
    hip: LevelSemiAxes;
    bicepR: LevelSemiAxes;
    bicepL: LevelSemiAxes;
    forearmR: LevelSemiAxes;
    forearmL: LevelSemiAxes;
    thighR: LevelSemiAxes;
    thighL: LevelSemiAxes;
    calfR: LevelSemiAxes;
    calfL: LevelSemiAxes;
  };
}

export type EstimationMethod = 'navy_primary' | 'visual_primary' | 'calibrated' | 'bmi_fallback';

export interface CompositionMethodBreakdown {
  navyFormula: { result: number | null; inputs: string; available: boolean };
  visualEstimate: { low: number | null; high: number | null; fromBrain: string; available: boolean };
  bmiEstimate: { result: number | null; available: boolean };
  manualCalibration: { result: number | null; source: string | null; available: boolean };
}

export interface CompositionEstimate {
  bodyFatPct: { low: number; mid: number; high: number };
  leanMassKg: { low: number; mid: number; high: number };
  fatMassKg: { low: number; mid: number; high: number };
  estimatedBmcKg: number | null;
  ffmi: number;
  methods: CompositionMethodBreakdown;
  blendedMethod: EstimationMethod;
  blendedConfidence: number;
  calibrated: boolean;
  explanation: string;
}

/** 9-parameter parametric body model (measurement-driven mesh generation). */
export interface BodyModelParameters {
  heightCm: number;
  shoulderCircCm: number;
  chestCircCm: number;
  waistCircCm: number;
  hipCircCm: number;
  neckCircCm: number;
  bicepCircCm: number;
  thighCircCm: number;
  calfCircCm: number;
  inseamCm: number;
  torsoLengthCm: number;
  sex: BiologicalSex;
  bodyFatPct: number;
}

export interface FutureMeInputs {
  currentParams: BodyModelParameters;
  currentWeightKg: number;
  goalWeightKg: number;
  goalBodyFatPct: number;
}

export interface AsymmetryCheck {
  name: string;
  leftValue: number;
  rightValue: number;
  unit: string;
  balanceRatioPct: number;
  status: 'balanced' | 'minor_imbalance' | 'moderate_imbalance' | 'significant_imbalance';
  recommendation: string;
}

export interface AsymmetryReport {
  checks: AsymmetryCheck[];
  overallScore: number;
  flaggedAreas: string[];
  recommendations: string[];
}

export interface ManualCalibrationInput {
  /** Manual circumference measurements keyed by measurement id (e.g. 'waist_natural'). */
  tapeMeasurements?: Record<string, number>;
  /** Manual body fat from InBody, DEXA, calipers etc. */
  manualBodyFatPct?: number | null;
  manualBodyFatSource?: string | null;
  manualBodyFatConfidence?: number | null;
  /** Date of the most recent manual entry used for calibration. */
  calibratedAtDate?: string | null;
}
