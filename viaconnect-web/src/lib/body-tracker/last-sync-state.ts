// Brief 12 last-sync honesty. Shared by Connections tiles (/wearables alias).
// Status comes from last-sync only. Never invent "5 min ago".
// Never pair Active with Never synced. Missing timestamps stay null.

export const LAST_SYNC_KINDS = [
  'not_connected',
  'connected_never_synced',
  'synced',
  'needs_reconnect',
] as const;

export type LastSyncKind = (typeof LAST_SYNC_KINDS)[number];

export interface LastSyncInput {
  linked: boolean;
  lastSyncAt: string | null | undefined;
  needsReconnect?: boolean;
  now?: number;
}

export interface LastSyncState {
  kind: LastSyncKind;
  label: string;
  lastSyncAt: string | null;
}

export const LAST_SYNC_LABELS = {
  not_connected: 'Not connected',
  connected_never_synced: 'Connected never synced',
  needs_reconnect: 'Needs reconnect',
} as const;

export function formatSyncedRelative(
  lastSyncAt: string,
  now = Date.now(),
): string | null {
  const then = new Date(lastSyncAt).getTime();
  if (!Number.isFinite(then)) return null;
  const deltaMs = Math.max(0, now - then);
  const minutes = Math.floor(deltaMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(lastSyncAt).toLocaleDateString();
}

export function resolveLastSyncState(input: LastSyncInput): LastSyncState {
  if (input.needsReconnect === true) {
    return {
      kind: 'needs_reconnect',
      label: LAST_SYNC_LABELS.needs_reconnect,
      lastSyncAt: null,
    };
  }

  if (!input.linked) {
    return {
      kind: 'not_connected',
      label: LAST_SYNC_LABELS.not_connected,
      lastSyncAt: null,
    };
  }

  const raw = input.lastSyncAt;
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return {
      kind: 'connected_never_synced',
      label: LAST_SYNC_LABELS.connected_never_synced,
      lastSyncAt: null,
    };
  }

  const relative = formatSyncedRelative(raw, input.now);
  if (!relative) {
    return {
      kind: 'connected_never_synced',
      label: LAST_SYNC_LABELS.connected_never_synced,
      lastSyncAt: null,
    };
  }

  return {
    kind: 'synced',
    label: `Synced ${relative}`,
    lastSyncAt: raw,
  };
}

export function oauthNeedsReconnect(
  row: { status: string; has_tokens: boolean } | undefined,
  configured: boolean,
): boolean {
  if (!configured || !row) return false;
  if (row.status === 'error' || row.status === 'needs_reconnect' || row.status === 'revoked') {
    return true;
  }
  return row.status === 'connected' && row.has_tokens !== true;
}
