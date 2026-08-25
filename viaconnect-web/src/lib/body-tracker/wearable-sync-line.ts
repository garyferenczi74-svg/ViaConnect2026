// Analytics / profile last-sync line from first-class tiles + last-sync-state.
// Never invents sync from getWearableSource or native_health_bridge.

import { LAST_SYNC_LABELS, type LastSyncKind } from './last-sync-state';
import { FIRST_CLASS_TILE_IDS } from './wearable-tiles';

export interface WearableSyncTile {
  id: string;
  lastSyncState: LastSyncKind;
  lastSyncAt?: string | null;
  statusLabel?: string;
}

export interface WearableSyncLine {
  connected: boolean;
  lastSyncLabel: string;
}

export function wearableSyncLineFromTiles(
  tiles: ReadonlyArray<WearableSyncTile>,
): WearableSyncLine {
  const firstClass = tiles.filter((tile) =>
    (FIRST_CLASS_TILE_IDS as readonly string[]).includes(tile.id),
  );
  const synced = firstClass
    .filter((tile) => tile.lastSyncState === 'synced' && typeof tile.lastSyncAt === 'string')
    .slice()
    .sort((a, b) => {
      const aMs = Date.parse(a.lastSyncAt ?? '');
      const bMs = Date.parse(b.lastSyncAt ?? '');
      return (Number.isFinite(bMs) ? bMs : 0) - (Number.isFinite(aMs) ? aMs : 0);
    });
  const latest = synced[0];
  if (latest) {
    const label =
      typeof latest.statusLabel === 'string' && latest.statusLabel.trim().length > 0
        ? latest.statusLabel
        : LAST_SYNC_LABELS.not_connected;
    return { connected: true, lastSyncLabel: label };
  }
  return { connected: false, lastSyncLabel: LAST_SYNC_LABELS.not_connected };
}
