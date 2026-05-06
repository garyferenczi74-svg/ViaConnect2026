// Biological age estimation per Prompt #85c §2.3.
// If metabolic age is available, use it directly (most accurate).
// Otherwise estimate from RHR, HRV, body fat %.

export interface BiologicalAgeInputs {
  metabolicAge?: number;
  restingHR?: number;
  hrv?: number;
  bodyFatPct?: number;
}

export function estimateBiologicalAge(
  chronologicalAge: number,
  inputs: BiologicalAgeInputs = {},
): number {
  if (inputs.metabolicAge !== undefined && inputs.metabolicAge > 0) {
    return inputs.metabolicAge;
  }
  let adjustment = 0;
  if (inputs.restingHR !== undefined) {
    if (inputs.restingHR < 60) adjustment -= 2;
    else if (inputs.restingHR > 80) adjustment += 3;
  }
  if (inputs.hrv !== undefined) {
    if (inputs.hrv > 50) adjustment -= 2;
    else if (inputs.hrv < 30) adjustment += 3;
  }
  if (inputs.bodyFatPct !== undefined) {
    if (inputs.bodyFatPct < 20) adjustment -= 1;
    else if (inputs.bodyFatPct > 30) adjustment += 2;
  }
  return Math.max(18, chronologicalAge + adjustment);
}

// Returns marker position 0..1 along a Younger←center→Older bar.
// Clamps at ±15 years from chronological for visualization.
export function biologicalAgeMarkerPosition(
  biologicalAge: number,
  chronologicalAge: number,
  rangeYears = 15,
): number {
  const delta = biologicalAge - chronologicalAge;
  const clamped = Math.max(-rangeYears, Math.min(rangeYears, delta));
  return (clamped / rangeYears) * 0.5 + 0.5;
}
