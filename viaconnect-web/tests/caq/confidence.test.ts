// Prompt 173c Phase E: personalization indicator + confidence math.

import { describe, it, expect } from 'vitest';
import {
  computePersonalization,
  getPersonalizationCopy,
} from '@/lib/caq/confidence';

describe('computePersonalization: confidence buckets', () => {
  it('returns preliminary when nothing is complete', () => {
    const r = computePersonalization(new Set<string>());
    expect(r.confidence).toBe('preliminary');
    expect(r.completedCount).toBe(0);
    expect(r.fraction).toBe(0);
  });

  it('stays preliminary until all 3 Quick required phases land', () => {
    const r = computePersonalization(new Set<string>(['1', '3']));
    expect(r.confidence).toBe('preliminary');
    expect(r.completedCount).toBe(2);
  });

  it('reads as preliminary the moment the Quick trio is complete', () => {
    const r = computePersonalization(new Set<string>(['1', '3', '4']));
    expect(r.confidence).toBe('preliminary');
    expect(r.completedCount).toBe(3);
    // 3 / 7 = 0.428...
    expect(r.fraction).toBeCloseTo(3 / 7, 5);
  });

  it('promotes to standard when a symptom phase lands on top of Quick', () => {
    const r = computePersonalization(new Set<string>(['1', '3', '4', '1b']));
    expect(r.confidence).toBe('standard');
    expect(r.completedCount).toBe(4);
  });

  it('promotes to full when all 7 phases are complete', () => {
    const r = computePersonalization(new Set<string>(['1', '3', '1b', '2a', '2b', '2c', '4']));
    expect(r.confidence).toBe('full');
    expect(r.completedCount).toBe(7);
    expect(r.fraction).toBe(1);
  });

  it('fraction is monotonic across additions', () => {
    const stages: ReadonlyArray<ReadonlyArray<string>> = [
      [],
      ['1'],
      ['1', '3'],
      ['1', '3', '4'],
      ['1', '3', '4', '1b'],
      ['1', '3', '4', '1b', '2a'],
      ['1', '3', '4', '1b', '2a', '2b'],
      ['1', '3', '4', '1b', '2a', '2b', '2c'],
    ];
    let prev = -1;
    for (const stage of stages) {
      const r = computePersonalization(new Set(stage));
      expect(r.fraction).toBeGreaterThanOrEqual(prev);
      prev = r.fraction;
    }
  });

  it('ignores unknown ids without crashing', () => {
    const r = computePersonalization(new Set<string>(['1', '3', '4', 'phase_unknown']));
    expect(r.completedCount).toBe(3);
    expect(r.confidence).toBe('preliminary');
  });
});

describe('getPersonalizationCopy: positive framing', () => {
  for (const bucket of ['preliminary', 'standard', 'full'] as const) {
    it(`${bucket} copy is non-empty + does not read as a failure`, () => {
      const text = getPersonalizationCopy(bucket);
      expect(text.length).toBeGreaterThan(0);
      // Never frames the result as failed / deficient (173c 0.5).
      const lower = text.toLowerCase();
      for (const forbidden of ['failed', 'incomplete', 'missing', 'deficient', 'inadequate']) {
        expect(lower).not.toContain(forbidden);
      }
    });
  }
});
