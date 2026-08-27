'use client';

/**
 * /plugins tiles use the same rest / selected glass as WearableTileCard.
 * Vendor marks stay in the icon slot. Apps-only registry.
 * Coming soon right action is Coming soon (not Connect). One line. No
 * duplicate No action yet under the badge.
 * Dropzone only if that plugin actually uploads a file (none on this page).
 * No second last-sync state machine. No invented last-sync.
 */

import Link from 'next/link';
import {
  formatSyncedRelative,
  resolveLastSyncState,
  type LastSyncKind,
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
  PLUGIN_TILE_ACTIVATED_RAIL,
  PLUGIN_TILE_FOCUS_RING,
  PLUGIN_TILE_OUTLINE_BTN,
  pluginTileCardChrome,
  pluginTileTitleClassName,
} from '@/components/plugins/pluginTileChrome';

export interface PluginAppCardProps {
  card: PluginAppCardModel;
  busy?: boolean;
  selected?: boolean;
  onSelect?: (slug: string) => void;
  onConnect?: (slug: string) => void;
  onDisconnect?: (slug: string) => void;
}

function lastSyncKindFor(card: PluginAppCardModel): LastSyncKind {
  const sm = resolveLastSyncState({
    linked: card.cardState === 'connected',
    lastSyncAt: card.cardState === 'connected' ? card.lastSyncAt : null,
    needsReconnect: card.cardState === 'needs_reconnect',
  });
  return sm.kind;
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
  return PLUGIN_STATE_COPY.notConnected;
}

export function PluginAppCard({
  card,
  busy,
  selected,
  onSelect,
  onConnect,
  onDisconnect,
}: PluginAppCardProps) {
  const state = card.cardState;
  const isSelected = Boolean(selected);
  const connectWired = isPluginConnectWired(card);
  const canIngest = connectWired && state !== 'coming_soon';
  const lastSyncLabel = state === 'connected' ? realLastSyncLabel(card.lastSyncAt) : null;
  const liveDot =
    state === 'connected' ? 'bg-[#2DA5A0]' : state === 'needs_reconnect' ? 'bg-[#B75E18]' : 'bg-white/30';
  const showComingSoonAction = state === 'coming_soon';
  const hasFileUpload = card.connectionType === 'file_import';

  return (
    <article
      data-testid={`plugin-app-card-${card.slug}`}
      data-plugin-slug={card.slug}
      data-card-state={state}
      data-last-sync-state={lastSyncKindFor(card)}
      data-has-file-upload={hasFileUpload ? 'true' : 'false'}
      data-selected={isSelected ? 'true' : 'false'}
      aria-selected={isSelected ? 'true' : undefined}
      role="option"
      tabIndex={isSelected ? 0 : -1}
      onClick={() => onSelect?.(card.slug)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(card.slug);
        }
      }}
      className={`${pluginTileCardChrome(isSelected)} ${PLUGIN_TILE_FOCUS_RING} cursor-pointer`}
    >
      {isSelected ? (
        <span aria-hidden="true" className={PLUGIN_TILE_ACTIVATED_RAIL} />
      ) : null}
      <div className="flex items-start gap-3">
        <PluginVendorMark slug={card.slug} displayName={card.displayName} />

        <div className="min-w-0 flex-1 overflow-visible">
          <div className="flex items-start justify-between gap-2">
            {showComingSoonAction ? (
              <span className="order-last shrink-0 pt-1 text-[11px] text-white/40">
                {PLUGIN_STATE_COPY.comingSoon}
              </span>
            ) : null}

            <div className="min-w-0 flex-1">
              <h3 className={pluginTileTitleClassName(isSelected)}>
                {card.displayName}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/60">
                <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${liveDot}`} />
                <span>
                  {statusLabel(state)}
                  {lastSyncLabel ? ` • ${lastSyncLabel}` : null}
                </span>
              </p>
              {state === 'coming_soon' && (
                <span className="sr-only">{PLUGIN_COMING_SOON_ACTION}</span>
              )}
              {state === 'connected' && card.disconnectPath ? (
                <button
                  type="button"
                  data-testid={`plugin-disconnect-${card.slug}`}
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDisconnect?.(card.slug);
                  }}
                  className="mt-2 min-h-[44px] text-xs font-medium text-teal hover:underline disabled:opacity-50"
                >
                  {PLUGIN_STATE_COPY.disconnect}
                </button>
              ) : null}
            </div>

            {state === 'connected' && isTruthfulWearablesManage(card) && card.wearablesCrossLink ? (
              <Link
                href={card.wearablesCrossLink}
                data-testid={`plugin-manage-${card.slug}`}
                onClick={(e) => e.stopPropagation()}
                className={PLUGIN_TILE_OUTLINE_BTN}
              >
                {PLUGIN_STATE_COPY.manage}
              </Link>
            ) : null}

            {state === 'needs_reconnect' && canIngest ? (
              <button
                type="button"
                data-testid={`plugin-connect-${card.slug}`}
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onConnect?.(card.slug);
                }}
                className={PLUGIN_TILE_OUTLINE_BTN}
              >
                Reconnect
              </button>
            ) : null}

            {state === 'not_connected' && canIngest ? (
              <button
                type="button"
                data-testid={`plugin-connect-${card.slug}`}
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onConnect?.(card.slug);
                }}
                className={PLUGIN_TILE_OUTLINE_BTN}
              >
                {PLUGIN_STATE_COPY.connect}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default PluginAppCard;
