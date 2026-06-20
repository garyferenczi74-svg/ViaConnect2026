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

  it('adopts the hash on mount WITHOUT scrolling, and scrolls only on a hashchange', () => {
    // Prevents a page load or dev HMR reload from auto scrolling to a leftover
    // hash target. Mount passes false; the hashchange handler passes true.
    expect(source).toContain('adoptHash(false)');
    expect(source).toContain('adoptHash(true)');
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

  it('imports the GeneXM SNP slugs and validates the hash second part against them', () => {
    expect(source).toContain("import { GENEX_M_SNP_SLUGS } from '@/data/genex360/genex-m-deep'");
    expect(source).toContain('GENEX_M_SNP_SLUG_SET');
    expect(source).toContain('.has(snpPart)');
  });

  it('parses the nested hash by splitting on a slash', () => {
    // Prompt 193c (config-driven): a single split of the raw fragment on "/"
    // yields panel, snp, and the optional variant rsid.
    expect(source).toContain("raw.split('/')");
    expect(source).toContain('panelPart');
    expect(source).toContain('snpPart');
  });

  it('validates the panel slug with an own-property safe Set, never the in operator', () => {
    // Guards a prototype pollution style crash: a crafted hash like #toString or
    // #constructor must not resolve to an inherited PANEL_BY_SLUG key.
    expect(source).toContain('PANEL_SLUG_SET.has(panelPart)');
    expect(source).not.toContain('panelPart in PANEL_BY_SLUG');
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

describe('GeneX360PanelSection variant deep link + highlight (193c)', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('parses three nested segments (panel, gene, variant rsid) by a single slash split', () => {
    // Config-driven Scheme A: the rsID is the third hash segment
    // (#genex-m/mthfr/rs1801133), so one split on "/" yields all three. A bare
    // panel or gene hash parses cleanly with variantPart undefined.
    expect(source).toContain("raw.split('/')");
    expect(source).toContain('panelPart');
    expect(source).toContain('snpPart');
    expect(source).toContain('variantPart');
  });

  it('honors the third segment as the variant rsid only under a valid gene', () => {
    expect(source).toContain('const variantRsid = snp && variantPart ? variantPart : null');
    expect(source).toContain('variantRsid');
  });

  it('owns a highlightRsid state', () => {
    expect(source).toContain('const [highlightRsid, setHighlightRsid] = useState<string | null>(null)');
  });

  it('records the variant rsid as the highlight when adopting the hash', () => {
    expect(source).toContain('setHighlightRsid(variantRsid)');
  });

  it('gates mount scrolling on variantRsid in addition to scrollOnAdopt', () => {
    // The bare panel / gene hash on mount still must NOT scroll (the 491cb489
    // no-auto-scroll-on-load fix). A variant deep link is the only new mount
    // scroll case, so the early return is skipped only when a variant is present.
    expect(source).toContain('if (!scrollOnAdopt && !variantRsid) return;');
  });

  it('scrolls to the variant sub block once the gene accordion has settled (204i)', () => {
    expect(source).toContain('function scrollToVariant');
    expect(source).toContain('getElementById(`variant-${rsid}`)');
    // Prompt 204i: the variant deep link waits for the accordion expand to settle
    // (position holds steady for a frame) before scrolling, so it lands ON the SNP
    // rather than its collapsed position.
    expect(source).toContain('function scrollToVariantWhenSettled');
    expect(source).toContain('scrollToVariantWhenSettled(variantRsid)');
    expect(source).toContain('if (top === lastTop)');
  });

  it('clears the highlight when a pill is selected or a SNP is toggled', () => {
    // Both navigations clear the highlight (the user is no longer landing from a
    // deep link). setHighlightRsid(null) appears in onSelect and onToggleSnp.
    expect(source).toContain('setHighlightRsid(null)');
  });

  it('passes highlightRsid down to the description card', () => {
    expect(source).toContain('highlightRsid={highlightRsid}');
  });

  it('still uses replaceState only and never pushState', () => {
    expect(source).toContain('history.replaceState');
    expect(source).not.toContain('pushState');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
