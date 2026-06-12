// Prompt 193 Task T3 (2026-06-12): contract tests for the GeneX360PanelSection
// island. Source string assertions per the repo convention (vitest node env, no
// jsdom). These lock the hash on mount + hashchange sync, replaceState (never
// pushState), the genex-m default, the composition of pills + card, the sr-only
// stubs for non active slugs, the aria-live announce, the reduced motion guard,
// scrollIntoView, and the no dash rule.
//
// Prompt 193a Task T3: the nested hash + single open SNP contract. These lock
// the two level parse (split on "/"), GENEX_M_SNP_SLUGS validation, the openSnp
// state and onToggleSnp toggle, the nested replaceState (never pushState),
// clearing openSnp on pill select, the snp- row scroll, and threading the slug +
// toggle to the card.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'GeneX360PanelSection.tsx');

describe('GeneX360PanelSection source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('is a client component', () => {
    expect(source).toContain("'use client'");
  });

  it('defaults the active slug to genex-m for deterministic SSR', () => {
    expect(source).toContain("useState<PanelSlug>('genex-m')");
  });

  it('reads the location hash on mount', () => {
    expect(source).toContain('window.location.hash');
  });

  it('registers and cleans up a hashchange listener', () => {
    expect(source).toContain("addEventListener('hashchange'");
    expect(source).toContain("removeEventListener('hashchange'");
  });

  it('updates the URL with replaceState and never pushState', () => {
    expect(source).toContain('history.replaceState');
    expect(source).not.toContain('pushState');
  });

  it('checks prefers-reduced-motion before scrolling', () => {
    expect(source).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(source).toContain('prefersReducedMotion');
  });

  it('smooth scrolls the active card into view', () => {
    expect(source).toContain('scrollIntoView');
    expect(source).toContain("behavior: prefersReducedMotion() ? 'auto' : 'smooth'");
  });

  it('composes the pill tabs and the description card', () => {
    expect(source).toContain('PanelPillTabs');
    expect(source).toContain('PanelDescriptionCard');
    expect(source).toContain('onBackToPanels={handleBack}');
  });

  it('renders sr-only stubs for every non active slug', () => {
    expect(source).toContain('panel.slug !== activeSlug');
    expect(source).toContain('aria-hidden="true"');
    expect(source).toContain('className="sr-only"');
  });

  it('announces the active panel via an aria-live region', () => {
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('Showing ${activePanel.displayName} panel');
  });

  it('moves focus to the active pill on back to panels', () => {
    expect(source).toContain('genex360-tab-${activeSlug}');
    expect(source).toContain("getElementById('genex360-panels')");
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('GeneX360PanelSection nested hash + single open SNP (193a)', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('imports the GeneX-M SNP slugs and validates the hash second part against them', () => {
    expect(source).toContain("import { GENEX_M_SNP_SLUGS } from '@/data/genex360/genex-m-deep'");
    expect(source).toContain('GENEX_M_SNP_SLUG_SET');
    expect(source).toContain('.has(snpPart)');
  });

  it('parses the two level hash by splitting on a slash', () => {
    expect(source).toContain("raw.split('/')");
    expect(source).toContain('panelPart');
    expect(source).toContain('snpPart');
  });

  it('only honors a SNP slug under the genex-m panel', () => {
    expect(source).toContain("panel === 'genex-m'");
  });

  it('owns an openSnp state and an onToggleSnp toggle', () => {
    expect(source).toContain('useState<string | null>(null)');
    expect(source).toContain('openSnp');
    expect(source).toContain('setOpenSnp');
    expect(source).toContain('onToggleSnp');
  });

  it('is a single open accordion (opening a new slug replaces the previous)', () => {
    expect(source).toContain('prev === snpSlug ? null : snpSlug');
  });

  it('updates the nested hash with replaceState and never pushState', () => {
    expect(source).toContain('`#${activeSlug}/${next}`');
    expect(source).toContain('`#${activeSlug}`');
    expect(source).not.toContain('pushState');
  });

  it('clears the open SNP when a pill is selected', () => {
    // onSelect sets the panel, clears the SNP, and writes the bare panel hash.
    expect(source).toContain('setOpenSnp(null)');
    expect(source).toContain("window.history.replaceState(null, '', `#${slug}`)");
  });

  it('scrolls the snp- row into view, honoring reduced motion', () => {
    expect(source).toContain('function scrollToSnp');
    expect(source).toContain('getElementById(`snp-${snpSlug}`)');
    expect(source).toContain("behavior: prefersReducedMotion() ? 'auto' : 'smooth'");
  });

  it('scrolls the SNP row on the next frame after a deep link sync', () => {
    expect(source).toContain('requestAnimationFrame(() => scrollToSnp(snp))');
  });

  it('threads the open slug and toggle to the card', () => {
    expect(source).toContain('openSnpSlug={openSnp}');
    expect(source).toContain('onToggleSnp={onToggleSnp}');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
