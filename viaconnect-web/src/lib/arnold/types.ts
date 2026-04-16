// Shared types for Arnold's visual analysis pipeline.
// Used by both the Edge Function (Deno) and client code.

export type PoseId = 'front' | 'back' | 'left' | 'right';

export interface BodyFatRange {
  low: number;
  high: number;
  midpoint: number;
  confidence: number;
}

export type FatDistributionPattern = 'android' | 'gynoid' | 'mixed';

export interface MuscleScore {
  score: 0 | 1 | 2 | 3 | 4;
  notes: string;
}

export interface MuscleDevelopment {
  overall_level: 0 | 1 | 2 | 3 | 4;
  shoulders: MuscleScore;
  arms: MuscleScore;
  chest: MuscleScore;
  back: MuscleScore;
  core: MuscleScore;
  legs: MuscleScore;
  glutes: MuscleScore;
}

export type SymmetrySeverity = 'minor' | 'moderate' | 'significant';

export interface SymmetryImbalance {
  area: string;
  description: string;
  severity: SymmetrySeverity;
}

export interface SymmetryAssessment {
  overallScore: number;
  imbalances: SymmetryImbalance[];
}

export type PostureSeverity = 'mild' | 'moderate' | 'significant';

export interface PostureDeviationFinding {
  type: string;
  severity: PostureSeverity;
  notes: string;
}

export interface PostureAssessment {
  overallAlignment: 'good' | 'fair' | 'needs_attention';
  deviations: PostureDeviationFinding[];
  compositionImpact: string;
}

export type ProgressDirection = 'improving' | 'maintaining' | 'regressing' | 'recomposing';
export type ChangeMagnitude = 'subtle' | 'moderate' | 'significant';

export interface NotableAreaChange {
  area: string;
  change: string;
  magnitude: ChangeMagnitude;
}

export interface ProgressVsPrevious {
  hasComparison: boolean;
  visibleChanges: string[];
  overallDirection: ProgressDirection;
  notableAreas: NotableAreaChange[];
}

export interface SomatotypeEstimate {
  ectomorph: number;
  mesomorph: number;
  endomorph: number;
}

export interface ArnoldVisualAnalysis {
  estimatedBodyFatRange: BodyFatRange;
  fatDistributionPattern: FatDistributionPattern;
  fatDistributionNotes: string;
  muscleDevelopment: MuscleDevelopment;
  symmetry: SymmetryAssessment;
  posture: PostureAssessment;
  progressVsPrevious: ProgressVsPrevious;
  somatotypeEstimate: SomatotypeEstimate;
  coachingInsights: string[];
  overallConfidence: number;
  confidenceFactors: string[];
}

export type CalibrationSource =
  | 'visual_only'
  | 'visual_primary'
  | 'visual_plus_manual'
  | 'visual_plus_manual_blended'
  | 'disagreement_flagged';

export interface CalibratedAnalysis extends ArnoldVisualAnalysis {
  calibrationSource: CalibrationSource;
  calibrationNote?: string;
  flagForReview?: boolean;
  bodyFatEstimate?: BodyFatRange;
}

export interface ManualMetricsSnapshot {
  totalBodyFatPct: number | null;
  source: string | null;
  confidence: number | null;
  weightLbs?: number | null;
  muscleMassLbs?: number | null;
  waistIn?: number | null;
  hipsIn?: number | null;
  heightCm?: number | null;
  age?: number | null;
  sex?: 'male' | 'female' | null;
}
