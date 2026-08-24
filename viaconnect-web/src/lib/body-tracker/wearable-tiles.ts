// First-class wearable tiles for /body-tracker/connections (/wearables redirects).
// Prompt 230 Task 1: Whoop, Hume Body Pod, Apple Health, Oura, Google Health, Garmin.
// Same IA at 390 and 1280.
//
// OAuth Connected-state requires provisioned Vercel secrets (WHOOP_*, OURA_*,
// WEARABLE_TOKEN_KEY, and optional *_REDIRECT_URI). Leftover connected_sources
// or token rows do not count until that path is real. Client IDs are never
// hardcoded. last_sync_at alone never marks a tile Connected. Whoop and Oura
// stay Coming soon (label, not Connect) until those secrets exist. Google
// Health and Garmin are honest Coming soon tiles: never connectable here,
// their *Configured flags never set true (Garmin connector is out of scope,
// spec section 12).
//
// Web Apple is XML only. Hume is XML sourceName hume_body_pod, never copied
// from phone_health, and has no OAuth. This tile is Apple Health, never Watch.
// Last-sync display is the shared SM in @/lib/body-tracker/last-sync-state (PR #40).

import {
  oauthNeedsReconnect,
  resolveLastSyncState,
  type LastSyncKind,
  type LastSyncState,
} from '@/lib/body-tracker/last-sync-state';

export const FIRST_CLASS_TILE_IDS = ['whoop', 'hume', 'apple_health', 'oura', 'google_health', 'garmin'] as const;

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

export const FORBIDDEN_FIRST_CLASS_TILE_IDS = [
  'fitbit',
  'google_health_connect',
  'phone_health',
  'manual_entry',
  'apple_watch',
  'watch',
] as const;

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
    name: 'Hume Body Pod',
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
  {
    id: 'google_health',
    name: 'Google Health',
    icon: 'HeartPulse',
    advertisedDimensions: ['sleep', 'recovery'],
    action: 'oauth',
    notes: 'Android aggregator for Fitbit and Pixel. Coming soon.',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    icon: 'Watch',
    advertisedDimensions: ['recovery', 'sleep', 'strain'],
    action: 'oauth',
    notes: 'Recovery, sleep, and workouts. Coming soon.',
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
  googleHealthConfigured: boolean;
  garminConfigured: boolean;
  platform: 'web' | 'ios' | 'android';
  now?: number;
}

export interface WearableTileView {
  id: FirstClassTileId;
  name: string;
  icon: string;
  status: TileStatus;
  statusLabel: string;
  lastSyncState: LastSyncKind;
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
    let linked = false;
    let lastSyncAt: string | null = null;
    let lastSyncKind: WearableTileView['lastSyncKind'] = null;
    let action: TileAction;
    let needsReconnect = false;

    if (spec.id === 'whoop') {
      const row = oauthRow(input.oauth, 'whoop');
      linked = isOAuthConnected(row, input.whoopConfigured);
      needsReconnect = oauthNeedsReconnect(row, input.whoopConfigured);
      lastSyncAt = linked ? row?.last_sync_at ?? null : null;
      lastSyncKind = lastSyncAt ? 'oauth_sync' : null;
      action = { kind: 'oauth', configured: input.whoopConfigured };
    } else if (spec.id === 'oura') {
      const row = oauthRow(input.oauth, 'oura');
      linked = isOAuthConnected(row, input.ouraConfigured);
      needsReconnect = oauthNeedsReconnect(row, input.ouraConfigured);
      lastSyncAt = linked ? row?.last_sync_at ?? null : null;
      lastSyncKind = lastSyncAt ? 'oauth_sync' : null;
      action = { kind: 'oauth', configured: input.ouraConfigured };
    } else if (spec.id === 'hume') {
      linked = isHumeConnected(input.humeIngestCount);
      lastSyncAt = linked ? input.humeLastPersistAt : null;
      lastSyncKind = lastSyncAt ? 'xml_upload' : null;
      action = { kind: 'xml_upload' };
    } else if (spec.id === 'google_health') {
      action = { kind: 'oauth', configured: input.googleHealthConfigured };
    } else if (spec.id === 'garmin') {
      action = { kind: 'oauth', configured: input.garminConfigured };
    } else {
      linked = isAppleHealthConnected({
        appleXmlIngested: input.appleXmlIngested,
        healthKitPersisted: input.healthKitPersisted,
        platform: input.platform,
      });
      if (linked && input.appleXmlIngested > 0) {
        lastSyncAt = input.appleXmlLastPersistAt;
        lastSyncKind = 'xml_upload';
      } else if (linked) {
        lastSyncAt = input.healthKitLastPersistAt;
        lastSyncKind = 'oauth_sync';
      }
      action = { kind: 'xml_upload' };
    }

    const sm = resolveLastSyncState({
      linked,
      lastSyncAt,
      needsReconnect,
      now: input.now,
    });
    const status: TileStatus =
      sm.kind === 'synced' || sm.kind === 'connected_never_synced' ? 'connected' : 'disconnected';
    const configured =
      spec.id === 'whoop' ? input.whoopConfigured
      : spec.id === 'oura' ? input.ouraConfigured
      : spec.id === 'google_health' ? input.googleHealthConfigured
      : spec.id === 'garmin' ? input.garminConfigured
      : true;
    const statusLabel =
      spec.action === 'oauth' ? oauthDisplayLabel(configured, sm) : sm.label;

    return {
      id: spec.id,
      name: spec.name,
      icon: spec.icon,
      status,
      statusLabel,
      lastSyncState: sm.kind,
      lastSyncAt: sm.lastSyncAt,
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

export const CONNECTIONS_LEAD = 'Connect your devices.';

export const OAUTH_COMING_SOON_LABEL = 'Coming soon';

export const BOS_UNKNOWN_NEVER_ZERO_COPY = 'Missing stays UNKNOWN, never 0.';

export const APPLE_HEALTH_DROPZONE_COPY =
  'Upload Apple Health XML. Drag and drop your XML file here, or click to browse.';

export const CONNECTIONS_BOS_COMPOSITE = {
  value: '--',
  band: 'UNKNOWN',
} as const;

/**
 * Whoop / Oura stay Coming soon until Vercel OAuth secrets exist.
 * last-sync-state is unchanged: Coming soon is display only, not a new SM kind.
 */
export function oauthDisplayLabel(
  configured: boolean,
  lastSync: LastSyncState,
): string {
  if (!configured && lastSync.kind === 'not_connected') {
    return OAUTH_COMING_SOON_LABEL;
  }
  return lastSync.label;
}

/** Connections BOS card never invents a composite number. Missing stays UNKNOWN, never 0. */
export function connectionsBosCompositeDisplay(): typeof CONNECTIONS_BOS_COMPOSITE {
  return CONNECTIONS_BOS_COMPOSITE;
}
