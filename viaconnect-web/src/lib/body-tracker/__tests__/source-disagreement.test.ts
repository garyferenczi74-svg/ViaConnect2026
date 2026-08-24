import { describe, it, expect } from 'vitest';
import {
  buildDimensionSourceRows,
  explainDisagreement,
  formatUnknownOrPending,
} from '../source-disagreement';

describe('source disagreement copy', () => {
  it('shows both values and Devices disagree. Using winner', () => {
    const out = explainDisagreement(
      { source: 'whoop', label: 'Whoop', value: 72, trust: 0.85 },
      { source: 'oura', label: 'Oura', value: 64, trust: 0.7 },
    );
    expect(out.headline).toBe('DISAGREE');
    expect(out.showWinnerBadge).toBe(true);
    expect(out.winnerLabel).toBe('Whoop');
    expect(out.detail).toBe('Devices disagree. Using Whoop.');
    expect(out.left?.value).toBe(72);
    expect(out.right?.value).toBe(64);
  });

  it('says Averaged because equal trust and does not invent a winner badge', () => {
    const out = explainDisagreement(
      { source: 'whoop', label: 'Whoop', value: 81, trust: 0.85 },
      { source: 'oura', label: 'Oura', value: 81, trust: 0.85 },
    );
    expect(out.kind).toBe('equal_trust_average');
    expect(out.averagedBecauseEqualTrust).toBe(true);
    expect(out.showWinnerBadge).toBe(false);
    expect(out.detail).toBe('Averaged because equal trust.');
    expect(out.left?.value).toBe(81);
    expect(out.right?.value).toBe(81);
  });

  it('one source shows the value with no winner badge', () => {
    const rows = buildDimensionSourceRows(
      ['strain'],
      [{ dimension: 'strain', sources: [{ source: 'whoop', label: 'Whoop', value: 8.4, trust: 0.85 }] }],
    );
    expect(rows[0].status).toBe('sourced');
    expect(rows[0].displayValue).toBe('8.4');
    expect(rows[0].disagreement?.showWinnerBadge).toBe(false);
    expect(rows[0].disagreement?.kind).toBe('single');
  });

  it('pending never renders a fake 0', () => {
    const rows = buildDimensionSourceRows(
      ['metabolic'],
      [
        {
          dimension: 'metabolic',
          manual: true,
          sources: [{ source: 'hume', label: 'Hume', value: null, trust: 0.8 }],
        },
      ],
    );
    expect(rows[0].status).toBe('pending');
    expect(rows[0].displayValue).toBe('Pending');
    expect(rows[0].value).toBeNull();
    expect(rows[0].manual).toBe(true);
    expect(formatUnknownOrPending(null)).toBe('Pending');
    expect(formatUnknownOrPending(0)).toBe('0');
  });
});
