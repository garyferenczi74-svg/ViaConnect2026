import { describe, it, expect } from 'vitest';
import {
  BOS_INSUFFICIENT_DATA_COPY,
  classifyBosFreshness,
  collectNamedBosContributors,
  computeWeeklyDelta,
  formatBosContributorLine,
  formatBosLastUpdated,
  formatBosScore,
  isComputableBosScore,
  isRealWearableContributor,
  resolveHonestBosDisplay,
  toDisplayBosScore,
  toHonestDisplayBosScore,
  weekAgoDate,
} from '../bos-display';

describe('toDisplayBosScore / NaN guard', () => {
  it('passes through a finite persisted score, including 0', () => {
    expect(toDisplayBosScore(74)).toBe(74);
    expect(toDisplayBosScore(0)).toBe(0);
    expect(toDisplayBosScore(100)).toBe(100);
  });

  it('coerces numeric strings the way PostgREST serializes numeric columns', () => {
    expect(toDisplayBosScore('60.00')).toBe(60);
    expect(toDisplayBosScore('0')).toBe(0);
  });

  it('returns null for NaN and never the string NaN', () => {
    expect(toDisplayBosScore(Number.NaN)).toBeNull();
    expect(formatBosScore(Number.NaN)).toBe(BOS_INSUFFICIENT_DATA_COPY);
    expect(formatBosScore(Number.NaN)).not.toBe('NaN');
    expect(formatBosScore(Number.NaN)).not.toBe('0');
  });

  it('returns null for Infinity, blank, null, and undefined', () => {
    expect(toDisplayBosScore(Number.POSITIVE_INFINITY)).toBeNull();
    expect(toDisplayBosScore(Number.NEGATIVE_INFINITY)).toBeNull();
    expect(toDisplayBosScore('NaN')).toBeNull();
    expect(toDisplayBosScore('')).toBeNull();
    expect(toDisplayBosScore('   ')).toBeNull();
    expect(toDisplayBosScore(null)).toBeNull();
    expect(toDisplayBosScore(undefined)).toBeNull();
    expect(toDisplayBosScore({})).toBeNull();
  });

  it('does not fake 0 when the score is uncomputable', () => {
    expect(toDisplayBosScore(null)).not.toBe(0);
    expect(formatBosScore(null)).toBe('Not enough data yet');
    expect(formatBosScore(undefined)).toBe('Not enough data yet');
    expect(isComputableBosScore(Number.NaN)).toBe(false);
    expect(isComputableBosScore(72)).toBe(true);
  });
});

describe('computeWeeklyDelta', () => {
  it('subtracts two persisted scores without inventing a delta', () => {
    expect(computeWeeklyDelta(80, 75, '2026-08-24', '2026-08-17')).toBe(5);
    expect(computeWeeklyDelta(70, 74, '2026-08-24', '2026-08-17')).toBe(-4);
    expect(computeWeeklyDelta(70, 70, '2026-08-24', '2026-08-17')).toBe(0);
  });

  it('returns null when the prior week is missing or non-finite', () => {
    expect(computeWeeklyDelta(80, null, '2026-08-24', null)).toBeNull();
    expect(computeWeeklyDelta(80, Number.NaN, '2026-08-24', '2026-08-17')).toBeNull();
    expect(computeWeeklyDelta(Number.NaN, 70, '2026-08-24', '2026-08-17')).toBeNull();
  });

  it('returns null when both dates are the same row', () => {
    expect(computeWeeklyDelta(80, 80, '2026-08-24', '2026-08-24')).toBeNull();
  });
});

describe('stale last-updated is not silent', () => {
  const now = Date.parse('2026-08-24T12:00:00.000Z');

  it('marks 7/13/2026 as stale relative to 8/24/2026', () => {
    expect(classifyBosFreshness('2026-07-13T12:00:00.000Z', now)).toBe('stale');
    const formatted = formatBosLastUpdated('2026-07-13T12:00:00.000Z', now);
    expect(formatted.freshness).toBe('stale');
    expect(formatted.label).toMatch(/stale/i);
    expect(formatted.label).toMatch(/7\/13\/2026|13/);
  });

  it('marks a same-day computed_at as fresh', () => {
    expect(classifyBosFreshness('2026-08-24T08:00:00.000Z', now)).toBe('fresh');
    expect(formatBosLastUpdated('2026-08-24T08:00:00.000Z', now).label).not.toMatch(/stale/i);
  });

  it('marks missing or invalid computed_at as missing, not fresh', () => {
    expect(classifyBosFreshness(null, now)).toBe('missing');
    expect(classifyBosFreshness('not-a-date', now)).toBe('missing');
    expect(formatBosLastUpdated(null, now).label).toBe('Last updated unknown');
  });
});

describe('weekAgoDate', () => {
  it('returns the UTC date seven days earlier', () => {
    expect(weekAgoDate('2026-08-24')).toBe('2026-08-17');
  });

  it('returns null for an unparseable date', () => {
    expect(weekAgoDate('nope')).toBeNull();
  });
});

describe('Brief 24 contributor honesty', () => {
  it('does not show a confident 62 / Good when wearables and CAQ / labs are missing', () => {
    const contributors = collectNamedBosContributors({
      caqCompleted: false,
      labsPresent: false,
      geneticsPresent: false,
      wearable: { present: false, last_engaged_at: null, latest_hrv: null, latest_sleep_hours: null },
      engagement: {
        wearable: { last_engaged_at: null },
        nutrition: { last_engaged_at: null },
      },
    });
    expect(contributors).toEqual([]);
    expect(toHonestDisplayBosScore(62, contributors)).toBeNull();
    expect(toHonestDisplayBosScore(62, contributors)).not.toBe(0);
    expect(formatBosScore(toHonestDisplayBosScore(62, contributors))).toBe(
      BOS_INSUFFICIENT_DATA_COPY,
    );
    expect(formatBosContributorLine(contributors)).toBeNull();
    const honest = resolveHonestBosDisplay({
      score: 62,
      contributors: [],
      accuracy_pills: [
        { key: 'caq', label: 'CAQ', state: 'incomplete' },
        { key: 'labs', label: 'Labs', state: 'incomplete' },
        { key: 'genetics', label: 'Genetics', state: 'incomplete' },
      ],
    });
    expect(honest.score).toBeNull();
    expect(honest.contributorLine).toBeNull();
  });

  it('names CAQ when a real CAQ contributor produced the persisted score, including 0', () => {
    const contributors = collectNamedBosContributors({ caqCompleted: true });
    expect(contributors).toEqual([{ key: 'caq', label: 'CAQ' }]);
    expect(toHonestDisplayBosScore(62, contributors)).toBe(62);
    expect(toHonestDisplayBosScore(0, contributors)).toBe(0);
    expect(formatBosContributorLine(contributors)).toBe('From CAQ');
    const honest = resolveHonestBosDisplay({
      score: 62,
      contributors: [],
      accuracy_pills: [{ key: 'caq', label: 'CAQ', state: 'complete' }],
    });
    expect(honest.score).toBe(62);
    expect(honest.contributorLine).toBe('From CAQ');
  });

  it('names Labs (and CAQ) when those sources produced the score', () => {
    const contributors = collectNamedBosContributors({
      caqCompleted: true,
      labsPresent: true,
    });
    expect(contributors.map((c) => c.label)).toEqual(['CAQ', 'Labs']);
    expect(formatBosContributorLine(contributors)).toBe('From CAQ and Labs');
    expect(toHonestDisplayBosScore(62, contributors)).toBe(62);
  });

  it('names a wearable only when present with real ingest evidence', () => {
    expect(
      isRealWearableContributor({
        present: true,
        last_engaged_at: null,
        latest_hrv: null,
        latest_sleep_hours: null,
        device_types: ['whoop'],
      }),
    ).toBe(false);
    const named = collectNamedBosContributors({
      wearable: {
        present: true,
        last_engaged_at: '2026-08-24T09:00:00.000Z',
        latest_hrv: 42,
        latest_sleep_hours: 7.2,
        device_types: ['oura'],
      },
    });
    expect(named).toEqual([{ key: 'wearable', label: 'Oura' }]);
    expect(toHonestDisplayBosScore(62, named)).toBe(62);
  });

  it('does not invent 0 when contributors are missing', () => {
    expect(toHonestDisplayBosScore(null, [])).toBeNull();
    expect(toHonestDisplayBosScore(undefined, [])).toBeNull();
    expect(toHonestDisplayBosScore(Number.NaN, [{ key: 'caq', label: 'CAQ' }])).toBeNull();
    expect(toHonestDisplayBosScore(62, [])).not.toBe(0);
  });
});
