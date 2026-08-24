// Prompt 193d (2026-06-12): source-string contract tests for the Blueprint bento
// cards (vitest node env, no jsdom). These lock the whole card link, the reuse of
// the shared GeneticsHubTile, the panels.ts data source, the single href resolver,
// the trademark mark, the Lucide icon at strokeWidth 1.5, the accessible name, the
// hero variant, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const COMPONENT = path.resolve(__dirname, '..', 'BlueprintPanelCard.tsx');

describe('BlueprintPanelCard source', () => {
  const source = readFileSync(COMPONENT, 'utf-8');

  it('is a client component', () => {
    expect(source).toContain("'use client'");
  });

  it('renders each card as a real next/link Link (shareable, right clickable)', () => {
    expect(source).toContain("import Link from 'next/link'");
    expect(source).toContain('<Link');
  });

  it('renders a light inner card surface inside the large card (not a nested hub tile)', () => {
    // The large card (GeneticBlueprintBento) owns the GeneticsHubTile chrome; the
    // inner cards are light bordered surfaces, never a second nested tile. We check
    // it neither imports nor renders the tile (a comment may still name it).
    expect(source).not.toContain("from './GeneticsHubTile'");
    expect(source).not.toContain('<GeneticsHubTile');
    expect(source).toContain('rounded-xl border border-white/[0.12]');
  });

  it('backs the media cards with a light navy tint and NO blur on the video so it stays watchable', () => {
    expect(source).toContain('const media = meta.media');
    expect(source).toContain('<CardMedia media={media}');
    // The media scrim is a light tint with NO backdrop blur (the blur smeared the
    // videos). Asserting the exact scrim className proves no blur on the video
    // layer; the Most Popular badge below legitimately uses backdrop-blur.
    expect(source).toContain(
      'pointer-events-none absolute inset-0 z-[1] rounded-[inherit] bg-[#1A2744]/35',
    );
  });

  it('brightens the panel sub heading and gives the white type a strong shadow for readability', () => {
    expect(source).toContain('text-white/85');
    expect(source).toContain('text-shadow:0_1px_3px_rgba(0,0,0,0.9)');
  });

  it('pulls display name, descriptor, and count from panels.ts (not duplicated copy)', () => {
    expect(source).toContain("import { PANEL_BY_SLUG } from '@/data/genex360/panels'");
    expect(source).toContain('panel.displayName');
    expect(source).toContain('panel.subtitle');
    expect(source).toContain('panel.markerCount');
  });

  it('routes the panel card link through the single resolver', () => {
    expect(source).toContain('blueprintPanelHref(meta.slug)');
  });

  it('shows the trademark mark on first mention', () => {
    expect(source).toContain('&trade;');
  });

  it('renders no leading panel icon (Gary 2026-06-12); only the arrow affordances remain', () => {
    expect(source).not.toContain('const Icon = meta.icon');
    expect(source).not.toContain('<Icon');
    // The panel card arrow (and the hero CTA arrow) stay Lucide at strokeWidth 1.5.
    expect(source).toContain('ArrowUpRight');
    expect(source).toContain('strokeWidth={1.5}');
  });

  it('gives the panel card link a discernible accessible name ending in view panel', () => {
    expect(source).toContain('aria-label={accessibleName}');
    expect(source).toContain('view panel');
  });

  it('keeps a focus-visible ring on the Card surface', () => {
    expect(source).toContain('focus-visible:ring-2');
    expect(source).toContain('focus-visible:ring-[#2DA5A0]/70');
    expect(source).toContain('focus-visible:ring-offset-[#1A2744]');
  });

  it('renders the hero variant with the Most Popular badge, the suite stat, and the primary CTA', () => {
    expect(source).toContain('export function BlueprintHeroCard');
    expect(source).toContain('{meta.badge}');
    expect(source).toContain('{meta.primaryStat}');
    expect(source).toContain('{meta.tagline}');
    expect(source).toContain('Explore GeneX360');
    expect(source).not.toContain('500+ variants');
  });

  it('plays the GeneX360 Complete background media behind the hero card, over a scrim', () => {
    // The hero card (the bento background hero) carries the moving media via the
    // shared CardMedia layer, with a navy scrim so the text stays legible.
    expect(source).toContain('<CardMedia media={GENETICS_CARD_MEDIA.genex360Complete}');
    expect(source).toContain('pointer-events-none absolute inset-0 z-[1]');
    expect(source).toContain('relative z-[2]');
  });

  it('uses only design token hexes (Teal / Orange / Navy), no alarm color', () => {
    expect(source).toContain('#2DA5A0');
    expect(source).not.toContain('#EF4444');
    expect(source).not.toContain('#F87171');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
