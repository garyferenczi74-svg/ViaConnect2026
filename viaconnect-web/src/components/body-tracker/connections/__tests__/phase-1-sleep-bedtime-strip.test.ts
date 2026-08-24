import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import {
  lockScoreDetailRows,
  ScoreDetailPanel,
} from '@/components/body-tracker/connections/ScoreDetailPanel';
import { SleepBedtimeStrip } from '@/components/body-tracker/connections/SleepBedtimeStrip';
import { WearableTileCard } from '@/components/body-tracker/connections/WearableTileCard';
import {
  BOS_UNKNOWN_NEVER_ZERO_COPY,
  CONNECTIONS_BOS_COMPOSITE,
  FIRST_CLASS_TILE_IDS,
  OAUTH_COMING_SOON_LABEL,
  SCORE_DETAIL_DIMENSIONS,
  buildWearableTiles,
  connectionsBosCompositeDisplay,
  type WearableTileInput,
} from '@/lib/body-tracker/wearable-tiles';
import {
  EMPTY_BEDTIME_STRIP,
  buildBedtimeStrip,
  lastSyncInputsFromTiles,
  syncedSleepTileIds,
} from '@/lib/body-tracker/sleep-bedtime-strip';

vi.mock('react-hot-toast', () => ({ default: { success: () => undefined, error: () => undefined } }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));

const root = process.cwd();
const NOW = Date.parse('2026-08-24T12:00:00.000Z');

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
    platform: 'web',
    now: NOW,
    ...over,
  };
}

const leftoverSleepRow = {
  dimension: 'sleep',
  source: 'whoop',
  value: 62,
  displayValue: '62',
  status: 'sourced' as const,
  showRing: true,
  manual: false,
  disagreement: null,
  sources: [{ source: 'whoop', value: 62, trust: 0.85, label: 'Whoop Sleep' }],
};

describe('Phase 1 Sleep bedtime strip on Connections', () => {
  it('keeps Sleep UNKNOWN and hides the strip without a real last-sync', () => {
    const locked = lockScoreDetailRows([leftoverSleepRow], { lastSyncSynced: false });
    const sleep = locked.find((r) => r.dimension === 'sleep');
    expect(sleep?.displayValue).toBe('UNKNOWN');
    expect(sleep?.value).toBeNull();
    expect(sleep?.showRing).toBe(false);
    expect(sleep?.displayValue).not.toBe('0');
    expect(sleep?.displayValue).not.toBe('62');

    const markup = renderToStaticMarkup(
      createElement(ScoreDetailPanel, {
        rows: [leftoverSleepRow],
        lastUpdatedAt: null,
        bedtimeStrip: EMPTY_BEDTIME_STRIP,
      }),
    );
    expect(markup).toContain('data-dimension="sleep"');
    expect(markup).toContain('data-bedtime-strip="hidden"');
    expect(markup).not.toContain('data-bedtime-strip="samples"');
    expect(markup).not.toContain('Two-week bedtime strip');
    expect(markup).toContain('UNKNOWN');
    expect(markup).not.toContain('>62<');
    expect(markup).not.toContain('>0<');
  });

  it('renders the strip only with real last-sync and real bedtime samples', () => {
    const tiles = buildWearableTiles(
      baseInput({
        appleXmlIngested: 4,
        appleXmlLastPersistAt: '2026-08-22T08:00:00.000Z',
      }),
    );
    const strip = buildBedtimeStrip({
      lastSyncInputs: lastSyncInputsFromTiles(tiles, NOW),
      samples: [
        {
          sourceProvider: 'health_kit',
          startAt: '2026-08-20T02:10:00.000Z',
          sourceApp: 'Health',
        },
      ],
      syncedTileIds: syncedSleepTileIds(tiles),
      now: NOW,
    });
    expect(strip.visible).toBe(true);
    expect(strip.kind).toBe('samples');

    const markup = renderToStaticMarkup(
      createElement(ScoreDetailPanel, {
        rows: [],
        lastUpdatedAt: '2026-08-22T08:00:00.000Z',
        bedtimeStrip: strip,
      }),
    );
    expect(markup).toContain('data-bedtime-strip="samples"');
    expect(markup).toContain('data-bedtime-at="2026-08-20T02:10:00.000Z"');
    expect(markup).toContain('Two-week bedtime strip');
    expect(markup).toContain('Bedtimes');
    expect(markup).not.toContain('Sleep Score');
    expect(markup).not.toContain('>62<');

    const hiddenStrip = renderToStaticMarkup(
      createElement(SleepBedtimeStrip, { strip: EMPTY_BEDTIME_STRIP }),
    );
    expect(hiddenStrip).toBe('');
  });

  it('leaves the four tiles, Coming soon Whoop/Oura, and BOS honesty unchanged', () => {
    expect(FIRST_CLASS_TILE_IDS).toEqual(['whoop', 'hume', 'apple_health', 'oura']);
    expect(SCORE_DETAIL_DIMENSIONS).toEqual(['sleep', 'recovery', 'strain', 'metabolic']);
    expect(connectionsBosCompositeDisplay()).toEqual(CONNECTIONS_BOS_COMPOSITE);
    expect(CONNECTIONS_BOS_COMPOSITE.value).toBe('--');
    expect(CONNECTIONS_BOS_COMPOSITE.band).toBe('UNKNOWN');
    expect(BOS_UNKNOWN_NEVER_ZERO_COPY).toBe('Missing stays UNKNOWN, never 0.');

    const tiles = buildWearableTiles(baseInput());
    expect(tiles.map((t) => t.id)).toEqual(['whoop', 'hume', 'apple_health', 'oura']);
    expect(tiles.find((t) => t.id === 'whoop')?.statusLabel).toBe(OAUTH_COMING_SOON_LABEL);
    expect(tiles.find((t) => t.id === 'oura')?.statusLabel).toBe(OAUTH_COMING_SOON_LABEL);
    expect(tiles.find((t) => t.id === 'whoop')?.statusLabel).not.toBe('Connect');
    expect(tiles.find((t) => t.id === 'oura')?.statusLabel).not.toBe('Connect');

    const whoopMarkup = renderToStaticMarkup(
      createElement(WearableTileCard, {
        tile: tiles.find((t) => t.id === 'whoop')!,
        onPrimary: () => undefined,
      }),
    );
    const ouraMarkup = renderToStaticMarkup(
      createElement(WearableTileCard, {
        tile: tiles.find((t) => t.id === 'oura')!,
        onPrimary: () => undefined,
      }),
    );
    expect(whoopMarkup).toContain('Coming soon');
    expect(ouraMarkup).toContain('Coming soon');
    expect(whoopMarkup).not.toContain('Connect');
    expect(ouraMarkup).not.toContain('Connect');

    const bos = renderToStaticMarkup(
      createElement(ScoreDetailPanel, { rows: [], lastUpdatedAt: null }),
    );
    expect(bos).toContain('Bio Optimization Score');
    expect(bos).toContain('--');
    expect(bos).toContain('UNKNOWN');
    expect(bos).toContain(BOS_UNKNOWN_NEVER_ZERO_COPY);
    expect(bos).not.toMatch(/Stability|Symmetry|Helix|Vitality/);
    expect(bos).not.toContain('>62<');
    expect(bos).not.toContain('>0<');
  });

  it('imports last-sync-state from the shared module only and stays on Phase 1', () => {
    const strip = src('src/lib/body-tracker/sleep-bedtime-strip.ts');
    const panel = src('src/components/body-tracker/connections/ScoreDetailPanel.tsx');
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    const ui = src('src/components/body-tracker/connections/SleepBedtimeStrip.tsx');
    const joined = strip + panel + surface + ui;
    expect(strip).toContain("@/lib/body-tracker/last-sync-state");
    expect(strip).toContain('resolveLastSyncState');
    expect(joined).not.toContain('last-sync-state-fork');
    expect(joined).not.toMatch(/2025-05|May 2025/);
    expect(joined).not.toMatch(/habit vs Recovery|protocol-change|3D privacy/i);
    expect(panel + ui).not.toMatch(/Stability|Symmetry|Helix|Vitality/);
    expect(panel).toContain('strokeWidth={1.5}');
    expect(ui).not.toContain('Sleep Score');
    const api = src('src/app/api/integrations/wearable-tiles/route.ts');
    expect(api).toContain('start_at');
    expect(api).toContain('bedtimeStrip');
  });
});
