'use client';

// BodySilhouette — gender-aware dispatcher for the 5-segment body silhouette.
// Used by both Body Composition (fat) and Muscle Analysis (muscle) modes.
// Defaults to male when gender is unknown.

import { BodySilhouetteMale } from './BodySilhouetteMale';
import { BodySilhouetteFemale } from './BodySilhouetteFemale';
import type { SegmentKey } from './SegmentalCallout';

interface SegmentalFatData {
  right_arm_pct: number;
  left_arm_pct: number;
  trunk_pct: number;
  right_leg_pct: number;
  left_leg_pct: number;
  total_body_fat_pct: number;
}
interface SegmentalMuscleData {
  right_arm_lbs: number;
  left_arm_lbs: number;
  trunk_lbs: number;
  right_leg_lbs: number;
  left_leg_lbs: number;
  total_muscle_mass_lbs: number;
  skeletal_muscle_mass_lbs: number;
}

interface BodySilhouetteProps {
  mode: 'fat' | 'muscle';
  segmentalData: SegmentalFatData | SegmentalMuscleData;
  gender?: 'male' | 'female';
  onSegmentClick?: (segment: SegmentKey) => void;
}

export function BodySilhouette({ gender = 'male', ...props }: BodySilhouetteProps) {
  if (gender === 'female') return <BodySilhouetteFemale {...props} />;
  return <BodySilhouetteMale {...props} />;
}
