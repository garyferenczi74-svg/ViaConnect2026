// =============================================================================
// body-scan-analyze/caq-delta.ts
//
// Deno-runtime replica of:
//   viaconnect-web/src/lib/body-tracker/caq-xref.ts  flagDemographicDelta()
//
// Deno Edge Functions cannot import from src/lib. Keep this logic verbatim
// in sync with the canonical client-side file. Any threshold or logic change
// must be applied to both files simultaneously.
// =============================================================================

import { CAQ_HEIGHT_THRESHOLD_CM, CAQ_WEIGHT_THRESHOLD_KG } from './constants.ts';

export interface DemographicPoint {
  height_cm: number;
  weight_kg: number;
}

export interface DemographicDeltaResult {
  flagged: boolean;
  reasons: string[];
}

/**
 * Compare scan-reported demographics against CAQ Phase 1 values.
 * Returns flagged=true and one reason string per exceeded threshold.
 * Threshold: strictly MORE than 5 cm height OR 5 kg weight (exactly 5.0 is NOT flagged).
 * Source rule: §7 + src/lib/body-tracker/caq-xref.ts.
 */
export function flagDemographicDelta(
  scanReported: DemographicPoint,
  caqPhase1: DemographicPoint,
): DemographicDeltaResult {
  const reasons: string[] = [];

  const heightDelta = Math.abs(scanReported.height_cm - caqPhase1.height_cm);
  const weightDelta = Math.abs(scanReported.weight_kg - caqPhase1.weight_kg);

  if (heightDelta > CAQ_HEIGHT_THRESHOLD_CM) {
    reasons.push(
      `Height discrepancy: scan reported ${scanReported.height_cm} cm, CAQ recorded ${caqPhase1.height_cm} cm (delta ${heightDelta.toFixed(2)} cm).`,
    );
  }

  if (weightDelta > CAQ_WEIGHT_THRESHOLD_KG) {
    reasons.push(
      `Weight discrepancy: scan reported ${scanReported.weight_kg} kg, CAQ recorded ${caqPhase1.weight_kg} kg (delta ${weightDelta.toFixed(2)} kg).`,
    );
  }

  return { flagged: reasons.length > 0, reasons };
}
