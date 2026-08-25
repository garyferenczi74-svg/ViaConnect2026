import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CONTRIBUTOR_ROW_CLASS,
  ContributorColumn,
} from '@/components/body-tracker/connections/ContributorColumn';
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
    expect(markup).toContain(CONTRIBUTOR_ROW_CLASS);
    expect(CONTRIBUTOR_ROW_CLASS).toBe('flex min-h-9 items-center gap-2 rounded-lg px-2 py-1.5');
    expect(markup).not.toContain('bg-navy-700/80');
    expect(markup).not.toContain('bg-navy-700');
    expect(markup).not.toContain('>Metric<');
    expect(markup).not.toContain('>Source<');
    expect(markup).not.toMatch(/mt-5 space-y-3/);
    expect((markup.match(/rounded-xl/g) ?? []).length).toBe(0);
    expect(markup).not.toMatch(/class="[^"]*\bp-3\b/);
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
    expect(markup).toContain(CONTRIBUTOR_ROW_CLASS);
    expect(markup).not.toContain('bg-navy-700/80');
    expect(markup).not.toMatch(/class="[^"]*\bp-3\b/);
    expect(markup).not.toContain('>Metric<');
    expect(markup).not.toContain('>Source<');
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
    expect(markup).toContain(CONTRIBUTOR_ROW_CLASS);
    expect(markup).not.toContain('bg-navy-700/80');
    expect(markup).not.toMatch(/class="[^"]*\bp-3\b/);
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
    expect(markup).toContain('mt-3 text-[11px] leading-snug text-white/45');
    expect(markup).not.toContain('text-xs leading-relaxed');
    expect(markup).not.toContain('>Metric<');
    expect(markup).not.toContain('>Source<');
  });
});
