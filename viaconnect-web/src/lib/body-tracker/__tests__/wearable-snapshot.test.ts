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
    dailyVitalsRows: [],
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
    expect(snap.tiles.find((t) => t.id === 'whoop')?.statusLabel).toBe('Coming soon');
    expect(snap.tiles.find((t) => t.id === 'oura')?.statusLabel).toBe('Coming soon');
    expect(snap.tiles.find((t) => t.id === 'apple_health')?.lastSyncState).toBe('synced');
    expect(snap.tiles.find((t) => t.id === 'apple_health')?.statusLabel).toBe('Synced 2d ago');
    expect(snap.tiles.find((t) => t.id === 'apple_health')?.lastSyncAt).toBe('2026-08-22T08:00:00.000Z');
    expect(snap.tiles.every((t) => t.appleWatchConnected === false)).toBe(true);
  });

  it('does not invent last sync and never marks Watch connected', () => {
    const snap = assembleWearableSnapshot(base());
    expect(snap.tiles.map((t) => t.id)).toEqual([
      'whoop',
      'hume',
      'apple_health',
      'oura',
      'google_health',
      'garmin',
    ]);
    expect(snap.tiles.every((t) => t.lastSyncAt === null)).toBe(true);
    expect(snap.tiles.every((t) => t.appleWatchConnected === false)).toBe(true);
    expect(formatTileLastSync(null, 'oauth_sync')).toBeNull();
    expect(snap.bedtimeStrip.visible).toBe(false);
    expect(snap.bedtimeStrip.kind).toBe('hidden');
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

  it('does not unlock Hume last-sync or Apple Sleep from Hume-tagged Apple-export sleep', () => {
    const snap = assembleWearableSnapshot(
      base({
        sleepRows: [
          {
            source_provider: 'health_kit',
            sleep_efficiency_pct: 88,
            total_sleep_min: 420,
            end_at: '2026-08-20T10:00:00.000Z',
            source_app: 'hume_body_pod',
          },
        ],
      }),
    );
    const hume = snap.tiles.find((t) => t.id === 'hume');
    const apple = snap.tiles.find((t) => t.id === 'apple_health');
    expect(hume?.status).toBe('disconnected');
    expect(hume?.lastSyncState).toBe('not_connected');
    expect(hume?.lastSyncAt).toBeNull();
    expect(hume?.dimensionsFed).toEqual([]);
    expect(apple?.status).toBe('disconnected');
    expect(apple?.lastSyncAt).toBeNull();
    expect(apple?.advertisedDimensions).toEqual(['body_comp', 'metabolic']);
    expect(apple?.dimensionsFed).toEqual([]);
    expect(apple?.advertisedDimensions).not.toContain('sleep');
    expect(snap.scoreDetail.find((r) => r.dimension === 'sleep')?.sources).toEqual([]);
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

  it('sources hrv, resting_hr, and steps honestly when real data exists (Task 7b)', () => {
    const rows = scoreDetailFromSnapshot(
      base({
        recoveryRows: [
          {
            source_provider: 'whoop',
            recovery_score: 70,
            cycle_date: '2026-08-20',
            hrv_ms: 55,
            resting_hr_bpm: 52,
          },
        ],
        dailyVitalsRows: [
          {
            source_provider: 'health_kit',
            steps: 8452,
            metric_date: '2026-08-20',
            source_app: 'Health',
          },
        ],
      }),
    );
    const hrv = rows.find((r) => r.dimension === 'hrv');
    expect(hrv?.showRing).toBe(true);
    expect(hrv?.displayValue).toBe('55');
    expect(hrv?.sources.map((s) => s.source)).toEqual(['whoop']);

    const restingHr = rows.find((r) => r.dimension === 'resting_hr');
    expect(restingHr?.showRing).toBe(true);
    expect(restingHr?.displayValue).toBe('52');
    expect(restingHr?.sources.map((s) => s.source)).toEqual(['whoop']);

    const steps = rows.find((r) => r.dimension === 'steps');
    expect(steps?.showRing).toBe(true);
    expect(steps?.displayValue).toBe('8452');
    expect(steps?.source).toBe('apple_health');
  });

  it('leaves hrv, resting_hr, and steps absent (Connect your device) with no real data', () => {
    const rows = scoreDetailFromSnapshot(base());
    const hrv = rows.find((r) => r.dimension === 'hrv');
    expect(hrv?.showRing).toBe(false);
    expect(hrv?.displayValue).toBe('UNKNOWN');
    expect(hrv?.value).toBeNull();
    const restingHr = rows.find((r) => r.dimension === 'resting_hr');
    expect(restingHr?.showRing).toBe(false);
    expect(restingHr?.value).toBeNull();
    const steps = rows.find((r) => r.dimension === 'steps');
    expect(steps?.showRing).toBe(false);
    expect(steps?.value).toBeNull();
  });

  it('excludes Oura contributor-score rows from hrv and resting_hr (unit mismatch honesty gate)', () => {
    const rows = scoreDetailFromSnapshot(
      base({
        recoveryRows: [
          {
            source_provider: 'oura',
            recovery_score: 65,
            cycle_date: '2026-08-20',
            hrv_ms: 78,
            resting_hr_bpm: 82,
          },
        ],
      }),
    );
    const hrv = rows.find((r) => r.dimension === 'hrv');
    expect(hrv?.sources).toEqual([]);
    expect(hrv?.showRing).toBe(false);
    expect(hrv?.displayValue).toBe('UNKNOWN');

    const restingHr = rows.find((r) => r.dimension === 'resting_hr');
    expect(restingHr?.sources).toEqual([]);
    expect(restingHr?.showRing).toBe(false);

    // Recovery (Oura's actual 0-100 readiness score) is a different dimension
    // and stays legitimate -- only hrv/resting_hr are unit-mismatched.
    const recovery = rows.find((r) => r.dimension === 'recovery');
    expect(recovery?.showRing).toBe(true);
  });

  it('resolves hrv/resting_hr independently per metric and prefers Whoop over Apple Health on disagreement', () => {
    const rows = scoreDetailFromSnapshot(
      base({
        recoveryRows: [
          {
            source_provider: 'whoop',
            recovery_score: 70,
            cycle_date: '2026-08-20',
            hrv_ms: 60,
            resting_hr_bpm: 50,
          },
          {
            // Apple Health XML writes one wearable_recovery row per metricKey,
            // so a health_kit row can carry hrv_ms without resting_hr_bpm.
            source_provider: 'health_kit',
            recovery_score: null,
            cycle_date: '2026-08-20',
            hrv_ms: 45,
            resting_hr_bpm: null,
            source_app: 'Health',
          },
        ],
      }),
    );
    const hrv = rows.find((r) => r.dimension === 'hrv');
    expect(hrv?.sources.map((s) => s.source).sort()).toEqual(['apple_health', 'whoop']);
    expect(hrv?.source).toBe('whoop');
    expect(hrv?.disagreement?.showDisagreeChrome).toBe(true);

    const restingHr = rows.find((r) => r.dimension === 'resting_hr');
    expect(restingHr?.sources.map((s) => s.source)).toEqual(['whoop']);
    expect(restingHr?.displayValue).toBe('50');
  });

  it('builds a bedtime strip only from a real last-sync plus real start_at samples', () => {
    const leftover = assembleWearableSnapshot(
      base({
        sleepRows: [
          {
            source_provider: 'whoop',
            sleep_efficiency_pct: 72,
            total_sleep_min: 420,
            start_at: '2026-08-20T02:10:00.000Z',
            end_at: '2026-08-20T10:00:00.000Z',
          },
        ],
      }),
    );
    expect(leftover.bedtimeStrip.visible).toBe(false);
    expect(leftover.bedtimeStrip.kind).toBe('hidden');
    expect(leftover.tiles.find((t) => t.id === 'whoop')?.statusLabel).toBe('Coming soon');

    const apple = assembleWearableSnapshot(
      base({
        appleImports: [{ records_ingested: 8, created_at: '2026-08-22T08:00:00.000Z' }],
        sleepRows: [
          {
            source_provider: 'health_kit',
            sleep_efficiency_pct: null,
            total_sleep_min: 470,
            start_at: '2026-08-20T02:10:00.000Z',
            end_at: '2026-08-20T10:00:00.000Z',
            source_app: 'Health',
          },
        ],
      }),
    );
    expect(apple.tiles.find((t) => t.id === 'apple_health')?.lastSyncState).toBe('synced');
    expect(apple.bedtimeStrip.visible).toBe(true);
    expect(apple.bedtimeStrip.kind).toBe('samples');
    expect(apple.bedtimeStrip.nights.some((n) => n.bedtimeAt === '2026-08-20T02:10:00.000Z')).toBe(
      true,
    );
    expect(apple.bedtimeStrip.nights.every((n) => n.bedtimeAt !== '2025-05-20T00:00:00.000Z')).toBe(
      true,
    );
  });
});
