// Cross-validate Arnold's visual analysis against manual/device data.
// Pure function, no DB side effects.
//
// MIRRORED IMPLEMENTATION
// Supabase Edge Functions run on Deno and cannot import this Next.js module
// directly, so an identical copy lives at:
//   supabase/functions/arnold-vision-analyze/index.ts (function `crossValidate`)
// If you change the algorithm here, mirror the change there AND bump
// CROSS_VALIDATOR_VERSION in BOTH files. The Vitest suite asserts both
// versions match before allowing a release.

export const CROSS_VALIDATOR_VERSION = '1.0.0';

import type {
  ArnoldVisualAnalysis,
  CalibratedAnalysis,
  ManualMetricsSnapshot,
} from './types';

export function crossValidate(
  visual: ArnoldVisualAnalysis,
  manual: ManualMetricsSnapshot | null,
): CalibratedAnalysis {
  if (!manual || manual.totalBodyFatPct === null) {
    return {
      ...visual,
      calibrationSource: 'visual_only',
      bodyFatEstimate: {
        ...visual.estimatedBodyFatRange,
        confidence: Math.max(0, visual.estimatedBodyFatRange.confidence * 0.8),
      },
    };
  }

  const visualMid = visual.estimatedBodyFatRange.midpoint;
  const manualBF = manual.totalBodyFatPct;
  const deviation = Math.abs(visualMid - manualBF);
  const manualConf = manual.confidence ?? 0.85;
  const visualConf = visual.estimatedBodyFatRange.confidence;

  if (deviation <= 3) {
    return {
      ...visual,
      calibrationSource: 'visual_plus_manual',
      bodyFatEstimate: {
        low:  Math.min(visual.estimatedBodyFatRange.low,  manualBF - 1),
        high: Math.max(visual.estimatedBodyFatRange.high, manualBF + 1),
        midpoint: round1((visualMid + manualBF) / 2),
        confidence: Math.min(0.95, visualConf + 0.15),
      },
      calibrationNote: `Visual estimate (${visualMid}%) aligns with your ${manual.source ?? 'recorded'} reading (${manualBF}%). High confidence in combined analysis.`,
    };
  }

  if (deviation <= 6) {
    const totalConf = manualConf + visualConf;
    const blended = totalConf > 0
      ? (manualBF * manualConf + visualMid * visualConf) / totalConf
      : (manualBF + visualMid) / 2;
    return {
      ...visual,
      calibrationSource: 'visual_plus_manual_blended',
      bodyFatEstimate: {
        low:  round1(blended - 3),
        high: round1(blended + 3),
        midpoint: round1(blended),
        confidence: Math.min(0.85, (manualConf + visualConf) / 2),
      },
      calibrationNote: `Visual estimate (${visualMid}%) differs from your ${manual.source ?? 'recorded'} reading (${manualBF}%) by ${deviation.toFixed(1)}%. Using blended estimate of ${round1(blended)}%. This variance is normal between visual and device methods.`,
    };
  }

  return {
    ...visual,
    calibrationSource: 'disagreement_flagged',
    bodyFatEstimate: {
      ...visual.estimatedBodyFatRange,
      confidence: 0.5,
    },
    calibrationNote: `Visual estimate (${visualMid}%) differs significantly from your ${manual.source ?? 'recorded'} reading (${manualBF}%). Possible causes: lighting or clothing affecting visual analysis, device calibration issues, or rapid changes between measurement and photo dates. Consider retaking both for a more accurate reading.`,
    flagForReview: true,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
