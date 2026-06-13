// Prompt 193f (2026-06-13): contract tests for the Your Genetic Blueprint bento
// mobile compaction. Source as text assertions per the repo convention (no DOM
// needed). These lock the two invariants of 193f: (1) below md the six panel cards
// sit in a compact TWO column grid with the hero full width above them, and (2) md
// and up is UNCHANGED from Prompt 193d (the four column asymmetric layout). They
// also lock the per card responsive treatment: the icon shows only below md, the
// descriptor and the background media show only at md and up, and the no dash rule.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const BENTO = path.resolve(__dirname, '..', 'GeneticBlueprintBento.tsx');
const CARD = path.resolve(__dirname, '..', 'BlueprintPanelCard.tsx');

describe('GeneticBlueprintBento grid (Prompt 193f)', () => {
  const source = readFileSync(BENTO, 'utf-8');

  it('uses a two column grid below md that becomes four columns at md', () => {
    expect(source).toContain('grid grid-cols-2 gap-2.5 md:grid-cols-4');
  });

  it('keeps the hero full width below md and a 2 by 2 anchor at md', () => {
    expect(source).toContain('<BlueprintHeroCard className="col-span-2 md:row-span-2" />');
  });

  it('widens the two bottom panel cards only at md (2 across below md)', () => {
    expect(source).toContain('meta={PANEL_BENTO_META[4]} className="md:col-span-2"');
    expect(source).toContain('meta={PANEL_BENTO_META[5]} className="md:col-span-2"');
  });

  it('leaves the four cluster cards (0 to 3) on pure grid auto placement, no span', () => {
    expect(source).toContain('<BlueprintPanelCard meta={PANEL_BENTO_META[0]} />');
    expect(source).toContain('<BlueprintPanelCard meta={PANEL_BENTO_META[1]} />');
    expect(source).toContain('<BlueprintPanelCard meta={PANEL_BENTO_META[2]} />');
    expect(source).toContain('<BlueprintPanelCard meta={PANEL_BENTO_META[3]} />');
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});

describe('BlueprintPanelCard compact mobile treatment (Prompt 193f)', () => {
  const source = readFileSync(CARD, 'utf-8');

  it('frosts the card surface below md and goes transparent at md', () => {
    expect(source).toContain('bg-[#1E3054]/80');
    expect(source).toContain('md:bg-transparent');
  });

  it('gates the per card media to md and up inside an absolute wrapper', () => {
    expect(source).toContain('absolute inset-0 z-0 hidden md:block');
  });

  it('shows the leading Lucide icon only on the compact mobile card', () => {
    expect(source).toContain('const Icon = meta.icon');
    expect(source).toContain('md:hidden');
    expect(source).toContain('strokeWidth={1.5}');
  });

  it('drops the descriptor below md and restores it at md', () => {
    expect(source).toContain('hidden text-[11px] leading-snug text-white/85');
    expect(source).toContain('md:block');
  });

  it('tints the icon by accent (teal assessment, orange educational)', () => {
    expect(source).toContain("meta.accent === 'orange' ? 'text-[#B75E18]' : 'text-[#2DA5A0]'");
  });

  it('contains no em or en dashes', () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
