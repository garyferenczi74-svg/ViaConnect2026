/**
 * src/hooks/journey/__tests__/useDailyScores.test.ts
 *
 * TDD for mapScoresToPillars (Prompt 208j Task J-T1).
 * Pure helper: deterministic, never throws, no DOM, node-safe.
 *
 * Equality guarantee: mapScoresToPillars takes the raw calculateDailyScores
 * output fields and converts them to the canonical pillar shape. Confidence 0
 * means no data -> the pillar value is null (computing state).
 */

import { describe, it, expect } from 'vitest';
import { mapScoresToPillars, type ScoreResultInput } from '../useDailyScores';

function fullInput(overrides: Partial<ScoreResultInput> = {}): ScoreResultInput {
  return {
    sleepScore: 75,
    sleepConfidence: 0.6,
    energyScore: 60,
    energyConfidence: 0.6,
    moodStressScore: 55,
    moodStressConfidence: 0.6,
    nutritionScore: 80,
    nutritionConfidence: 0.6,
    activityScore: 50,
    activityConfidence: 0.6,
    ...overrides,
  };
}

describe('mapScoresToPillars', () => {
  it('returns exact scores when all confidences are positive', () => {
    const result = mapScoresToPillars(fullInput());
    expect(result.sleepQuality).toBe(75);
    expect(result.energyLevel).toBe(60);
    expect(result.moodStress).toBe(55);
    expect(result.nutrition).toBe(80);
    expect(result.physicalActivity).toBe(50);
  });

  it('returns null for sleepQuality when sleepConfidence is 0', () => {
    const result = mapScoresToPillars(fullInput({ sleepConfidence: 0 }));
    expect(result.sleepQuality).toBeNull();
  });

  it('returns null for energyLevel when energyConfidence is 0', () => {
    const result = mapScoresToPillars(fullInput({ energyConfidence: 0 }));
    expect(result.energyLevel).toBeNull();
  });

  it('returns null for moodStress when moodStressConfidence is 0', () => {
    const result = mapScoresToPillars(fullInput({ moodStressConfidence: 0 }));
    expect(result.moodStress).toBeNull();
  });

  it('returns null for nutrition when nutritionConfidence is 0', () => {
    const result = mapScoresToPillars(fullInput({ nutritionConfidence: 0 }));
    expect(result.nutrition).toBeNull();
  });

  it('returns null for physicalActivity when activityConfidence is 0', () => {
    const result = mapScoresToPillars(fullInput({ activityConfidence: 0 }));
    expect(result.physicalActivity).toBeNull();
  });

  it('returns null for all pillars when all confidences are 0 (no data state)', () => {
    const result = mapScoresToPillars({
      sleepScore: 0, sleepConfidence: 0,
      energyScore: 0, energyConfidence: 0,
      moodStressScore: 0, moodStressConfidence: 0,
      nutritionScore: 0, nutritionConfidence: 0,
      activityScore: 0, activityConfidence: 0,
    });
    expect(result.sleepQuality).toBeNull();
    expect(result.energyLevel).toBeNull();
    expect(result.moodStress).toBeNull();
    expect(result.nutrition).toBeNull();
    expect(result.physicalActivity).toBeNull();
  });

  it('returns null for a pillar when score is 0 and confidence is 0', () => {
    const result = mapScoresToPillars(fullInput({ sleepScore: 0, sleepConfidence: 0 }));
    expect(result.sleepQuality).toBeNull();
  });

  it('returns 0 (not null) when score is 0 but confidence is positive', () => {
    // A pillar score of 0 with confidence > 0 means the data exists but the score
    // is genuinely zero. This should propagate as 0, not null.
    const result = mapScoresToPillars(fullInput({ sleepScore: 0, sleepConfidence: 0.6 }));
    expect(result.sleepQuality).toBe(0);
  });

  it('does not include bioOptimization or hydration (those are added by the hook)', () => {
    const result = mapScoresToPillars(fullInput());
    expect(Object.keys(result)).not.toContain('bioOptimization');
    expect(Object.keys(result)).not.toContain('hydration');
  });

  it('never throws on valid input', () => {
    expect(() => mapScoresToPillars(fullInput())).not.toThrow();
  });

  it('handles score 100 correctly', () => {
    const result = mapScoresToPillars(fullInput({ sleepScore: 100, sleepConfidence: 0.9 }));
    expect(result.sleepQuality).toBe(100);
  });

  it('preserves confidence boundary: exactly 0 returns null', () => {
    const result = mapScoresToPillars(fullInput({ nutritionScore: 72, nutritionConfidence: 0 }));
    expect(result.nutrition).toBeNull();
  });

  it('preserves confidence boundary: positive epsilon returns the score', () => {
    const result = mapScoresToPillars(fullInput({ nutritionScore: 72, nutritionConfidence: 0.001 }));
    expect(result.nutrition).toBe(72);
  });
});
