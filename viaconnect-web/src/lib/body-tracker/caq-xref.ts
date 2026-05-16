// Body Scanner: CAQ cross-reference helpers (§7, §15.2).
//
// Compares scan-reported demographics against CAQ Phase 1 values and
// flags discrepancies that exceed allowed thresholds. Callers persist
// the returned reason strings into body_photo_sessions.quality_issues
// (TEXT[] column).

export interface DemographicPoint {
  height_cm: number;
  weight_kg: number;
}

export interface DemographicDeltaResult {
  flagged: boolean;
  reasons: string[];
}

// Threshold per §7: strictly more than 5 cm height delta OR strictly
// more than 5 kg weight delta triggers a flag. Exactly 5.0 is NOT flagged.
const HEIGHT_THRESHOLD_CM = 5;
const WEIGHT_THRESHOLD_KG = 5;

export function flagDemographicDelta(
  scanReported: DemographicPoint,
  caqPhase1: DemographicPoint,
): DemographicDeltaResult {
  const reasons: string[] = [];

  const heightDelta = Math.abs(scanReported.height_cm - caqPhase1.height_cm);
  const weightDelta = Math.abs(scanReported.weight_kg - caqPhase1.weight_kg);

  if (heightDelta > HEIGHT_THRESHOLD_CM) {
    reasons.push(
      `Height discrepancy: scan reported ${scanReported.height_cm} cm, CAQ recorded ${caqPhase1.height_cm} cm (delta ${heightDelta.toFixed(2)} cm).`,
    );
  }

  if (weightDelta > WEIGHT_THRESHOLD_KG) {
    reasons.push(
      `Weight discrepancy: scan reported ${scanReported.weight_kg} kg, CAQ recorded ${caqPhase1.weight_kg} kg (delta ${weightDelta.toFixed(2)} kg).`,
    );
  }

  return { flagged: reasons.length > 0, reasons };
}
