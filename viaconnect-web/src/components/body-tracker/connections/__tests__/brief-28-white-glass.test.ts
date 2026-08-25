import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import {
  WearableTileCard,
  WEARABLE_TILE_ACTIVATED_CHROME,
  WEARABLE_TILE_ACTIVATED_RAIL,
  WEARABLE_TILE_RESTING_CHROME,
  wearableTileCardChrome,
  wearableTileTitleClassName,
} from '@/components/body-tracker/connections/WearableTileCard';
import {
  BOS_UNKNOWN_NEVER_ZERO_COPY,
  FIRST_CLASS_TILE_IDS,
  buildWearableTiles,
  type WearableTileInput,
  type WearableTileView,
} from '@/lib/body-tracker/wearable-tiles';

vi.mock('react-hot-toast', () => ({ default: { success: () => undefined, error: () => undefined } }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));

const root = process.cwd();
const src = (rel: string) => readFileSync(join(root, rel), 'utf8');

function baseInput(over: Partial<WearableTileInput> = {}): WearableTileInput {
  return {
    oauth: [],
    humeIngestCount: 0,
    humeLastPersistAt: null,
    appleXmlIngested: 0,
    appleXmlLastPersistAt: null,
    healthKitPersisted: false,
    healthKitLastPersistAt: null,
    dimensionsFed: {},
    whoopConfigured: false,
    ouraConfigured: false,
    googleHealthConfigured: false,
    garminConfigured: false,
    platform: 'web',
    now: Date.parse('2026-08-24T10:00:00.000Z'),
    ...over,
  };
}

function tileById(id: WearableTileView['id']): WearableTileView {
  const found = buildWearableTiles(baseInput()).find((t) => t.id === id);
  if (!found) throw new Error(`missing tile ${id}`);
  return found;
}

const TEAL_FILL_TOKENS = ['bg-teal', 'border-teal', 'ring-teal', 'text-teal'] as const;

describe('Brief 28 white glass on activated wearable cards', () => {
  it('resting chrome is Apple dark glass for every first-class tile id', () => {
    expect(FIRST_CLASS_TILE_IDS).toEqual([
      'whoop',
      'hume',
      'apple_health',
      'oura',
      'google_health',
      'garmin',
    ]);
    const resting = wearableTileCardChrome(false);
    expect(resting).toBe(WEARABLE_TILE_RESTING_CHROME);
    expect(resting).toContain('rounded-[24px]');
    expect(resting).toContain('border-white/[0.08]');
    expect(resting).toContain('bg-card');
    expect(resting).toContain('backdrop-blur-md');
    expect(resting).not.toContain('bg-white/');

    for (const id of FIRST_CLASS_TILE_IDS) {
      const markup = renderToStaticMarkup(
        createElement(WearableTileCard, {
          tile: tileById(id),
          onPrimary: () => undefined,
          selected: false,
        }),
      );
      expect(markup).toContain('rounded-[24px]');
      expect(markup).toContain('border-white/[0.08]');
      expect(markup).toContain('bg-card');
      expect(markup).toContain('backdrop-blur-md');
      expect(markup).not.toContain('border-[rgba(255,255,255,0.45)]');
      expect(markup).not.toContain('bg-[rgba(255,255,255,0.20)]');
      expect(markup).not.toContain('bg-white/[0.08]');
    }
  });

  it('activated chrome is real white body glass (16px blur, 0.16-0.28 fill, 0.45 stroke)', () => {
    const activated = wearableTileCardChrome(true);
    expect(activated).toBe(WEARABLE_TILE_ACTIVATED_CHROME);
    expect(activated).toContain('rounded-[24px]');
    expect(activated).toMatch(/backdrop-blur-\[16px\]|blur\(16px\)/);
    expect(activated).toContain('bg-[rgba(255,255,255,0.20)]');
    expect(activated).toContain('border-[rgba(255,255,255,0.45)]');

    const bgAlpha = Number(activated.match(/bg-\[rgba\(255,\s*255,\s*255,\s*(0\.\d+)\)\]/)?.[1]);
    expect(bgAlpha).toBeGreaterThanOrEqual(0.16);
    expect(bgAlpha).toBeLessThanOrEqual(0.28);
    expect(activated).toMatch(/border-\[rgba\(255,\s*255,\s*255,\s*0\.45\)\]/);

    // Body must not be a white stroke on an opaque navy plate.
    expect(activated).not.toContain('overflow-hidden');
    expect(activated).not.toContain('bg-white/[0.08]');
    expect(activated).not.toContain('bg-card');
    expect(activated).not.toContain('bg-navy');
    expect(activated).not.toContain('bg-teal');
    for (const token of TEAL_FILL_TOKENS) {
      expect(activated).not.toContain(token);
    }
    expect(activated).not.toMatch(/\bteal\b/);

    const title = wearableTileTitleClassName(true);
    expect(title).toContain('text-white');
    expect(title).toContain('font-bold');
    expect(title).not.toContain('text-teal');

    expect(WEARABLE_TILE_ACTIVATED_RAIL).toContain('bg-white/60');
    expect(WEARABLE_TILE_ACTIVATED_RAIL).not.toContain('bg-teal');
  });

  it('Whoop and Oura use the same card class function as Apple', () => {
    const whoop = tileById('whoop');
    const oura = tileById('oura');
    const apple = tileById('apple_health');
    expect(whoop.id).toBe('whoop');
    expect(oura.id).toBe('oura');
    expect(apple.id).toBe('apple_health');
    expect(wearableTileCardChrome(false)).toBe(wearableTileCardChrome(false));
    expect(wearableTileCardChrome(true)).toBe(wearableTileCardChrome(true));

    for (const selected of [false, true]) {
      const classes = [whoop, oura, apple].map((tile) => {
        const html = renderToStaticMarkup(
          createElement(WearableTileCard, {
            tile,
            onPrimary: () => undefined,
            selected,
          }),
        );
        const match = html.match(/class="([^"]*rounded-\[24px\][^"]*)"/);
        expect(match?.[1]).toContain(wearableTileCardChrome(selected));
        return match?.[1];
      });
      expect(classes[0]).toBe(classes[1]);
      expect(classes[1]).toBe(classes[2]);
    }
  });

  it('Coming soon tiles still have no Connect; Hume and Apple still expose Upload XML', () => {
    for (const id of ['whoop', 'oura', 'google_health', 'garmin'] as const) {
      const markup = renderToStaticMarkup(
        createElement(WearableTileCard, {
          tile: tileById(id),
          onPrimary: () => undefined,
          selected: true,
        }),
      );
      expect(markup).toContain('Coming soon');
      expect(markup).not.toContain('Connect');
      expect(markup).not.toContain('Upload XML');
    }

    const hume = renderToStaticMarkup(
      createElement(WearableTileCard, {
        tile: tileById('hume'),
        onPrimary: () => undefined,
        selected: true,
      }),
    );
    const apple = renderToStaticMarkup(
      createElement(WearableTileCard, {
        tile: tileById('apple_health'),
        onPrimary: () => undefined,
        onDropXml: () => undefined,
        selected: true,
      }),
    );
    expect(hume).toContain('Upload XML');
    expect(hume).not.toContain('data-apple-dropzone');
    expect(apple).toContain('Upload XML');
    expect(apple).toContain('data-apple-dropzone');
    expect(apple).toContain('Upload Apple Health XML');
  });

  it('UNKNOWN never 0 string is still present and a11y selection signals stay', () => {
    expect(BOS_UNKNOWN_NEVER_ZERO_COPY).toBe('Missing stays UNKNOWN, never 0.');
    const tiles = src('src/lib/body-tracker/wearable-tiles.ts');
    const tile = src('src/components/body-tracker/connections/WearableTileCard.tsx');
    expect(tiles).toContain('Missing stays UNKNOWN, never 0.');
    expect(tile).toContain('role="option"');
    expect(tile).toContain('tabIndex={selected ? 0 : -1}');
    expect(tile).toContain("aria-selected={selected ? 'true' : undefined}");
    expect(tile).toContain("if (e.target !== e.currentTarget) return;");
    expect(tile).not.toContain('bg-teal/5');
    expect(tile).not.toContain('border-teal bg-teal/5');
    expect(tile).not.toContain('ring-1 ring-teal');
    expect(tile).not.toContain('text-teal whitespace-normal');
    expect(tile).not.toContain('rounded-full bg-teal');
  });
});
