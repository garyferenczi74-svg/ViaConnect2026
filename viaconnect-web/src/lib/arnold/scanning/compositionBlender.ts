// Blend multiple body composition estimates into a single, honest output.
// Always returns a range plus method breakdown for UI transparency.

import { classifyFFMI, calculateFFMI } from '../brain/anthropometricStandards';
import type {
  BiologicalSex,
  CompositionEstimate,
  CompositionMethodBreakdown,
  EstimationMethod,
} from './types';

export interface BlenderInputs {
  sex: BiologicalSex;
  heightCm: number;
  weightKg: number;
  navyBodyFatPct: number | null;
  visualLowPct: number | null;
  visualHighPct: number | null;
  bmiBodyFatPct: number | null;
  manualBodyFatPct: number | null;
  manualSource: string | null;
  manualConfidence: number | null;
}

export function blendComposition(inputs: BlenderInputs): CompositionEstimate {
  const methods: CompositionMethodBreakdown = {
    navyFormula: {
      result: inputs.navyBodyFatPct,
      available: inputs.navyBodyFatPct !== null,
      inputs: 'neck + waist + hip (female) + height',
    },
    visualEstimate: {
      low: inputs.visualLowPct,
      high: inputs.visualHighPct,
      available: inputs.visualLowPct !== null && inputs.visualHighPct !== null,
      fromBrain: 'Arnold Vision API analysis range',
    },
    bmiEstimate: {
      result: inputs.bmiBodyFatPct,
      available: inputs.bmiBodyFatPct !== null,
    },
    manualCalibration: {
      result: inputs.manualBodyFatPct,
      source: inputs.manualSource,
      available: inputs.manualBodyFatPct !== null,
    },
  };

  let midBF: number;
  let spread: number;
  let method: EstimationMethod;
  let confidence: number;
  let calibrated = false;
  let explanation = '';

  const hasStrongManual =
    inputs.manualBodyFatPct !== null &&
    (inputs.manualConfidence ?? 0) >= 0.80;

  if (hasStrongManual) {
    midBF = inputs.manualBodyFatPct!;
    spread = 2;
    method = 'calibrated';
    confidence = Math.min(0.95, (inputs.manualConfidence ?? 0.8) + 0.05);
    calibrated = true;
    explanation = `Anchored to your ${inputs.manualSource ?? 'manual'} reading of ${inputs.manualBodyFatPct!.toFixed(1)}%. Other methods used for cross validation only.`;
  } else {
    const navy = inputs.navyBodyFatPct;
    const visualMid =
      inputs.visualLowPct !== null && inputs.visualHighPct !== null
        ? (inputs.visualLowPct + inputs.visualHighPct) / 2
        : null;
    const bmi = inputs.bmiBodyFatPct;

    const entries: Array<{ value: number; weight: number; label: string }> = [];
    if (navy !== null)       entries.push({ value: navy,      weight: 0.45, label: 'Navy formula' });
    if (visualMid !== null)  entries.push({ value: visualMid, weight: 0.35, label: 'Arnold visual' });
    if (bmi !== null)        entries.push({ value: bmi,       weight: 0.20, label: 'CUN-BAE (BMI)' });

    if (entries.length === 0) {
      midBF = 0; spread = 0; method = 'bmi_fallback'; confidence = 0;
      explanation = 'No composition inputs available.';
    } else {
      const totalWeight = entries.reduce((s, e) => s + e.weight, 0);
      const weighted = entries.reduce((s, e) => s + e.value * e.weight, 0) / totalWeight;
      midBF = round1(weighted);
      const maxDiff = entries.reduce((m, e) => Math.max(m, Math.abs(e.value - weighted)), 0);
      spread = Math.max(2, round1(maxDiff));
      method = navy !== null ? 'navy_primary' : visualMid !== null ? 'visual_primary' : 'bmi_fallback';
      confidence = spread <= 3 ? 0.78 : spread <= 5 ? 0.65 : 0.52;
      explanation = `Blended from ${entries.map(e => e.label).join(', ')}. Range reflects disagreement between methods.`;
    }
  }

  const low = clampBF(midBF - spread);
  const high = clampBF(midBF + spread);

  const fatMassKgLow  = inputs.weightKg * (low  / 100);
  const fatMassKgMid  = inputs.weightKg * (midBF / 100);
  const fatMassKgHigh = inputs.weightKg * (high / 100);
  const leanLow  = inputs.weightKg - fatMassKgHigh;
  const leanMid  = inputs.weightKg - fatMassKgMid;
  const leanHigh = inputs.weightKg - fatMassKgLow;

  const heightM = inputs.heightCm / 100;
  const ffmi = round1(calculateFFMI(leanMid, heightM));
  // FFMI classification is not returned directly; callers derive label via classifyFFMI when needed.
  void classifyFFMI;

  return {
    bodyFatPct: { low, mid: midBF, high },
    leanMassKg: { low: round1(leanLow),  mid: round1(leanMid),  high: round1(leanHigh) },
    fatMassKg:  { low: round1(fatMassKgLow), mid: round1(fatMassKgMid), high: round1(fatMassKgHigh) },
    estimatedBmcKg: null, // BMC requires DEXA; we do not estimate from photos.
    ffmi,
    methods,
    blendedMethod: method,
    blendedConfidence: round1(confidence),
    calibrated,
    explanation,
  };
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
function clampBF(n: number): number {
  return Math.max(2, Math.min(70, round1(n)));
}
