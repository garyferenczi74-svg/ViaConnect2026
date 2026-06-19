// Prompt 193 Task T2 (2026-06-12): contract tests for PanelMarkerGroup.
// Prompt 193a Task T3 (2026-06-12): plus the per SNP disclosure contract.
//
// Source-as-text assertions per the repo convention (environment: 'node', no
// jsdom). These lock the Teal symbol color, the rendered fields (groupTitle,
// symbol, fullName, description), the responsive two column grid, the Lucide
// icon at strokeWidth 1.5, and the no dash rule. The 193a block locks the
// accessible disclosure that renders only when a marker has a deepReport and a
// toggle is supplied: the snp-<slug> row id, the aria-expanded + aria-controls
// button, the mounted SnpDeepReport, the reduced motion handling, and that
// markers without a report still render statically.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'PanelMarkerGroup.tsx');

describe('PanelMarkerGroup source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('colors the marker symbol Teal #2DA5A0', () => {
    expect(source).toContain('text-[#2DA5A0]');
  });

  it('renders the group title', () => {
    expect(source).toContain('group.groupTitle');
  });

  it('renders the marker symbol, fullName, and description', () => {
    expect(source).toContain('marker.symbol');
    expect(source).toContain('marker.fullName');
    expect(source).toContain('marker.description');
  });

  it('mutes the fullName tone', () => {
    expect(source).toContain('text-white/45');
  });

  it('renders the description in body text', () => {
    expect(source).toContain('text-white/75');
  });

  it('stacks the collapsed SNP tabs in a single column (Prompt 193e)', () => {
    expect(source).toContain('<ul className="space-y-2.5">');
  });

  it('types the group prop from the data layer PanelMarkerGroup', () => {
    expect(source).toContain('@/data/genex360/types');
  });

  it('uses a Lucide icon at strokeWidth 1.5 (no checkmark glyphs)', () => {
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).not.toContain(String.fromCharCode(0x2705)); // white heavy check mark
    expect(source).not.toContain(String.fromCharCode(0x2714)); // heavy check mark
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('PanelMarkerGroup per SNP disclosure (193a)', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('is a client component', () => {
    expect(source).toContain("'use client'");
  });

  it('accepts the single open slug and toggle props', () => {
    expect(source).toContain('openSnpSlug?: string | null');
    expect(source).toContain('onToggleSnp?: (snpSlug: string) => void');
  });

  it('gates the disclosure on a present deepReport and a supplied toggle', () => {
    expect(source).toContain('marker.deepReport');
    expect(source).toContain("typeof onToggleSnp === \"function\"");
  });

  it('derives the slug from the marker symbol, lowercased', () => {
    expect(source).toContain('marker.symbol.toLowerCase()');
  });

  it('gives the SNP row a snp- prefixed id and a sticky scroll margin', () => {
    expect(source).toContain('id={`snp-${slug}`}');
    expect(source).toContain('scroll-mt-[80px]');
  });

  it('renders a View full report toggle with aria-expanded and aria-controls', () => {
    expect(source).toContain('type="button"');
    expect(source).toContain('aria-expanded={isOpen}');
    expect(source).toContain('aria-controls={detailId}');
    expect(source).toContain('View full report');
    expect(source).toContain('onClick={() => onToggleSnp(slug)}');
  });

  it('gives the toggle a 44px minimum tap target and a focus ring', () => {
    expect(source).toContain('min-h-[44px]');
    expect(source).toContain('focus-visible:ring-2');
  });

  it('rotates a Lucide ChevronDown when open at strokeWidth 1.5', () => {
    expect(source).toContain('ChevronDown');
    expect(source).toContain("isOpen ? \"rotate-180\" : \"rotate-0\"");
    expect(source).toContain('strokeWidth={1.5}');
  });

  it('mounts the VariantReportTabs in a labeled region only when this row is open (204f)', () => {
    // Prompt 204f: the open accordion now mounts the two-tab VariantReportTabs,
    // which holds the 193a SnpDeepReport behind its Full Report tab.
    expect(source).toContain("import { VariantReportTabs } from \"./VariantReportTabs\"");
    expect(source).toContain('id={detailId}');
    expect(source).toContain('role="region"');
    expect(source).toContain('aria-label={`${marker.symbol} full report`}');
    expect(source).toContain('<VariantReportTabs');
    // The detail region is conditional on the open state.
    expect(source).toContain('{isOpen ? (');
  });

  it('mounts the tabs for a deep-report marker and keeps an inline description otherwise (204f)', () => {
    // Prompt 204f: a marker with a deep report opens into the tab shell (the
    // description moves into the Full Report tab). A marker without a deep report
    // keeps its inline description paragraph (the Prompt 193e placement).
    expect(source).toContain('marker.deepReport ? (');
    expect(source).toContain('<p className="text-[13px] leading-relaxed text-white/75">{marker.description}</p>');
  });

  it('threads the highlightRsid through to the report (193c / 204f)', () => {
    // The group accepts the prop, forwards it to SnpMarkerRow, and on to
    // VariantReportTabs so the deep linked variant sub block gets its soft ring.
    expect(source).toContain('highlightRsid?: string | null');
    expect(source).toContain('highlightRsid={highlightRsid ?? null}');
    expect(source).toContain('highlightRsid: string | null');
    expect(source).toContain('highlightRsid={highlightRsid}');
  });

  it('animates the expand with framer motion height auto', () => {
    expect(source).toContain("from \"framer-motion\"");
    expect(source).toContain("animate={{ height: \"auto\", opacity: 1 }}");
  });

  it('honors prefers reduced motion via useReducedMotion and a zero duration', () => {
    expect(source).toContain('useReducedMotion');
    expect(source).toContain('reduced ? { duration: 0 }');
    expect(source).toContain('motion-reduce:transition-none');
  });

  it('keeps a static inline fallback only when no toggle is supplied (non-island use)', () => {
    // Prompt 193e: with the island toggle present EVERY marker collapses to a
    // tab. Without onToggleSnp the static inline row remains as a fallback.
    expect(source).toContain('Static fallback');
    expect(source).toContain('marker.fullName');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
