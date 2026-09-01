import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  WearableBrandMark,
  WEARABLE_MARK_ASSETS,
} from '@/components/body-tracker/connections/WearableBrandMark';
import { FIRST_CLASS_TILE_IDS } from '@/lib/body-tracker/wearable-tiles';

const root = process.cwd();
function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('WearableBrandMark', () => {
  it('ships every vendor entry lexCleared: false (or omitted) -- Lex has not signed off on any mark yet', () => {
    for (const id of FIRST_CLASS_TILE_IDS) {
      const asset = WEARABLE_MARK_ASSETS[id];
      expect(asset === undefined || asset.lexCleared === false).toBe(true);
    }
  });

  it.each(FIRST_CLASS_TILE_IDS)(
    'renders the Lucide fallback for %s while its mark is not Lex-cleared',
    (id) => {
      const markup = renderToStaticMarkup(createElement(WearableBrandMark, { id }));
      expect(markup).toContain('data-vendor-mark="fallback"');
      expect(markup).not.toContain(`data-vendor-mark="${id}"`);
      expect(markup).toContain('<svg');
      expect(markup).not.toContain('<img');
    },
  );

  it('falls back for an unknown id (never throws, never renders a blank tile)', () => {
    const markup = renderToStaticMarkup(createElement(WearableBrandMark, { id: 'unknown_vendor' }));
    expect(markup).toContain('data-vendor-mark="fallback"');
    expect(markup).toContain('<svg');
  });

  it('forwards className to the fallback icon for sizing', () => {
    const markup = renderToStaticMarkup(createElement(WearableBrandMark, { id: 'whoop', className: 'h-5 w-5' }));
    expect(markup).toMatch(/class="[^"]*\bh-5\b[^"]*\bw-5\b[^"]*"/);
  });

  it('uses distinct Lucide fallbacks per known vendor id where the brief specifies distinct icons', () => {
    const svgFor = (id: string) => {
      const markup = renderToStaticMarkup(createElement(WearableBrandMark, { id }));
      const match = markup.match(/<svg[^>]*>[\s\S]*?<\/svg>/);
      return match ? match[0] : '';
    };
    const whoop = svgFor('whoop');
    const oura = svgFor('oura');
    const appleHealth = svgFor('apple_health');
    const hume = svgFor('hume');
    const googleHealth = svgFor('google_health');
    const garmin = svgFor('garmin');
    const clair = svgFor('clair');
    // Different vendors render visually distinct markup (different Lucide
    // icon paths), never one generic icon standing in for every tile.
    expect(whoop).not.toBe(oura);
    expect(whoop).not.toBe(appleHealth);
    expect(whoop).not.toBe(hume);
    expect(oura).not.toBe(appleHealth);
    expect(oura).not.toBe(googleHealth);
    expect(appleHealth).not.toBe(hume);
    expect(clair).not.toBe(whoop);
    expect(clair).not.toBe(oura);
    expect(clair).not.toBe(appleHealth);
    expect(clair).not.toBe(hume);
    expect(clair).not.toBe(googleHealth);
    // Whoop and garmin are the one deliberate exception: task-11-brief.md
    // pins BOTH to Watch (matching WEARABLE_TILE_SPECS.icon in
    // wearable-tiles.ts, which also lists 'Watch' for both). This is an
    // honest, intentional shared fallback, not a bug -- Lucide fallbacks
    // need not be unique per vendor; the real per-vendor logos will differ
    // once Lex clears each one. Do not assert whoop !== garmin here.
    expect(garmin).toBe(whoop);
  });

  it('renders the real local asset once an entry is Lex-cleared', () => {
    // WEARABLE_MARK_ASSETS is a plain mutable Record (not frozen or `as
    // const`), so this flips one vendor's clearance to exercise the img
    // branch without weakening the shipped default (every entry above
    // still asserts lexCleared: false). Restored so later test files in
    // the same run see the shipped Lex-gated default.
    const original = WEARABLE_MARK_ASSETS.whoop;
    WEARABLE_MARK_ASSETS.whoop = { src: '/logos/wearables/whoop.svg', lexCleared: true };
    try {
      const markup = renderToStaticMarkup(createElement(WearableBrandMark, { id: 'whoop' }));
      expect(markup).toContain('<img');
      expect(markup).toContain('data-vendor-mark="whoop"');
      expect(markup).toContain('src="/logos/wearables/whoop.svg"');
      expect(markup).not.toContain('data-vendor-mark="fallback"');
    } finally {
      WEARABLE_MARK_ASSETS.whoop = original;
    }
  });

  it('never hotlinks a mark asset -- every configured src is a local /logos path', () => {
    for (const asset of Object.values(WEARABLE_MARK_ASSETS)) {
      if (!asset) continue;
      expect(asset.src.startsWith('/logos/wearables/')).toBe(true);
      expect(asset.src).not.toMatch(/^https?:\/\//);
    }
  });

  // CONTROLLER ADDENDUM #1: the icon swap folded in the 44px touch-target
  // fix for WearableTileCard.tsx (outlineBtn was min-h-[36px]; the chevron
  // and inline "Upload XML" buttons had no minimum at all). Source guard:
  // no min-h-[36px] survives on any interactive control in that file, and
  // every button carries a min-h-[44px] touch target.
  it('WearableTileCard has no min-h-[36px] left on an interactive control; every button is min-h-[44px]', () => {
    const tile = src('src/components/body-tracker/connections/WearableTileCard.tsx');
    expect(tile).not.toContain('min-h-[36px]');
    // Five distinct <button> elements in this file: the chevron
    // ("... details" aria-label), three outlineBtn-styled actions
    // (Upload XML / Connect / Reconnect, sharing the outlineBtn constant),
    // and the inline text "Upload XML" button. Sanity: still five buttons.
    const buttonCount = tile.split('<button').length - 1;
    expect(buttonCount).toBe(5);
    // outlineBtn itself (backing three of the five buttons) must be
    // min-h-[44px], not min-h-[36px].
    const outlineBtnDecl = tile.match(/const outlineBtn =\s*\n?\s*'([^']*)'/);
    expect(outlineBtnDecl).not.toBeNull();
    expect(outlineBtnDecl?.[1]).toContain('min-h-[44px]');
    // The chevron ("... details") button and the inline "Upload XML" text
    // button each declare their own literal min-h-[44px] touch target.
    expect(tile).toContain(
      'className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/5 hover:text-white"',
    );
    expect(tile).toContain(
      'className="mt-2 flex min-h-[44px] items-center text-xs font-medium text-teal hover:underline"',
    );
  });
});
