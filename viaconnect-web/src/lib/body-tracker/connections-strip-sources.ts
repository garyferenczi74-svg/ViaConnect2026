// My Biology ConnectionsStrip sources: FIRST_CLASS_TILE_IDS only.
// Status comes from last-sync-state. Connected only after a real last-sync.
// Never hardcodes connected: true. Never invents a wearable sync.

import { LAST_SYNC_LABELS, type LastSyncKind } from './last-sync-state';
import {
  FIRST_CLASS_TILE_IDS,
  OAUTH_COMING_SOON_LABEL,
  WEARABLE_TILE_SPECS,
  type FirstClassTileId,
} from './wearable-tiles';

export interface ConnectionsStripSource {
  id: FirstClassTileId;
  label: string;
  connected: boolean;
  statusLabel: string;
}

export interface ConnectionsStripTileInput {
  id: string;
  lastSyncState: LastSyncKind;
  statusLabel?: string;
}

export function buildConnectionsStripSources(
  tiles: ReadonlyArray<ConnectionsStripTileInput> = [],
): ConnectionsStripSource[] {
  return FIRST_CLASS_TILE_IDS.map((id) => {
    const spec = WEARABLE_TILE_SPECS.find((row) => row.id === id);
    const tile = tiles.find((row) => row.id === id);
    const lastSyncState = tile?.lastSyncState ?? 'not_connected';
    const connected = lastSyncState === 'synced';
    const statusLabel =
      typeof tile?.statusLabel === 'string' && tile.statusLabel.trim().length > 0
        ? tile.statusLabel
        : lastSyncState === 'not_connected'
          ? spec?.action === 'oauth'
            ? OAUTH_COMING_SOON_LABEL
            : LAST_SYNC_LABELS.not_connected
          : LAST_SYNC_LABELS.not_connected;
    return {
      id,
      label: spec?.name ?? id,
      connected,
      statusLabel,
    };
  });
}
