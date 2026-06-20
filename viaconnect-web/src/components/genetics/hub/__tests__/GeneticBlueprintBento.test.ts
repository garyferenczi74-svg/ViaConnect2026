// Prompt 193d (2026-06-12): source-string contract tests for the Your Genetic
// Blueprint card (vitest node env, no jsdom). These lock the ONE large card that
// contains everything (the reused GeneticsHubTile chrome), the section header, the
// composition of the hero plus six inner panel cards nested inside it, the spec's
// asymmetric spans (hero 2 by 2, two wide cards), the responsive grid, and the no
// dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'GeneticBlueprintBento.tsx');

describe('GeneticBlueprintBento source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('is a client component', () => {
    expect(source).toContain("'use client'");
  });

  it('is ONE large card: the seven cards are nested inside a shared GeneticsHubTile', () => {
    expect(source).toContain("import { GeneticsHubTile } from './GeneticsHubTile'");
    expect(source).toContain('<GeneticsHubTile');
    // The large card carries the most prominent hero media of the set.
    expect(source).toContain('media={GENETICS_CARD_MEDIA.hero}');
  });

  it('keeps the eyebrow, title, and subtitle above the bento, inside the card', () => {
    expect(source).toContain('Your DNA, decoded');
    expect(source).toContain('Your Genetic Blueprint');
    // Prompt 204 follow-up (Gary 2026-06-20): the main subheading no longer
    // duplicates the GeneX360 card line; it reads the precision-health wording.
    expect(source).toContain('Precision health insights from your DNA');
    expect(source).not.toContain('The full suite of 6 genetic panels in one comprehensive test');
  });

  it('labels the section by its heading for assistive tech', () => {
    expect(source).toContain('aria-labelledby="genetic-blueprint-heading"');
    expect(source).toContain('id="genetic-blueprint-heading"');
  });

  it('pins a Shop GeneX360 CTA to the top right of the header (Gary 2026-06-20)', () => {
    expect(source).toContain("import { GENEX360_SHOP_HREF } from './geneticsHubLinks'");
    expect(source).toContain('href={GENEX360_SHOP_HREF}');
    expect(source).toContain('Shop GeneX360');
    // The header row aligns top and pushes the button to the corner.
    expect(source).toContain('flex items-start justify-between');
    // Lucide ShoppingBag icon at strokeWidth 1.5, 44px tap target.
    expect(source).toContain('ShoppingBag');
    expect(source).toContain('strokeWidth={1.5}');
    expect(source).toContain('min-h-[44px]');
  });

  it('composes the hero card plus the six inner panel cards', () => {
    expect(source).toContain('<BlueprintHeroCard');
    expect(source).toContain('<BlueprintPanelCard meta={PANEL_BENTO_META[0]}');
    expect(source).toContain('<BlueprintPanelCard meta={PANEL_BENTO_META[1]}');
    expect(source).toContain('<BlueprintPanelCard meta={PANEL_BENTO_META[2]}');
    expect(source).toContain('<BlueprintPanelCard meta={PANEL_BENTO_META[3]}');
    expect(source).toContain('<BlueprintPanelCard meta={PANEL_BENTO_META[4]}');
    expect(source).toContain('<BlueprintPanelCard meta={PANEL_BENTO_META[5]}');
  });

  it('makes the hero a full height left anchor on the desktop bento', () => {
    expect(source).toContain('col-span-2 md:row-span-2 md:order-1');
  });

  it('reorders the six panels for desktop only via md:order, no md:col-span', () => {
    expect(source).toContain('meta={PANEL_BENTO_META[4]} className="md:order-2"');
    expect(source).toContain('meta={PANEL_BENTO_META[5]} className="md:order-3"');
    expect(source).not.toContain('className="md:col-span-2"');
  });

  it('uses a two column grid below md that becomes five columns by two rows at md', () => {
    expect(source).toContain('grid grid-cols-2 gap-2.5 md:grid-cols-5 md:grid-rows-2');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
