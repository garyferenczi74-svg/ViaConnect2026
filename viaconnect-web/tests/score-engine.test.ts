// Body Tracker score engine — covers composite arithmetic, contributor
// grades, tier assignment, and confidence-percent calculation.

import { describe, it, expect } from 'vitest';
import { calculateBodyScore } from '@/lib/body-tracker/score-engine';

describe('calculateBodyScore', () => {
  it('returns a 0 to 1000 score with 5 contributors', () => {
    const out = calculateBodyScore({
      bodyFatPct: 18,
      weightTrend: 'stable',
      muscleMassTrend: 'stable',
      restingHR: 55,
      hrv: 50,
    });
    expect(out.bodyScore).toBeGreaterThanOrEqual(0);
    expect(out.bodyScore).toBeLessThanOrEqual(1000);
    expect(out.contributors).toHaveProperty('composition');
    expect(out.contributors).toHaveProperty('weight');
    expect(out.contributors).toHaveProperty('muscle');
    expect(out.contributors).toHaveProperty('cardiovascular');
    expect(out.contributors).toHaveProperty('metabolic');
  });

  it('lands an ideal-input case in Optimal tier', () => {
    const out = calculateBodyScore({
      bodyFatPct: 18,
      segmentalFatBalance: 1,
      visceralFatRating: 8,
      weightTrend: 'toward_goal',
      weightConsistency: 1,
      muscleMassTrend: 'gaining',
      segmentalMuscleBalance: 1,
      restingHR: 55,
      hrv: 50,
      circadianAlignment: 1,
      metabolicAgeDelta: 5,
      metabolicCapacity: 90,
      strainBalance: 1,
    });
    expect(out.bodyScore).toBeGreaterThanOrEqual(800);
    expect(out.tier).toBe('Optimal');
  });

  it('penalizes high visceral fat', () => {
    const ok = calculateBodyScore({ bodyFatPct: 18, visceralFatRating: 10 });
    const bad = calculateBodyScore({ bodyFatPct: 18, visceralFatRating: 18 });
    expect(bad.contributors.composition.score).toBeLessThan(ok.contributors.composition.score);
  });

  it('confidence reflects how many of the 5 inputs are present', () => {
    const empty = calculateBodyScore({});
    const partial = calculateBodyScore({ bodyFatPct: 18, weightTrend: 'stable' });
    const full = calculateBodyScore({
      bodyFatPct: 18,
      weightTrend: 'stable',
      muscleMassTrend: 'stable',
      restingHR: 55,
      metabolicAgeDelta: 5,
    });
    expect(empty.confidencePct).toBe(0);
    expect(partial.confidencePct).toBe(40);
    expect(full.confidencePct).toBe(100);
  });

  it('clamps each contributor to the 0 to 100 band', () => {
    const out = calculateBodyScore({
      bodyFatPct: 60,
      weightTrend: 'away_from_goal',
      muscleMassTrend: 'losing',
      restingHR: 95,
      hrv: 15,
    });
    Object.values(out.contributors).forEach((c) => {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
    });
  });
});
