// Prompt 193d (2026-06-12): tests for the Blueprint bento presentation data. The
// data is pure (no DOM), so these import it directly and assert the resolved link
// targets, the six panel entries in spec order, the count units, and the hero.

import { describe, it, expect } from 'vitest';
import { PANEL_BENTO_META, HERO_BENTO_META, blueprintPanelHref } from '../blueprintBentoData';
import { PANEL_BY_SLUG } from '@/data/genex360/panels';

describe('blueprintBentoData', () => {
  it('resolves a panel card href to the Blueprint explorer with the panel tab hash', () => {
    expect(blueprintPanelHref('genex-m')).toBe('/genetics/blueprint#genex-m');
    expect(blueprintPanelHref('cannabis-iq')).toBe('/genetics/blueprint#cannabis-iq');
  });

  it('lists the six panels in Gary 2026-06-12 source / mobile order', () => {
    // HormoneIQ and EpigenHQ on top, PeptideIQ and CannabisIQ in the middle,
    // GeneXM and NutrigenDX as the two bottom wide cards.
    expect(PANEL_BENTO_META.map((m) => m.slug)).toEqual([
      'hormone-iq',
      'epigen-hq',
      'peptide-iq',
      'cannabis-iq',
      'genex-m',
      'nutrigen-dx',
    ]);
  });

  it('uses the panel marker scope unit nouns from the spec reference table', () => {
    const bySlug = Object.fromEntries(PANEL_BENTO_META.map((m) => [m.slug, m.unit]));
    expect(bySlug['genex-m']).toBe('SNPs');
    expect(bySlug['nutrigen-dx']).toBe('markers');
    expect(bySlug['hormone-iq']).toBe('markers');
    expect(bySlug['epigen-hq']).toBe('markers');
    expect(bySlug['peptide-iq']).toBe('genes');
    expect(bySlug['cannabis-iq']).toBe('genes');
  });

  it('pairs every panel meta with a real panel in panels.ts so the count is not duplicated', () => {
    for (const m of PANEL_BENTO_META) {
      expect(PANEL_BY_SLUG[m.slug]).toBeDefined();
      expect(typeof PANEL_BY_SLUG[m.slug].markerCount).toBe('number');
    }
  });

  it('reflects the Prompt 193d display rename through panels.ts (no dash on GeneXM)', () => {
    expect(PANEL_BY_SLUG['genex-m'].displayName).toBe('GeneXM');
    expect(PANEL_BY_SLUG['nutrigen-dx'].displayName).toBe('NutrigenDX');
    expect(PANEL_BY_SLUG['epigen-hq'].displayName).toBe('EpigenHQ');
  });

  it('points the hero at the Blueprint explorer root with the suite stats and tagline', () => {
    expect(HERO_BENTO_META.href).toBe('/genetics/blueprint');
    expect(HERO_BENTO_META.primaryStat).toBe('500+ variants');
    expect(HERO_BENTO_META.secondaryStat).toBe('6 panels');
    expect(HERO_BENTO_META.badge).toBe('Most Popular');
    expect(HERO_BENTO_META.tagline).toBe('Built For Your Biology');
  });

  it('gives every panel meta an icon and a teal or orange accent', () => {
    for (const m of PANEL_BENTO_META) {
      expect(m.icon).toBeTruthy();
      expect(['teal', 'orange']).toContain(m.accent);
    }
  });

  it('reads the two educational panels as orange and the assessment panels as teal', () => {
    const bySlug = Object.fromEntries(PANEL_BENTO_META.map((m) => [m.slug, m.accent]));
    expect(bySlug['genex-m']).toBe('teal');
    expect(bySlug['peptide-iq']).toBe('orange');
    expect(bySlug['cannabis-iq']).toBe('orange');
  });

  it('gives the HormoneIQ card its background hero video (Gary 2026-06-12)', () => {
    const hormone = PANEL_BENTO_META.find((m) => m.slug === 'hormone-iq');
    expect(hormone?.media?.kind).toBe('video');
    expect(hormone?.media?.src).toContain('HormoneIQ%20Video.mp4');
  });

  it('gives the EpigenHQ card its background hero video (Gary 2026-06-12)', () => {
    const epigen = PANEL_BENTO_META.find((m) => m.slug === 'epigen-hq');
    expect(epigen?.media?.kind).toBe('video');
    expect(epigen?.media?.src).toContain('an_attractive_older_fit_couple.mp4');
  });

  it('gives the NutrigenDX card a background hero image (Gary 2026-06-13)', () => {
    const nutrigen = PANEL_BENTO_META.find((m) => m.slug === 'nutrigen-dx');
    expect(nutrigen?.media?.kind).toBe('image');
    expect(nutrigen?.media?.src).toContain('Food%203.png');
  });

  it('gives the CannabisIQ card a background hero video (Gary 2026-06-13)', () => {
    const cannabis = PANEL_BENTO_META.find((m) => m.slug === 'cannabis-iq');
    expect(cannabis?.media?.kind).toBe('video');
    expect(cannabis?.media?.src).toContain('CannabisIQ.mp4');
  });

  it('gives the GeneXM card a background hero video (Gary 2026-06-13)', () => {
    const genexm = PANEL_BENTO_META.find((m) => m.slug === 'genex-m');
    expect(genexm?.media?.kind).toBe('video');
    expect(genexm?.media?.src).toContain('Methylation%20Testing.mp4');
  });

  it('gives the PeptideIQ card a background hero image (Gary 2026-06-13)', () => {
    const peptide = PANEL_BENTO_META.find((m) => m.slug === 'peptide-iq');
    expect(peptide?.media?.kind).toBe('image');
    expect(peptide?.media?.src).toContain('Doctor%201.png');
  });

  it('now carries background media on all six panel cards', () => {
    const withMedia = PANEL_BENTO_META.filter((m) => m.media).map((m) => m.slug);
    expect(withMedia).toEqual([
      'hormone-iq',
      'epigen-hq',
      'peptide-iq',
      'cannabis-iq',
      'genex-m',
      'nutrigen-dx',
    ]);
  });
});
