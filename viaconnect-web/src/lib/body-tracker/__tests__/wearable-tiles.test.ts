import { describe, it, expect } from 'vitest';
import {
  APPLE_HEALTH_DROPZONE_COPY,
  BOS_UNKNOWN_NEVER_ZERO_COPY,
  CONNECTIONS_BOS_COMPOSITE,
  CONNECTIONS_FOOTER,
  FIRST_CLASS_TILE_IDS,
  FORBIDDEN_FIRST_CLASS_TILE_IDS,
  OAUTH_COMING_SOON_LABEL,
  WEARABLE_TILE_SPECS,
  WATCH_FORBIDDEN_LABELS,
  appleHealthDisplayName,
  appleStatusLabel,
  buildWearableTiles,
  isComingSoonTile,
  railFeedDimensions,
  railFeedHeading,
  tileContributorLine,
  connectionsBosCompositeDisplay,
  connectionsBosNumericScore,
  namedWearableContributorCount,
  resolveConnectionsBosDisplay,
  isAppleHealthConnected,
  isHumeConnected,
  isOAuthConnected,
  oauthDisplayLabel,
  type WearableTileInput,
} from '../wearable-tiles';

const NOW = Date.parse('2026-08-24T10:00:00.000Z');

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
    googleHealthConfigured: false,
    garminConfigured: false,
    platform: 'web',
    now: NOW,
    ...over,
  };
}

describe('wearable tile model', () => {
  it('exposes Whoop, Hume Body Pod, Apple Health, Oura, Google Health, Garmin and no Watch tile', () => {
    expect(FIRST_CLASS_TILE_IDS).toEqual([
      'whoop',
      'hume',
      'apple_health',
      'oura',
      'google_health',
      'garmin',
    ]);
    expect(WEARABLE_TILE_SPECS.map((s) => s.id)).toEqual([...FIRST_CLASS_TILE_IDS]);
    expect(WEARABLE_TILE_SPECS.map((s) => s.name)).toEqual([
      'Whoop',
      'Hume Body Pod',
      'Apple Health',
      'Oura',
      'Google Health',
      'Garmin',
    ]);
    expect(WEARABLE_TILE_SPECS.some((s) => /watch/i.test(s.name))).toBe(false);
    expect((FIRST_CLASS_TILE_IDS as readonly string[]).includes('drinklinc')).toBe(false);
    expect(WEARABLE_TILE_SPECS.some((s) => s.id === 'drinklinc' || /linc/i.test(s.name))).toBe(
      false,
    );
    expect(appleHealthDisplayName()).toBe('Apple Health');
    expect(CONNECTIONS_FOOTER).toBe('Bio Optimization Score uses these sources.');
    for (const id of FORBIDDEN_FIRST_CLASS_TILE_IDS) {
      expect((FIRST_CLASS_TILE_IDS as readonly string[]).includes(id)).toBe(false);
    }
  });

  it('maps advertised dimensions per Arnold source map', () => {
    const byId = Object.fromEntries(WEARABLE_TILE_SPECS.map((s) => [s.id, s.advertisedDimensions]));
    expect(byId.whoop).toEqual(['sleep', 'recovery', 'strain']);
    expect(byId.hume).toEqual(['body_comp', 'metabolic']);
    expect(byId.apple_health).toEqual(['body_comp', 'metabolic']);
    expect(byId.oura).toEqual(['sleep', 'recovery']);
    expect(byId.google_health).toEqual([]);
    expect(byId.garmin).toEqual([]);
    expect(byId.apple_health).not.toContain('sleep');
  });

  it('never connects OAuth from last_sync_at alone', () => {
    expect(
      isOAuthConnected(
        {
          provider: 'whoop',
          status: 'pending',
          last_sync_at: '2026-08-24T00:00:00.000Z',
          has_tokens: false,
        },
        true,
      ),
    ).toBe(false);
    expect(
      isOAuthConnected(
        {
          provider: 'oura',
          status: 'connected',
          last_sync_at: null,
          has_tokens: true,
        },
        true,
      ),
    ).toBe(true);
    expect(
      isOAuthConnected(
        {
          provider: 'oura',
          status: 'connected',
          last_sync_at: '2026-08-24T00:00:00.000Z',
          has_tokens: false,
        },
        true,
      ),
    ).toBe(false);
  });

  it('keeps OAuth tiles Not connected until secrets are provisioned', () => {
    const leftover = {
      provider: 'whoop',
      status: 'connected',
      last_sync_at: '2026-08-24T00:00:00.000Z',
      has_tokens: true,
    };
    expect(isOAuthConnected(leftover, false)).toBe(false);
    expect(isOAuthConnected(leftover, true)).toBe(true);

    const tiles = buildWearableTiles(
      baseInput({
        oauth: [
          leftover,
          {
            provider: 'oura',
            status: 'connected',
            last_sync_at: '2026-08-24T00:00:00.000Z',
            has_tokens: true,
          },
        ],
        whoopConfigured: false,
        ouraConfigured: false,
        appleXmlIngested: 4,
        appleXmlLastPersistAt: '2026-08-22T08:00:00.000Z',
      }),
    );
    const whoop = tiles.find((t) => t.id === 'whoop');
    const oura = tiles.find((t) => t.id === 'oura');
    const apple = tiles.find((t) => t.id === 'apple_health');
    expect(whoop?.status).toBe('disconnected');
    expect(whoop?.lastSyncState).toBe('not_connected');
    expect(whoop?.statusLabel).toBe('Coming soon');
    expect(whoop?.lastSyncAt).toBeNull();
    expect(whoop?.action).toEqual({ kind: 'oauth', configured: false });
    expect(oura?.status).toBe('disconnected');
    expect(oura?.lastSyncState).toBe('not_connected');
    expect(oura?.statusLabel).toBe('Coming soon');
    expect(oura?.lastSyncAt).toBeNull();
    expect(oura?.action).toEqual({ kind: 'oauth', configured: false });
    expect(apple?.statusLabel).toBe('Synced 2d ago');
    expect(apple?.lastSyncState).toBe('synced');
    expect(apple?.lastSyncAt).toBe('2026-08-22T08:00:00.000Z');
    expect(apple?.appleWatchConnected).toBe(false);
    expect(tiles.every((t) => t.appleWatchConnected === false)).toBe(true);
  });

  it('connects OAuth only after provisioned secrets plus tokens', () => {
    const tiles = buildWearableTiles(
      baseInput({
        oauth: [
          {
            provider: 'whoop',
            status: 'connected',
            last_sync_at: '2026-08-24T00:00:00.000Z',
            has_tokens: true,
          },
        ],
        whoopConfigured: true,
      }),
    );
    const whoop = tiles.find((t) => t.id === 'whoop');
    expect(whoop?.status).toBe('connected');
    expect(whoop?.statusLabel).toBe('Synced 10h ago');
    expect(whoop?.lastSyncState).toBe('synced');
    expect(whoop?.lastSyncAt).toBe('2026-08-24T00:00:00.000Z');
    expect(whoop?.action).toEqual({ kind: 'oauth', configured: true });
  });

  it('shows Connected never synced when OAuth persist has no last_sync_at', () => {
    const tiles = buildWearableTiles(
      baseInput({
        oauth: [{ provider: 'whoop', status: 'connected', last_sync_at: null, has_tokens: true }],
        whoopConfigured: true,
      }),
    );
    const whoop = tiles.find((t) => t.id === 'whoop');
    expect(whoop?.lastSyncState).toBe('connected_never_synced');
    expect(whoop?.statusLabel).toBe('Connected never synced');
    expect(whoop?.lastSyncAt).toBeNull();
    expect(JSON.stringify(whoop)).not.toContain('5 min ago');
  });

  it('flags Needs reconnect when tokens are gone after secrets are provisioned', () => {
    const tiles = buildWearableTiles(
      baseInput({
        oauth: [
          {
            provider: 'oura',
            status: 'connected',
            last_sync_at: '2026-08-24T11:55:00.000Z',
            has_tokens: false,
          },
        ],
        ouraConfigured: true,
      }),
    );
    const oura = tiles.find((t) => t.id === 'oura');
    expect(oura?.lastSyncState).toBe('needs_reconnect');
    expect(oura?.status).toBe('disconnected');
    expect(oura?.statusLabel).toBe('Needs reconnect');
    expect(oura?.lastSyncAt).toBeNull();
    expect(oura?.statusLabel).not.toContain('Active');
    expect(JSON.stringify(oura)).not.toContain('5 min ago');
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
    expect(hume?.name).toBe('Hume Body Pod');
    expect(hume?.status).toBe('connected');
    expect(hume?.statusLabel).toBe('Synced 22h ago');
    expect(hume?.lastSyncState).toBe('synced');
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
    expect(apple?.lastSyncState).toBe('synced');
    expect(apple?.statusLabel).toBe('Synced 2d ago');
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
      expect(tile.lastSyncState).toBe('not_connected');
      expect(tile.lastSyncAt).toBeNull();
      expect(tile.statusLabel).not.toContain('Active');
      expect(tile.statusLabel).not.toContain('Connected');
      expect(JSON.stringify(tile)).not.toContain('5 min ago');
      expect(tile.dimensionsFed).toEqual([]);
    }
    expect(tiles.find((t) => t.id === 'whoop')?.statusLabel).toBe('Coming soon');
    expect(tiles.find((t) => t.id === 'oura')?.statusLabel).toBe('Coming soon');
    expect(tiles.find((t) => t.id === 'hume')?.statusLabel).toBe('Not connected');
    expect(tiles.find((t) => t.id === 'apple_health')?.statusLabel).toBe('Not connected');
  });

  it('labels Apple XML vs not connected', () => {
    expect(appleStatusLabel({ connected: false, xmlIngested: 0 })).toBe('Not connected');
    expect(appleStatusLabel({ connected: true, xmlIngested: 2 })).toBe('Connected via XML');
  });

  it('uses Connected never synced when linked with no last_sync_at', () => {
    const tiles = buildWearableTiles(
      baseInput({
        oauth: [
          {
            provider: 'whoop',
            status: 'connected',
            last_sync_at: null,
            has_tokens: true,
          },
        ],
        whoopConfigured: true,
      }),
    );
    const whoop = tiles.find((t) => t.id === 'whoop');
    expect(whoop?.status).toBe('connected');
    expect(whoop?.statusLabel).toBe('Connected never synced');
    expect(whoop?.lastSyncState).toBe('connected_never_synced');
    expect(whoop?.lastSyncAt).toBeNull();
    expect(whoop?.statusLabel).not.toMatch(/Active/);
    expect(whoop?.statusLabel).not.toMatch(/5 min ago/);
  });

  it('labels unconfigured OAuth Coming soon and never invents Connected', () => {
    expect(OAUTH_COMING_SOON_LABEL).toBe('Coming soon');
    expect(
      oauthDisplayLabel(false, {
        kind: 'not_connected',
        label: 'Not connected',
        lastSyncAt: null,
      }),
    ).toBe('Coming soon');
    expect(
      oauthDisplayLabel(true, {
        kind: 'not_connected',
        label: 'Not connected',
        lastSyncAt: null,
      }),
    ).toBe('Not connected');
    expect(connectionsBosCompositeDisplay()).toEqual({ value: '--', band: 'UNKNOWN' });
    expect(resolveConnectionsBosDisplay(0)).toEqual({ value: '--', band: 'UNKNOWN' });
    expect(resolveConnectionsBosDisplay(3)).toEqual({ value: '--', band: 'UNKNOWN' });
    expect(connectionsBosNumericScore(resolveConnectionsBosDisplay(0))).toBeNull();
    expect(namedWearableContributorCount([])).toBe(0);
    expect(CONNECTIONS_BOS_COMPOSITE.value).not.toBe('0');
    expect(BOS_UNKNOWN_NEVER_ZERO_COPY).toBe('Missing stays UNKNOWN, never 0.');
    expect(APPLE_HEALTH_DROPZONE_COPY).toMatch(/Apple Health XML/);
    expect(APPLE_HEALTH_DROPZONE_COPY).not.toMatch(/Hume/);
  });

  it('uses Needs reconnect when configured tokens are missing', () => {
    const tiles = buildWearableTiles(
      baseInput({
        oauth: [
          {
            provider: 'oura',
            status: 'connected',
            last_sync_at: '2026-08-24T00:00:00.000Z',
            has_tokens: false,
          },
        ],
        ouraConfigured: true,
      }),
    );
    const oura = tiles.find((t) => t.id === 'oura');
    expect(oura?.status).toBe('disconnected');
    expect(oura?.statusLabel).toBe('Needs reconnect');
    expect(oura?.lastSyncState).toBe('needs_reconnect');
    expect(oura?.lastSyncAt).toBeNull();
  });

  it('renders Google Health and Garmin as non-interactive Coming soon tiles', () => {
    const tiles = buildWearableTiles(baseInput());
    expect(tiles.map((t) => t.id)).toEqual(['whoop', 'hume', 'apple_health', 'oura', 'google_health', 'garmin']);
    const google = tiles.find((t) => t.id === 'google_health');
    const garmin = tiles.find((t) => t.id === 'garmin');
    expect(google?.statusLabel).toBe('Coming soon');
    expect(garmin?.statusLabel).toBe('Coming soon');
    expect(google?.action).toEqual({ kind: 'oauth', configured: false });
    expect(garmin?.action).toEqual({ kind: 'oauth', configured: false });
    expect(google?.status).toBe('disconnected');
  });
  it('keeps google_health and garmin out of the FORBIDDEN device-tile set now that they are Coming soon tiles', () => {
    expect(FORBIDDEN_FIRST_CLASS_TILE_IDS).not.toContain('google_health');
    expect(FORBIDDEN_FIRST_CLASS_TILE_IDS).not.toContain('garmin');
    expect(FORBIDDEN_FIRST_CLASS_TILE_IDS).toContain('apple_watch');
  });

  it('uses will feed on Coming soon and feeds only after a real last-sync', () => {
    const cold = buildWearableTiles(baseInput());
    const whoop = cold.find((t) => t.id === 'whoop');
    const oura = cold.find((t) => t.id === 'oura');
    const google = cold.find((t) => t.id === 'google_health');
    const garmin = cold.find((t) => t.id === 'garmin');
    const apple = cold.find((t) => t.id === 'apple_health');
    const hume = cold.find((t) => t.id === 'hume');
    if (!whoop || !oura || !google || !garmin || !apple || !hume) {
      throw new Error('missing first-class tile');
    }
    expect(isComingSoonTile(whoop)).toBe(true);
    expect(isComingSoonTile(oura)).toBe(true);
    expect(isComingSoonTile(google)).toBe(true);
    expect(isComingSoonTile(garmin)).toBe(true);
    expect(isComingSoonTile(apple)).toBe(false);
    expect(isComingSoonTile(hume)).toBe(false);
    expect(tileContributorLine(whoop)).toBe('Will feed Sleep, Recovery, Strain');
    expect(tileContributorLine(oura)).toBe('Will feed Sleep, Recovery');
    expect(tileContributorLine(google)).toBeNull();
    expect(tileContributorLine(garmin)).toBeNull();
    expect(tileContributorLine(apple)).toBeNull();
    expect(tileContributorLine(hume)).toBeNull();
    expect(railFeedHeading(whoop)).toBe('Will feed');
    expect(railFeedHeading(google)).toBeNull();
    expect(railFeedHeading(apple)).toBe('Feeds');
    expect(railFeedDimensions(apple)).toEqual(['body_comp', 'metabolic']);
    expect(railFeedDimensions(apple)).not.toContain('sleep');
    expect(railFeedDimensions(hume)).toEqual(['body_comp', 'metabolic']);

    const neverSynced = buildWearableTiles(
      baseInput({
        oauth: [{ provider: 'whoop', status: 'connected', last_sync_at: null, has_tokens: true }],
        whoopConfigured: true,
      }),
    ).find((t) => t.id === 'whoop');
    if (!neverSynced) throw new Error('missing whoop');
    expect(neverSynced.lastSyncState).toBe('connected_never_synced');
    expect(tileContributorLine(neverSynced)).toBeNull();

    const syncedApple = buildWearableTiles(
      baseInput({
        appleXmlIngested: 4,
        appleXmlLastPersistAt: '2026-08-22T08:00:00.000Z',
        dimensionsFed: { apple_health: ['body_comp', 'metabolic'] },
      }),
    ).find((t) => t.id === 'apple_health');
    if (!syncedApple) throw new Error('missing apple');
    expect(syncedApple.lastSyncState).toBe('synced');
    expect(tileContributorLine(syncedApple)).toBe('Feeds Body comp., Metabolic');
    expect(tileContributorLine(syncedApple)).not.toMatch(/Sleep/);
    expect(railFeedDimensions(syncedApple)).toEqual(['body_comp', 'metabolic']);

    const appleWithSleep = {
      ...syncedApple,
      dimensionsFed: ['body_comp', 'metabolic', 'sleep'] as const,
    };
    expect(railFeedDimensions(appleWithSleep)).toEqual(['body_comp', 'metabolic', 'sleep']);
    expect(tileContributorLine(appleWithSleep)).toBe('Feeds Body comp., Metabolic, Sleep');
  });
});
