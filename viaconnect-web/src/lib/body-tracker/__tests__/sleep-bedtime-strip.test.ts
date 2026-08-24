import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveLastSyncState } from '@/lib/body-tracker/last-sync-state';
import {
  BEDTIME_STRIP_DAYS,
  EMPTY_BEDTIME_STRIP,
  SLEEP_SAMPLE_PROVIDER_TO_TILE,
  bedtimeBarPercent,
  buildBedtimeStrip,
  formatBedtimeLabel,
  lastFourteenDayKeys,
  lastSyncInputsFromTiles,
  nightKeyFromBedtime,
  parseBedtimeIso,
  parseBedtimeStrip,
  resolveSyncedLastSync,
  syncedSleepTileIds,
} from '../sleep-bedtime-strip';

const NOW = Date.parse('2026-08-24T12:00:00.000Z');
const ROOT = process.cwd();

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function appleSyncedTiles() {
  return [
    { id: 'whoop', lastSyncState: 'not_connected' as const, lastSyncAt: null },
    { id: 'hume', lastSyncState: 'not_connected' as const, lastSyncAt: null },
    {
      id: 'apple_health',
      lastSyncState: 'synced' as const,
      lastSyncAt: '2026-08-22T08:00:00.000Z',
    },
    { id: 'oura', lastSyncState: 'not_connected' as const, lastSyncAt: null },
  ];
}

describe('Phase 1 Sleep bedtime strip', () => {
  it('hides the strip when resolveLastSyncState is not synced', () => {
    const none = buildBedtimeStrip({
      lastSyncInputs: [{ linked: false, lastSyncAt: null, now: NOW }],
      samples: [
        {
          sourceProvider: 'health_kit',
          startAt: '2026-08-20T02:10:00.000Z',
        },
      ],
      syncedTileIds: [],
      now: NOW,
    });
    expect(resolveLastSyncState({ linked: false, lastSyncAt: null, now: NOW }).kind).not.toBe(
      'synced',
    );
    expect(none.kind).toBe('hidden');
    expect(none.visible).toBe(false);
    expect(none.nights).toEqual([]);
    expect(none.lastSyncKind).toBe('not_connected');

    const neverSynced = buildBedtimeStrip({
      lastSyncInputs: [{ linked: true, lastSyncAt: null, now: NOW }],
      samples: [{ sourceProvider: 'whoop', startAt: '2026-08-20T02:10:00.000Z' }],
      syncedTileIds: ['whoop'],
      now: NOW,
    });
    expect(neverSynced.kind).toBe('hidden');
    expect(neverSynced.visible).toBe(false);
    expect(neverSynced.lastSyncKind).toBe('connected_never_synced');
  });

  it('does not invent last-sync or a May 2025 mock', () => {
    const strip = src('src/lib/body-tracker/sleep-bedtime-strip.ts');
    const testSrc = src('src/lib/body-tracker/__tests__/sleep-bedtime-strip.test.ts');
    expect(strip).toContain("@/lib/body-tracker/last-sync-state");
    expect(strip).toContain('resolveLastSyncState');
    expect(strip).not.toContain('last-sync-state-fork');
    expect(strip + testSrc).not.toMatch(/2025-05|May 2025|May 20/);
    expect(parseBedtimeIso('')).toBeNull();
    expect(parseBedtimeIso('not-a-date')).toBeNull();
    expect(resolveSyncedLastSync([]).synced).toBe(false);
    expect(EMPTY_BEDTIME_STRIP.visible).toBe(false);
  });

  it('shows the two-week strip only with real last-sync and real start_at samples', () => {
    const tiles = appleSyncedTiles();
    const strip = buildBedtimeStrip({
      lastSyncInputs: lastSyncInputsFromTiles(tiles, NOW),
      samples: [
        {
          sourceProvider: 'health_kit',
          startAt: '2026-08-20T02:10:00.000Z',
          endAt: '2026-08-20T10:00:00.000Z',
          sourceApp: 'Health',
        },
        {
          sourceProvider: 'health_kit',
          startAt: '2026-08-21T23:45:00.000Z',
          endAt: '2026-08-22T07:10:00.000Z',
        },
      ],
      syncedTileIds: syncedSleepTileIds(tiles),
      now: NOW,
    });

    expect(strip.kind).toBe('samples');
    expect(strip.visible).toBe(true);
    expect(strip.lastSyncKind).toBe('synced');
    expect(strip.nights).toHaveLength(BEDTIME_STRIP_DAYS);
    expect(lastFourteenDayKeys(NOW)[0]).toBe('2026-08-11');
    expect(lastFourteenDayKeys(NOW)[13]).toBe('2026-08-24');

    const night20 = strip.nights.find((n) => n.dayKey === '2026-08-19');
    expect(nightKeyFromBedtime('2026-08-20T02:10:00.000Z')).toBe('2026-08-19');
    expect(night20?.bedtimeAt).toBe('2026-08-20T02:10:00.000Z');
    expect(night20?.label).toBe('2:10 AM');

    const night21 = strip.nights.find((n) => n.dayKey === '2026-08-21');
    expect(night21?.bedtimeAt).toBe('2026-08-21T23:45:00.000Z');
    expect(night21?.label).toBe(formatBedtimeLabel('2026-08-21T23:45:00.000Z'));

    const emptyNight = strip.nights.find((n) => n.dayKey === '2026-08-12');
    expect(emptyNight?.bedtimeAt).toBeNull();
    expect(emptyNight?.label).toBeNull();
    expect(strip.nights.filter((n) => n.bedtimeAt).map((n) => n.bedtimeAt)).toEqual([
      '2026-08-20T02:10:00.000Z',
      '2026-08-21T23:45:00.000Z',
    ]);
    expect(bedtimeBarPercent(null)).toBeNull();
  });

  it('ignores leftover Whoop bedtimes when only Hume has a real last-sync', () => {
    const tiles = [
      { id: 'whoop', lastSyncState: 'not_connected' as const, lastSyncAt: null },
      {
        id: 'hume',
        lastSyncState: 'synced' as const,
        lastSyncAt: '2026-08-22T08:00:00.000Z',
      },
      { id: 'apple_health', lastSyncState: 'not_connected' as const, lastSyncAt: null },
      { id: 'oura', lastSyncState: 'not_connected' as const, lastSyncAt: null },
    ];
    const strip = buildBedtimeStrip({
      lastSyncInputs: lastSyncInputsFromTiles(tiles, NOW),
      samples: [
        { sourceProvider: 'whoop', startAt: '2026-08-20T02:10:00.000Z' },
        {
          sourceProvider: 'health_kit',
          startAt: '2026-08-20T03:00:00.000Z',
          sourceApp: 'Hume Health',
        },
      ],
      syncedTileIds: syncedSleepTileIds(tiles),
      now: NOW,
    });
    expect(syncedSleepTileIds(tiles).size).toBe(0);
    expect(SLEEP_SAMPLE_PROVIDER_TO_TILE.whoop).toBe('whoop');
    expect(strip.kind).toBe('empty');
    expect(strip.visible).toBe(false);
    expect(strip.nights.every((n) => n.bedtimeAt === null)).toBe(true);
  });

  it('does not invent a sleep score or fill missing nights', () => {
    const stripSrc = src('src/lib/body-tracker/sleep-bedtime-strip.ts');
    expect(stripSrc).not.toMatch(/sleep.?score|Sleep Score/i);
    expect(stripSrc).not.toMatch(/\b62\b/);
    expect(parseBedtimeStrip({ kind: 'samples', visible: true, nights: 'nope' })).toEqual(
      EMPTY_BEDTIME_STRIP,
    );
    expect(parseBedtimeStrip(null).visible).toBe(false);
  });
});
