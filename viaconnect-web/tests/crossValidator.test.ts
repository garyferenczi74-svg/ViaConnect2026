// Cross-validator parity test.
//
// The vision Edge Function (supabase/functions/arnold-vision-analyze/index.ts)
// inlines a Deno-compatible copy of crossValidate(). This suite asserts:
//   1. CROSS_VALIDATOR_VERSION constants in BOTH files match.
//   2. The canonical TypeScript implementation produces the expected outputs
//      across the three calibration branches (visual_only, plus_manual,
//      blended, disagreement_flagged).
//
// If you change the algorithm, update both files AND bump the version in
// both. This test will fail loudly if they drift.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  crossValidate,
  CROSS_VALIDATOR_VERSION,
} from '@/lib/arnold/crossValidator';
import type {
  ArnoldVisualAnalysis,
  ManualMetricsSnapshot,
} from '@/lib/arnold/types';

const baseVisual: ArnoldVisualAnalysis = {
  estimatedBodyFatRange: { low: 18, high: 22, midpoint: 20, confidence: 0.7 },
  fatDistributionPattern: 'mixed',
  fatDistributionNotes: 'Even distribution.',
  muscleDevelopment: {
    overall_level: 2,
    shoulders: { score: 2, notes: '' },
    arms: { score: 2, notes: '' },
    chest: { score: 2, notes: '' },
    back: { score: 2, notes: '' },
    core: { score: 2, notes: '' },
    legs: { score: 2, notes: '' },
    glutes: { score: 2, notes: '' },
  },
  symmetry: { overallScore: 0.9, imbalances: [] },
  posture: { overallAlignment: 'good', deviations: [], compositionImpact: '' },
  progressVsPrevious: {
    hasComparison: false,
    visibleChanges: [],
    overallDirection: 'maintaining',
    notableAreas: [],
  },
  somatotypeEstimate: { ectomorph: 0.3, mesomorph: 0.5, endomorph: 0.2 },
  coachingInsights: [],
  overallConfidence: 0.7,
  confidenceFactors: [],
};

describe('CROSS_VALIDATOR_VERSION', () => {
  it('canonical and edge-function copies declare the same version', () => {
    const edgePath = path.resolve(
      __dirname,
      '../supabase/functions/arnold-vision-analyze/index.ts',
    );
    const edgeSrc = readFileSync(edgePath, 'utf8');
    const m = edgeSrc.match(/CROSS_VALIDATOR_VERSION\s*=\s*['"]([^'"]+)['"]/);
    expect(m).not.toBeNull();
    expect(m![1]).toBe(CROSS_VALIDATOR_VERSION);
  });
});

describe('crossValidate', () => {
  it('returns visual_only when no manual snapshot is provided', () => {
    const out = crossValidate(baseVisual, null);
    expect(out.calibrationSource).toBe('visual_only');
    expect(out.bodyFatEstimate?.confidence).toBeLessThan(baseVisual.estimatedBodyFatRange.confidence);
  });

  it('returns visual_only when manual snapshot has no body-fat reading', () => {
    const manual: ManualMetricsSnapshot = { totalBodyFatPct: null, source: null, confidence: null };
    expect(crossValidate(baseVisual, manual).calibrationSource).toBe('visual_only');
  });

  it('returns visual_plus_manual when deviation is small (<= 3%)', () => {
    const manual: ManualMetricsSnapshot = { totalBodyFatPct: 21, source: 'inbody', confidence: 0.9 };
    const out = crossValidate(baseVisual, manual);
    expect(out.calibrationSource).toBe('visual_plus_manual');
    expect(out.bodyFatEstimate?.confidence).toBeGreaterThan(baseVisual.estimatedBodyFatRange.confidence);
  });

  it('returns visual_plus_manual_blended when deviation is moderate (3 to 6%)', () => {
    const manual: ManualMetricsSnapshot = { totalBodyFatPct: 25, source: 'caliper', confidence: 0.7 };
    const out = crossValidate(baseVisual, manual);
    expect(out.calibrationSource).toBe('visual_plus_manual_blended');
    expect(out.bodyFatEstimate?.midpoint).toBeGreaterThan(baseVisual.estimatedBodyFatRange.midpoint);
  });

  it('flags disagreement_flagged when deviation > 6%', () => {
    const manual: ManualMetricsSnapshot = { totalBodyFatPct: 30, source: 'dexa', confidence: 0.95 };
    const out = crossValidate(baseVisual, manual);
    expect(out.calibrationSource).toBe('disagreement_flagged');
    expect(out.flagForReview).toBe(true);
  });
});
