/**
 * Prompt 218: shared connection-state read interface.
 * Single source of truth for Plugins (and agreement with analytics / wearables readers).
 * Never fabricates Connected/Available; fail-open to unavailable.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  PLUGIN_APP_REGISTRY_FALLBACK,
  type PluginAppRegistryRow,
  type PluginAppCategory,
} from './pluginAppRegistry';

export type ConnectionCardState =
  | 'connected'
  | 'available'
  | 'coming_soon'
  | 'unavailable';

export interface UserConnectionSnapshot {
  slug: string;
  connected: boolean;
  connectedAt: string | null;
  lastSyncAt: string | null;
  source: 'body_tracker_connections' | 'data_source_connections' | 'none';
}

export interface PluginAppCardModel extends PluginAppRegistryRow {
  cardState: ConnectionCardState;
  connectedAt: string | null;
  lastSyncAt: string | null;
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
    status: (raw.status === 'live' ? 'live' : 'coming_soon') as PluginAppRegistryRow['status'],
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
      (supabase as any)
        .from('plugin_app_registry')
        .select(
          'slug, display_name, category, description, icon_key, status, connection_type, state_source, connect_path, disconnect_path, wearables_cross_link, sort_order',
        )
        .eq('is_active', true)
        .order('sort_order', { ascending: true }) as Promise<{ data: unknown; error: unknown }>,
      TIMEOUT_MS,
      `${SCOPE}.registry`,
    );
    if (error || !Array.isArray(data) || data.length === 0) {
      if (error) safeLog.warn(SCOPE, 'registry read failed open to fallback', { error });
      return PLUGIN_APP_REGISTRY_FALLBACK;
    }
    return (data as Record<string, unknown>[]).map(mapRegistryRow);
  } catch (err) {
    safeLog.warn(SCOPE, 'registry timeout/error fail-open', {
      error: err instanceof Error ? err.message : String(err),
    });
    return PLUGIN_APP_REGISTRY_FALLBACK;
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
      (supabase as any)
        .from('body_tracker_connections')
        .select('source_id, status, last_sync_at, updated_at, created_at')
        .eq('user_id', userId) as Promise<{ data: unknown; error: unknown }>,
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
          connectedAt: (r.updated_at as string) ?? (r.created_at as string) ?? null,
          lastSyncAt: (r.last_sync_at as string) ?? null,
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
      (supabase as any)
        .from('data_source_connections')
        .select('source_id, is_active, last_sync_at, created_at, updated_at')
        .eq('user_id', userId) as Promise<{ data: unknown; error: unknown }>,
      TIMEOUT_MS,
      `${SCOPE}.dsc`,
    );
    if (dsc.error) {
      // Table may be missing on some envs; do not hard-fail if btc worked.
      safeLog.warn(SCOPE, 'data_source_connections read soft-fail', { error: dsc.error });
    } else if (Array.isArray(dsc.data)) {
      for (const r of dsc.data as Array<Record<string, unknown>>) {
        const slug = String(r.source_id ?? '');
        if (!slug) continue;
        // Prefer body_tracker row if already present for same slug.
        if (rows.some((x) => x.slug === slug)) continue;
        rows.push({
          slug,
          connected: Boolean(r.is_active),
          connectedAt: (r.created_at as string) ?? null,
          lastSyncAt: (r.last_sync_at as string) ?? null,
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

/** Join registry + user state into card models. Never invents connected. */
export function joinRegistryWithState(
  registry: PluginAppRegistryRow[],
  snapshots: UserConnectionSnapshot[],
  opts?: { forceUnavailable?: boolean },
): PluginAppCardModel[] {
  const bySlug = new Map(snapshots.map((s) => [s.slug, s]));
  return registry
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName))
    .map((app) => {
      if (opts?.forceUnavailable) {
        return {
          ...app,
          cardState: 'unavailable' as const,
          connectedAt: null,
          lastSyncAt: null,
        };
      }
      if (app.status === 'coming_soon') {
        return {
          ...app,
          cardState: 'coming_soon' as const,
          connectedAt: null,
          lastSyncAt: null,
        };
      }
      // File import live apps: always Available (navigate to upload), not connection-state.
      if (app.connectionType === 'file_import' || app.stateSource === 'none') {
        return {
          ...app,
          cardState: 'available' as const,
          connectedAt: null,
          lastSyncAt: null,
        };
      }
      const snap = bySlug.get(app.slug);
      if (snap?.connected) {
        return {
          ...app,
          cardState: 'connected' as const,
          connectedAt: snap.connectedAt,
          lastSyncAt: snap.lastSyncAt,
        };
      }
      return {
        ...app,
        cardState: 'available' as const,
        connectedAt: null,
        lastSyncAt: snap?.lastSyncAt ?? null,
      };
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
  if (!ok && rows.length === 0) {
    // Total failure: show unavailable rather than fake Available for live apps.
    return {
      cards: joinRegistryWithState(registry, [], { forceUnavailable: true }),
      stateOk: false,
    };
  }
  return {
    cards: joinRegistryWithState(registry, rows),
    stateOk: ok,
  };
}

export function groupCardsByCategory(
  cards: PluginAppCardModel[],
): Array<{ category: PluginAppCategory; cards: PluginAppCardModel[] }> {
  const order: PluginAppCategory[] = [
    'Health Platforms',
    'Nutrition',
    'Fitness',
    'Mindfulness',
    'Data Import',
    'Other',
  ];
  const map = new Map<PluginAppCategory, PluginAppCardModel[]>();
  for (const c of cards) {
    const list = map.get(c.category) ?? [];
    list.push(c);
    map.set(c.category, list);
  }
  return order
    .filter((cat) => (map.get(cat)?.length ?? 0) > 0)
    .map((category) => ({ category, cards: map.get(category)! }));
}
