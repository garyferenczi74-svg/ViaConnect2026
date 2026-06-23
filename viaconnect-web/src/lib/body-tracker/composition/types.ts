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
  source: 'scan' | 'manual';
  recordedAt: string;
  totalBodyFatPct: number | null;
  regionFatPct: RegionMap;
  visceralFatRating: number | null;
  bodyWaterPct: number | null;
  regionMuscleLbs: RegionMap;
  totalMuscleMassLbs: number | null;
  skeletalMuscleMassLbs: number | null;
}

export interface ScanDerived {
  totalBodyFatPct: number | null;
  confidence: number;
}
