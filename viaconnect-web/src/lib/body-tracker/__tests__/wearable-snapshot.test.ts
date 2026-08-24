import { describe, it, expect } from 'vitest';
import {
  assembleWearableSnapshot,
  formatTileLastSync,
  scoreDetailFromSnapshot,
  type WearableSnapshotInput,
} from '../wearable-snapshot';

function base(over: Partial<WearableSnapshotInput> = {}): WearableSnapshotInput {
  return {
    connected: [],
    tokenProviders: [],
    appleImports: [],
    bodyRows: [],
    sleepRows: [],
    recoveryRows: [],
    workoutRows: [],
    healthKitPersisted: false,
    healthKitLastPersistAt: null,
    whoopConfigured: false,
    ouraConfigured: false,
    platform: 'web',
    metabolicManual: true,
    now: Date.parse('2026-08-24T12:00:00.000Z'),
    ...over,
  };
}

describe('wearable snapshot', () => {
  it('ignores leftover OAuth rows until secrets are provisioned', () => {
    const snap = assembleWearableSnapshot(
      base({
        connected: [
          { provider: 'whoop', status: 'connected', last_sync_at: '2026-08-24T00:00:00.000Z' },
          { provider: 'oura', status: 'connected', last_sync_at: '2026-08-24T00:00:00.000Z' },
        ],
        tokenProviders: ['whoop', 'oura'],
        appleImports: [{ records_ingested: 8, created_at: '2026-08-22T08:00:00.000Z' }],
        whoopConfigured: false,
        ouraConfigured: false,
        now: Date.parse('2026-08-24T10:00:00.000Z'),
      }),
    );
    expect(snap.tiles.find((t) => t.id === 'whoop')?.statusLabel).toBe('Not connected');
    expect(snap.tiles.find((t) => t.id === 'oura')?.statusLabel).toBe('Not connected');
    expect(snap.tiles.find((t) => t.id === 'apple_health')?.lastSyncState).toBe('synced');
    expect(snap.tiles.find((t) => t.id === 'apple_health')?.statusLabel).toBe('Synced 2d ago');
    expect(snap.tiles.find((t) => t.id === 'apple_health')?.lastSyncAt).toBe('2026-08-22T08:00:00.000Z');
    expect(snap.tiles.every((t) => t.appleWatchConnected === false)).toBe(true);
  });

  it('does not invent last sync and never marks Watch connected', () => {
    const snap = assembleWearableSnapshot(base());
    expect(snap.tiles.map((t) => t.id)).toEqual(['whoop', 'hume', 'apple_health', 'oura']);
    expect(snap.tiles.every((t) => t.lastSyncAt === null)).toBe(true);
    expect(snap.tiles.every((t) => t.appleWatchConnected === false)).toBe(true);
    expect(formatTileLastSync(null, 'oauth_sync')).toBeNull();
  });

  it('connects Hume only after Hume-tagged persist and Apple via XML', () => {
    const snap = assembleWearableSnapshot(
      base({
        bodyRows: [
          {
            measured_at: '2026-08-20T07:00:00.000Z',
            updated_at: '2026-08-20T07:00:00.000Z',
            source_app: 'Hume Health',
            weight_kg: 70.1,
            body_fat_pct: 18.4,
          },
        ],
        appleImports: [{ records_ingested: 12, created_at: '2026-08-20T09:00:00.000Z' }],
        now: Date.parse('2026-08-24T10:00:00.000Z'),
      }),
    );
    expect(snap.tiles.find((t) => t.id === 'hume')?.lastSyncState).toBe('synced');
    expect(snap.tiles.find((t) => t.id === 'apple_health')?.lastSyncState).toBe('synced');
    expect(snap.tiles.find((t) => t.id === 'hume')?.statusLabel).toBe('Synced 4d ago');
    expect(snap.tiles.find((t) => t.id === 'apple_health')?.statusLabel).toBe('Synced 4d ago');
    expect(snap.tiles.find((t) => t.id === 'hume')?.action.kind).toBe('xml_upload');
  });

  it('shows DISAGREE, equal-trust average, Pending, and never a fake 0', () => {
    const rows = scoreDetailFromSnapshot(
      base({
        sleepRows: [
          {
            source_provider: 'whoop',
            sleep_efficiency_pct: 72,
            total_sleep_min: 420,
            end_at: '2026-08-20T10:00:00.000Z',
          },
          {
            source_provider: 'oura',
            sleep_efficiency_pct: 64,
            total_sleep_min: 400,
            end_at: '2026-08-20T10:05:00.000Z',
          },
          {
            source_provider: 'health_kit',
            sleep_efficiency_pct: 50,
            total_sleep_min: 380,
            end_at: '2026-08-20T10:06:00.000Z',
            source_app: 'Health',
          },
        ],
        recoveryRows: [
          { source_provider: 'whoop', recovery_score: 81, cycle_date: '2026-08-20' },
          { source_provider: 'oura', recovery_score: 81, cycle_date: '2026-08-20' },
        ],
        workoutRows: [
          { source_provider: 'whoop', strain: 8.4, start_at: '2026-08-20T12:00:00.000Z' },
          { source_provider: 'oura', strain: 6.1, start_at: '2026-08-20T12:05:00.000Z' },
        ],
        metabolicManual: false,
      }),
    );
    const sleep = rows.find((r) => r.dimension === 'sleep');
    expect(sleep?.disagreement?.detail).toBe('averaged because equal trust.');
    expect(sleep?.disagreement?.showDisagreeChrome).toBe(true);
    expect(sleep?.displayValue).toBe('68');
    expect(sleep?.sources.map((s) => s.source)).toEqual(['whoop', 'oura', 'apple_health']);
    expect(sleep?.sources.find((s) => s.source === 'apple_health')?.value).toBe(50);
    const recovery = rows.find((r) => r.dimension === 'recovery');
    expect(recovery?.disagreement?.showDisagreeChrome).toBe(false);
    expect(recovery?.sources.some((s) => s.label === 'Oura Readiness')).toBe(true);
    const strain = rows.find((r) => r.dimension === 'strain');
    expect(strain?.disagreement?.showWinnerBadge).toBe(false);
    expect(strain?.displayValue).toBe('8.4');
    expect(strain?.sources.every((s) => s.source === 'whoop')).toBe(true);
    const metabolic = rows.find((r) => r.dimension === 'metabolic');
    expect(metabolic?.displayValue).toBe('UNKNOWN');
    expect(metabolic?.showRing).toBe(false);
    expect(metabolic?.value).toBeNull();
    expect(metabolic?.manual).toBe(false);
  });

  it('does not feed Hume into sleep or invent Oura strain', () => {
    const rows = scoreDetailFromSnapshot(
      base({
        sleepRows: [
          {
            source_provider: 'health_kit',
            sleep_efficiency_pct: 70,
            total_sleep_min: 400,
            end_at: '2026-08-20T10:00:00.000Z',
            source_app: 'Hume Health',
          },
        ],
        workoutRows: [{ source_provider: 'oura', strain: 9.9, start_at: '2026-08-20T12:00:00.000Z' }],
      }),
    );
    expect(rows.find((r) => r.dimension === 'sleep')?.sources).toEqual([]);
    expect(rows.find((r) => r.dimension === 'strain')?.displayValue).toBe('UNKNOWN');
    expect(rows.find((r) => r.dimension === 'strain')?.showRing).toBe(false);
  });
});
