'use client';

/**
 * 390 tile anatomy lock: vendor mark left, name, status badge,
 * last-sync or No action yet. Connected: Manage in Wearables Data + Disconnect.
 * Coming soon: badge + No action yet. No coming-soon action control.
 * Tile states from last-sync-state via the join. No second state machine.
 */

import Link from 'next/link';
import { formatSyncedRelative } from '@/lib/body-tracker/last-sync-state';
import type { PluginAppCardModel } from '@/lib/integrations/connectionState';
import {
  PLUGIN_COMING_SOON_ACTION,
  PLUGIN_STATE_COPY,
  isPluginConnectWired,
} from '@/lib/integrations/pluginAppRegistry';
import { PluginVendorMark } from '@/components/plugins/PluginVendorMark';

const CARD_BG = 'bg-[#1E3054]';
const TEAL = '#2DA5A0';

export interface PluginAppCardProps {
  card: PluginAppCardModel;
  busy?: boolean;
  onConnect?: (slug: string) => void;
  onDisconnect?: (slug: string) => void;
}

function persistLastSyncLine(iso: string | null): string | null {
  if (!iso) return null;
  const relative = formatSyncedRelative(iso);
  if (!relative) return null;
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  const abs = new Date(iso).toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  if (!abs || abs === '0') return null;
  return PLUGIN_STATE_COPY.lastSync(abs);
}

export function PluginAppCard({
  card,
  busy,
  onConnect,
  onDisconnect,
}: PluginAppCardProps) {
  const state = card.cardState;
  const connectWired = isPluginConnectWired(card);
  const lastSyncLine = state === 'connected' ? persistLastSyncLine(card.lastSyncAt) : null;
  const showNoAction = state === 'coming_soon';

  return (
    <article
      data-testid={`plugin-app-card-${card.slug}`}
      data-card-state={state}
      className={`flex items-center gap-3 rounded-2xl border border-white/10 ${CARD_BG} px-3 py-3`}
    >
      <PluginVendorMark slug={card.slug} displayName={card.displayName} />

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-white">{card.displayName}</h3>

        {state === 'connected' && (
          <span
            className="mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              color: TEAL,
              borderColor: 'rgba(45,165,160,0.4)',
              background: 'rgba(45,165,160,0.12)',
            }}
          >
            {PLUGIN_STATE_COPY.connected}
          </span>
        )}
        {state === 'not_connected' && (
          <span className="mt-1 inline-flex rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
            {PLUGIN_STATE_COPY.notConnected}
          </span>
        )}
        {state === 'coming_soon' && (
          <span className="mt-1 inline-flex rounded-full border border-[#B75E18]/35 bg-[#B75E18]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#B75E18]">
            {PLUGIN_STATE_COPY.comingSoon}
          </span>
        )}
        {state === 'needs_reconnect' && (
          <span className="mt-1 inline-flex rounded-full border border-[#B75E18]/35 bg-[#B75E18]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#B75E18]">
            {PLUGIN_STATE_COPY.needsReconnect}
          </span>
        )}

        {lastSyncLine && (
          <p className="mt-1 text-[11px] text-white/45">{lastSyncLine}</p>
        )}
        {showNoAction && (
          <p className="mt-1 text-[11px] text-white/45" data-testid={`plugin-no-action-${card.slug}`}>
            {PLUGIN_STATE_COPY.noActionYet}
          </p>
        )}
        {state === 'coming_soon' && (
          <span className="sr-only">{PLUGIN_COMING_SOON_ACTION}</span>
        )}
      </div>

      {state !== 'coming_soon' && (
        <div className="flex shrink-0 flex-col items-stretch gap-2">
          {state === 'connected' && card.wearablesCrossLink && (
            <Link
              href={card.wearablesCrossLink}
              data-testid={`plugin-manage-${card.slug}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#2DA5A0] bg-transparent px-3 text-center text-[11px] font-semibold text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/10"
            >
              {PLUGIN_STATE_COPY.manage}
            </Link>
          )}

          {state === 'connected' && card.disconnectPath && (
            <button
              type="button"
              data-testid={`plugin-disconnect-${card.slug}`}
              disabled={busy}
              onClick={() => onDisconnect?.(card.slug)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white bg-transparent px-3 text-[11px] font-semibold text-white transition-colors hover:border-red-400/40 hover:text-red-300 disabled:opacity-50"
            >
              {PLUGIN_STATE_COPY.disconnect}
            </button>
          )}

          {state === 'needs_reconnect' && card.wearablesCrossLink && (
            <Link
              href={card.wearablesCrossLink}
              data-testid={`plugin-manage-${card.slug}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#2DA5A0] bg-transparent px-3 text-center text-[11px] font-semibold text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/10"
            >
              {PLUGIN_STATE_COPY.manage}
            </Link>
          )}

          {(state === 'not_connected' || state === 'needs_reconnect') && connectWired && (
            <button
              type="button"
              data-testid={`plugin-connect-${card.slug}`}
              disabled={busy}
              onClick={() => onConnect?.(card.slug)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#2DA5A0] bg-transparent px-3 text-[11px] font-semibold text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/10 disabled:opacity-50"
            >
              {PLUGIN_STATE_COPY.connect}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default PluginAppCard;
