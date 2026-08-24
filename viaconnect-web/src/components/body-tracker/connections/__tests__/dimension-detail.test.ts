import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  DimensionDetailSheet,
  METRIC_EXPLAINER,
} from '@/components/body-tracker/connections/DimensionDetailSheet';
import type { DimensionSourceRow } from '@/lib/body-tracker/source-disagreement';

describe('DimensionDetailSheet', () => {
  it('metric=null renders nothing', () => {
    const markup = renderToStaticMarkup(
      createElement(DimensionDetailSheet, { metric: null, rows: [], onClose: () => undefined }),
    );
    expect(markup).toBe('');
  });

  it('metric=sleep shows the explainer copy and the dimension-detail hook', () => {
    const markup = renderToStaticMarkup(
      createElement(DimensionDetailSheet, { metric: 'sleep', rows: [], onClose: () => undefined }),
    );
    expect(markup).toContain('data-dimension-detail="sleep"');
    expect(markup).toContain(METRIC_EXPLAINER.sleep);
    expect(markup).toContain('role="dialog"');
  });

  it('metric=recovery with a sourced row shows the source labels and an Active pill', () => {
    const rows: DimensionSourceRow[] = [
      {
        dimension: 'recovery',
        source: 'whoop',
        value: 72,
        displayValue: '72',
        status: 'sourced',
        showRing: true,
        manual: false,
        disagreement: null,
        sources: [
          { source: 'whoop', value: 72, trust: 3, label: 'Whoop', is_active: true },
          { source: 'oura', value: 70, trust: 2, label: 'Oura', is_active: false },
        ],
      },
    ];
    const markup = renderToStaticMarkup(
      createElement(DimensionDetailSheet, { metric: 'recovery', rows, onClose: () => undefined }),
    );
    expect(markup).toContain('Whoop');
    expect(markup).toContain('Oura');
    expect(markup).toContain('Active');
  });

  it('a DISAGREE row renders the disagreement detail line', () => {
    const rows: DimensionSourceRow[] = [
      {
        dimension: 'sleep',
        source: 'whoop',
        value: 85,
        displayValue: '85',
        status: 'sourced',
        showRing: true,
        manual: false,
        disagreement: {
          kind: 'winner',
          headline: 'DISAGREE',
          detail: 'Devices disagree. Using Whoop.',
          left: null,
          right: null,
          sources: [],
          winnerSource: 'whoop',
          winnerLabel: 'Whoop',
          resolvedValue: 85,
          resolvedDisplay: '85',
          averagedBecauseEqualTrust: false,
          showWinnerBadge: true,
          showDisagreeChrome: true,
          manual: false,
          activeIcon: 'whoop',
        },
        sources: [
          { source: 'whoop', value: 85, trust: 3, label: 'Whoop', is_active: true },
          { source: 'oura', value: 78, trust: 2, label: 'Oura', is_active: false },
        ],
      },
    ];
    const markup = renderToStaticMarkup(
      createElement(DimensionDetailSheet, { metric: 'sleep', rows, onClose: () => undefined }),
    );
    expect(markup).toContain('Devices disagree. Using Whoop.');
    expect(markup).toContain('DISAGREE');
  });

  it('metric=hrv with empty rows shows a neutral no-source line, never a fabricated value', () => {
    const markup = renderToStaticMarkup(
      createElement(DimensionDetailSheet, { metric: 'hrv', rows: [], onClose: () => undefined }),
    );
    expect(markup).toContain('No source connected yet');
    expect(markup).not.toMatch(/font-mono/);
  });

  it('a source with a non-finite value renders UNKNOWN, never a fabricated number', () => {
    const rows: DimensionSourceRow[] = [
      {
        dimension: 'sleep',
        source: 'whoop',
        value: 85,
        displayValue: '85',
        status: 'sourced',
        showRing: true,
        manual: false,
        disagreement: null,
        sources: [{ source: 'whoop', value: null, trust: 3, label: 'Whoop', is_active: true }],
      },
    ];
    const markup = renderToStaticMarkup(
      createElement(DimensionDetailSheet, { metric: 'sleep', rows, onClose: () => undefined }),
    );
    expect(markup).toContain('UNKNOWN');
  });

  it('a manual row shows the Manual indicator', () => {
    const rows: DimensionSourceRow[] = [
      {
        dimension: 'metabolic',
        source: 'manual',
        value: 180,
        displayValue: '180',
        status: 'sourced',
        showRing: true,
        manual: true,
        disagreement: null,
        sources: [{ source: 'manual', value: 180, trust: 5, label: 'Manual entry', is_active: true }],
      },
    ];
    const markup = renderToStaticMarkup(
      createElement(DimensionDetailSheet, { metric: 'body_composition', rows, onClose: () => undefined }),
    );
    expect(markup).toContain('Manual');
    expect(markup).toContain('data-dimension-detail="body_composition"');
  });
});
