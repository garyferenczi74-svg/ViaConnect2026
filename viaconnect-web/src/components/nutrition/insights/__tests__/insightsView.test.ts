// Prompt 192 Task 4: unit tests for the pure Nutrition Insights view helpers.
// Node environment, no React: every instant is injected.

import { describe, it, expect } from 'vitest';
import {
  activeCountChip,
  formatRetryAfter,
  INSIGHT_TYPE_LABELS,
  INSIGHT_TYPE_ORDER,
  relativeTimestamp,
  snapshotToRows,
  topInsight,
  type InsightRow,
} from '../insightsView';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

function row(overrides: Partial<InsightRow>): InsightRow {
  return {
    id: 'id-1',
    insight_type: 'macro_gap',
    horizon: 'daily',
    title: 'Protein ran low',
    body: 'Your protein landed under target on 4 of 7 days.',
    severity: 'info',
    confidence: 'medium',
    data_snapshot: {},
    product_suggestion: null,
    status: 'active',
    generated_at: '2026-06-12T08:00:00.000Z',
    expires_at: '2026-06-13T08:00:00.000Z',
    ...overrides,
  };
}

describe('relativeTimestamp', () => {
  const now = new Date('2026-06-12T12:00:00.000Z');

  it('renders hours: 2h ago', () => {
    expect(relativeTimestamp('2026-06-12T10:00:00.000Z', now)).toBe('2h ago');
  });

  it('renders days: 3d ago', () => {
    expect(relativeTimestamp('2026-06-09T11:00:00.000Z', now)).toBe('3d ago');
  });

  it('renders minutes: 45m ago', () => {
    expect(relativeTimestamp('2026-06-12T11:15:00.000Z', now)).toBe('45m ago');
  });

  it('renders just now under a minute', () => {
    expect(relativeTimestamp('2026-06-12T11:59:40.000Z', now)).toBe('just now');
  });

  it('clamps a future instant to just now instead of going negative', () => {
    expect(relativeTimestamp('2026-06-12T12:05:00.000Z', now)).toBe('just now');
  });

  it('fails open to an empty string on garbage', () => {
    expect(relativeTimestamp('not-a-date', now)).toBe('');
    expect(relativeTimestamp('', now)).toBe('');
  });

  it('emits no em or en dashes', () => {
    const out = relativeTimestamp('2026-06-09T11:00:00.000Z', now);
    expect(out.includes(EM_DASH)).toBe(false);
    expect(out.includes(EN_DASH)).toBe(false);
  });
});

describe('snapshotToRows', () => {
  it('humanizes snake_case keys into plain labels', () => {
    expect(snapshotToRows({ window_days: 7 })).toEqual([{ label: 'Window days', value: '7' }]);
  });

  it('formats numbers: locale thousands and one decimal max', () => {
    const rows = snapshotToRows({ total_kcal: 1234, avg_score: 71.4567 });
    expect(rows).toEqual([
      { label: 'Total kcal', value: '1,234' },
      { label: 'Avg score', value: '71.5' },
    ]);
  });

  it('keeps window and date string fields as plain values', () => {
    const rows = snapshotToRows({ window_start: '2026-06-05', window_end: '2026-06-11' });
    expect(rows).toEqual([
      { label: 'Window start', value: '2026-06-05' },
      { label: 'Window end', value: '2026-06-11' },
    ]);
  });

  it('renders booleans as Yes and No', () => {
    expect(snapshotToRows({ fully_scored: true, partial_week: false })).toEqual([
      { label: 'Fully scored', value: 'Yes' },
      { label: 'Partial week', value: 'No' },
    ]);
  });

  it('skips null and undefined values', () => {
    expect(snapshotToRows({ a: null, b: undefined, c: 3 })).toEqual([
      { label: 'C', value: '3' },
    ]);
  });

  it('joins primitive arrays with commas', () => {
    expect(snapshotToRows({ low_nutrients: ['iron', 'magnesium'] })).toEqual([
      { label: 'Low nutrients', value: 'iron, magnesium' },
    ]);
  });

  it('flattens one level of nesting and omits anything deeper', () => {
    const rows = snapshotToRows({ protein: { gap_g: 18, deep: { nope: 1 } } });
    expect(rows).toEqual([{ label: 'Protein gap g', value: '18' }]);
  });

  it('never emits raw JSON markers', () => {
    const rows = snapshotToRows({
      nested: { again: { x: 1 } },
      objects_in_array: [{ x: 1 }],
      n: 5,
    });
    for (const r of rows) {
      expect(r.value.includes('{')).toBe(false);
      expect(r.value.includes('[object')).toBe(false);
    }
  });

  it('fails open to an empty list on non object input', () => {
    expect(snapshotToRows(null)).toEqual([]);
    expect(snapshotToRows(undefined)).toEqual([]);
  });
});

describe('topInsight', () => {
  it('returns null for an empty list', () => {
    expect(topInsight([])).toBeNull();
  });

  it('prefers attention over a newer non attention insight', () => {
    const older = row({ id: 'a', severity: 'attention', generated_at: '2026-06-12T06:00:00.000Z' });
    const newer = row({ id: 'b', severity: 'positive', generated_at: '2026-06-12T10:00:00.000Z' });
    expect(topInsight([newer, older])?.id).toBe('a');
  });

  it('picks the newest among multiple attention insights', () => {
    const a = row({ id: 'a', severity: 'attention', generated_at: '2026-06-12T06:00:00.000Z' });
    const b = row({ id: 'b', severity: 'attention', generated_at: '2026-06-12T10:00:00.000Z' });
    expect(topInsight([a, b])?.id).toBe('b');
  });

  it('falls back to the newest overall when nothing needs attention', () => {
    const a = row({ id: 'a', severity: 'info', generated_at: '2026-06-12T06:00:00.000Z' });
    const b = row({ id: 'b', severity: 'positive', generated_at: '2026-06-12T10:00:00.000Z' });
    expect(topInsight([a, b])?.id).toBe('b');
  });
});

describe('activeCountChip', () => {
  it('is null when only the rendered top insight exists', () => {
    expect(activeCountChip(1, false)).toBeNull();
    expect(activeCountChip(0, false)).toBeNull();
  });

  it('reads N active when more remain', () => {
    expect(activeCountChip(3, false)).toBe('3 active');
  });

  it('marks an open ended count when the read had a next page', () => {
    expect(activeCountChip(3, true)).toBe('3+ active');
  });
});

describe('formatRetryAfter', () => {
  it('rounds seconds up to whole minutes', () => {
    expect(formatRetryAfter(540)).toBe('Try again in 9m');
    expect(formatRetryAfter(541)).toBe('Try again in 10m');
  });

  it('floors at one minute', () => {
    expect(formatRetryAfter(20)).toBe('Try again in 1m');
    expect(formatRetryAfter(0)).toBe('Try again in 1m');
  });
});

describe('type order and labels', () => {
  it('covers all 8 insight types, each with a label', () => {
    expect(INSIGHT_TYPE_ORDER).toHaveLength(8);
    for (const t of INSIGHT_TYPE_ORDER) {
      expect(typeof INSIGHT_TYPE_LABELS[t]).toBe('string');
      expect(INSIGHT_TYPE_LABELS[t].length).toBeGreaterThan(0);
    }
  });
});
