// Prompt 191 Task C (2026-06-12): contract tests for YourVariantsCard.
//
// Source-as-text assertions per the repo convention (environment: 'node', no
// jsdom). These lock the deep link read, the data API usage, the tabpanel
// wiring, the GeneX360 link, the sample-data banner copy, the per test filter
// memory, the bounded scroll affordance, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'YourVariantsCard.tsx');

describe('YourVariantsCard source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('reads the ?test= deep link via useSearchParams', () => {
    expect(source).toContain('useSearchParams');
    expect(source).toContain("searchParams.get('test')");
  });

  it('validates the requested test id with getTestById', () => {
    expect(source).toContain('getTestById');
  });

  it('shows the total sample count via totalSampleVariantCount', () => {
    expect(source).toContain('totalSampleVariantCount()');
  });

  it('renders the active panel as a tabpanel labelled by the active tab', () => {
    expect(source).toContain('role="tabpanel"');
    expect(source).toContain('aria-labelledby={activeTabId}');
    expect(source).toContain('id={PANEL_ID}');
  });

  it('passes a consistent panelId into the pill tabs', () => {
    expect(source).toContain('panelId={PANEL_ID}');
    expect(source).toContain('${PANEL_ID}-tab-${activeTest.id}');
  });

  it('imports GENEX360_SHOP_HREF and links to it with a Next Link', () => {
    expect(source).toContain("import { GENEX360_SHOP_HREF } from './geneticsHubLinks'");
    expect(source).toContain("import Link from 'next/link'");
    expect(source).toContain('href={GENEX360_SHOP_HREF}');
  });

  it('renders the Sample data banner copy and the Order GeneX360 CTA', () => {
    expect(source).toContain('Sample data.');
    expect(source).toContain('Order GeneX360');
  });

  it('keeps a per test impact filter memory record (no sessionStorage)', () => {
    expect(source).toContain('filterByTest');
    expect(source).toContain('Record<string, ImpactFilterValue>');
    expect(source).not.toContain('sessionStorage');
  });

  it('bounds the row list in a max height scroll area (Section 4.3)', () => {
    expect(source).toContain('max-h-[420px]');
    expect(source).toContain('overflow-y-auto');
  });

  it('renders the honest empty-filter line for a tier with no rows', () => {
    expect(source).toContain('No {activeFilter} impact variants in this sample.');
  });

  it('does not fabricate loading or error states for static sample data', () => {
    expect(source.toLowerCase()).not.toContain('spinner');
    expect(source).not.toContain('isLoading');
  });

  it('uses the yourVariants media seam from GENETICS_CARD_MEDIA', () => {
    expect(source).toContain('GENETICS_CARD_MEDIA.yourVariants');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
