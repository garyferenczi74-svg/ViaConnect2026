// Prompt #170 Phase 1f: shared portion types for the NutriVision portion engine.
// Phase 1 ships reference_object, vision_inference, and user_override methods;
// the lidar and arcore values are reserved for Phase 2 (Prompt 170b) so the
// data layer can adopt them without a schema change.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import type { BoundingBox } from '../vision/types';

export type PortionEstimationMethod =
  | 'lidar'              // 170b Phase 2 stub
  | 'arcore'             // 170b Phase 2 stub
  | 'reference_object'   // Phase 1 primary when reference detected
  | 'vision_inference'   // Phase 1 fallback when no reference
  | 'user_override'      // user dragged the portion slider
  | 'unknown';

export interface PortionEstimate {
  method: PortionEstimationMethod;
  grams: number;
  volume_ml?: number;
  // 0..1 confidence in the estimate (separate from recognition confidence).
  confidence: number;
  // Free-text label describing the estimate, e.g. "142 g, about 1 medium breast".
  humanLabel?: string;
}

// Prompt #170a supplement §17: forks are dropped from the catalog because
// their real-world length varies too much (child fork through serving fork).
// plate_8in is added so the result-screen plate selector covers small plates.
export type ReferenceObjectKind =
  | 'credit_card'    // ISO/IEC 7810 ID-1: 85.60 by 53.98 mm
  | 'plate_8in'      // 8 inch salad plate roughly 203 mm diameter
  | 'plate_10in'     // 10 inch dinner plate roughly 254 mm diameter
  | 'plate_12in';    // 12 inch dinner plate roughly 305 mm diameter

export interface ReferenceObject {
  kind: ReferenceObjectKind;
  boundingBox: BoundingBox;
  // Real-world longest dimension of this reference, in mm. The scaler uses
  // this to compute pixels per mm against the bounding box.
  realWorldLongestMm: number;
}

export interface FoodDensity {
  // Per category so the table stays compact; many foods have similar density.
  category: string;
  densityGPerMl: number;
}
