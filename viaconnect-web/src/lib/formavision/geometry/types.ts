// Parameter-vector model for the FormaVision parametric body mesh (Prompt 210b).
//
// The avatar body is a code-generated wireframe whose geometry is a pure function
// of this vector, so the rendered body can never drift from the scan numbers. This
// file defines ONLY the input types and the sex templates. A separate later task
// (P1-T2) maps the real scan snapshot into a BodyParamVector; do not build that
// mapping here.
//
// Anthropometric defaults below are population-typical adult values drawn from the
// public-domain ANSUR II / NHANES circumference ranges (means rounded to the cm).
// They are neutral fallbacks for an UNKNOWN measurement, not medical claims.

export type Sex = 'male' | 'female';

// A single horizontal cross-section of the torso-and-legs stack, ordered head to foot.
export interface BodyRing {
  // Stable identifier, e.g. 'neck', 'chest', 'waist', 'hip', 'rThigh', 'lThigh',
  // 'rCalf', 'lCalf'.
  id: string;
  // Normalized body height of this ring. 0 = feet (floor), 1 = crown.
  levelN: number;
  // Real-world circumference in meters, or null when UNKNOWN (use the template
  // default for the matching ring id and mark the ring estimated).
  circumferenceM: number | null;
  // Depth over width of the cross-section ellipse at this region (b / a). A value
  // of 1 is a circle; values below 1 are wider than deep (typical for a torso).
  aspectRatio: number;
  // True when circumferenceM was filled from the template rather than measured.
  estimated: boolean;
}

// One arm, lofted separately from the torso as a tapered tube.
export interface ArmParam {
  side: 'r' | 'l';
  // Upper-arm (bicep) circumference in meters, or null when UNKNOWN.
  bicepM: number | null;
  // Forearm circumference in meters, or null when UNKNOWN.
  forearmM: number | null;
  // True when either circumference was filled from the template.
  estimated: boolean;
}

export interface BodyParamVector {
  sex: Sex;
  // Real-world standing height in meters. The caller passes a default if unknown.
  heightM: number;
  // Torso-and-legs rings, ordered head to foot (descending levelN is not required;
  // the builder sorts by levelN).
  rings: BodyRing[];
  // Left and right arms.
  arms: ArmParam[];
}

// A template ring default: where the ring sits, its neutral circumference, and the
// cross-section aspect ratio for that region.
export interface TemplateRing {
  id: string;
  levelN: number;
  circumferenceM: number;
  aspectRatio: number;
}

export interface BodyTemplate {
  sex: Sex;
  heightM: number;
  rings: TemplateRing[];
  arm: {
    bicepM: number;
    forearmM: number;
  };
  // Head ovoid sizing relative to the neck ring, plus its own aspect ratio.
  head: {
    // Multiplier applied to the neck circumference to derive the head circumference.
    circumferenceFromNeck: number;
    aspectRatio: number;
  };
}

// Population-typical adult male defaults (meters). Wider shoulders and chest, a
// waist close to the hip, deeper torso aspect than the female template.
export const MALE_TEMPLATE: BodyTemplate = {
  sex: 'male',
  heightM: 1.75,
  rings: [
    { id: 'neck', levelN: 0.87, circumferenceM: 0.39, aspectRatio: 0.92 },
    { id: 'chest', levelN: 0.72, circumferenceM: 1.0, aspectRatio: 0.72 },
    { id: 'waist', levelN: 0.62, circumferenceM: 0.9, aspectRatio: 0.78 },
    { id: 'hip', levelN: 0.52, circumferenceM: 0.98, aspectRatio: 0.74 },
    { id: 'rThigh', levelN: 0.45, circumferenceM: 0.56, aspectRatio: 0.92 },
    { id: 'lThigh', levelN: 0.45, circumferenceM: 0.56, aspectRatio: 0.92 },
    { id: 'rCalf', levelN: 0.22, circumferenceM: 0.37, aspectRatio: 0.9 },
    { id: 'lCalf', levelN: 0.22, circumferenceM: 0.37, aspectRatio: 0.9 },
  ],
  arm: { bicepM: 0.33, forearmM: 0.27 },
  head: { circumferenceFromNeck: 1.45, aspectRatio: 0.85 },
};

// Population-typical adult female defaults (meters). Narrower waist relative to a
// wider hip, smaller chest and neck, slightly rounder cross-sections.
export const FEMALE_TEMPLATE: BodyTemplate = {
  sex: 'female',
  heightM: 1.62,
  rings: [
    { id: 'neck', levelN: 0.87, circumferenceM: 0.33, aspectRatio: 0.94 },
    { id: 'chest', levelN: 0.72, circumferenceM: 0.9, aspectRatio: 0.76 },
    { id: 'waist', levelN: 0.63, circumferenceM: 0.74, aspectRatio: 0.82 },
    { id: 'hip', levelN: 0.51, circumferenceM: 0.99, aspectRatio: 0.72 },
    { id: 'rThigh', levelN: 0.45, circumferenceM: 0.55, aspectRatio: 0.93 },
    { id: 'lThigh', levelN: 0.45, circumferenceM: 0.55, aspectRatio: 0.93 },
    { id: 'rCalf', levelN: 0.22, circumferenceM: 0.35, aspectRatio: 0.91 },
    { id: 'lCalf', levelN: 0.22, circumferenceM: 0.35, aspectRatio: 0.91 },
  ],
  arm: { bicepM: 0.28, forearmM: 0.24 },
  head: { circumferenceFromNeck: 1.6, aspectRatio: 0.86 },
};

export function templateForSex(sex: Sex): BodyTemplate {
  return sex === 'female' ? FEMALE_TEMPLATE : MALE_TEMPLATE;
}
