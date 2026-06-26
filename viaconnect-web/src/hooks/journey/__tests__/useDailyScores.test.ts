/**
 * src/hooks/journey/__tests__/useDailyScores.test.ts
 *
 * TDD for mapScoresToPillars, mergeLocalMeals, and applyScoreOverlay
 * (Prompt 208j Task J-T1 + parity-gap fix).
 *
 * Pure helpers: deterministic, never throw, no DOM, node-safe.
 *
 * Equality guarantee: mapScoresToPillars takes the raw calculateDailyScores
 * output fields and converts them to the canonical pillar shape. Confidence 0
 * means no data -> the pillar value is null (computing state).
 *
 * mergeLocalMeals: deduplicates by meal_type (DB rows take precedence) and
 * appends any locally-cached meal whose type is not already present.
 *
 * applyScoreOverlay: when overall confidence is 0 and a cached result has
 * confidence > 0, overlays cached gauge values for any gauge with confidence 0
 * and recomputes overall. No-op when overall confidence > 0 or no valid cache.
 */

import { describe, it, expect } from 'vitest';
import {
  mapScoresToPillars,
  mergeLocalMeals,
  applyScoreOverlay,
  type ScoreResultInput,
  type NormalisedMeal,
} from '../useDailyScores';
import type { DailyScoreResult } from '@/lib/scoring/dailyScoreEngineV2';

// ---------------------------------------------------------------------------
// mapScoresToPillars
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// mergeLocalMeals
// ---------------------------------------------------------------------------

function makeDbMeal(meal_type: string): NormalisedMeal {
  return {
    meal_type,
    calories: 400,
    protein_grams: 30,
    carbs_grams: 50,
    fats_grams: 10,
    includes_vegetables: false,
    includes_whole_grains: false,
    includes_lean_protein: false,
    meal_quality_rating: 3,
  };
}

describe('mergeLocalMeals', () => {
  it('returns DB meals unchanged when there are no local meals', () => {
    const db = [makeDbMeal('breakfast'), makeDbMeal('lunch')];
    const result = mergeLocalMeals(db, []);
    expect(result).toHaveLength(2);
    expect(result[0].meal_type).toBe('breakfast');
  });

  it('appends a local meal whose meal_type is not in the DB list', () => {
    const db = [makeDbMeal('breakfast')];
    const local = [{ meal_type: 'dinner', quality_rating: 3, calories: 600 }];
    const result = mergeLocalMeals(db, local);
    expect(result).toHaveLength(2);
    expect(result[1].meal_type).toBe('dinner');
    expect(result[1].calories).toBe(600);
    expect(result[1].meal_quality_rating).toBe(3);
  });

  it('does NOT append a local meal whose meal_type already exists in the DB list (DB takes precedence)', () => {
    const db = [makeDbMeal('breakfast')];
    const local = [{ meal_type: 'breakfast', quality_rating: 1, calories: 100 }];
    const result = mergeLocalMeals(db, local);
    expect(result).toHaveLength(1);
    // DB version preserved
    expect(result[0].calories).toBe(400);
  });

  it('handles multiple local meals with mixed overlap', () => {
    const db = [makeDbMeal('breakfast'), makeDbMeal('lunch')];
    const local = [
      { meal_type: 'lunch', quality_rating: 2 },
      { meal_type: 'dinner', quality_rating: 4 },
      { meal_type: 'snack', meal_score: 70 },
    ];
    const result = mergeLocalMeals(db, local);
    expect(result).toHaveLength(4);
    const types = result.map((m) => m.meal_type);
    expect(types).toContain('breakfast');
    expect(types).toContain('lunch');
    expect(types).toContain('dinner');
    expect(types).toContain('snack');
  });

  it('does not mutate the input DB meals array', () => {
    const db = [makeDbMeal('breakfast')];
    const original = [...db];
    mergeLocalMeals(db, [{ meal_type: 'lunch' }]);
    expect(db).toHaveLength(original.length);
  });

  it('maps local meal optional fields to null when absent', () => {
    const db: NormalisedMeal[] = [];
    const local = [{ meal_type: 'dinner' }];
    const result = mergeLocalMeals(db, local);
    expect(result[0].calories).toBeNull();
    expect(result[0].protein_grams).toBeNull();
    expect(result[0].meal_quality_rating).toBeNull();
    expect(result[0].includes_vegetables).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyScoreOverlay
// ---------------------------------------------------------------------------

function makeGauge(score: number, confidence: number) {
  return {
    score,
    manualScore: score,
    wearableScore: null,
    manualWeight: 1,
    wearableWeight: 0,
    confidence,
    label: 'Test',
    color: '#fff',
  };
}

function makeResult(overrides: Partial<{
  sleepScore: number; sleepConf: number;
  energyScore: number; energyConf: number;
  moodScore: number; moodConf: number;
  nutritionScore: number; nutritionConf: number;
  activityScore: number; activityConf: number;
  overallScore: number; overallConf: number;
}> = {}): DailyScoreResult {
  const o = {
    sleepScore: 70, sleepConf: 0.6,
    energyScore: 60, energyConf: 0.6,
    moodScore: 55, moodConf: 0.6,
    nutritionScore: 80, nutritionConf: 0.6,
    activityScore: 50, activityConf: 0.6,
    overallScore: 63, overallConf: 1,
    ...overrides,
  };
  return {
    sleep: makeGauge(o.sleepScore, o.sleepConf),
    energy: makeGauge(o.energyScore, o.energyConf),
    moodStress: makeGauge(o.moodScore, o.moodConf),
    nutrition: makeGauge(o.nutritionScore, o.nutritionConf),
    activity: makeGauge(o.activityScore, o.activityConf),
    overall: makeGauge(o.overallScore, o.overallConf),
    dataMode: 'manual' as const,
    manualCompleteness: 1,
    wearableCompleteness: 0,
  };
}

describe('applyScoreOverlay', () => {
  it('returns scores unchanged when overall confidence > 0 (no overlay needed)', () => {
    const scores = makeResult();
    const cached = makeResult({ sleepScore: 99, sleepConf: 0.9 });
    const result = applyScoreOverlay(scores, cached);
    // sleep should remain the fresh value
    expect(result.sleep.score).toBe(70);
  });

  it('returns scores unchanged when cached is null', () => {
    const scores = makeResult({ overallConf: 0 });
    const result = applyScoreOverlay(scores, null);
    expect(result.overall.confidence).toBe(0);
    expect(result.sleep.score).toBe(70);
  });

  it('returns scores unchanged when cached overall confidence is 0', () => {
    const scores = makeResult({ overallConf: 0 });
    const cached = makeResult({ overallConf: 0 });
    applyScoreOverlay(scores, cached);
    // sleep stays at fresh value (neither has valid data)
    expect(scores.sleep.score).toBe(70);
  });

  it('overlays cached gauge when fresh confidence is 0 and cached confidence > 0', () => {
    const scores = makeResult({ overallConf: 0, sleepConf: 0 });
    const cached = makeResult({ sleepScore: 85, sleepConf: 0.8 });
    applyScoreOverlay(scores, cached);
    expect(scores.sleep.score).toBe(85);
    expect(scores.sleep.confidence).toBe(0.8);
  });

  it('does not overlay a gauge that already has fresh confidence > 0', () => {
    const scores = makeResult({
      overallConf: 0,
      sleepConf: 0,
      energyConf: 0.6,
    });
    const cached = makeResult({ sleepScore: 85, energyScore: 99 });
    applyScoreOverlay(scores, cached);
    // sleep overlaid
    expect(scores.sleep.score).toBe(85);
    // energy NOT overlaid (fresh confidence > 0)
    expect(scores.energy.score).toBe(60);
  });

  it('recomputes overall after overlay', () => {
    const scores = makeResult({ overallConf: 0, sleepConf: 0, energyConf: 0, moodConf: 0, nutritionConf: 0, activityConf: 0 });
    const cached = makeResult({ sleepScore: 80, energyScore: 60, moodScore: 40, nutritionScore: 100, activityScore: 20 });
    applyScoreOverlay(scores, cached);
    // All 5 gauges overlaid; overall = round((80+60+40+100+20)/5) = round(300/5) = 60
    expect(scores.overall.score).toBe(60);
    expect(scores.overall.confidence).toBe(1);
  });

  it('never throws', () => {
    const scores = makeResult({ overallConf: 0 });
    expect(() => applyScoreOverlay(scores, null)).not.toThrow();
    expect(() => applyScoreOverlay(scores, makeResult())).not.toThrow();
  });
});
