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

describe('Brief 28 grey rest + portal blue body glass', () => {
  it('resting chrome is Apple grey glass for every first-class tile id', () => {
    expect(FIRST_CLASS_TILE_IDS).toEqual([
      'whoop',
      'hume',
      'apple_health',
      'oura',
      'google_health',
      'garmin',
      'clair',
    ]);
    const resting = wearableTileCardChrome(false);
    expect(resting).toBe(WEARABLE_TILE_RESTING_CHROME);
    expect(resting).toBe(
      'relative rounded-[24px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.07)] p-4 backdrop-blur-md',
    );
    expect(resting).toContain('rounded-[24px]');
    expect(resting).toContain('rgba(255,255,255,0.07)');
    expect(resting).toContain('rgba(255,255,255,0.14)');
    expect(resting).toContain('bg-[rgba(255,255,255,0.07)]');
    expect(resting).toContain('backdrop-blur-md');
    expect(WEARABLE_TILE_RESTING_CHROME).not.toContain('bg-card');
    expect(WEARABLE_TILE_RESTING_CHROME).not.toContain('overflow-hidden');
    expect(WEARABLE_TILE_RESTING_CHROME).not.toContain('#1E3054');
    expect(WEARABLE_TILE_RESTING_CHROME).not.toContain('bg-navy');
    expect(WEARABLE_TILE_RESTING_CHROME).not.toContain('bg-teal/20');
    expect(resting).not.toContain('bg-card');
    expect(resting).not.toContain('bg-teal');
    expect(resting).not.toContain('border-teal');
    expect(resting).not.toContain('bg-[rgba(255,255,255,0.14)]');
    expect(resting).not.toContain('border-[rgba(255,255,255,0.28)]');

    for (const id of FIRST_CLASS_TILE_IDS) {
      const markup = renderToStaticMarkup(
        createElement(WearableTileCard, {
          tile: tileById(id),
          onPrimary: () => undefined,
          selected: false,
        }),
      );
      expect(markup).toContain('rounded-[24px]');
      expect(markup).toContain('bg-[rgba(255,255,255,0.07)]');
      expect(markup).toContain('border-[rgba(255,255,255,0.14)]');
      expect(markup).toContain('backdrop-blur-md');
      expect(markup).not.toContain('border-[rgba(255,255,255,0.45)]');
      expect(markup).not.toContain('bg-[rgba(255,255,255,0.20)]');
      expect(markup).not.toContain('bg-[rgba(255,255,255,0.14)]');
      expect(markup).not.toContain('border-[rgba(255,255,255,0.28)]');
      expect(markup).not.toContain('bg-white/[0.08]');
      expect(markup).not.toContain('bg-teal/20');
      expect(markup).not.toContain('backdrop-blur-[16px]');
    }
  });

  it('activated chrome is portal blue body glass (#4A90D9), not teal-on-navy', () => {
    const activated = wearableTileCardChrome(true);
    expect(activated).toBe(WEARABLE_TILE_ACTIVATED_CHROME);
    expect(activated).toBe(
      'relative rounded-[24px] border border-[rgba(74,144,217,0.25)] bg-[rgba(74,144,217,0.10)] p-4 pl-6 backdrop-blur-[16px]',
    );
    expect(activated).toContain('rounded-[24px]');
    expect(activated).toContain('rgba(74,144,217,0.10)');
    expect(activated).toContain('rgba(74,144,217,0.25)');
    expect(activated).toContain('backdrop-blur-[16px]');
    expect(activated).not.toContain('bg-[rgba(74,144,217,0.20)]');
    expect(activated).not.toContain('border-[rgba(74,144,217,0.50)]');

    // Body must be portal blue glass, not teal fill/stroke or an opaque navy plate.
    // Assert overflow-hidden / bg-card on the chrome constants, not the file
    // source (the component comment mentions overflow-hidden).
    expect(WEARABLE_TILE_ACTIVATED_CHROME).not.toContain('overflow-hidden');
    expect(WEARABLE_TILE_ACTIVATED_CHROME).not.toContain('bg-card');
    expect(WEARABLE_TILE_ACTIVATED_CHROME).not.toContain('bg-white/[0.08]');
    expect(WEARABLE_TILE_ACTIVATED_CHROME).not.toContain('bg-[rgba(255,255,255,0.20)]');
    expect(WEARABLE_TILE_ACTIVATED_CHROME).not.toContain('bg-teal/20');
    expect(WEARABLE_TILE_ACTIVATED_CHROME).not.toContain('border-teal/50');
    expect(WEARABLE_TILE_ACTIVATED_CHROME).not.toContain('bg-teal');
    expect(WEARABLE_TILE_ACTIVATED_CHROME).not.toContain('border-teal');
    expect(WEARABLE_TILE_ACTIVATED_CHROME).not.toContain('rgba(45,165,160');
    expect(activated).not.toContain('overflow-hidden');
    expect(activated).not.toContain('bg-card');
    expect(activated).not.toContain('bg-navy');
    expect(activated).not.toContain('bg-teal/20');
    expect(activated).not.toContain('border-teal/50');
    expect(activated).not.toContain('bg-[rgba(45,165,160');

    const title = wearableTileTitleClassName(true);
    expect(title).toContain('text-teal');
    expect(title).toContain('font-bold');
    expect(title).not.toContain('text-white');

    expect(WEARABLE_TILE_ACTIVATED_RAIL).toContain('bg-teal');
    expect(WEARABLE_TILE_ACTIVATED_RAIL).not.toContain('bg-white');
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
    for (const id of ['whoop', 'oura', 'google_health', 'garmin', 'clair'] as const) {
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
    expect(WEARABLE_TILE_ACTIVATED_CHROME).toContain('rgba(74,144,217,0.10)');
    expect(WEARABLE_TILE_ACTIVATED_CHROME).toContain('rgba(74,144,217,0.25)');
    expect(WEARABLE_TILE_ACTIVATED_CHROME).toContain('backdrop-blur-[16px]');
    expect(WEARABLE_TILE_ACTIVATED_CHROME).not.toContain('bg-teal/20');
    expect(WEARABLE_TILE_ACTIVATED_CHROME).not.toContain('border-teal/50');
    expect(WEARABLE_TILE_ACTIVATED_CHROME).not.toContain('bg-card');
    expect(WEARABLE_TILE_ACTIVATED_CHROME).not.toContain('overflow-hidden');
    expect(WEARABLE_TILE_ACTIVATED_CHROME).not.toContain('bg-white');
    expect(WEARABLE_TILE_ACTIVATED_CHROME).not.toContain('bg-[rgba(74,144,217,0.20)]');
    expect(WEARABLE_TILE_ACTIVATED_CHROME).not.toContain('border-[rgba(74,144,217,0.50)]');
    expect(WEARABLE_TILE_RESTING_CHROME).toContain('rgba(255,255,255,0.07)');
    expect(WEARABLE_TILE_RESTING_CHROME).toContain('border-[rgba(255,255,255,0.14)]');
    expect(WEARABLE_TILE_RESTING_CHROME).not.toContain('bg-[rgba(255,255,255,0.14)]');
    expect(WEARABLE_TILE_RESTING_CHROME).not.toContain('bg-card');
    expect(WEARABLE_TILE_RESTING_CHROME).not.toContain('overflow-hidden');
    expect(WEARABLE_TILE_RESTING_CHROME).not.toContain('bg-teal/20');
    expect(tile).not.toContain('bg-teal/5');
    expect(tile).not.toContain('border-teal bg-teal/5');
    expect(tile).not.toContain('ring-1 ring-teal');
    expect(tile).not.toContain('bg-[rgba(255,255,255,0.20)]');
  });

  it('Import and BOS outer sections use the same thinner grey rest glass', () => {
    const PANEL_REST_GLASS =
      'relative rounded-[24px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.07)] p-4 backdrop-blur-md sm:p-5';
    const importPanel = src('src/components/body-tracker/connections/ActiveSourceDetailPanel.tsx');
    const bosPanel = src('src/components/body-tracker/connections/ScoreDetailPanel.tsx');
    expect(importPanel).toContain(PANEL_REST_GLASS);
    expect(bosPanel).toContain(PANEL_REST_GLASS);
    for (const panel of [importPanel, bosPanel]) {
      expect(panel).not.toContain('bg-card');
      expect(panel).not.toContain('overflow-hidden');
      expect(panel).not.toContain('bg-teal/20');
      expect(panel).not.toContain('#1E3054');
      expect(panel).not.toContain('border-white/[0.08] bg-card');
    }
    expect(importPanel).not.toContain('bg-navy-700');
    expect(bosPanel).not.toContain('bg-navy-700');
  });

  it('1280 row stretches Import and BOS glass to the Garmin tile bottom', () => {
    const PANEL_REST_GLASS =
      'relative rounded-[24px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.07)] p-4 backdrop-blur-md sm:p-5';
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    const importPanel = src('src/components/body-tracker/connections/ActiveSourceDetailPanel.tsx');
    const bosPanel = src('src/components/body-tracker/connections/ScoreDetailPanel.tsx');

    const importClass = importPanel.match(/<section[\s\S]*?className="([^"]+)"/)?.[1];
    const bosClass = bosPanel.match(/<section[\s\S]*?className="([^"]+)"/)?.[1];
    expect(importClass).toBeTruthy();
    expect(bosClass).toBeTruthy();
    expect(importClass).toContain(PANEL_REST_GLASS);
    expect(bosClass).toContain(PANEL_REST_GLASS);
    expect(importClass).toContain('h-full');
    expect(bosClass).toContain('h-full');
    expect(importClass).not.toContain('bg-card');
    expect(bosClass).not.toContain('bg-card');
    expect(importClass).not.toContain('overflow-hidden');
    expect(bosClass).not.toContain('overflow-hidden');

    expect(surface).toContain('min-[1280px]:grid-cols-[1fr_1.2fr_1fr]');
    expect(surface).toContain('min-[1280px]:items-stretch');
    expect(surface).toContain('min-[1280px]:h-full');
    expect((surface.match(/min-\[1280px\]:h-full/g) ?? []).length).toBe(2);
    expect(surface).toContain("anyConnected ? 'order-2' : 'order-3'} min-[900px]:order-none min-[1280px]:h-full");
    expect(surface).toContain("anyConnected ? 'order-3' : 'order-1'} min-[900px]:order-none min-[1280px]:h-full");
    expect(surface).toContain(
      "className={`space-y-3 ${anyConnected ? 'order-1' : 'order-2'} min-[900px]:order-none`}",
    );

    expect(FIRST_CLASS_TILE_IDS[FIRST_CLASS_TILE_IDS.length - 1]).toBe('clair');
    expect(FIRST_CLASS_TILE_IDS).toEqual([
      'whoop',
      'hume',
      'apple_health',
      'oura',
      'google_health',
      'garmin',
      'clair',
    ]);
    expect(bosPanel).toContain('Missing stays UNKNOWN, never 0.');
  });
});
