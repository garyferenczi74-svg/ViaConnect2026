// Shared types for Arnold's body scanning pipeline.
// Pure TS, no runtime deps.

import type { BiologicalSex } from '../brain/bodyCompositionScience';
import type { PoseId } from '../types';

export type { BiologicalSex, PoseId };

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
  cm: number;
  /** +/- symmetric uncertainty in cm. */
  uncertaintyCm: number;
  confidence: ConfidenceLevel;
  /** Named source, e.g., "ellipse_frontSide" | "geometric_front" | "tape_calibrated". */
  source: string;
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
