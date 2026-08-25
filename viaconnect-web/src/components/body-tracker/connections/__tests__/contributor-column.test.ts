import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ContributorColumn } from '@/components/body-tracker/connections/ContributorColumn';
import { CONTRIBUTOR_METRICS, METRIC_LABELS } from '@/lib/body-tracker/contributor-rows';
import type { DimensionSourceRow } from '@/lib/body-tracker/source-disagreement';
import { CONNECTIONS_DISCLOSURE } from '@/lib/body-tracker/wearable-tiles';

describe('ContributorColumn', () => {
  it('cold: renders all 7 metric labels, each with a Connect your device CTA and a details chevron', () => {
    const markup = renderToStaticMarkup(
      createElement(ContributorColumn, { rows: [], onOpenDimension: () => undefined }),
    );
    for (const metric of CONTRIBUTOR_METRICS) {
      expect(markup).toContain(METRIC_LABELS[metric]);
    }
    expect((markup.match(/Connect your device/g) ?? []).length).toBe(7);
    for (const metric of CONTRIBUTOR_METRICS) {
      expect(markup).toContain(`aria-label="${METRIC_LABELS[metric]} details"`);
    }
    expect((markup.match(/ details"/g) ?? []).length).toBe(7);
    expect(markup).toContain('data-connect-cta');
  });

  it('populated: the matching row shows its real source, not the CTA', () => {
    const rows: DimensionSourceRow[] = [
      {
        dimension: 'sleep',
        source: 'apple_health',
        value: 90,
        displayValue: '90',
        status: 'sourced',
        showRing: true,
        manual: false,
        disagreement: null,
        sources: [],
      },
    ];
    const markup = renderToStaticMarkup(
      createElement(ContributorColumn, { rows, onOpenDimension: () => undefined }),
    );
    expect((markup.match(/Connect your device/g) ?? []).length).toBe(6);
    expect(markup).toContain('data-metric="sleep"');
    expect(markup).toContain('data-ring="visible"');
    expect(markup).toMatch(/Apple Health/);
  });

  it('disagreeing row: the DISAGREE chip is a real wired button, not an inert span', () => {
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
        sources: [],
      },
    ];
    let openedMetric: string | null = null;
    const markup = renderToStaticMarkup(
      createElement(ContributorColumn, {
        rows,
        onOpenDimension: (metric: string) => {
          openedMetric = metric;
        },
      }),
    );
    // Real interactive control, not the old bare <span>DISAGREE</span>.
    expect(markup).toMatch(/<button[^>]*>DISAGREE<\/button>/);
    expect(markup).not.toMatch(/<span[^>]*>DISAGREE<\/span>/);
    expect(markup).toContain('aria-label="Sleep sources disagree, details"');
    // onOpenDimension is only invoked on a real click event, which
    // renderToStaticMarkup (no jsdom) cannot dispatch; this proves the
    // button is wired to the same live prop the chevron uses, not a
    // decorative dead end.
    expect(openedMetric).toBeNull();
  });

  it('renders the panel-level disclosure once', () => {
    // Prompt 230 Task 9: the disclosure is now the centralized
    // CONNECTIONS_DISCLOSURE constant (moved to wearable-tiles.ts, renamed
    // from the local CONTRIBUTOR_DISCLOSURE), so this asserts the real
    // canonical copy renders exactly once rather than an invented substring.
    const markup = renderToStaticMarkup(
      createElement(ContributorColumn, { rows: [], onOpenDimension: () => undefined }),
    );
    expect(markup).toContain(CONNECTIONS_DISCLOSURE);
    const matches = markup.split(CONNECTIONS_DISCLOSURE).length - 1;
    expect(matches).toBe(1);
  });
});
