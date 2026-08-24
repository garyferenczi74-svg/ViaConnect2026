'use client';

/**
 * Prompt 218: Plugins apps surface (registry join + connect/disconnect).
 * Wearables are not listed; cross-link to Wearables Data where a vendor spans both.
 */

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Watch, Loader2 } from 'lucide-react';
import { PluginAppCard } from '@/components/plugins/PluginAppCard';
import { usePluginAppCards } from '@/hooks/usePluginAppCards';
import {
  groupCardsByCategory,
  type PluginAppCardModel,
} from '@/lib/integrations/connectionState';
import {
  PLUGIN_PAGE_SUBTITLE,
  PLUGIN_STATE_COPY,
} from '@/lib/integrations/pluginAppRegistry';
import { safeLog } from '@/lib/utils/safe-log';

export function PluginsAppsSurface() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cards, loading, stateOk, refresh } = usePluginAppCards();
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const banner = searchParams?.get('connected')
    ? `Connected: ${searchParams.get('connected')}`
    : searchParams?.get('disconnected')
      ? `Disconnected: ${searchParams.get('disconnected')}`
      : searchParams?.get('error')
        ? `Could not complete that step (${searchParams.get('error')}).`
        : null;

  const groups = useMemo(() => groupCardsByCategory(cards), [cards]);

  const onConnect = useCallback(
    (slug: string) => {
      const card = cards.find((c) => c.slug === slug);
      if (!card?.connectPath || card.status !== 'live') return;
      if (card.connectionType === 'file_import') {
        router.push(card.connectPath);
        return;
      }
      // OAuth start (full navigation; tokens never touch the client).
      window.location.href = card.connectPath;
    },
    [cards, router],
  );

  const onDisconnect = useCallback(
    async (slug: string) => {
      const card = cards.find((c) => c.slug === slug);
      if (!card?.disconnectPath) return;
      setBusySlug(slug);
      try {
        const res = await fetch(card.disconnectPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          safeLog.warn('PluginsAppsSurface', 'disconnect failed', {
            slug,
            status: res.status,
          });
        }
        refresh();
      } catch (error) {
        safeLog.warn('PluginsAppsSurface', 'disconnect error', { slug, error });
      } finally {
        setBusySlug(null);
      }
    },
    [cards, refresh],
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-16 pt-4 md:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Plugins</h1>
        <p className="text-sm text-white/60" data-testid="plugins-subtitle">
          {PLUGIN_PAGE_SUBTITLE}
        </p>
        <p className="text-xs text-white/40">
          App integrations only. Device wearables live under{' '}
          <Link href="/wearables" className="text-[#2DA5A0] hover:underline">
            Wearables Data
          </Link>
          {' '}and{' '}
          <Link href="/body-tracker/connections" className="text-[#2DA5A0] hover:underline">
            Connected Sources
          </Link>
          .
        </p>
      </header>

      {banner && (
        <div
          role="status"
          className="rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-3 py-2 text-xs text-white/80"
        >
          {banner}
        </div>
      )}

      {!stateOk && (
        <div
          data-testid="plugins-state-unavailable"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#B75E18]/35 bg-[#B75E18]/10 px-3 py-3 text-xs text-white/80"
        >
          <span>{PLUGIN_STATE_COPY.unavailable}</span>
          <button
            type="button"
            onClick={refresh}
            className="min-h-[44px] rounded-xl border border-[#B75E18]/40 bg-[#B75E18]/15 px-3 font-semibold text-white"
          >
            {PLUGIN_STATE_COPY.retry}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          Loading apps...
        </div>
      ) : groups.length === 0 ? (
        <p className="text-sm text-white/50">No app integrations are listed yet.</p>
      ) : (
        groups.map(({ category, cards: groupCards }) => (
          <section key={category} data-testid={`plugin-category-${category}`} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">
              {category}
            </h2>
            {groupCards.length === 0 ? (
              <p className="text-xs text-white/40">No live integrations in this category yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groupCards.map((card: PluginAppCardModel) => (
                  <PluginAppCard
                    key={card.slug}
                    card={card}
                    busy={busySlug === card.slug}
                    onConnect={onConnect}
                    onDisconnect={onDisconnect}
                    onRetry={refresh}
                  />
                ))}
              </div>
            )}
          </section>
        ))
      )}

      <aside className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[rgba(30,48,84,0.6)] p-4">
        <Watch className="mt-0.5 h-5 w-5 shrink-0 text-[#2DA5A0]" strokeWidth={1.5} />
        <div className="min-w-0 text-xs text-white/60">
          <p className="font-semibold text-white/80">Looking for Whoop, Oura, Hume Body Pod, or Apple Health?</p>
          <p className="mt-1">
            Those are wearable devices. Connect them in{' '}
            <Link href="/wearables" className="text-[#2DA5A0] hover:underline">
              Wearables Data
            </Link>{' '}
            or{' '}
            <Link href="/body-tracker/connections" className="text-[#2DA5A0] hover:underline">
              Connected Sources
            </Link>
            . Google Health app connection is listed above and links to device management.
          </p>
        </div>
      </aside>
    </div>
  );
}

export default PluginsAppsSurface;
