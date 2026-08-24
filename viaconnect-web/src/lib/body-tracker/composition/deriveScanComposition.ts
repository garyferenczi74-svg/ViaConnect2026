// Pure derivation of scan composition from a BodyScanEstimate.
// Honest model: only total body fat pct is derivable from a photo scan.
// Everything else is UNKNOWN (null) - never 0.

import type { BodyScanEstimate } from '@/components/body-tracker/BodyScanUploader';
import type { ScanDerived } from './types';

export type { ScanDerived };

const CONFIDENCE_MAP: Record<'low' | 'medium' | 'high', number> = {
  low: 0.4,
  medium: 0.65,
  high: 0.85,
};

export function deriveScanComposition(est: BodyScanEstimate): ScanDerived {
  const min = est.estimated_body_fat_min;
  const max = est.estimated_body_fat_max;
  const minOk = Number.isFinite(min);
  const maxOk = Number.isFinite(max);
  const mid =
    minOk && maxOk
      ? Math.round(((min + max) / 2) * 10) / 10
      : null;
  return {
    // Midpoint is metadata for readers that need a single number. UI shows the range.
    totalBodyFatPct: mid,
    estimatedBodyFatMin: minOk ? min : null,
    estimatedBodyFatMax: maxOk ? max : null,
    confidence: CONFIDENCE_MAP[est.ai_confidence] ?? 0.5,
  };
}
