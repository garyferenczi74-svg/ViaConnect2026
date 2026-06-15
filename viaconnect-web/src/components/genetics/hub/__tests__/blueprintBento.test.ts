// Prompt 193f (2026-06-13): contract tests for the Your Genetic Blueprint bento
// mobile compaction. Source as text assertions per the repo convention (no DOM
// needed). These lock the two invariants of 193f: (1) below md the six panel cards
// sit in a compact TWO column grid with the hero full width above them, and (2) md
// and up is UNCHANGED from Prompt 193d (the four column asymmetric layout).
//
// Mobile media restore (2026-06-14, Gary): the panel card per card treatment was
// changed so the background media renders at EVERY width and the leading icon is
// gone, on a transparent surface. The panel card assertions below now lock that
// behavior; only the descriptor stays md and up. The grid invariants and the no
// dash rule are unchanged.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const BENTO = path.resolve(__dirname, '..', 'GeneticBlueprintBento.tsx');
const CARD = path.resolve(__dirname, '..', 'BlueprintPanelCard.tsx');

describe('GeneticBlueprintBento grid (Prompt 193f)', () => {
  const source = readFileSync(BENTO, 'utf-8');

  it('uses a two column grid below md that becomes five columns by two rows at md', () => {
    expect(source).toContain('grid grid-cols-2 gap-2.5 md:grid-cols-5 md:grid-rows-2');
  });

  it('keeps the hero full width below md and a full height left anchor at md', () => {
    expect(source).toContain('<BlueprintHeroCard className="col-span-2 md:row-span-2 md:order-1" />');
  });

  it('reorders the six panels for desktop only via md:order, no md:col-span', () => {
    expect(source).toContain('meta={PANEL_BENTO_META[0]} className="md:order-4"');
    expect(source).toContain('meta={PANEL_BENTO_META[1]} className="md:order-5"');
    expect(source).toContain('meta={PANEL_BENTO_META[2]} className="md:order-6"');
    expect(source).toContain('meta={PANEL_BENTO_META[3]} className="md:order-7"');
    expect(source).toContain('meta={PANEL_BENTO_META[4]} className="md:order-2"');
    expect(source).toContain('meta={PANEL_BENTO_META[5]} className="md:order-3"');
    expect(source).not.toContain('className="md:col-span-2"');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('BlueprintPanelCard compact mobile treatment (Prompt 193f)', () => {
  const source = readFileSync(CARD, 'utf-8');

  it('keeps the card surface transparent at every width so the media shows through (2026-06-14 mobile media restore)', () => {
    expect(source).toContain('rounded-xl border border-white/[0.12] bg-transparent');
    // The frosted mobile fill and its md override are both gone.
    expect(source).not.toContain('bg-[#1E3054]/80');
    expect(source).not.toContain('md:bg-transparent');
  });

  it('renders the per card media at every width inside an absolute wrapper (2026-06-14 mobile media restore)', () => {
    expect(source).toContain('<div className="absolute inset-0 z-0">');
    // The media is no longer gated off mobile.
    expect(source).not.toContain('absolute inset-0 z-0 hidden md:block');
    expect(source).toContain('<CardMedia media={media}');
  });

  it('renders no leading panel icon at any width (2026-06-14 mobile media restore); only the arrow affordance remains', () => {
    expect(source).not.toContain('const Icon = meta.icon');
    expect(source).not.toContain('<Icon');
    // The icon was the only md:hidden element, so it is gone too.
    expect(source).not.toContain('md:hidden');
    // The panel card arrow stays Lucide at strokeWidth 1.5.
    expect(source).toContain('ArrowUpRight');
    expect(source).toContain('strokeWidth={1.5}');
  });

  it('drops the descriptor below md and restores it at md', () => {
    expect(source).toContain('hidden text-[11px] leading-snug text-white/85');
    expect(source).toContain('md:block');
  });

  it('no longer derives a per icon accent tint (2026-06-14 mobile media restore removed the icon)', () => {
    expect(source).not.toContain("meta.accent === 'orange' ? 'text-[#B75E18]' : 'text-[#2DA5A0]'");
    expect(source).not.toContain('const accentText');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
