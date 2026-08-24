// First-class wearable tiles for /body-tracker/connections (alias /wearables).
// Picasso IA: Whoop, Hume, Apple Health, Oura. Same surface at 390 and 1280.
//
// OAuth Connected-state requires provisioned Vercel secrets (WHOOP_*, OURA_*,
// WEARABLE_TOKEN_KEY, and optional *_REDIRECT_URI). Leftover connected_sources
// or token rows do not count until that path is real. Client IDs are never
// hardcoded. last_sync_at alone never marks a tile Connected.
//
// Web Apple is XML only (Connected via XML). Hume is never copied from
// phone_health and has no OAuth. This tile is Apple Health, never Watch.

export const FIRST_CLASS_TILE_IDS = ['whoop', 'hume', 'apple_health', 'oura'] as const;

export type FirstClassTileId = (typeof FIRST_CLASS_TILE_IDS)[number];

export type WearableDimension =
  | 'strain'
  | 'recovery'
  | 'sleep'
  | 'metabolic'
  | 'nutrients'
  | 'symptoms'
  | 'immune'
  | 'regimen';

export type TileStatus = 'connected' | 'disconnected';

export type TileAction =
  | { kind: 'oauth'; configured: boolean }
  | { kind: 'xml_upload' };

export interface WearableTileSpec {
  id: FirstClassTileId;
  name: string;
  icon: string;
  advertisedDimensions: WearableDimension[];
  action: TileAction['kind'];
  notes: string;
}

export const WEARABLE_TILE_SPECS: WearableTileSpec[] = [
  {
    id: 'whoop',
    name: 'Whoop',
    icon: 'Watch',
    advertisedDimensions: ['recovery', 'sleep', 'strain'],
    action: 'oauth',
    notes: 'Connect through the WHOOP Developer API. Recovery, sleep, and strain feed Bio Optimization Score when ingested.',
  },
  {
    id: 'hume',
    name: 'Hume',
    icon: 'Scan',
    advertisedDimensions: ['metabolic'],
    action: 'xml_upload',
    notes: 'Hume has no public developer API. Upload an Apple Health export so Hume-tagged body and weight rows can ingest.',
  },
  {
    id: 'apple_health',
    name: 'Apple Health',
    icon: 'Heart',
    advertisedDimensions: ['sleep', 'metabolic'],
    action: 'xml_upload',
    notes: 'On the web, upload an Apple Health export XML. This tile is Apple Health, never Apple Watch.',
  },
  {
    id: 'oura',
    name: 'Oura',
    icon: 'Circle',
    advertisedDimensions: ['recovery', 'sleep'],
    action: 'oauth',
    notes: 'Connect through the Oura Cloud API. Sleep and recovery feed Bio Optimization Score when ingested.',
  },
];

export const SCORE_DETAIL_DIMENSIONS: WearableDimension[] = [
  'sleep',
  'recovery',
  'strain',
  'metabolic',
];

export const NON_WEARABLE_DIMENSIONS: WearableDimension[] = [
  'regimen',
  'nutrients',
  'symptoms',
  'immune',
];

export interface OAuthConnectionRow {
  provider: string;
  status: string;
  last_sync_at: string | null;
  has_tokens: boolean;
}

export interface WearableTileInput {
  oauth: OAuthConnectionRow[];
  humeIngestCount: number;
  humeLastPersistAt: string | null;
  appleXmlIngested: number;
  appleXmlLastPersistAt: string | null;
  healthKitPersisted: boolean;
  healthKitLastPersistAt: string | null;
  dimensionsFed: Partial<Record<FirstClassTileId, WearableDimension[]>>;
  whoopConfigured: boolean;
  ouraConfigured: boolean;
  platform: 'web' | 'ios' | 'android';
}

export interface WearableTileView {
  id: FirstClassTileId;
  name: string;
  icon: string;
  status: TileStatus;
  statusLabel: string;
  lastSyncAt: string | null;
  lastSyncKind: 'oauth_sync' | 'xml_upload' | null;
  advertisedDimensions: WearableDimension[];
  dimensionsFed: WearableDimension[];
  action: TileAction;
  notes: string;
  appleWatchConnected: false;
}

function oauthRow(oauth: OAuthConnectionRow[], provider: string): OAuthConnectionRow | undefined {
  return oauth.find((r) => r.provider === provider);
}

/**
 * OAuth tiles stay Not connected until secrets are provisioned AND the
 * callback upserts status=connected WITH tokens. A leftover row is ignored.
 */
export function isOAuthConnected(
  row: OAuthConnectionRow | undefined,
  configured: boolean,
): boolean {
  if (!configured) return false;
  if (!row) return false;
  return row.status === 'connected' && row.has_tokens === true;
}

export function isHumeConnected(humeIngestCount: number): boolean {
  return humeIngestCount > 0;
}

/** Web Apple connects only via XML persist. iOS may also use a HealthKit batch persist. */
export function isAppleHealthConnected(input: {
  appleXmlIngested: number;
  healthKitPersisted: boolean;
  platform: 'web' | 'ios' | 'android';
}): boolean {
  if (input.appleXmlIngested > 0) return true;
  if (input.platform === 'web') return false;
  return input.healthKitPersisted === true;
}

export function appleStatusLabel(input: {
  connected: boolean;
  xmlIngested: number;
}): string {
  if (!input.connected) return 'Not connected';
  if (input.xmlIngested > 0) return 'Connected via XML';
  return 'Connected';
}

export function buildWearableTiles(input: WearableTileInput): WearableTileView[] {
  return WEARABLE_TILE_SPECS.map((spec) => {
    let status: TileStatus = 'disconnected';
    let lastSyncAt: string | null = null;
    let lastSyncKind: WearableTileView['lastSyncKind'] = null;
    let action: TileAction;
    let statusLabel = 'Not connected';

    if (spec.id === 'whoop') {
      const row = oauthRow(input.oauth, 'whoop');
      status = isOAuthConnected(row, input.whoopConfigured) ? 'connected' : 'disconnected';
      lastSyncAt = status === 'connected' ? row?.last_sync_at ?? null : null;
      lastSyncKind = lastSyncAt ? 'oauth_sync' : null;
      statusLabel = status === 'connected' ? 'Connected' : 'Not connected';
      action = { kind: 'oauth', configured: input.whoopConfigured };
    } else if (spec.id === 'oura') {
      const row = oauthRow(input.oauth, 'oura');
      status = isOAuthConnected(row, input.ouraConfigured) ? 'connected' : 'disconnected';
      lastSyncAt = status === 'connected' ? row?.last_sync_at ?? null : null;
      lastSyncKind = lastSyncAt ? 'oauth_sync' : null;
      statusLabel = status === 'connected' ? 'Connected' : 'Not connected';
      action = { kind: 'oauth', configured: input.ouraConfigured };
    } else if (spec.id === 'hume') {
      status = isHumeConnected(input.humeIngestCount) ? 'connected' : 'disconnected';
      lastSyncAt = status === 'connected' ? input.humeLastPersistAt : null;
      lastSyncKind = lastSyncAt ? 'xml_upload' : null;
      statusLabel = status === 'connected' ? 'Connected via XML' : 'Not connected';
      action = { kind: 'xml_upload' };
    } else {
      const connected = isAppleHealthConnected({
        appleXmlIngested: input.appleXmlIngested,
        healthKitPersisted: input.healthKitPersisted,
        platform: input.platform,
      });
      status = connected ? 'connected' : 'disconnected';
      if (status === 'connected' && input.appleXmlIngested > 0) {
        lastSyncAt = input.appleXmlLastPersistAt;
        lastSyncKind = 'xml_upload';
      } else if (status === 'connected') {
        lastSyncAt = input.healthKitLastPersistAt;
        lastSyncKind = 'oauth_sync';
      }
      statusLabel = appleStatusLabel({
        connected,
        xmlIngested: input.appleXmlIngested,
      });
      action = { kind: 'xml_upload' };
    }

    return {
      id: spec.id,
      name: spec.name,
      icon: spec.icon,
      status,
      statusLabel,
      lastSyncAt,
      lastSyncKind,
      advertisedDimensions: spec.advertisedDimensions,
      dimensionsFed: status === 'connected' ? (input.dimensionsFed[spec.id] ?? []) : [],
      action,
      notes: spec.notes,
      appleWatchConnected: false,
    };
  });
}

export function appleHealthDisplayName(): string {
  return 'Apple Health';
}

export const WATCH_FORBIDDEN_LABELS = [
  'Apple Watch',
  'Watch connected',
  'Apple Watch connected',
  'Connected Watch',
] as const;

export const CONNECTIONS_FOOTER = 'Bio Optimization Score uses these sources.';
