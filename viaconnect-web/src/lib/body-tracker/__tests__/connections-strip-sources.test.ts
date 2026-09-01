import { describe, it, expect } from 'vitest';
import { FIRST_CLASS_TILE_IDS } from '../wearable-tiles';
import { buildConnectionsStripSources } from '../connections-strip-sources';

describe('ConnectionsStrip sources SSOT', () => {
  it('lists first-class tiles including Clair and never hardcodes connected:true', () => {
    const sources = buildConnectionsStripSources([]);
    expect(sources.map((s) => s.id)).toEqual([...FIRST_CLASS_TILE_IDS]);
    expect(sources).toHaveLength(FIRST_CLASS_TILE_IDS.length);
    expect(sources.find((s) => s.id === 'clair')?.label).toBe('Clair Health');
    expect(sources.find((s) => s.id === 'clair')?.connected).toBe(false);
    expect(sources.every((s) => s.connected === false)).toBe(true);
    expect(JSON.stringify(sources)).not.toMatch(/"connected":true/);
  });

  it('marks Connected only after a real last-sync', () => {
    const sources = buildConnectionsStripSources([
      { id: 'apple_health', lastSyncState: 'synced', statusLabel: 'Synced 3 min ago' },
      { id: 'whoop', lastSyncState: 'not_connected', statusLabel: 'Coming soon' },
      { id: 'hume', lastSyncState: 'connected_never_synced', statusLabel: 'Connected never synced' },
    ]);
    expect(sources.find((s) => s.id === 'apple_health')?.connected).toBe(true);
    expect(sources.find((s) => s.id === 'whoop')?.connected).toBe(false);
    expect(sources.find((s) => s.id === 'whoop')?.statusLabel).toBe('Coming soon');
    expect(sources.find((s) => s.id === 'hume')?.connected).toBe(false);
    expect(sources.find((s) => s.id === 'garmin')?.connected).toBe(false);
    expect(sources.find((s) => s.id === 'google_health')?.connected).toBe(false);
  });

  it('includes google_health and garmin labels from first-class specs', () => {
    const sources = buildConnectionsStripSources([]);
    expect(sources.find((s) => s.id === 'google_health')?.label).toBe('Google Health');
    expect(sources.find((s) => s.id === 'garmin')?.label).toBe('Garmin');
    expect(sources.find((s) => s.id === 'clair')?.label).toBe('Clair Health');
    expect(sources.find((s) => s.id === 'hume')?.label).toBe('Hume Body Pod');
  });
});
