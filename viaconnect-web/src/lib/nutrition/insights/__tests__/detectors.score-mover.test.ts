// Prompt 192 Task 2 (TDD first): score_mover detector tests.
// Deterministically ranks the other detectors' facts and emits one winner.

import { describe, expect, it } from 'vitest';
import { detectScoreMover } from '../detectors/score-mover';
import { mkFact, mkInput } from './fixtures';

describe('detectScoreMover', () => {
  it('emits the single highest impact candidate as a weekly fact', () => {
    const candidates = [
      mkFact({
        type: 'macro_gap',
        horizon: 'weekly',
        severity: 'attention',
        factFingerprint: 'fp_macro',
        snapshot: { macro: 'protein', magnitudePct: 40 },
      }),
      mkFact({
        type: 'hydration_correlation',
        horizon: 'weekly',
        severity: 'info',
        factFingerprint: 'fp_hydration',
        snapshot: { magnitudePct: 25 },
      }),
    ];
    const facts = detectScoreMover(mkInput(), candidates);
    expect(facts).toHaveLength(1);
    const fact = facts[0];
    expect(fact.type).toBe('score_mover');
    expect(fact.horizon).toBe('weekly');
    expect(fact.snapshot.winnerType).toBe('macro_gap');
    expect(fact.snapshot.winnerFingerprint).toBe('fp_macro');
    expect(fact.snapshot.candidatesConsidered).toBe(2);
  });

  it('breaks a severity tie by magnitude', () => {
    const candidates = [
      mkFact({
        type: 'macro_gap',
        horizon: 'weekly',
        severity: 'attention',
        factFingerprint: 'fp_macro',
        snapshot: { magnitudePct: 30 },
      }),
      mkFact({
        type: 'micronutrient_gap',
        horizon: 'weekly',
        severity: 'attention',
        factFingerprint: 'fp_micro',
        snapshot: { magnitudePct: 55 },
      }),
    ];
    const [fact] = detectScoreMover(mkInput(), candidates);
    expect(fact.snapshot.winnerType).toBe('micronutrient_gap');
  });

  it('is deterministic across identical runs', () => {
    const candidates = [
      mkFact({ type: 'macro_gap', factFingerprint: 'a', snapshot: { magnitudePct: 10 } }),
      mkFact({ type: 'quality_trend', factFingerprint: 'b', snapshot: { magnitudePct: 10 } }),
    ];
    const a = detectScoreMover(mkInput(), candidates);
    const b = detectScoreMover(mkInput(), candidates);
    expect(a).toEqual(b);
  });

  it('excludes consistency_streak and prior score_mover facts from candidacy', () => {
    const candidates = [
      mkFact({ type: 'consistency_streak', severity: 'positive', factFingerprint: 'fp_streak' }),
      mkFact({ type: 'score_mover', factFingerprint: 'fp_mover' }),
      mkFact({ type: 'macro_gap', factFingerprint: 'fp_macro' }),
      mkFact({ type: 'hydration_correlation', factFingerprint: 'fp_hyd' }),
    ];
    const [fact] = detectScoreMover(mkInput(), candidates);
    expect(fact.snapshot.candidatesConsidered).toBe(2);
    expect(['macro_gap', 'hydration_correlation']).toContain(fact.snapshot.winnerType);
  });

  it('needs at least 2 eligible candidates', () => {
    expect(detectScoreMover(mkInput(), [mkFact({ type: 'macro_gap' })])).toHaveLength(0);
    expect(detectScoreMover(mkInput(), [])).toHaveLength(0);
  });
});
