// Phase 2: one logged protocol habit next to one Bio Optimization Score
// dimension (Sleep). Educational context only. Not a diagnosis. Not a
// correlation. Hide unless a real Sleep last-sync AND a real logged habit.
//
// last-sync-state comes from @/lib/body-tracker/last-sync-state only.
// Sleep last-sync reuses Phase 1 helpers (sleepTileSynced / resolveSyncedLastSync).

import {
  resolveLastSyncState,
  type LastSyncInput,
  type LastSyncKind,
} from '@/lib/body-tracker/last-sync-state';
import {
  lastSyncInputsFromTiles,
  resolveSyncedLastSync,
} from '@/lib/body-tracker/sleep-bedtime-strip';

export const HABIT_SLEEP_DIMENSION = 'Sleep' as const;

export type HabitSleepPairKind = 'hidden' | 'visible';

export interface HabitSleepPairView {
  kind: HabitSleepPairKind;
  visible: boolean;
  habitName: string | null;
  dimension: typeof HABIT_SLEEP_DIMENSION;
  sentence: string | null;
}

export const EMPTY_HABIT_SLEEP_PAIR: HabitSleepPairView = {
  kind: 'hidden',
  visible: false,
  habitName: null,
  dimension: HABIT_SLEEP_DIMENSION,
  sentence: null,
};

export interface HabitNameRow {
  name?: string | null;
  product_slug?: string | null;
  taken?: boolean;
  completed?: boolean;
}

export interface HabitNameSource {
  morning?: ReadonlyArray<HabitNameRow>;
  afternoon?: ReadonlyArray<HabitNameRow>;
  evening?: ReadonlyArray<HabitNameRow>;
}

export interface SleepCapableTile {
  id: string;
  lastSyncState: LastSyncKind;
  lastSyncAt?: string | null;
}

export interface HabitSleepPairInput {
  tiles?: ReadonlyArray<SleepCapableTile>;
  lastSyncInputs?: LastSyncInput[];
  sleepTileSynced?: boolean;
  habitName?: string | null;
  schedule?: HabitNameSource | null;
  adherenceRows?: ReadonlyArray<HabitNameRow> | null;
  now?: number;
}

const SLEEP_TILE_IDS = new Set(['whoop', 'oura', 'apple_health']);

function realHabitName(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function rowIsLogged(row: HabitNameRow): boolean {
  return row.taken === true || row.completed === true;
}

function nameFromLoggedRow(row: HabitNameRow): string | null {
  if (!rowIsLogged(row)) return null;
  return realHabitName(row.name);
}

export function habitSleepPairSentence(habitName: string): string {
  return `${habitName} is one habit you logged, shown next to Sleep. It is educational context, not a diagnosis, and it is not a correlation.`;
}

export function firstLoggedHabitName(
  schedule?: HabitNameSource | null,
  adherenceRows?: ReadonlyArray<HabitNameRow> | null,
): string | null {
  if (schedule) {
    for (const bucket of ['morning', 'afternoon', 'evening'] as const) {
      for (const row of schedule[bucket] ?? []) {
        const name = nameFromLoggedRow(row);
        if (name) return name;
      }
    }
  }
  if (adherenceRows) {
    for (const row of adherenceRows) {
      const name = nameFromLoggedRow(row);
      if (name) return name;
    }
  }
  return null;
}

function sleepCapableTiles(
  tiles: ReadonlyArray<SleepCapableTile>,
): SleepCapableTile[] {
  return tiles.filter((tile) => SLEEP_TILE_IDS.has(tile.id));
}

export function isSleepLastSyncSynced(
  tiles: ReadonlyArray<SleepCapableTile>,
  now?: number,
): boolean {
  const sleepTiles = sleepCapableTiles(tiles);
  if (sleepTiles.length === 0) return false;

  const inputs = lastSyncInputsFromTiles(
    sleepTiles.map((tile) => ({
      lastSyncState: tile.lastSyncState,
      lastSyncAt: tile.lastSyncAt ?? null,
    })),
    now,
  );
  let syncedByResolver = false;
  for (const input of inputs) {
    if (resolveLastSyncState(input).kind === 'synced') {
      syncedByResolver = true;
      break;
    }
  }
  const lastSync = resolveSyncedLastSync(inputs);
  const sleepTileSynced =
    sleepTiles.some((tile) => tile.lastSyncState === 'synced');
  return syncedByResolver && lastSync.synced && sleepTileSynced;
}

export function sleepLastSyncFromWearablePayload(payload: {
  tiles?: ReadonlyArray<SleepCapableTile> | null;
  bedtimeStrip?: { sleepTileSynced?: boolean } | null;
  now?: number;
}): boolean {
  if (Array.isArray(payload.tiles) && payload.tiles.length > 0) {
    return isSleepLastSyncSynced(payload.tiles, payload.now);
  }
  return payload.bedtimeStrip?.sleepTileSynced === true;
}

function resolveSleepGate(input: HabitSleepPairInput): boolean {
  if (input.tiles && input.tiles.length > 0) {
    return isSleepLastSyncSynced(input.tiles, input.now);
  }
  return input.sleepTileSynced === true;
}

function resolveHabitName(input: HabitSleepPairInput): string | null {
  const explicit = realHabitName(input.habitName);
  if (explicit) return explicit;
  return firstLoggedHabitName(input.schedule, input.adherenceRows);
}

export function resolveHabitSleepPair(input: HabitSleepPairInput): HabitSleepPairView {
  const sleepTileSynced = resolveSleepGate(input);
  const habitName = resolveHabitName(input);
  if (!sleepTileSynced || !habitName) {
    return EMPTY_HABIT_SLEEP_PAIR;
  }
  return {
    kind: 'visible',
    visible: true,
    habitName,
    dimension: HABIT_SLEEP_DIMENSION,
    sentence: habitSleepPairSentence(habitName),
  };
}
