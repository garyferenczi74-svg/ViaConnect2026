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
  // When aM and bM are both set, they take priority for the cross-section shape.
  aspectRatio: number;
  // Prompt 210h Rev C: measured side-to-side half-width (meters). From scan
  // semi-axes (front width / 2). null/undefined means use circumference + aspect.
  aM?: number | null;
  // Prompt 210h Rev C: measured front-to-back half-depth (meters). From scan
  // semi-axes (side depth / 2). null/undefined means use circumference + aspect.
  bM?: number | null;
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

// A vertical anchor level in the trunk loft (Prompt 210a Section 2.1). Some levels
// are anchored by a real measured ring (anchorRingId set), others are purely
// structural taper levels with a template circumference and no user measurement.
// Structural levels are inherently template and are NOT user-measurable, so they
// are never flagged estimated; only a measured level whose user value is null is.
export interface TrunkLevel {
  id: string;
  // Normalized height of this level. 0 = feet, 1 = crown. Scaled by heightM.
  levelN: number;
  // Template circumference in meters (the neutral default and the taper fallback).
  circumferenceM: number;
  // Region-specific front-to-side aspect ratio (depth / width) at this level.
  aspectRatio: number;
  // When set, this level is anchored by the named measured BodyRing: a real user
  // circumference at that ring overrides circumferenceM exactly. When undefined,
  // the level is structural (template-only, never estimated).
  anchorRingId?: string;
}

// A vertical anchor level in an arm loft, top (shoulder) to bottom (wrist).
export interface ArmLevel {
  id: string;
  // Fraction along the arm from shoulder (0) to wrist (1).
  t: number;
  // Template circumference in meters.
  circumferenceM: number;
  aspectRatio: number;
  // Which measured arm value anchors this level, if any: bicep at mid-upper-arm,
  // forearm at mid-forearm. Other levels are structural taper.
  anchor?: 'bicep' | 'forearm';
}

export interface BodyTemplate {
  sex: Sex;
  heightM: number;
  rings: TemplateRing[];
  arm: {
    bicepM: number;
    forearmM: number;
  };
  // Full anatomical trunk level set (210a 2.1), foot to head. Used by the enriched
  // loft. The measured-ring stack above (rings) is kept for the scan mapper.
  trunkLevels: TrunkLevel[];
  // Arm level set, shoulder to wrist.
  armLevels: ArmLevel[];
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
  // Full anatomical level set, foot to head. Structural levels (ankle, knee, glute,
  // lowWaist, shoulder) taper the silhouette and carry no anchorRingId. Measured
  // anchors: midCalf<-calf, midThigh<-quad, hip<-hip, navelWaist<-waist,
  // chest<-chest, neckBase<-neck. Aspect ratios are region-specific: waist and chest
  // read wider side-to-side (lower aspect), thigh and calf rounder, neck near-round.
  trunkLevels: [
    { id: 'ankle', levelN: 0.04, circumferenceM: 0.24, aspectRatio: 0.78 },
    { id: 'midCalf', levelN: 0.22, circumferenceM: 0.37, aspectRatio: 0.9, anchorRingId: 'rCalf' },
    { id: 'knee', levelN: 0.30, circumferenceM: 0.38, aspectRatio: 0.92 },
    { id: 'midThigh', levelN: 0.45, circumferenceM: 0.56, aspectRatio: 0.92, anchorRingId: 'rThigh' },
    { id: 'glute', levelN: 0.50, circumferenceM: 1.0, aspectRatio: 0.74 },
    { id: 'hip', levelN: 0.52, circumferenceM: 0.98, aspectRatio: 0.74, anchorRingId: 'hip' },
    { id: 'lowWaist', levelN: 0.58, circumferenceM: 0.93, aspectRatio: 0.8 },
    { id: 'navelWaist', levelN: 0.62, circumferenceM: 0.9, aspectRatio: 0.78, anchorRingId: 'waist' },
    { id: 'chest', levelN: 0.72, circumferenceM: 1.0, aspectRatio: 0.72, anchorRingId: 'chest' },
    { id: 'shoulder', levelN: 0.81, circumferenceM: 1.12, aspectRatio: 0.66 },
    { id: 'neckBase', levelN: 0.87, circumferenceM: 0.39, aspectRatio: 0.92, anchorRingId: 'neck' },
  ],
  armLevels: [
    { id: 'shoulder', t: 0.0, circumferenceM: 0.42, aspectRatio: 0.95 },
    { id: 'midUpperArm', t: 0.28, circumferenceM: 0.33, aspectRatio: 0.95, anchor: 'bicep' },
    { id: 'elbow', t: 0.52, circumferenceM: 0.28, aspectRatio: 0.95 },
    { id: 'midForearm', t: 0.74, circumferenceM: 0.27, aspectRatio: 0.95, anchor: 'forearm' },
    { id: 'wrist', t: 1.0, circumferenceM: 0.17, aspectRatio: 0.95 },
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
  // Female anatomical level set: narrower waist relative to a wider hip and glute,
  // narrower shoulder than the male template, slightly rounder cross-sections.
  trunkLevels: [
    { id: 'ankle', levelN: 0.04, circumferenceM: 0.22, aspectRatio: 0.8 },
    { id: 'midCalf', levelN: 0.22, circumferenceM: 0.35, aspectRatio: 0.91, anchorRingId: 'rCalf' },
    { id: 'knee', levelN: 0.30, circumferenceM: 0.35, aspectRatio: 0.93 },
    { id: 'midThigh', levelN: 0.45, circumferenceM: 0.55, aspectRatio: 0.93, anchorRingId: 'rThigh' },
    { id: 'glute', levelN: 0.49, circumferenceM: 1.02, aspectRatio: 0.72 },
    { id: 'hip', levelN: 0.51, circumferenceM: 0.99, aspectRatio: 0.72, anchorRingId: 'hip' },
    { id: 'lowWaist', levelN: 0.59, circumferenceM: 0.78, aspectRatio: 0.84 },
    { id: 'navelWaist', levelN: 0.63, circumferenceM: 0.74, aspectRatio: 0.82, anchorRingId: 'waist' },
    { id: 'chest', levelN: 0.72, circumferenceM: 0.9, aspectRatio: 0.76, anchorRingId: 'chest' },
    { id: 'shoulder', levelN: 0.81, circumferenceM: 0.98, aspectRatio: 0.7 },
    { id: 'neckBase', levelN: 0.87, circumferenceM: 0.33, aspectRatio: 0.94, anchorRingId: 'neck' },
  ],
  armLevels: [
    { id: 'shoulder', t: 0.0, circumferenceM: 0.36, aspectRatio: 0.96 },
    { id: 'midUpperArm', t: 0.28, circumferenceM: 0.28, aspectRatio: 0.96, anchor: 'bicep' },
    { id: 'elbow', t: 0.52, circumferenceM: 0.24, aspectRatio: 0.96 },
    { id: 'midForearm', t: 0.74, circumferenceM: 0.24, aspectRatio: 0.96, anchor: 'forearm' },
    { id: 'wrist', t: 1.0, circumferenceM: 0.15, aspectRatio: 0.96 },
  ],
  arm: { bicepM: 0.28, forearmM: 0.24 },
  head: { circumferenceFromNeck: 1.6, aspectRatio: 0.86 },
};

export function templateForSex(sex: Sex): BodyTemplate {
  return sex === 'female' ? FEMALE_TEMPLATE : MALE_TEMPLATE;
}
