// Phase 1 Sleep bedtime strip. Apple Health iOS 26 style: two weeks of
// real bedtimes, not a sleep score or BOS number.
//
// Visible only when resolveLastSyncState is synced AND a real start_at exists.
// last-sync-state comes from @/lib/body-tracker/last-sync-state only.

import {
  resolveLastSyncState,
  type LastSyncInput,
  type LastSyncKind,
} from '@/lib/body-tracker/last-sync-state';
import { matchesHume } from '@/lib/body-tracker/connected-sources/registry';

export const BEDTIME_STRIP_DAYS = 14;

export type BedtimeStripKind = 'hidden' | 'empty' | 'samples';

export interface SleepBedtimeSample {
  sourceProvider: string;
  startAt: string;
  endAt?: string | null;
  sourceApp?: string | null;
}

export interface BedtimeStripNight {
  dayKey: string;
  bedtimeAt: string | null;
  label: string | null;
  offsetMinutes: number | null;
}

export interface BedtimeStripView {
  kind: BedtimeStripKind;
  visible: boolean;
  lastSyncKind: LastSyncKind | 'none';
  sleepTileSynced: boolean;
  nights: BedtimeStripNight[];
}

export const EMPTY_BEDTIME_STRIP: BedtimeStripView = {
  kind: 'hidden',
  visible: false,
  lastSyncKind: 'none',
  sleepTileSynced: false,
  nights: [],
};

export const SLEEP_SAMPLE_PROVIDER_TO_TILE: Record<string, 'whoop' | 'oura' | 'apple_health'> = {
  whoop: 'whoop',
  oura: 'oura',
  health_kit: 'apple_health',
  apple_health: 'apple_health',
};

const WINDOW_START_MINUTES = 20 * 60;
const WINDOW_SPAN_MINUTES = 12 * 60;

export function lastSyncInputsFromTiles(
  tiles: Array<{
    lastSyncState: LastSyncKind;
    lastSyncAt: string | null;
  }>,
  now?: number,
): LastSyncInput[] {
  return tiles.map((tile) => ({
    linked: tile.lastSyncState === 'synced' || tile.lastSyncState === 'connected_never_synced',
    lastSyncAt: tile.lastSyncAt,
    needsReconnect: tile.lastSyncState === 'needs_reconnect',
    now,
  }));
}

export function resolveSyncedLastSync(inputs: LastSyncInput[]): {
  synced: boolean;
  kind: LastSyncKind | 'none';
} {
  if (inputs.length === 0) {
    return { synced: false, kind: 'none' };
  }

  let fallback: LastSyncKind | 'none' = 'none';
  for (const input of inputs) {
    const state = resolveLastSyncState(input);
    if (state.kind === 'synced') {
      return { synced: true, kind: 'synced' };
    }
    if (fallback === 'none') fallback = state.kind;
  }
  return { synced: false, kind: fallback };
}

export function syncedSleepTileIds(
  tiles: Array<{ id: string; lastSyncState: LastSyncKind }>,
): Set<'whoop' | 'oura' | 'apple_health'> {
  const ids = new Set<'whoop' | 'oura' | 'apple_health'>();
  for (const tile of tiles) {
    if (tile.lastSyncState !== 'synced') continue;
    if (tile.id === 'whoop' || tile.id === 'oura' || tile.id === 'apple_health') {
      ids.add(tile.id);
    }
  }
  return ids;
}

export function parseBedtimeIso(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  const ms = new Date(raw).getTime();
  if (!Number.isFinite(ms)) return null;
  return raw;
}

export function nightKeyFromBedtime(startAt: string): string | null {
  const parsed = parseBedtimeIso(startAt);
  if (!parsed) return null;
  const d = new Date(parsed);
  if (d.getUTCHours() < 12) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

export function formatBedtimeLabel(startAt: string): string | null {
  const parsed = parseBedtimeIso(startAt);
  if (!parsed) return null;
  const d = new Date(parsed);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const suffix = hours < 12 ? 'AM' : 'PM';
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export function bedtimeOffsetMinutes(startAt: string): number | null {
  const parsed = parseBedtimeIso(startAt);
  if (!parsed) return null;
  const d = new Date(parsed);
  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  return (minutes - WINDOW_START_MINUTES + 24 * 60) % (24 * 60);
}

export function bedtimeBarPercent(offsetMinutes: number | null): number | null {
  if (offsetMinutes === null || !Number.isFinite(offsetMinutes)) return null;
  const clamped = Math.min(WINDOW_SPAN_MINUTES, Math.max(0, offsetMinutes));
  return (clamped / WINDOW_SPAN_MINUTES) * 100;
}

export function lastFourteenDayKeys(nowMs: number): string[] {
  const end = new Date(nowMs);
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const keys: string[] = [];
  for (let i = BEDTIME_STRIP_DAYS - 1; i >= 0; i -= 1) {
    keys.push(new Date(endUtc - i * 86400000).toISOString().slice(0, 10));
  }
  return keys;
}

export function weekdayLetter(dayKey: string): string {
  const day = new Date(`${dayKey}T00:00:00.000Z`).getUTCDay();
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][day] ?? '';
}

function sampleBelongsToSyncedTile(
  sample: SleepBedtimeSample,
  syncedTiles: Set<string>,
): boolean {
  if (matchesHume(sample.sourceApp)) return false;
  const tileId = SLEEP_SAMPLE_PROVIDER_TO_TILE[sample.sourceProvider];
  if (!tileId) return false;
  return syncedTiles.has(tileId);
}

function emptyNights(nowMs: number): BedtimeStripNight[] {
  return lastFourteenDayKeys(nowMs).map((dayKey) => ({
    dayKey,
    bedtimeAt: null,
    label: null,
    offsetMinutes: null,
  }));
}

export function buildBedtimeStrip(input: {
  lastSyncInputs: LastSyncInput[];
  samples: SleepBedtimeSample[];
  syncedTileIds: Iterable<string>;
  now?: number;
}): BedtimeStripView {
  const now = input.now ?? Date.now();
  const lastSync = resolveSyncedLastSync(input.lastSyncInputs);
  const syncedTiles = new Set(input.syncedTileIds);
  const sleepTileSynced =
    syncedTiles.has('whoop') || syncedTiles.has('oura') || syncedTiles.has('apple_health');
  if (!lastSync.synced) {
    return {
      kind: 'hidden',
      visible: false,
      lastSyncKind: lastSync.kind,
      sleepTileSynced: false,
      nights: [],
    };
  }
  const windowStart = now - BEDTIME_STRIP_DAYS * 86400000;
  const byNight = new Map<string, string>();

  for (const sample of input.samples) {
    if (!sampleBelongsToSyncedTile(sample, syncedTiles)) continue;
    const startAt = parseBedtimeIso(sample.startAt);
    if (!startAt) continue;
    const ms = new Date(startAt).getTime();
    if (ms < windowStart || ms > now) continue;
    const night = nightKeyFromBedtime(startAt);
    if (!night) continue;
    const prev = byNight.get(night);
    if (!prev || startAt < prev) byNight.set(night, startAt);
  }

  if (byNight.size === 0) {
    return {
      kind: 'empty',
      visible: false,
      lastSyncKind: 'synced',
      sleepTileSynced,
      nights: emptyNights(now),
    };
  }

  const nights = lastFourteenDayKeys(now).map((dayKey) => {
    const bedtimeAt = byNight.get(dayKey) ?? null;
    return {
      dayKey,
      bedtimeAt,
      label: bedtimeAt ? formatBedtimeLabel(bedtimeAt) : null,
      offsetMinutes: bedtimeAt ? bedtimeOffsetMinutes(bedtimeAt) : null,
    };
  });

  return {
    kind: 'samples',
    visible: true,
    lastSyncKind: 'synced',
    sleepTileSynced,
    nights,
  };
}

export function parseBedtimeStrip(raw: unknown): BedtimeStripView {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY_BEDTIME_STRIP;
  const value = raw as Partial<BedtimeStripView>;
  if (value.kind !== 'hidden' && value.kind !== 'empty' && value.kind !== 'samples') {
    return EMPTY_BEDTIME_STRIP;
  }
  if (typeof value.visible !== 'boolean') return EMPTY_BEDTIME_STRIP;
  if (!Array.isArray(value.nights)) return EMPTY_BEDTIME_STRIP;
  const lastSyncKind =
    value.lastSyncKind === 'synced' ||
    value.lastSyncKind === 'not_connected' ||
    value.lastSyncKind === 'connected_never_synced' ||
    value.lastSyncKind === 'needs_reconnect' ||
    value.lastSyncKind === 'none'
      ? value.lastSyncKind
      : 'none';
  return {
    kind: value.kind,
    visible: value.visible === true && value.kind === 'samples',
    lastSyncKind,
    sleepTileSynced: value.sleepTileSynced === true,
    nights: value.nights.filter((night): night is BedtimeStripNight => {
      return !!night && typeof night.dayKey === 'string';
    }),
  };
}
