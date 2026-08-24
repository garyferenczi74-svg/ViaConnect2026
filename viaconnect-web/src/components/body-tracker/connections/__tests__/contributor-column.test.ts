import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ContributorColumn } from '@/components/body-tracker/connections/ContributorColumn';
import { CONTRIBUTOR_METRICS, METRIC_LABELS } from '@/lib/body-tracker/contributor-rows';
import type { DimensionSourceRow } from '@/lib/body-tracker/source-disagreement';

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

  it('renders the panel-level disclosure once', () => {
    const markup = renderToStaticMarkup(
      createElement(ContributorColumn, { rows: [], onOpenDimension: () => undefined }),
    );
    const matches = markup.match(/connected device/gi) ?? [];
    expect(matches.length).toBe(1);
  });
});
