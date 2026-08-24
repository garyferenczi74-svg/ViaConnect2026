import { describe, it, expect } from 'vitest';
import { buildContributorRows, CONTRIBUTOR_METRICS } from '../contributor-rows';

describe('buildContributorRows', () => {
  it('returns the 7 MetricKeys with null source when nothing is connected', () => {
    const rows = buildContributorRows([]);
    expect(rows.map((r) => r.metric)).toEqual([...CONTRIBUTOR_METRICS]);
    expect(rows.every((r) => r.connectedSource === null)).toBe(true);
  });
  it('populates a metric with its source when that dimension is sourced', () => {
    const rows = buildContributorRows([
      { dimension: 'sleep', source: 'apple_health', value: 90, displayValue: '90', status: 'sourced', showRing: true, manual: false, disagreement: null, sources: [] },
    ]);
    expect(rows.find((r) => r.metric === 'sleep')?.connectedSource).toBe('apple_health');
    expect(rows.find((r) => r.metric === 'hrv')?.connectedSource).toBeNull();
  });
  it('aliases workouts <- strain and body_composition <- metabolic for today\'s data', () => {
    const rows = buildContributorRows([
      { dimension: 'strain', source: 'whoop', value: 12, displayValue: '12', status: 'sourced', showRing: true, manual: false, disagreement: null, sources: [] },
      { dimension: 'metabolic', source: 'hume', value: 22, displayValue: '22', status: 'sourced', showRing: true, manual: false, disagreement: null, sources: [] },
    ]);
    expect(rows.find((r) => r.metric === 'workouts')?.connectedSource).toBe('whoop');
    expect(rows.find((r) => r.metric === 'body_composition')?.connectedSource).toBe('hume');
  });
  it('only counts a match connected when showRing is true, not on value alone', () => {
    const rows = buildContributorRows([
      { dimension: 'recovery', source: 'oura', value: 40, displayValue: '40', status: 'pending', showRing: false, manual: false, disagreement: null, sources: [] },
    ]);
    expect(rows.find((r) => r.metric === 'recovery')?.connectedSource).toBeNull();
  });
});
