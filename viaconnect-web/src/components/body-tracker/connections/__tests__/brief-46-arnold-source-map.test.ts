import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { WearableTileCard } from '@/components/body-tracker/connections/WearableTileCard';
import {
  WEARABLE_TILE_ACTIVATED_CHROME,
  WEARABLE_TILE_ACTIVATED_RAIL,
  WEARABLE_TILE_RESTING_CHROME,
  wearableTileCardChrome,
} from '@/components/body-tracker/connections/WearableTileCard';
import { ActiveSourceDetailPanel } from '@/components/body-tracker/connections/ActiveSourceDetailPanel';
import { ScoreDetailPanel } from '@/components/body-tracker/connections/ScoreDetailPanel';
import {
  BOS_UNKNOWN_NEVER_ZERO_COPY,
  CONNECTIONS_BOS_COMPOSITE,
  FIRST_CLASS_TILE_IDS,
  SCORE_DETAIL_DIMENSIONS,
  WEARABLE_TILE_SPECS,
  buildWearableTiles,
  connectionsBosCompositeDisplay,
  resolveConnectionsBosDisplay,
  tileContributorLine,
  type WearableTileInput,
  type WearableTileView,
} from '@/lib/body-tracker/wearable-tiles';
import { assembleWearableSnapshot, type WearableSnapshotInput } from '@/lib/body-tracker/wearable-snapshot';

vi.mock('react-hot-toast', () => ({ default: { success: () => undefined, error: () => undefined } }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

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

function tileById(id: WearableTileView['id'], over: Partial<WearableTileInput> = {}): WearableTileView {
  const found = buildWearableTiles(baseInput(over)).find((t) => t.id === id);
  if (!found) throw new Error(`missing tile ${id}`);
  return found;
}

function snapshotBase(over: Partial<WearableSnapshotInput> = {}): WearableSnapshotInput {
  return {
    connected: [],
    tokenProviders: [],
    appleImports: [],
    bodyRows: [],
    sleepRows: [],
    recoveryRows: [],
    workoutRows: [],
    dailyVitalsRows: [],
    healthKitPersisted: false,
    healthKitLastPersistAt: null,
    whoopConfigured: false,
    ouraConfigured: false,
    platform: 'web',
    metabolicManual: false,
    now: Date.parse('2026-08-24T10:00:00.000Z'),
    ...over,
  };
}

describe('Brief 46 Arnold source map', () => {
  it('locks the Arnold advertised map and will-feed vs feeds copy', () => {
    const byId = Object.fromEntries(WEARABLE_TILE_SPECS.map((s) => [s.id, s.advertisedDimensions]));
    expect(byId.whoop).toEqual(['sleep', 'recovery', 'strain']);
    expect(byId.hume).toEqual(['body_comp', 'metabolic']);
    expect(byId.apple_health).toEqual(['body_comp', 'metabolic']);
    expect(byId.oura).toEqual(['sleep', 'recovery']);
    expect(byId.google_health).toEqual([]);
    expect(byId.garmin).toEqual([]);
    expect(byId.apple_health).not.toContain('sleep');

    const whoop = tileById('whoop');
    const oura = tileById('oura');
    const google = tileById('google_health');
    const garmin = tileById('garmin');
    const apple = tileById('apple_health');
    const hume = tileById('hume');

    const whoopMarkup = renderToStaticMarkup(
      createElement(WearableTileCard, { tile: whoop, onPrimary: () => undefined }),
    );
    const ouraMarkup = renderToStaticMarkup(
      createElement(WearableTileCard, { tile: oura, onPrimary: () => undefined }),
    );
    const googleMarkup = renderToStaticMarkup(
      createElement(WearableTileCard, { tile: google, onPrimary: () => undefined }),
    );
    const garminMarkup = renderToStaticMarkup(
      createElement(WearableTileCard, { tile: garmin, onPrimary: () => undefined }),
    );
    const appleMarkup = renderToStaticMarkup(
      createElement(WearableTileCard, { tile: apple, onPrimary: () => undefined }),
    );
    const humeMarkup = renderToStaticMarkup(
      createElement(WearableTileCard, { tile: hume, onPrimary: () => undefined }),
    );

    expect(whoopMarkup).toContain('Will feed Sleep, Recovery, Strain');
    expect(ouraMarkup).toContain('Will feed Sleep, Recovery');
    expect(whoopMarkup).not.toContain('Feeds ');
    expect(ouraMarkup).not.toContain('Feeds ');
    expect(googleMarkup).not.toContain('Will feed');
    expect(googleMarkup).not.toContain('Feeds ');
    expect(garminMarkup).not.toContain('Will feed');
    expect(garminMarkup).not.toContain('Feeds ');
    expect(appleMarkup).not.toContain('Sleep');
    expect(appleMarkup).not.toContain('Will feed');
    expect(appleMarkup).not.toContain('Feeds ');
    expect(humeMarkup).not.toContain('Will feed');
    expect(humeMarkup).not.toContain('Feeds ');

    const syncedApple = tileById('apple_health', {
      appleXmlIngested: 3,
      appleXmlLastPersistAt: '2026-08-22T08:00:00.000Z',
      dimensionsFed: { apple_health: ['body_comp', 'metabolic'] },
    });
    const syncedMarkup = renderToStaticMarkup(
      createElement(WearableTileCard, { tile: syncedApple, onPrimary: () => undefined }),
    );
    expect(tileContributorLine(syncedApple)).toBe('Feeds Body comp., Metabolic');
    expect(syncedMarkup).toContain('Feeds Body comp., Metabolic');
    expect(syncedMarkup).not.toContain('Sleep');
    expect(syncedMarkup).not.toContain('Will feed');
  });

  it('shows Body comp., Metabolic on Apple and Hume FEEDS rails and omits Google/Garmin lists', () => {
    const appleRail = renderToStaticMarkup(
      createElement(ActiveSourceDetailPanel, { tile: tileById('apple_health') }),
    );
    const humeRail = renderToStaticMarkup(
      createElement(ActiveSourceDetailPanel, { tile: tileById('hume') }),
    );
    const whoopRail = renderToStaticMarkup(
      createElement(ActiveSourceDetailPanel, { tile: tileById('whoop') }),
    );
    const googleRail = renderToStaticMarkup(
      createElement(ActiveSourceDetailPanel, { tile: tileById('google_health') }),
    );
    const garminRail = renderToStaticMarkup(
      createElement(ActiveSourceDetailPanel, { tile: tileById('garmin') }),
    );

    expect(appleRail).toContain('data-feeds-rail="true"');
    expect(appleRail).toContain('Body comp., Metabolic');
    expect(appleRail).not.toContain('Sleep');
    expect(humeRail).toContain('data-feeds-rail="true"');
    expect(humeRail).toContain('Body comp., Metabolic');
    expect(whoopRail).toContain('Will feed');
    expect(whoopRail).toContain('Sleep, Recovery, Strain');
    expect(googleRail).not.toContain('data-feeds-rail="true"');
    expect(garminRail).not.toContain('data-feeds-rail="true"');
  });

  it('Coming soon tiles have no Connect and no last-sync', () => {
    for (const id of ['whoop', 'oura', 'google_health', 'garmin'] as const) {
      const tile = tileById(id);
      expect(tile.statusLabel).toBe('Coming soon');
      expect(tile.lastSyncState).toBe('not_connected');
      expect(tile.lastSyncAt).toBeNull();
      const markup = renderToStaticMarkup(
        createElement(WearableTileCard, { tile, onPrimary: () => undefined }),
      );
      expect(markup).not.toContain('Connect');
      expect(markup).not.toContain('Last synced');
      expect(markup).not.toContain('5 min ago');
      expect(JSON.stringify(tile)).not.toMatch(/May 20|5 min ago|Last synced/);
    }
  });

  it('does not unlock Hume last-sync or Apple Sleep from Hume-tagged Apple-export sleep', () => {
    const snap = assembleWearableSnapshot(
      snapshotBase({
        sleepRows: [
          {
            source_provider: 'health_kit',
            sleep_efficiency_pct: 90,
            total_sleep_min: 400,
            end_at: '2026-08-20T10:00:00.000Z',
            source_app: 'Hume Health',
          },
        ],
      }),
    );
    const hume = snap.tiles.find((t) => t.id === 'hume');
    const apple = snap.tiles.find((t) => t.id === 'apple_health');
    expect(hume?.lastSyncState).toBe('not_connected');
    expect(hume?.lastSyncAt).toBeNull();
    expect(hume?.statusLabel).toBe('Not connected');
    expect(apple?.advertisedDimensions).toEqual(['body_comp', 'metabolic']);
    expect(apple?.dimensionsFed).toEqual([]);
    expect(apple?.lastSyncAt).toBeNull();
    expect(snap.scoreDetail.find((r) => r.dimension === 'sleep')?.sources).toEqual([]);

    const humeOnly = assembleWearableSnapshot(
      snapshotBase({
        bodyRows: [
          {
            measured_at: '2026-08-20T07:00:00.000Z',
            updated_at: '2026-08-20T07:00:00.000Z',
            source_app: 'hume_body_pod',
            weight_kg: 71.2,
            body_fat_pct: 18.1,
          },
        ],
      }),
    );
    expect(humeOnly.tiles.find((t) => t.id === 'hume')?.lastSyncState).toBe('synced');
    expect(humeOnly.tiles.find((t) => t.id === 'hume')?.dimensionsFed).toEqual([
      'body_comp',
      'metabolic',
    ]);
    expect(humeOnly.tiles.find((t) => t.id === 'apple_health')?.lastSyncState).toBe('not_connected');
  });

  it('keeps empty BOS UNKNOWN and does not change Brief 30 math', () => {
    expect(SCORE_DETAIL_DIMENSIONS).toEqual(['sleep', 'recovery', 'strain', 'metabolic']);
    expect(connectionsBosCompositeDisplay()).toEqual({ value: '--', band: 'UNKNOWN' });
    expect(resolveConnectionsBosDisplay(0)).toEqual(CONNECTIONS_BOS_COMPOSITE);
    expect(CONNECTIONS_BOS_COMPOSITE.value).not.toBe('0');
    expect(BOS_UNKNOWN_NEVER_ZERO_COPY).toBe('Missing stays UNKNOWN, never 0.');

    const markup = renderToStaticMarkup(
      createElement(ScoreDetailPanel, { rows: [], lastUpdatedAt: null }),
    );
    expect(markup).toContain('--');
    expect(markup).toContain('UNKNOWN');
    expect(markup).toContain(BOS_UNKNOWN_NEVER_ZERO_COPY);
    expect(markup).not.toContain('>0<');
  });

  it('keeps Brief 28 chrome locked and plugins apps-only', () => {
    expect(FIRST_CLASS_TILE_IDS).toEqual([
      'whoop',
      'hume',
      'apple_health',
      'oura',
      'google_health',
      'garmin',
    ]);
    expect(wearableTileCardChrome(false)).toBe(WEARABLE_TILE_RESTING_CHROME);
    expect(WEARABLE_TILE_RESTING_CHROME).toBe(
      'relative rounded-[24px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.07)] p-4 backdrop-blur-md',
    );
    expect(WEARABLE_TILE_ACTIVATED_CHROME).toBe(
      'relative rounded-[24px] border border-[rgba(74,144,217,0.25)] bg-[rgba(74,144,217,0.10)] p-4 pl-6 backdrop-blur-[16px]',
    );
    expect(WEARABLE_TILE_ACTIVATED_RAIL).toBe('absolute inset-y-3 left-0 w-1 rounded-full bg-teal/60');
    expect(WEARABLE_TILE_RESTING_CHROME).not.toContain('bg-card');
    expect(WEARABLE_TILE_RESTING_CHROME).not.toContain('overflow-hidden');

    const tile = src('src/components/body-tracker/connections/WearableTileCard.tsx');
    const panel = src('src/components/body-tracker/connections/ScoreDetailPanel.tsx');
    const plugins = src('src/components/plugins/PluginsAppsSurface.tsx');
    const registry = src('src/lib/integrations/pluginAppRegistry.ts');
    expect(tile).toContain('strokeWidth={1.5}');
    expect(tile).not.toMatch(/\bas any\b/);
    expect(panel).toContain('ConnectionsBosDial');
    expect(plugins).not.toContain('WearableTileCard');
    expect(plugins).not.toContain('Apple Health');
    expect(plugins).not.toContain('Hume Body Pod');
    expect(registry).toContain('PLUGIN_PAGE_EXCLUDED_SLUGS');
    expect(registry).toContain("'whoop'");
    expect(registry).toContain("'apple_health'");
  });
});
