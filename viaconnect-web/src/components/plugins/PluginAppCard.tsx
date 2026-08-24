'use client';

/**
 * Prompt 218: single app plugin card (Connected / Available / Coming soon / Unavailable).
 */

import Link from 'next/link';
import {
  Activity,
  Apple,
  Brain,
  Dna,
  HeartPulse,
  Plug,
  type LucideIcon,
} from 'lucide-react';
import type { PluginAppCardModel } from '@/lib/integrations/connectionState';
import { PLUGIN_STATE_COPY } from '@/lib/integrations/pluginAppRegistry';

const ICONS: Record<string, LucideIcon> = {
  HeartPulse,
  Apple,
  Activity,
  Brain,
  Dna,
  Plug,
};

const CARD_BG = 'bg-[rgba(30,48,84,0.85)]';
const TEAL = '#2DA5A0';

export interface PluginAppCardProps {
  card: PluginAppCardModel;
  busy?: boolean;
  onConnect?: (slug: string) => void;
  onDisconnect?: (slug: string) => void;
  onRetry?: () => void;
}

export function PluginAppCard({
  card,
  busy,
  onConnect,
  onDisconnect,
  onRetry,
}: PluginAppCardProps) {
  const Icon = ICONS[card.iconKey] ?? Plug;
  const state = card.cardState;

  return (
    <article
      data-testid={`plugin-app-card-${card.slug}`}
      data-card-state={state}
      className={`flex min-h-[140px] flex-col gap-3 rounded-2xl border border-white/10 ${CARD_BG} p-4 backdrop-blur-md`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
          <Icon className="h-5 w-5 text-white/70" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{card.displayName}</h3>
            {state === 'connected' && (
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  color: TEAL,
                  borderColor: 'rgba(45,165,160,0.4)',
                  background: 'rgba(45,165,160,0.12)',
                }}
              >
                {PLUGIN_STATE_COPY.connected}
              </span>
            )}
            {state === 'coming_soon' && (
              <span className="rounded-full border border-[#B75E18]/35 bg-[#B75E18]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#B75E18]">
                {PLUGIN_STATE_COPY.comingSoon}
              </span>
            )}
            {state === 'unavailable' && (
              <span className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                Unavailable
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/55">{card.description}</p>
        </div>
      </div>

      {state === 'connected' && (
        <div className="space-y-1 text-[11px] text-white/45">
          {card.connectedAt && <p>{PLUGIN_STATE_COPY.connectedSince(card.connectedAt)}</p>}
          <p>{PLUGIN_STATE_COPY.lastSync(card.lastSyncAt)}</p>
        </div>
      )}

      {card.wearablesCrossLink && (
        <Link
          href={card.wearablesCrossLink}
          className="text-[11px] font-medium text-[#2DA5A0] hover:underline"
        >
          {PLUGIN_STATE_COPY.wearablesLink}
        </Link>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        {state === 'connected' && card.disconnectPath && (
          <button
            type="button"
            data-testid={`plugin-disconnect-${card.slug}`}
            disabled={busy}
            onClick={() => onDisconnect?.(card.slug)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 text-xs font-semibold text-white/80 transition-colors hover:border-red-400/40 hover:text-red-300 disabled:opacity-50"
          >
            {PLUGIN_STATE_COPY.disconnect}
          </button>
        )}

        {state === 'available' && card.connectPath && card.connectionType === 'file_import' && (
          <Link
            href={card.connectPath}
            data-testid={`plugin-open-${card.slug}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#2DA5A0]/45 bg-[#2DA5A0]/15 px-4 text-xs font-semibold text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/25"
          >
            {PLUGIN_STATE_COPY.open}
          </Link>
        )}

        {state === 'available' && card.connectPath && card.connectionType !== 'file_import' && (
          <button
            type="button"
            data-testid={`plugin-connect-${card.slug}`}
            disabled={busy}
            onClick={() => onConnect?.(card.slug)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#2DA5A0]/45 bg-[#2DA5A0]/15 px-4 text-xs font-semibold text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/25 disabled:opacity-50"
          >
            {PLUGIN_STATE_COPY.connect}
          </button>
        )}

        {state === 'coming_soon' && (
          <span className="inline-flex min-h-[44px] items-center text-xs text-white/40">
            No action yet. We will enable Connect when the flow ships.
          </span>
        )}

        {state === 'unavailable' && (
          <button
            type="button"
            data-testid={`plugin-retry-${card.slug}`}
            onClick={() => onRetry?.()}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 text-xs font-semibold text-white/70 hover:bg-white/[0.08]"
          >
            {PLUGIN_STATE_COPY.retry}
          </button>
        )}
      </div>
    </article>
  );
}

export default PluginAppCard;
