import { describe, it, expect } from 'vitest';
import { LAST_SYNC_LABELS } from '../last-sync-state';
import { wearableSyncLineFromTiles } from '../wearable-sync-line';

describe('analytics wearable sync line', () => {
  it('defaults to Not connected when no first-class tile has last-sync', () => {
    expect(wearableSyncLineFromTiles([])).toEqual({
      connected: false,
      lastSyncLabel: LAST_SYNC_LABELS.not_connected,
    });
    expect(
      wearableSyncLineFromTiles([
        { id: 'whoop', lastSyncState: 'not_connected', statusLabel: 'Coming soon' },
        { id: 'fitbit', lastSyncState: 'synced', lastSyncAt: '2026-08-25T00:00:00.000Z', statusLabel: 'Synced just now' },
      ]),
    ).toEqual({
      connected: false,
      lastSyncLabel: LAST_SYNC_LABELS.not_connected,
    });
  });

  it('uses the newest first-class last-sync label and does not invent getWearableSource copy', () => {
    const line = wearableSyncLineFromTiles([
      {
        id: 'oura',
        lastSyncState: 'synced',
        lastSyncAt: '2026-08-24T00:00:00.000Z',
        statusLabel: 'Synced 1d ago',
      },
      {
        id: 'apple_health',
        lastSyncState: 'synced',
        lastSyncAt: '2026-08-25T12:00:00.000Z',
        statusLabel: 'Synced 3 min ago',
      },
    ]);
    expect(line.connected).toBe(true);
    expect(line.lastSyncLabel).toBe('Synced 3 min ago');
    expect(line.lastSyncLabel).not.toMatch(/Synced today|Synced yesterday|Not synced yet/);
  });
});
