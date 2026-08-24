/**
 * Plugin card join: registry + persisted connection rows.
 * Tile states come from last-sync-state.ts only. No second state machine.
 * Missing timestamps stay null. Never invent Connected or last-sync.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  oauthNeedsReconnect,
  resolveLastSyncState,
} from '@/lib/body-tracker/last-sync-state';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  PLUGIN_APP_REGISTRY_FALLBACK,
  PLUGIN_SECTION_ORDER,
  isPluginConnectWired,
  isPluginPageApp,
  pluginSectionFor,
  type PluginAppRegistryRow,
  type PluginAppCategory,
  type PluginSectionId,
} from './pluginAppRegistry';

export type ConnectionCardState =
  | 'not_connected'
  | 'coming_soon'
  | 'connected'
  | 'needs_reconnect';

export interface UserConnectionSnapshot {
  slug: string;
  connected: boolean;
  status: string;
  connectedAt: string | null;
  lastSyncAt: string | null;
  source: 'body_tracker_connections' | 'data_source_connections' | 'none';
}

export interface PluginAppCardModel extends PluginAppRegistryRow {
  cardState: ConnectionCardState;
  connectedAt: string | null;
  lastSyncAt: string | null;
}

type QueryResult = { data: unknown; error: unknown };

interface QueryBuilder {
  select: (columns: string) => QueryBuilder;
  eq: (column: string, value: string | boolean) => QueryBuilder;
  order: (column: string, options: { ascending: boolean }) => QueryBuilder;
  then: Promise<QueryResult>['then'];
}

function fromTable(supabase: SupabaseClient, table: string): QueryBuilder {
  return (supabase as unknown as { from: (name: string) => QueryBuilder }).from(table);
}

function asQuery(builder: QueryBuilder): Promise<QueryResult> {
  return Promise.resolve(builder);
}

function asIso(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  return Number.isFinite(new Date(value).getTime()) ? value : null;
}

const SCOPE = 'integrations.connectionState';
const TIMEOUT_MS = 4000;

function mapRegistryRow(raw: Record<string, unknown>): PluginAppRegistryRow {
  return {
    slug: String(raw.slug),
    displayName: String(raw.display_name ?? raw.displayName ?? raw.slug),
    category: String(raw.category) as PluginAppCategory,
    description: String(raw.description ?? ''),
    iconKey: String(raw.icon_key ?? raw.iconKey ?? 'Plug'),
    status: raw.status === 'live' ? 'live' : 'coming_soon',
    connectionType: (raw.connection_type ?? raw.connectionType ?? 'none') as PluginAppRegistryRow['connectionType'],
    stateSource: (raw.state_source ?? raw.stateSource ?? 'none') as PluginAppRegistryRow['stateSource'],
    connectPath: (raw.connect_path ?? raw.connectPath ?? null) as string | null,
    disconnectPath: (raw.disconnect_path ?? raw.disconnectPath ?? null) as string | null,
    wearablesCrossLink: (raw.wearables_cross_link ?? raw.wearablesCrossLink ?? null) as string | null,
    sortOrder: Number(raw.sort_order ?? raw.sortOrder ?? 100),
  };
}

/** Load app registry from DB; fail-open to code fallback. */
export async function loadPluginAppRegistry(
  supabase: SupabaseClient,
): Promise<PluginAppRegistryRow[]> {
  try {
    const { data, error } = await withTimeout(
      asQuery(
        fromTable(supabase, 'plugin_app_registry')
          .select(
            'slug, display_name, category, description, icon_key, status, connection_type, state_source, connect_path, disconnect_path, wearables_cross_link, sort_order',
          )
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
      ),
      TIMEOUT_MS,
      `${SCOPE}.registry`,
    );
    if (error || !Array.isArray(data) || data.length === 0) {
      if (error) safeLog.warn(SCOPE, 'registry read failed open to fallback', { error });
      return PLUGIN_APP_REGISTRY_FALLBACK.filter(isPluginPageApp);
    }
    return (data as Record<string, unknown>[]).map(mapRegistryRow).filter(isPluginPageApp);
  } catch (err) {
    safeLog.warn(SCOPE, 'registry timeout/error fail-open', {
      error: err instanceof Error ? err.message : String(err),
    });
    return PLUGIN_APP_REGISTRY_FALLBACK.filter(isPluginPageApp);
  }
}

/**
 * Read user connection snapshots for app plugins.
 * Merges body_tracker_connections + data_source_connections (no token fields).
 */
export async function loadUserConnectionSnapshots(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: boolean; rows: UserConnectionSnapshot[] }> {
  const rows: UserConnectionSnapshot[] = [];
  let ok = true;

  try {
    const btc = await withTimeout(
      asQuery(
        fromTable(supabase, 'body_tracker_connections')
          .select('source_id, status, last_sync_at, updated_at, created_at')
          .eq('user_id', userId),
      ),
      TIMEOUT_MS,
      `${SCOPE}.btc`,
    );
    if (btc.error) {
      ok = false;
      safeLog.warn(SCOPE, 'body_tracker_connections read failed', { error: btc.error });
    } else if (Array.isArray(btc.data)) {
      for (const r of btc.data as Array<Record<string, unknown>>) {
        const slug = String(r.source_id ?? '');
        if (!slug) continue;
        const status = String(r.status ?? '');
        const connected = status === 'connected' || status === 'active';
        rows.push({
          slug,
          connected,
          status,
          connectedAt: asIso(r.updated_at) ?? asIso(r.created_at),
          lastSyncAt: asIso(r.last_sync_at),
          source: 'body_tracker_connections',
        });
      }
    }
  } catch (err) {
    ok = false;
    safeLog.warn(SCOPE, 'body_tracker_connections timeout', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    const dsc = await withTimeout(
      asQuery(
        fromTable(supabase, 'data_source_connections')
          .select('source_id, is_active, last_sync_at, created_at, updated_at')
          .eq('user_id', userId),
      ),
      TIMEOUT_MS,
      `${SCOPE}.dsc`,
    );
    if (dsc.error) {
      safeLog.warn(SCOPE, 'data_source_connections read soft-fail', { error: dsc.error });
    } else if (Array.isArray(dsc.data)) {
      for (const r of dsc.data as Array<Record<string, unknown>>) {
        const slug = String(r.source_id ?? '');
        if (!slug) continue;
        if (rows.some((x) => x.slug === slug)) continue;
        const connected = Boolean(r.is_active);
        rows.push({
          slug,
          connected,
          status: connected ? 'connected' : 'disconnected',
          connectedAt: asIso(r.created_at),
          lastSyncAt: asIso(r.last_sync_at),
          source: 'data_source_connections',
        });
      }
    }
  } catch (err) {
    safeLog.warn(SCOPE, 'data_source_connections timeout', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return { ok, rows };
}

function emptyCard(
  app: PluginAppRegistryRow,
  cardState: ConnectionCardState,
): PluginAppCardModel {
  return {
    ...app,
    cardState,
    connectedAt: null,
    lastSyncAt: null,
  };
}

/** Join registry + user state into card models. Never invents connected. */
export function joinRegistryWithState(
  registry: PluginAppRegistryRow[],
  snapshots: UserConnectionSnapshot[],
): PluginAppCardModel[] {
  const bySlug = new Map(snapshots.map((s) => [s.slug, s]));
  return registry
    .filter(isPluginPageApp)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName))
    .map((app) => {
      if (app.status === 'coming_soon' || !isPluginConnectWired(app)) {
        return emptyCard(app, 'coming_soon');
      }

      const snap = bySlug.get(app.slug);
      const needsReconnect = oauthNeedsReconnect(
        snap ? { status: snap.status, has_tokens: snap.connected } : undefined,
        true,
      );
      const sm = resolveLastSyncState({
        linked: snap?.connected === true,
        lastSyncAt: snap?.lastSyncAt ?? null,
        needsReconnect,
      });

      if (sm.kind === 'needs_reconnect') {
        return emptyCard(app, 'needs_reconnect');
      }

      // Connected only when last-sync-state reports a real persist timestamp.
      if (sm.kind === 'synced' && sm.lastSyncAt) {
        return {
          ...app,
          cardState: 'connected',
          connectedAt: snap?.connectedAt ?? null,
          lastSyncAt: sm.lastSyncAt,
        };
      }

      return emptyCard(app, 'not_connected');
    });
}

export async function loadPluginAppCards(
  supabase: SupabaseClient,
  userId: string | null,
): Promise<{ cards: PluginAppCardModel[]; stateOk: boolean }> {
  const registry = await loadPluginAppRegistry(supabase);
  if (!userId) {
    return {
      cards: joinRegistryWithState(registry, []),
      stateOk: true,
    };
  }
  const { ok, rows } = await loadUserConnectionSnapshots(supabase, userId);
  return {
    cards: joinRegistryWithState(registry, rows),
    stateOk: ok || rows.length > 0,
  };
}

export function groupCardsByCategory(
  cards: PluginAppCardModel[],
): Array<{ category: PluginSectionId; cards: PluginAppCardModel[] }> {
  const map = new Map<PluginSectionId, PluginAppCardModel[]>();
  for (const card of cards) {
    const section = pluginSectionFor(card.category);
    const list = map.get(section) ?? [];
    list.push(card);
    map.set(section, list);
  }
  return PLUGIN_SECTION_ORDER
    .filter((section) => (map.get(section)?.length ?? 0) > 0)
    .map((category) => ({ category, cards: map.get(category) ?? [] }));
}
