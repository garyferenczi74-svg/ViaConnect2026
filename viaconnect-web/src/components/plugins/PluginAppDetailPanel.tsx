'use client';

/**
 * Center column for /plugins. Mirrors ActiveSourceDetailPanel structure
 * (glass shell, name, honest state, Coming soon or wired actions).
 * Wearable XML import stays off this panel unless the selected plugin
 * is actually file_import, and even then we only open that plugin path.
 */

import Link from 'next/link';
import { FolderOpen, MousePointerClick } from 'lucide-react';
import {
  formatSyncedRelative,
  resolveLastSyncState,
} from '@/lib/body-tracker/last-sync-state';
import type { PluginAppCardModel } from '@/lib/integrations/connectionState';
import {
  PLUGIN_COMING_SOON_ACTION,
  PLUGIN_STATE_COPY,
  isPluginConnectWired,
  isTruthfulWearablesManage,
} from '@/lib/integrations/pluginAppRegistry';
import { PluginVendorMark } from '@/components/plugins/PluginVendorMark';
import {
  PLUGIN_PANEL_GLASS,
  PLUGIN_TILE_OUTLINE_BTN,
} from '@/components/plugins/pluginTileChrome';

export interface PluginAppDetailPanelProps {
  card: PluginAppCardModel | null;
  busy?: boolean;
  onConnect?: (slug: string) => void;
  onDisconnect?: (slug: string) => void;
}

function realLastSyncLabel(iso: string | null): string | null {
  if (!iso) return null;
  if (!formatSyncedRelative(iso)) return null;
  const sm = resolveLastSyncState({ linked: true, lastSyncAt: iso });
  if (sm.kind !== 'synced' || !sm.lastSyncAt) return null;
  return sm.label;
}

function statusLabel(state: PluginAppCardModel['cardState']): string {
  if (state === 'connected') return PLUGIN_STATE_COPY.connected;
  if (state === 'needs_reconnect') return PLUGIN_STATE_COPY.needsReconnect;
  if (state === 'coming_soon') return PLUGIN_STATE_COPY.comingSoon;
  return PLUGIN_STATE_COPY.notConnected;
}

export function PluginAppDetailPanel({
  card,
  busy,
  onConnect,
  onDisconnect,
}: PluginAppDetailPanelProps) {
  const connectWired = card ? isPluginConnectWired(card) : false;
  const canIngest = Boolean(card && connectWired && card.cardState !== 'coming_soon');
  const lastSyncLabel =
    card?.cardState === 'connected' ? realLastSyncLabel(card.lastSyncAt) : null;
  const isFileImport = card?.connectionType === 'file_import';

  return (
    <section
      data-testid="plugins-detail"
      data-detail-plugin={card?.slug ?? 'none'}
      className={PLUGIN_PANEL_GLASS}
    >
      {card === null ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.14] bg-[rgba(255,255,255,0.04)] p-10 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.06)]">
            <MousePointerClick className="h-5 w-5 text-teal" strokeWidth={1.5} />
          </div>
          <h2 className="text-base font-semibold text-white">Pick an app</h2>
          <p className="text-sm text-white/50">Select an app to see how to connect it.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <PluginVendorMark slug={card.slug} displayName={card.displayName} />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">{card.displayName}</h2>
              <p className="mt-0.5 text-xs text-white/50">{card.category}</p>
            </div>
          </div>

          {card.description ? (
            <div className="rounded-xl border border-white/[0.08] bg-[rgba(255,255,255,0.06)] p-3">
              <p className="text-sm leading-relaxed text-white/70">{card.description}</p>
            </div>
          ) : null}

          {card.cardState === 'coming_soon' ? (
            <div className="space-y-2">
              <p className="rounded-xl border border-copper/30 bg-copper/10 px-3 py-2.5 text-sm font-medium text-copper">
                {PLUGIN_STATE_COPY.comingSoon}
              </p>
              <p className="text-sm text-white/60">{PLUGIN_COMING_SOON_ACTION}</p>
            </div>
          ) : (
            <p className="text-sm text-white/60">
              {statusLabel(card.cardState)}
              {lastSyncLabel ? ` • ${lastSyncLabel}` : null}
            </p>
          )}

          {isFileImport && canIngest ? (
            <button
              type="button"
              data-testid={`plugin-detail-import-${card.slug}`}
              disabled={busy}
              onClick={() => onConnect?.(card.slug)}
              className={PLUGIN_TILE_OUTLINE_BTN}
            >
              <FolderOpen className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              Open import
            </button>
          ) : null}

          {card.cardState === 'not_connected' && canIngest && !isFileImport ? (
            <button
              type="button"
              data-testid={`plugin-detail-connect-${card.slug}`}
              disabled={busy}
              onClick={() => onConnect?.(card.slug)}
              className={PLUGIN_TILE_OUTLINE_BTN}
            >
              {PLUGIN_STATE_COPY.connect}
            </button>
          ) : null}

          {card.cardState === 'needs_reconnect' && canIngest ? (
            <button
              type="button"
              data-testid={`plugin-detail-connect-${card.slug}`}
              disabled={busy}
              onClick={() => onConnect?.(card.slug)}
              className={PLUGIN_TILE_OUTLINE_BTN}
            >
              Reconnect
            </button>
          ) : null}

          {card.cardState === 'connected' && card.disconnectPath ? (
            <button
              type="button"
              data-testid={`plugin-detail-disconnect-${card.slug}`}
              disabled={busy}
              onClick={() => onDisconnect?.(card.slug)}
              className="min-h-[44px] text-sm font-medium text-teal hover:underline disabled:opacity-50"
            >
              {PLUGIN_STATE_COPY.disconnect}
            </button>
          ) : null}

          {card.cardState === 'connected' &&
          isTruthfulWearablesManage(card) &&
          card.wearablesCrossLink ? (
            <Link
              href={card.wearablesCrossLink}
              data-testid={`plugin-detail-manage-${card.slug}`}
              className={PLUGIN_TILE_OUTLINE_BTN}
            >
              {PLUGIN_STATE_COPY.manage}
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}

export default PluginAppDetailPanel;
