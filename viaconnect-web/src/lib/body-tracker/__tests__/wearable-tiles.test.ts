import { describe, it, expect } from 'vitest';
import {
  CONNECTIONS_FOOTER,
  FIRST_CLASS_TILE_IDS,
  WEARABLE_TILE_SPECS,
  WATCH_FORBIDDEN_LABELS,
  appleHealthDisplayName,
  appleStatusLabel,
  buildWearableTiles,
  isAppleHealthConnected,
  isHumeConnected,
  isOAuthConnected,
  type WearableTileInput,
} from '../wearable-tiles';

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
    ...over,
  };
}

describe('wearable tile model', () => {
  it('exposes Whoop, Hume, Apple Health, Oura and no Watch tile', () => {
    expect(FIRST_CLASS_TILE_IDS).toEqual(['whoop', 'hume', 'apple_health', 'oura']);
    expect(WEARABLE_TILE_SPECS.map((s) => s.id)).toEqual([...FIRST_CLASS_TILE_IDS]);
    expect(WEARABLE_TILE_SPECS.some((s) => /watch/i.test(s.name))).toBe(false);
    expect(appleHealthDisplayName()).toBe('Apple Health');
    expect(CONNECTIONS_FOOTER).toBe('Bio Optimization Score uses these sources.');
  });

  it('maps advertised dimensions per Picasso ingest map', () => {
    const byId = Object.fromEntries(WEARABLE_TILE_SPECS.map((s) => [s.id, s.advertisedDimensions]));
    expect(byId.whoop).toEqual(['recovery', 'sleep', 'strain']);
    expect(byId.hume).toEqual(['metabolic']);
    expect(byId.apple_health).toEqual(['sleep', 'metabolic']);
    expect(byId.oura).toEqual(['recovery', 'sleep']);
  });

  it('never connects OAuth from last_sync_at alone', () => {
    expect(
      isOAuthConnected({
        provider: 'whoop',
        status: 'pending',
        last_sync_at: '2026-08-24T00:00:00.000Z',
        has_tokens: false,
      }),
    ).toBe(false);
    expect(
      isOAuthConnected({
        provider: 'oura',
        status: 'connected',
        last_sync_at: null,
        has_tokens: true,
      }),
    ).toBe(true);
    expect(
      isOAuthConnected({
        provider: 'oura',
        status: 'connected',
        last_sync_at: '2026-08-24T00:00:00.000Z',
        has_tokens: false,
      }),
    ).toBe(false);
  });

  it('does not copy HealthKit / phone_health onto Hume', () => {
    expect(isHumeConnected(0)).toBe(false);
    const tiles = buildWearableTiles(
      baseInput({
        healthKitPersisted: true,
        healthKitLastPersistAt: '2026-08-24T00:00:00.000Z',
        platform: 'ios',
      }),
    );
    expect(tiles.find((t) => t.id === 'hume')?.status).toBe('disconnected');
    expect(tiles.find((t) => t.id === 'hume')?.lastSyncAt).toBeNull();
    expect(tiles.find((t) => t.id === 'hume')?.action).toEqual({ kind: 'xml_upload' });
  });

  it('connects Hume only after a Hume-tagged ingest and uses Upload XML', () => {
    const tiles = buildWearableTiles(
      baseInput({
        humeIngestCount: 3,
        humeLastPersistAt: '2026-08-23T12:00:00.000Z',
        dimensionsFed: { hume: ['metabolic'] },
      }),
    );
    const hume = tiles.find((t) => t.id === 'hume');
    expect(hume?.status).toBe('connected');
    expect(hume?.statusLabel).toBe('Connected via XML');
    expect(hume?.lastSyncAt).toBe('2026-08-23T12:00:00.000Z');
    expect(hume?.action.kind).toBe('xml_upload');
  });

  it('web Apple tile is Connected via XML and never Watch', () => {
    const tiles = buildWearableTiles(
      baseInput({
        appleXmlIngested: 4,
        appleXmlLastPersistAt: '2026-08-22T08:00:00.000Z',
        healthKitPersisted: true,
        healthKitLastPersistAt: '2026-08-22T09:00:00.000Z',
        platform: 'web',
      }),
    );
    const apple = tiles.find((t) => t.id === 'apple_health');
    expect(apple?.name).toBe('Apple Health');
    expect(apple?.statusLabel).toBe('Connected via XML');
    expect(apple?.lastSyncAt).toBe('2026-08-22T08:00:00.000Z');
    expect(apple?.lastSyncKind).toBe('xml_upload');
    expect(apple?.appleWatchConnected).toBe(false);
    for (const label of WATCH_FORBIDDEN_LABELS) {
      expect(apple?.statusLabel).not.toContain(label);
      expect(apple?.name).not.toContain(label);
    }
  });

  it('web Apple stays disconnected when only HealthKit exists', () => {
    expect(
      isAppleHealthConnected({
        appleXmlIngested: 0,
        healthKitPersisted: true,
        platform: 'web',
      }),
    ).toBe(false);
    const tiles = buildWearableTiles(
      baseInput({ healthKitPersisted: true, platform: 'web' }),
    );
    expect(tiles.find((t) => t.id === 'apple_health')?.status).toBe('disconnected');
    expect(tiles.find((t) => t.id === 'apple_health')?.lastSyncAt).toBeNull();
  });

  it('leaves lastSyncAt null when disconnected', () => {
    const tiles = buildWearableTiles(baseInput());
    for (const tile of tiles) {
      expect(tile.status).toBe('disconnected');
      expect(tile.statusLabel).toBe('Not connected');
      expect(tile.lastSyncAt).toBeNull();
      expect(tile.dimensionsFed).toEqual([]);
    }
  });

  it('labels Apple XML vs not connected', () => {
    expect(appleStatusLabel({ connected: false, xmlIngested: 0 })).toBe('Not connected');
    expect(appleStatusLabel({ connected: true, xmlIngested: 2 })).toBe('Connected via XML');
  });
});
