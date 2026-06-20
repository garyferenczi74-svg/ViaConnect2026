// Prompt 193c Task T2 (2026-06-12): contract tests for VariantReportPill.
//
// Source-as-text assertions per the repo convention (environment: 'node', no
// jsdom). These lock the resolver wiring, the null return for no report, the
// real next/link usage, the unified "View Your Variant" label (Gary 2026-06-20),
// the Lucide FileText + ArrowUpRight icons at strokeWidth 1.5, the accessible
// name that starts with the visible label and stays gene-distinct, the 44px
// touch target, the teal outline styling, and the no dash rule. The runtime
// resolver behavior (exists false for an unmatched rsID) is asserted directly
// against the live resolver, which the pill calls.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { resolveVariantReport } from '../../../../lib/genex360/resolveVariantReport';

const COMPONENT = path.resolve(__dirname, '..', 'VariantReportPill.tsx');

describe('VariantReportPill source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('calls resolveVariantReport with the rsid, panelSlug and gene (204i fallback)', () => {
    expect(source).toContain('resolveVariantReport(rsid, panelSlug, gene)');
  });

  it('returns null when the resolver reports no matching report (never a dead link)', () => {
    expect(source).toContain('if (!target.exists)');
    expect(source).toContain('return null;');
  });

  it('renders a real next/link Link whose href comes from the resolver target', () => {
    expect(source).toContain("import Link from 'next/link'");
    expect(source).toContain('<Link');
    expect(source).toContain('href={target.href}');
  });

  it('shows the unified visible "View Your Variant" label on every row', () => {
    expect(source).toContain('const label = "View Your Variant";');
    // No split Report / Gene report visible labels remain.
    expect(source).not.toContain('? "Gene report" : "Report"');
  });

  it('renders the leading FileText and trailing ArrowUpRight icons at strokeWidth 1.5', () => {
    expect(source).toContain('FileText');
    expect(source).toContain('ArrowUpRight');
    expect(source).toContain('strokeWidth={1.5}');
  });

  it('builds a variant aria-label that avoids a doubled variant label', () => {
    expect(source).toContain('geneLabel.includes(variantLabel)');
    expect(source).toContain('`View Your Variant, the full ${accessibleName} report`');
  });

  it('keeps the accessible name starting with the visible label (WCAG 2.5.3) and gene-distinct (204i)', () => {
    expect(source).toContain("const geneLevel = target.level === \"gene\"");
    // The accessible name still distinguishes a gene-level fallback for assistive
    // tech, while starting with the unified visible label so voice control matches.
    expect(source).toContain('`View Your Variant, the ${geneLabel} gene report`');
    expect(source).toContain('aria-label={ariaLabel}');
  });

  it('gives the pill a 44px minimum touch target', () => {
    expect(source).toContain('min-h-[44px]');
  });

  it('styles a teal outline pill distinct from the filled severity chips', () => {
    expect(source).toContain('border-[#2DA5A0]/50');
    expect(source).toContain('text-white');
    expect(source).toContain('bg-transparent');
    expect(source).toContain('hover:bg-[#2DA5A0]/10');
    expect(source).toContain('rounded-full');
    expect(source).toContain('no-underline');
  });

  it('keeps a focus-visible ring on the Card surface', () => {
    expect(source).toContain('focus-visible:ring-2');
    expect(source).toContain('focus-visible:ring-[#2DA5A0]/70');
    expect(source).toContain('focus-visible:ring-offset-[#1A2744]');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('VariantReportPill resolver behavior', () => {
  it('resolves an existing report so the pill renders a link', () => {
    const target = resolveVariantReport('rs1801133', 'genexm');
    expect(target.exists).toBe(true);
    expect(target.href).toBe('/genetics/blueprint#genex-m/mthfr/rs1801133');
  });

  it('reports exists false for an unmatched rsID so the pill returns null', () => {
    const target = resolveVariantReport('rs00000000', 'genexm');
    expect(target.exists).toBe(false);
    expect(target.href).toBe('');
  });
});
