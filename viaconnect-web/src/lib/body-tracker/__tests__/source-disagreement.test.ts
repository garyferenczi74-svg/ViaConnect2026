import { describe, it, expect } from 'vitest';
import {
  EQUAL_TRUST_COPY,
  buildDimensionSourceRows,
  explainDisagreement,
  formatUnknownOrPending,
  reconcileDimensionSources,
} from '../source-disagreement';

describe('source disagreement DISPLAY', () => {
  it('shows both values, DISAGREE, and the is_active winner', () => {
    const out = explainDisagreement(
      { source: 'whoop', shortLabel: 'Whoop', label: 'Whoop Sleep', value: 72, trust: 0.85 },
      { source: 'oura', shortLabel: 'Oura', label: 'Oura Sleep', value: 64, trust: 0.7 },
    );
    expect(out.headline).toBe('DISAGREE');
    expect(out.showDisagreeChrome).toBe(true);
    expect(out.showWinnerBadge).toBe(true);
    expect(out.winnerLabel).toBe('Whoop');
    expect(out.detail).toBe('Devices disagree. Using Whoop.');
    expect(out.sources.find((s) => s.source === 'whoop')?.is_active).toBe(true);
    expect(out.sources.find((s) => s.source === 'oura')?.is_active).toBe(false);
    expect(out.left?.value).toBe(72);
    expect(out.right?.value).toBe(64);
  });

  it('uses averaged because equal trust when the active value is an average', () => {
    const out = explainDisagreement(
      { source: 'whoop', shortLabel: 'Whoop', value: 72, trust: 0.85 },
      { source: 'oura', shortLabel: 'Oura', value: 64, trust: 0.85 },
    );
    expect(out.kind).toBe('equal_trust_average');
    expect(out.averagedBecauseEqualTrust).toBe(true);
    expect(out.showWinnerBadge).toBe(false);
    expect(out.showDisagreeChrome).toBe(true);
    expect(out.detail).toBe(EQUAL_TRUST_COPY);
    expect(out.detail).toBe('averaged because equal trust.');
    expect(out.resolvedDisplay).toBe('68');
    expect(out.sources.every((s) => s.is_active !== true)).toBe(true);
    expect(out.left?.value).toBe(72);
    expect(out.right?.value).toBe(64);
  });

  it('does not DISAGREE when equal-trust values match', () => {
    const out = explainDisagreement(
      { source: 'whoop', shortLabel: 'Whoop', value: 81, trust: 0.85 },
      { source: 'oura', shortLabel: 'Oura', value: 81, trust: 0.85 },
    );
    expect(out.kind).toBe('agree');
    expect(out.showDisagreeChrome).toBe(false);
    expect(out.averagedBecauseEqualTrust).toBe(false);
    expect(out.sources.find((s) => s.source === 'whoop')?.is_active).toBe(true);
  });

  it('keeps the loser visible on a sleep triple', () => {
    const out = reconcileDimensionSources([
      { source: 'whoop', shortLabel: 'Whoop', value: 72, trust: 0.85 },
      { source: 'oura', shortLabel: 'Oura', value: 64, trust: 0.85 },
      { source: 'apple_health', shortLabel: 'Apple Health', value: 50, trust: 0.75 },
    ]);
    expect(out.showDisagreeChrome).toBe(true);
    expect(out.detail).toBe(EQUAL_TRUST_COPY);
    expect(out.sources.map((s) => s.source)).toEqual(['whoop', 'oura', 'apple_health']);
    expect(out.sources.find((s) => s.source === 'apple_health')?.value).toBe(50);
    expect(out.resolvedDisplay).toBe('68');
  });

  it('treats Apple Watch native as higher trust than Apple Health plugin', () => {
    const out = explainDisagreement(
      { source: 'apple_watch', shortLabel: 'Apple Watch', value: 80, trust: 0.85 },
      { source: 'apple_health', shortLabel: 'Apple Health', value: 60, trust: 0.75 },
    );
    expect(out.kind).toBe('winner');
    expect(out.winnerSource).toBe('apple_watch');
    expect(out.sources.find((s) => s.source === 'apple_watch')?.is_active).toBe(true);
    expect(out.sources.find((s) => s.source === 'apple_health')?.is_active).toBe(false);
    expect(out.detail).toBe('Devices disagree. Using Apple Watch.');
  });

  it('labels Manual and skips DISAGREE chrome while still showing the wearable', () => {
    const out = reconcileDimensionSources([
      { source: 'manual', shortLabel: 'Manual', value: 18.2, trust: 1, manual: true },
      { source: 'hume', shortLabel: 'Hume', value: 19.4, trust: 0.8 },
    ]);
    expect(out.kind).toBe('manual');
    expect(out.manual).toBe(true);
    expect(out.showDisagreeChrome).toBe(false);
    expect(out.sources.find((s) => s.source === 'manual')?.is_active).toBe(true);
    expect(out.sources.find((s) => s.source === 'hume')?.value).toBe(19.4);
  });

  it('one source shows the value with no winner badge', () => {
    const rows = buildDimensionSourceRows(
      ['strain'],
      [{ dimension: 'strain', sources: [{ source: 'whoop', shortLabel: 'Whoop', value: 8.4, trust: 0.85 }] }],
    );
    expect(rows[0].status).toBe('sourced');
    expect(rows[0].displayValue).toBe('8.4');
    expect(rows[0].disagreement?.showWinnerBadge).toBe(false);
    expect(rows[0].disagreement?.kind).toBe('single');
    expect(rows[0].sources[0]?.is_active).toBe(true);
    expect(rows[0].showRing).toBe(true);
  });

  it('pending never renders a fake 0', () => {
    const rows = buildDimensionSourceRows(
      ['metabolic'],
      [
        {
          dimension: 'metabolic',
          sources: [{ source: 'hume', label: 'Hume', value: null, trust: 0.8 }],
        },
      ],
    );
    expect(rows[0].status).toBe('pending');
    expect(rows[0].displayValue).toBe('UNKNOWN');
    expect(rows[0].showRing).toBe(false);
    expect(rows[0].value).toBeNull();
    expect(rows[0].manual).toBe(false);
    expect(formatUnknownOrPending(null)).toBe('UNKNOWN');
    expect(formatUnknownOrPending(0)).toBe('0');
  });

  it('does not invent wearable DISAGREE on non-wearable dims', () => {
    const rows = buildDimensionSourceRows(['regimen', 'nutrients', 'symptoms', 'immune'], []);
    for (const row of rows) {
      expect(row.disagreement?.showDisagreeChrome).toBe(false);
      expect(row.displayValue).toBe('UNKNOWN');
      expect(row.showRing).toBe(false);
    }
  });
});
