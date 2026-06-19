// Prompt 204f (2026-06-19): contract tests for VariantReportTabs.
//
// Source-as-text assertions per the repo convention (environment: 'node', no
// jsdom). These lock the two-tab structure (Description default, Full Report
// behind a tab), the validated-laySummary-or-interim Description body, the
// preserved 204e deep-link behavior (default to Full Report when a variant deep
// link targets this report, so the highlight is visible), the reuse of the 193a
// SnpDeepReport unchanged in the Full Report tab, the WAI-ARIA tab semantics, and
// the standing rules (Lucide strokeWidth 1.5, tokens, no dashes, no alarm color).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'VariantReportTabs.tsx');

describe('VariantReportTabs source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('is a client component', () => {
    expect(source).toContain("'use client'");
  });

  it('renders exactly two tabs, Description and Full Report', () => {
    expect(source).toContain("label: 'Description'");
    expect(source).toContain("label: 'Full Report'");
    expect(source).toContain('role="tablist"');
    expect(source).toContain('role="tab"');
    expect(source).toContain('role="tabpanel"');
  });

  it('defaults to Description on a plain open and Full Report on a matching variant deep link (204e)', () => {
    // The default is decided in the useState initializer (not a post-mount
    // effect) so the variant sub block is in the DOM before the island rAF scroll.
    expect(source).toContain('targetsThisReport(report, highlightRsid)');
    expect(source).toContain("useState<ReportTab>(");
    expect(source).toContain("? 'full' : 'description'");
    // A later deep link re-asserts Full Report, keyed on highlightRsid.
    expect(source).toContain('useEffect');
    expect(source).toContain("setActiveTab('full')");
  });

  it('matches the deep link against this report by rsid', () => {
    expect(source).toContain('report.keyVariants.some((v) => v.rsid === highlightRsid)');
  });

  it('renders the Full Report tab from the unchanged 193a SnpDeepReport, threading highlightRsid and severity', () => {
    expect(source).toContain("import { SnpDeepReport } from './SnpDeepReport'");
    expect(source).toContain('<SnpDeepReport');
    expect(source).toContain('report={report}');
    expect(source).toContain('highlightRsid={highlightRsid}');
    // Prompt 204g: the member severity map is forwarded for the cross-reference.
    expect(source).toContain('severityByRsid={severityByRsid}');
    // The marker description paragraph stays at the top of the Full Report tab.
    expect(source).toContain('{marker.description}');
  });

  it('renders the validated laySummary when present, otherwise the interim state', () => {
    expect(source).toContain('report.laySummary ?? []');
    expect(source).toContain('laySummary.length > 0');
    expect(source).toContain('laySummary.map');
    expect(source).toContain('<InterimDescription symbol={symbol} />');
  });

  it('the interim state names the gene but states no fabricated specifics', () => {
    // It explains what a SNP is in general terms and points to Full Report; it
    // only ever interpolates the gene symbol, never an invented claim.
    expect(source).toContain('A SNP is a common, single-letter difference');
    expect(source).toContain('open the Full Report tab');
    expect(source).toContain('covers the {symbol} gene');
  });

  it('shows the consult note on the Description tab', () => {
    expect(source).toContain(
      'Consult a practitioner before making changes based on genetic data',
    );
  });

  it('uses WAI-ARIA tab semantics with roving tabindex and keyboard navigation', () => {
    expect(source).toContain('aria-selected={active}');
    expect(source).toContain('aria-controls={`${idBase}-panel-${tab.id}`}');
    expect(source).toContain('aria-labelledby={`${idBase}-tab-description`}');
    expect(source).toContain('tabIndex={active ? 0 : -1}');
    expect(source).toContain("case 'ArrowRight'");
    expect(source).toContain("case 'Home'");
    expect(source).toContain("case 'End'");
  });

  it('gives each tab a 44px minimum tap target and a visible focus ring', () => {
    expect(source).toContain('min-h-[44px]');
    expect(source).toContain('focus-visible:ring-2');
  });

  it('uses Lucide icons at strokeWidth 1.5 only', () => {
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).toContain("from 'lucide-react'");
  });

  it('uses the established teal active pill, no alarm color', () => {
    expect(source).toContain('bg-[#2DA5A0] text-[#1A2744]');
    // No red / alarm tokens anywhere.
    expect(source.toLowerCase()).not.toContain('bg-red');
    expect(source.toLowerCase()).not.toContain('text-red');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
