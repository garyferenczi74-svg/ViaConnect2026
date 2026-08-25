// Phase 2: one logged protocol habit next to Sleep.
// Hide unless a real Sleep last-sync AND a real completed/taken habit exist.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveLastSyncState } from '@/lib/body-tracker/last-sync-state';
import type { ScheduleView } from '@/lib/caq/supplements/timing/assignTiming';
import {
  EMPTY_HABIT_SLEEP_PAIR,
  HABIT_SLEEP_DIMENSION,
  firstLoggedHabitName,
  habitSleepPairSentence,
  isSleepLastSyncSynced,
  resolveHabitSleepPair,
  sleepLastSyncFromWearablePayload,
} from '../habit-sleep-pair';

const ROOT = process.cwd();
const NOW = Date.parse('2026-08-25T12:00:00.000Z');

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function card(
  slot: 'morning' | 'afternoon' | 'evening',
  name: string,
  taken = false,
): ScheduleView['morning'][0] {
  return {
    slot_id: `${slot}-${name}`,
    user_supplement_id: `u-${name}`,
    name,
    dose: '1',
    time_of_day: slot,
    time_source: 'hannah',
    rationale: null,
    with_food: false,
    empty_stomach: false,
    fat_soluble: false,
    away_from: [],
    taken,
    display_order: 0,
  };
}

function tiles(over: Partial<Record<'whoop' | 'hume' | 'apple_health' | 'oura', {
  lastSyncState: 'not_connected' | 'connected_never_synced' | 'synced' | 'needs_reconnect';
  lastSyncAt: string | null;
}>> = {}) {
  const base = {
    lastSyncState: 'not_connected' as const,
    lastSyncAt: null,
  };
  return [
    { id: 'whoop', ...(over.whoop ?? base) },
    { id: 'hume', ...(over.hume ?? base) },
    { id: 'apple_health', ...(over.apple_health ?? base) },
    { id: 'oura', ...(over.oura ?? base) },
  ];
}

const appleSynced = tiles({
  apple_health: {
    lastSyncState: 'synced',
    lastSyncAt: '2026-08-22T08:00:00.000Z',
  },
});

const takenMthfr: ScheduleView = {
  morning: [card('morning', 'MTHFR+', true)],
  afternoon: [],
  evening: [],
};

const scheduledNotTaken: ScheduleView = {
  morning: [card('morning', 'MTHFR+', false)],
  afternoon: [],
  evening: [],
};

describe('Phase 2 habit-sleep pair resolver', () => {
  it('hides the pair with no last-sync, even if a habit exists', () => {
    const none = resolveHabitSleepPair({
      tiles: tiles(),
      schedule: takenMthfr,
      now: NOW,
    });
    expect(none).toEqual(EMPTY_HABIT_SLEEP_PAIR);
    expect(none.visible).toBe(false);
    expect(none.kind).toBe('hidden');
    expect(none.habitName).toBeNull();
    expect(none.sentence).toBeNull();
    expect(isSleepLastSyncSynced(tiles(), NOW)).toBe(false);
    expect(
      resolveLastSyncState({ linked: false, lastSyncAt: null, now: NOW }).kind,
    ).not.toBe('synced');
  });

  it('hides the pair with last-sync but no logged habit and does not invent one', () => {
    const none = resolveHabitSleepPair({
      tiles: appleSynced,
      schedule: scheduledNotTaken,
      now: NOW,
    });
    expect(isSleepLastSyncSynced(appleSynced, NOW)).toBe(true);
    expect(firstLoggedHabitName(scheduledNotTaken)).toBeNull();
    expect(firstLoggedHabitName(null)).toBeNull();
    expect(firstLoggedHabitName({ morning: [], afternoon: [], evening: [] })).toBeNull();
    expect(none.visible).toBe(false);
    expect(none.habitName).toBeNull();
    expect(none.sentence).not.toContain('MTHFR+');
    expect(resolveHabitSleepPair({ tiles: appleSynced, habitName: '', now: NOW }).visible).toBe(
      false,
    );
    expect(
      resolveHabitSleepPair({
        tiles: appleSynced,
        adherenceRows: [{ completed: true, product_slug: 'mthfr-plus' }],
        now: NOW,
      }).visible,
    ).toBe(false);
  });

  it('shows the pair only with real last-sync AND a real completed/taken habit', () => {
    const pair = resolveHabitSleepPair({
      tiles: appleSynced,
      schedule: takenMthfr,
      now: NOW,
    });
    expect(pair.visible).toBe(true);
    expect(pair.kind).toBe('visible');
    expect(pair.habitName).toBe('MTHFR+');
    expect(pair.dimension).toBe('Sleep');
    expect(pair.dimension).toBe(HABIT_SLEEP_DIMENSION);
    expect(pair.sentence).toBe(habitSleepPairSentence('MTHFR+'));
    expect(pair.sentence).toBe(
      'MTHFR+ is one habit you logged, shown next to Sleep. It is educational context, not a diagnosis, and it is not a correlation.',
    );
    expect(pair.sentence).not.toMatch(/\br\s*=/);
    expect(pair.sentence).not.toContain('Sleep Score');
    expect(pair.sentence).not.toContain('Vitality');
    expect(pair.sentence).not.toContain('62');
    expect(pair.sentence).not.toMatch(/\b0\b/);

    const fromAdherence = resolveHabitSleepPair({
      tiles: appleSynced,
      adherenceRows: [{ completed: true, name: 'NAD+' }],
      now: NOW,
    });
    expect(fromAdherence.visible).toBe(true);
    expect(fromAdherence.habitName).toBe('NAD+');
    expect(fromAdherence.sentence).toContain('NAD+ is one habit you logged, shown next to Sleep');
  });

  it('does not unlock Sleep from Hume-only last-sync', () => {
    const humeOnly = tiles({
      hume: {
        lastSyncState: 'synced',
        lastSyncAt: '2026-08-22T08:00:00.000Z',
      },
    });
    const pair = resolveHabitSleepPair({
      tiles: humeOnly,
      schedule: takenMthfr,
      now: NOW,
    });
    expect(isSleepLastSyncSynced(humeOnly, NOW)).toBe(false);
    expect(pair.visible).toBe(false);
    expect(pair.kind).toBe('hidden');
  });

  it('reads last-sync from last-sync-state only and stays on Phase 2', () => {
    const resolver = src('src/lib/body-tracker/habit-sleep-pair.ts');
    expect(resolver).toContain("@/lib/body-tracker/last-sync-state");
    expect(resolver).toContain('resolveLastSyncState');
    expect(resolver).toContain('resolveSyncedLastSync');
    expect(resolver).toContain('sleepTileSynced');
    expect(resolver).not.toContain('last-sync-state-fork');
    expect(resolver).not.toContain('LAST_SYNC_STATES');
    expect(resolver).not.toContain('2025-05');
    expect(resolver).not.toMatch(/habit vs Recovery|protocol-change|3D privacy/i);
    expect(resolver).not.toMatch(/genex_m|GCG|GLP1R|GLP-1|Semaglutide/i);
    expect(resolver).not.toContain('Sleep Score');
    expect(resolver).not.toContain('Vitality');
    expect(resolver).not.toContain('Helix');
    expect(
      sleepLastSyncFromWearablePayload({
        tiles: appleSynced,
        bedtimeStrip: { sleepTileSynced: false },
      }),
    ).toBe(true);
    expect(
      sleepLastSyncFromWearablePayload({
        bedtimeStrip: { kind: 'empty', visible: false, lastSyncKind: 'synced', sleepTileSynced: true, nights: [] },
      }),
    ).toBe(true);
    expect(sleepLastSyncFromWearablePayload({})).toBe(false);
  });
});
