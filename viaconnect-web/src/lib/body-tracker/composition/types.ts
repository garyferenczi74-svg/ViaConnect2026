// Canonical typed shapes for the body composition read/write path.
// null === UNKNOWN - never coerce an unknown measurement to 0.

export type RegionMap = {
  right_arm: number | null;
  left_arm: number | null;
  trunk: number | null;
  right_leg: number | null;
  left_leg: number | null;
};

export interface CompositionSnapshot {
  entryId: string;
  source: string;
  recordedAt: string;
  deviceName?: string | null;
  totalBodyFatPct: number | null;
  regionFatPct: RegionMap;
  visceralFatRating: number | null;
  bodyWaterPct: number | null;
  regionMuscleLbs: RegionMap;
  totalMuscleMassLbs: number | null;
  skeletalMuscleMassLbs: number | null;
  /** Present when this entry is linked to body_tracker_photo_scans. */
  scanId?: string | null;
  /** Scan protocol when known. Photo estimate is formavision_photo; guided is 4pose_v1. */
  protocol?: string | null;
  /** Photo-scan body fat is a RANGE. Display these; do not treat midpoint as measured. */
  estimatedBodyFatMin?: number | null;
  estimatedBodyFatMax?: number | null;
  /** Photo-scan waist-to-hip range when the analyze estimate included it. */
  estimatedWhrMin?: number | null;
  estimatedWhrMax?: number | null;
  isEstimated?: boolean;
}

export interface ScanDerived {
  /** Midpoint of the estimate range. Metadata / delta math only — not a measured value. */
  totalBodyFatPct: number | null;
  estimatedBodyFatMin?: number | null;
  estimatedBodyFatMax?: number | null;
  confidence: number;
}
