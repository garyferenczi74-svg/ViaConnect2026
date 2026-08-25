// Phase 2: one logged habit next to Sleep on /dashboard and Connections BOS.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { HabitSleepPair } from '@/components/body-tracker/connections/HabitSleepPair';
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
import {
  EMPTY_HABIT_SLEEP_PAIR,
  habitSleepPairSentence,
  resolveHabitSleepPair,
} from '@/lib/body-tracker/habit-sleep-pair';

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

const visiblePair = resolveHabitSleepPair({
  sleepTileSynced: true,
  habitName: 'MTHFR+',
});

describe('Phase 2 habit next to Sleep', () => {
  it('hides the pair on both surfaces without last-sync even if a habit exists', () => {
    const hidden = resolveHabitSleepPair({
      sleepTileSynced: false,
      habitName: 'MTHFR+',
    });
    expect(hidden.visible).toBe(false);

    const panel = renderToStaticMarkup(
      createElement(ScoreDetailPanel, {
        rows: [leftoverSleepRow],
        lastUpdatedAt: null,
        bedtimeStrip: EMPTY_BEDTIME_STRIP,
        habitSleepPair: hidden,
      }),
    );
    expect(panel).toContain('data-dimension="sleep"');
    expect(panel).toContain('data-habit-sleep-pair="hidden"');
    expect(panel).not.toContain('data-habit-sleep-pair="visible"');
    expect(panel).not.toContain('MTHFR+ is one habit you logged');
    expect(panel).toContain('UNKNOWN');

    const pairMarkup = renderToStaticMarkup(
      createElement(HabitSleepPair, { pair: hidden }),
    );
    expect(pairMarkup).toBe('');
  });

  it('hides the pair with last-sync but no logged habit', () => {
    const tiles = buildWearableTiles(
      baseInput({
        appleXmlIngested: 4,
        appleXmlLastPersistAt: '2026-08-22T08:00:00.000Z',
      }),
    );
    const hidden = resolveHabitSleepPair({
      tiles,
      habitName: null,
      now: NOW,
    });
    expect(hidden.visible).toBe(false);
    expect(hidden.habitName).toBeNull();

    const panel = renderToStaticMarkup(
      createElement(ScoreDetailPanel, {
        rows: [],
        lastUpdatedAt: '2026-08-22T08:00:00.000Z',
        habitSleepPair: hidden,
      }),
    );
    expect(panel).toContain('data-habit-sleep-pair="hidden"');
    expect(panel).not.toContain('is one habit you logged');
    expect(renderToStaticMarkup(createElement(HabitSleepPair, { pair: EMPTY_HABIT_SLEEP_PAIR }))).toBe(
      '',
    );
  });

  it('renders the pair only with real last-sync and a real habit name + Hannah lock', () => {
    expect(visiblePair.visible).toBe(true);
    expect(visiblePair.habitName).toBe('MTHFR+');
    expect(visiblePair.sentence).toBe(habitSleepPairSentence('MTHFR+'));

    const panel = renderToStaticMarkup(
      createElement(ScoreDetailPanel, {
        rows: [],
        lastUpdatedAt: '2026-08-22T08:00:00.000Z',
        habitSleepPair: visiblePair,
      }),
    );
    expect(panel).toContain('data-dimension="sleep"');
    expect(panel).toContain('data-habit-sleep-pair="visible"');
    expect(panel).toContain('MTHFR+');
    expect(panel).toContain('Sleep');
    expect(panel).toContain(
      'MTHFR+ is one habit you logged, shown next to Sleep. It is educational context, not a diagnosis, and it is not a correlation.',
    );
    expect(visiblePair.sentence).not.toMatch(/\br\s*=/);
    expect(panel).not.toMatch(/r\s*=\s*[-+]?\d*\.\d/);
    expect(panel).not.toContain('r =');
    expect(panel).not.toContain('Sleep Score');
    expect(panel).not.toContain('Vitality');
    expect(panel).not.toContain('Helix');
    expect(panel).not.toMatch(/Stability|Symmetry/);
    expect(panel).not.toContain('>62<');
    expect(panel).not.toContain('>0<');

    const pairOnly = renderToStaticMarkup(
      createElement(HabitSleepPair, { pair: visiblePair }),
    );
    expect(pairOnly).toContain('data-habit-sleep-pair="visible"');
    expect(pairOnly).toContain('data-habit-dimension="Sleep"');
    expect(pairOnly).toContain('stroke-width="1.5"');
    expect(pairOnly).toContain('rounded-2xl');
    expect(pairOnly).not.toContain('Sleep Score');
    expect(pairOnly).not.toContain('Vitality');
    expect(pairOnly).not.toContain('Helix');
  });

  it('keeps four tiles, Coming soon Whoop/Oura, Brief 24 BOS honesty, and Phase 1 strip hidden without samples', () => {
    expect(FIRST_CLASS_TILE_IDS).toEqual(['whoop', 'hume', 'apple_health', 'oura']);
    expect(SCORE_DETAIL_DIMENSIONS).toEqual(['sleep', 'recovery', 'strain', 'metabolic']);
    expect(connectionsBosCompositeDisplay()).toEqual(CONNECTIONS_BOS_COMPOSITE);
    expect(CONNECTIONS_BOS_COMPOSITE.value).toBe('--');
    expect(CONNECTIONS_BOS_COMPOSITE.band).toBe('UNKNOWN');
    expect(BOS_UNKNOWN_NEVER_ZERO_COPY).toBe('Missing stays UNKNOWN, never 0.');

    const locked = lockScoreDetailRows([leftoverSleepRow], { lastSyncSynced: false });
    expect(locked.find((r) => r.dimension === 'sleep')?.displayValue).toBe('UNKNOWN');
    expect(locked.find((r) => r.dimension === 'sleep')?.displayValue).not.toBe('0');
    expect(locked.find((r) => r.dimension === 'sleep')?.displayValue).not.toBe('62');

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

    const syncedTiles = buildWearableTiles(
      baseInput({
        appleXmlIngested: 4,
        appleXmlLastPersistAt: '2026-08-22T08:00:00.000Z',
      }),
    );
    const hiddenStrip = buildBedtimeStrip({
      lastSyncInputs: lastSyncInputsFromTiles(syncedTiles, NOW),
      samples: [],
      syncedTileIds: syncedSleepTileIds(syncedTiles),
      now: NOW,
    });
    expect(hiddenStrip.visible).toBe(false);
    expect(hiddenStrip.kind).toBe('empty');
    expect(hiddenStrip.sleepTileSynced).toBe(true);
    expect(renderToStaticMarkup(createElement(SleepBedtimeStrip, { strip: hiddenStrip }))).toBe('');
    expect(renderToStaticMarkup(createElement(SleepBedtimeStrip, { strip: EMPTY_BEDTIME_STRIP }))).toBe(
      '',
    );

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
    expect(bos).toContain('data-habit-sleep-pair="hidden"');
  });

  it('imports last-sync-state only, reuses Phase 1 helpers, and parks Phase 3/4', () => {
    const resolver = src('src/lib/body-tracker/habit-sleep-pair.ts');
    const ui = src('src/components/body-tracker/connections/HabitSleepPair.tsx');
    const panel = src('src/components/body-tracker/connections/ScoreDetailPanel.tsx');
    const surface = src('src/components/body-tracker/connections/ConnectionsSurface.tsx');
    const morning = src('src/components/dashboard/morning-card/MorningCard.tsx');
    const chips = src('src/components/dashboard/morning-card/MorningChipGrid.tsx');
    const hook = src('src/hooks/useSleepTileSynced.ts');
    const joined = resolver + ui + panel + surface + morning + hook;

    expect(resolver).toContain("@/lib/body-tracker/last-sync-state");
    expect(resolver).toContain('resolveLastSyncState');
    expect(joined).not.toContain('last-sync-state-fork');
    expect(joined).not.toContain('LAST_SYNC_STATES');
    expect(joined).not.toMatch(/habit vs Recovery|protocol-change|3D privacy/i);
    expect(joined).not.toMatch(/genex_m|GCG|GLP1R|GLP-1|Semaglutide/i);
    expect(ui + panel + morning).not.toMatch(/Stability|Symmetry|Helix|Vitality/);
    expect(ui).not.toContain('Sleep Score');
    expect(panel).toContain('HabitSleepPair');
    expect(morning).toContain('HabitSleepPair');
    expect(morning).toContain('useDailyScheduleView');
    expect(morning).toContain('useSleepTileSynced');
    expect(surface).toContain('useDailyScheduleView');
    expect(chips).toContain('grid-cols-4');
    expect(chips).toContain('md:grid-cols-8');
    expect(chips).not.toContain('HabitSleepPair');
    expect(panel).toContain('strokeWidth={1.5}');
    expect(ui).toContain('strokeWidth={1.5}');
    expect(ui).toContain('rounded-2xl');
    expect(hook).toContain('/api/integrations/wearable-tiles');
    expect(hook).toContain('sleepLastSyncFromWearablePayload');
  });
});
