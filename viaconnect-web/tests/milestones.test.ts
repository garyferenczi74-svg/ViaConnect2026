// Jeffery milestone detector + body-tracker bridge.

import { describe, it, expect } from 'vitest';
import {
  detectMilestones,
  tierForScore,
  TIER_FLOORS,
} from '@/lib/agents/jeffery/milestones';
import {
  normalizeBodyScoreSeries,
  detectBodyScoreMilestones,
} from '@/lib/body-tracker/milestones-bridge';

describe('tierForScore', () => {
  it.each([
    [0, 'Baseline'],
    [34, 'Baseline'],
    [35, 'Developing'],
    [54, 'Developing'],
    [55, 'Progressing'],
    [74, 'Progressing'],
    [75, 'Thriving'],
    [89, 'Thriving'],
    [90, 'Optimal'],
    [100, 'Optimal'],
  ])('score %i resolves to %s', (s, tier) => {
    expect(tierForScore(s)).toBe(tier);
  });

  it('TIER_FLOORS is sorted descending so first match wins', () => {
    for (let i = 1; i < TIER_FLOORS.length; i++) {
      expect(TIER_FLOORS[i].min).toBeLessThan(TIER_FLOORS[i - 1].min);
    }
  });
});

describe('detectMilestones', () => {
  it('returns nothing for fewer than 2 points', () => {
    expect(detectMilestones([])).toEqual([]);
    expect(detectMilestones([{ date: '2026-04-01', score: 10 }])).toEqual([]);
  });

  it('emits an upward crossing when the user passes a tier floor', () => {
    const out = detectMilestones([
      { date: '2026-04-01', score: 30 }, // Baseline
      { date: '2026-04-02', score: 40 }, // Developing
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ from: 'Baseline', to: 'Developing', direction: 'up' });
  });

  it('emits a downward crossing on regression', () => {
    const out = detectMilestones([
      { date: '2026-04-01', score: 92 },
      { date: '2026-04-02', score: 70 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ from: 'Optimal', to: 'Progressing', direction: 'down' });
  });

  it('skips datapoints that stay inside the same tier', () => {
    const out = detectMilestones([
      { date: '2026-04-01', score: 30 },
      { date: '2026-04-02', score: 32 },
      { date: '2026-04-03', score: 34 },
    ]);
    expect(out).toEqual([]);
  });
});

describe('normalizeBodyScoreSeries', () => {
  it('scales 0 to 1000 down to 0 to 100 by integer division', () => {
    const out = normalizeBodyScoreSeries([
      { date: '2026-04-01', score: 0 },
      { date: '2026-04-02', score: 500 },
      { date: '2026-04-03', score: 999 },
      { date: '2026-04-04', score: 1000 },
    ]);
    expect(out.map((p) => p.score)).toEqual([0, 50, 100, 100]);
  });

  it('clamps an out-of-range score', () => {
    expect(normalizeBodyScoreSeries([{ date: '2026-04-01', score: 1500 }])[0].score).toBe(100);
    expect(normalizeBodyScoreSeries([{ date: '2026-04-01', score: -50 }])[0].score).toBe(0);
  });
});

describe('detectBodyScoreMilestones', () => {
  it('crosses Baseline to Developing when raw score moves from 250 to 400', () => {
    const out = detectBodyScoreMilestones([
      { date: '2026-04-01', score: 250 }, // 25 normalized = Baseline
      { date: '2026-04-02', score: 400 }, // 40 normalized = Developing
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ from: 'Baseline', to: 'Developing', direction: 'up' });
  });
});
