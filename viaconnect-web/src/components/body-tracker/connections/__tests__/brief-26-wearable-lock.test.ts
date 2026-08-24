import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { HEALTH_XML_IMPORT_COPY } from '@/components/body-tracker/connected-sources/AppleHealthImportModal';
import { WearableTileCard } from '@/components/body-tracker/connections/WearableTileCard';
import {
  lockScoreDetailRows,
  ScoreDetailPanel,
} from '@/components/body-tracker/connections/ScoreDetailPanel';
import { METRIC_LABELS } from '@/lib/body-tracker/contributor-rows';
import {
  APPLE_HEALTH_DROPZONE_COPY,
  BOS_UNKNOWN_NEVER_ZERO_COPY,
  CONNECTIONS_BOS_COMPOSITE,
  CONNECTIONS_FOOTER,
  CONNECTIONS_LEAD,
  FIRST_CLASS_TILE_IDS,
  SCORE_DETAIL_DIMENSIONS,
  buildWearableTiles,
  connectionsBosCompositeDisplay,
  type WearableTileInput,
  type WearableTileView,
} from '@/lib/body-tracker/wearable-tiles';

vi.mock('react-hot-toast', () => ({ default: { success: () => undefined, error: () => undefined } }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));

import { AppleHealthImportModal } from '@/components/body-tracker/connected-sources/AppleHealthImportModal';

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

function tileById(id: WearableTileView['id']): WearableTileView {
  const found = buildWearableTiles(baseInput()).find((t) => t.id === id);
  if (!found) throw new Error(`missing tile ${id}`);
  return found;
}

describe('Brief 26 Wearable Data 1280 lock', () => {
  it('ships six tiles only in lock order and same IA at 390 and 1280', () => {
    expect(FIRST_CLASS_TILE_IDS).toEqual([
      'whoop',
      'hume',
      'apple_health',
      'oura',
      'google_health',
      'garmin',
    ]);
    const tiles = buildWearableTiles(baseInput());
    expect(tiles.map((t) => t.id)).toEqual([
      'whoop',
      'hume',
      'apple_health',
      'oura',
      'google_health',
      'garmin',
    ]);
    expect(tiles.map((t) => t.name)).toEqual([
      'Whoop',
      'Hume Body Pod',
      'Apple Health',
      'Oura',
      'Google Health',
      'Garmin',
    ]);
    expect(tiles.find((t) => t.id === 'google_health')?.statusLabel).toBe('Coming soon');
    expect(tiles.find((t) => t.id === 'garmin')?.statusLabel).toBe('Coming soon');
    expect(tiles.some((t) => /watch/i.test(t.name))).toBe(false);

    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    const tile = src('src/components/body-tracker/connections/WearableTileCard.tsx');
    expect(surface).toContain('min-[1280px]:grid-cols-2');
    expect(surface).toContain('CONNECTIONS_LEAD');
    expect(CONNECTIONS_LEAD).toBe('Connect your devices.');
    expect(tile).not.toContain('min-[1280px]:block');
    expect(tile).toContain('data-apple-dropzone');
    expect(surface + tile).not.toContain('google_health');
    expect(surface + tile).not.toContain('Apple Watch');
  });

  it('Whoop and Oura are Coming soon with no Connect and no fake last-sync', () => {
    const whoop = tileById('whoop');
    const oura = tileById('oura');
    expect(whoop.statusLabel).toBe('Coming soon');
    expect(oura.statusLabel).toBe('Coming soon');
    expect(whoop.lastSyncState).toBe('not_connected');
    expect(oura.lastSyncState).toBe('not_connected');
    expect(whoop.lastSyncAt).toBeNull();
    expect(oura.lastSyncAt).toBeNull();
    expect(whoop.statusLabel).not.toBe('Not configured');
    expect(oura.statusLabel).not.toBe('Not configured');
    expect(whoop.statusLabel).not.toBe('Connected');
    expect(oura.statusLabel).not.toBe('Connected');
    expect(JSON.stringify(whoop)).not.toMatch(/May 20|5 min ago|Last synced/);
    expect(JSON.stringify(oura)).not.toMatch(/May 20|5 min ago|Last synced/);

    const whoopMarkup = renderToStaticMarkup(
      createElement(WearableTileCard, { tile: whoop, onPrimary: () => undefined }),
    );
    const ouraMarkup = renderToStaticMarkup(
      createElement(WearableTileCard, { tile: oura, onPrimary: () => undefined }),
    );
    expect((whoopMarkup.match(/Coming soon/g) ?? []).length).toBe(1);
    expect((ouraMarkup.match(/Coming soon/g) ?? []).length).toBe(1);
    expect(whoopMarkup).not.toContain('sr-only');
    expect(ouraMarkup).not.toContain('sr-only');
    expect(whoopMarkup).not.toContain('Connect');
    expect(ouraMarkup).not.toContain('Connect');
    expect(whoopMarkup).not.toContain('Not configured');
    expect(ouraMarkup).not.toContain('Not configured');
    expect(whoopMarkup).not.toContain('Connected');
    expect(ouraMarkup).not.toContain('Last synced');
    expect(whoopMarkup + ouraMarkup).not.toContain('Upload XML');
    const tileSrc = src('src/components/body-tracker/connections/WearableTileCard.tsx');
    expect(tileSrc).toContain('{tile.statusLabel}');
    expect((tileSrc.match(/Coming soon/g) ?? []).length).toBe(0);
  });

  it('Hume modal title is Hume and Apple dropzone stays Apple-only', () => {
    expect(HEALTH_XML_IMPORT_COPY.hume.title).toBe('Import Hume Body Pod');
    expect(HEALTH_XML_IMPORT_COPY.hume.lead).toMatch(/Hume-tagged/);
    expect(HEALTH_XML_IMPORT_COPY.hume.lead).not.toMatch(/OAuth/i);
    expect(HEALTH_XML_IMPORT_COPY.apple.title).toBe('Import from Apple Health');
    expect(HEALTH_XML_IMPORT_COPY.apple.title).not.toContain('Hume');
    expect(APPLE_HEALTH_DROPZONE_COPY).toContain('Apple Health XML');
    expect(APPLE_HEALTH_DROPZONE_COPY).not.toContain('Hume');

    const hume = renderToStaticMarkup(
      createElement(AppleHealthImportModal, {
        open: true,
        intent: 'hume',
        onClose: () => undefined,
      }),
    );
    const apple = renderToStaticMarkup(
      createElement(AppleHealthImportModal, {
        open: true,
        intent: 'apple',
        onClose: () => undefined,
      }),
    );
    expect(hume).toContain('Import Hume Body Pod');
    expect(hume).toContain('data-import-intent="hume"');
    expect(hume).not.toContain('Import from Apple Health');
    expect(apple).toContain('Import from Apple Health');
    expect(apple).toContain('data-import-intent="apple"');
    expect(apple).not.toContain('Import Hume Body Pod');

    const appleTile = renderToStaticMarkup(
      createElement(WearableTileCard, {
        tile: tileById('apple_health'),
        onPrimary: () => undefined,
        onDropXml: () => undefined,
      }),
    );
    expect(appleTile).toContain('Upload XML');
    expect(appleTile).toContain('Not connected');
    expect(appleTile).toContain(APPLE_HEALTH_DROPZONE_COPY);
    expect(appleTile).not.toContain('Hume');
    expect(appleTile).not.toContain('Coming soon');

    const humeTile = renderToStaticMarkup(
      createElement(WearableTileCard, {
        tile: tileById('hume'),
        onPrimary: () => undefined,
      }),
    );
    expect(humeTile).toContain('Upload XML');
    expect(humeTile).toContain('Not connected');
    expect(humeTile).not.toContain(APPLE_HEALTH_DROPZONE_COPY);
    expect(humeTile).not.toContain('data-apple-dropzone');
  });

  it('BOS ring is UNKNOWN never 0 and keeps Helix Vitality Stability Symmetry off', () => {
    // The ring block still pins the honest empty-state composite. The old
    // 4-dim SCORE_DETAIL_DIMENSIONS model still gates the ring's "named
    // contributor" count internally (lockScoreDetailRows is unchanged), but
    // it is no longer what renders per row -- Task 7 replaced the
    // per-dimension row render with the 7-MetricKey ContributorColumn, so
    // those row-level assertions below now describe the new model.
    expect(connectionsBosCompositeDisplay()).toEqual(CONNECTIONS_BOS_COMPOSITE);
    expect(CONNECTIONS_BOS_COMPOSITE.value).toBe('--');
    expect(CONNECTIONS_BOS_COMPOSITE.band).toBe('UNKNOWN');
    expect(CONNECTIONS_BOS_COMPOSITE.value).not.toBe('0');
    expect(BOS_UNKNOWN_NEVER_ZERO_COPY).toBe('Missing stays UNKNOWN, never 0.');
    expect(CONNECTIONS_FOOTER).toBe('Bio Optimization Score uses these sources.');

    const locked = lockScoreDetailRows([]);
    expect(locked.map((r) => r.dimension)).toEqual(SCORE_DETAIL_DIMENSIONS);
    expect(locked.every((r) => r.displayValue === 'UNKNOWN')).toBe(true);
    expect(locked.every((r) => r.value === null)).toBe(true);

    const markup = renderToStaticMarkup(
      createElement(ScoreDetailPanel, { rows: [], lastUpdatedAt: null }),
    );
    expect(markup).toContain('Bio Optimization Score');
    expect(markup).toContain('--');
    expect(markup).toContain(BOS_UNKNOWN_NEVER_ZERO_COPY);
    expect(markup).toContain(CONNECTIONS_FOOTER);
    expect(markup).not.toMatch(/Stability|Symmetry|Helix|Vitality/);
    expect(markup).not.toContain('>0<');

    // Contributor column: all 7 MetricKeys render, cold, as "Connect your
    // device" -- never a per-row UNKNOWN placeholder standing in for a
    // value that was never measured.
    for (const label of Object.values(METRIC_LABELS)) {
      expect(markup).toContain(label);
    }
    expect((markup.match(/Connect your device/g) ?? []).length).toBe(7);
    // The ring band + BOS_UNKNOWN_NEVER_ZERO_COPY still legitimately say
    // UNKNOWN; the contributor rows no longer do.
    expect(markup).toContain('UNKNOWN');

    const panel = src('src/components/body-tracker/connections/ScoreDetailPanel.tsx');
    expect(panel).not.toMatch(/Stability|Symmetry|Helix|Vitality/);
    expect(panel).toContain('connectionsBosCompositeDisplay');
  });

  it('imports last-sync-state from @/lib/body-tracker/last-sync-state only', () => {
    const tiles = src('src/lib/body-tracker/wearable-tiles.ts');
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    const card = src('src/components/body-tracker/connections/WearableTileCard.tsx');
    const panel = src('src/components/body-tracker/connections/ScoreDetailPanel.tsx');
    const sm = src('src/lib/body-tracker/last-sync-state.ts');
    expect(sm).toContain('export function resolveLastSyncState');
    expect(tiles).toContain("@/lib/body-tracker/last-sync-state");
    expect(tiles).toContain('resolveLastSyncState');
    expect(tiles).not.toContain('last-sync-state-fork');
    expect(surface + card + panel).not.toMatch(/from ['"][^'"]*last-sync-state['"]/);
    expect(surface + card + panel).not.toContain('LAST_SYNC_STATES');
    expect(tiles).not.toContain('LAST_SYNC_STATES');
  });
});
