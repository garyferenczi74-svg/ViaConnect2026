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
    ...over,
  };
}

describe('wearable snapshot', () => {
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
      }),
    );
    expect(snap.tiles.find((t) => t.id === 'hume')?.statusLabel).toBe('Connected via XML');
    expect(snap.tiles.find((t) => t.id === 'apple_health')?.statusLabel).toBe('Connected via XML');
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
        ],
        recoveryRows: [
          { source_provider: 'whoop', recovery_score: 81, cycle_date: '2026-08-20' },
          { source_provider: 'oura', recovery_score: 81, cycle_date: '2026-08-20' },
        ],
        workoutRows: [{ source_provider: 'whoop', strain: 8.4, start_at: '2026-08-20T12:00:00.000Z' }],
        metabolicManual: true,
      }),
    );
    const sleep = rows.find((r) => r.dimension === 'sleep');
    expect(sleep?.disagreement?.detail).toBe('Averaged because equal trust.');
    const recovery = rows.find((r) => r.dimension === 'recovery');
    expect(recovery?.disagreement?.detail).toBe('Averaged because equal trust.');
    const strain = rows.find((r) => r.dimension === 'strain');
    expect(strain?.disagreement?.showWinnerBadge).toBe(false);
    expect(strain?.displayValue).toBe('8.4');
    const metabolic = rows.find((r) => r.dimension === 'metabolic');
    expect(metabolic?.displayValue).toBe('Pending');
    expect(metabolic?.value).toBeNull();
    expect(metabolic?.manual).toBe(true);
  });
});
