'use client';

/**
 * /plugins apps surface. Existing chrome/logo stay in AppShell.
 * Wearable device tiles are not listed here.
 */

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { PluginAppCard } from '@/components/plugins/PluginAppCard';
import { usePluginAppCards } from '@/hooks/usePluginAppCards';
import { groupCardsByCategory } from '@/lib/integrations/connectionState';
import {
  PLUGIN_COMING_SOON_ACTION,
  PLUGIN_PAGE_SCOPE_LINE,
  PLUGIN_PAGE_SUBTITLE,
  PLUGIN_STATE_COPY,
  isPluginConnectWired,
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
      if (!card || !isPluginConnectWired(card)) return;
      if (card.cardState === 'coming_soon') return;
      if (!card.connectPath) return;
      if (card.connectionType === 'file_import') {
        router.push(card.connectPath);
        return;
      }
      window.location.href = card.connectPath;
    },
    [cards, router],
  );

  const onDisconnect = useCallback(
    async (slug: string) => {
      const card = cards.find((c) => c.slug === slug);
      if (!card?.disconnectPath || card.cardState !== 'connected') return;
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
    <div className="w-full space-y-6 pb-16 pt-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Plugins</h1>
        <p className="text-sm text-[#2DA5A0]" data-testid="plugins-subtitle">
          {PLUGIN_PAGE_SUBTITLE}
        </p>
        <p className="text-xs text-white/40" data-testid="plugins-scope-line">
          App integrations only. Device wearables under{' '}
          <Link href="/body-tracker/connections" className="text-[#2DA5A0] hover:underline">
            Wearables Data
          </Link>{' '}
          (/body-tracker/connections).
        </p>
        <span className="sr-only">{PLUGIN_PAGE_SCOPE_LINE}</span>
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
          <span>{PLUGIN_STATE_COPY.stateUnavailable}</span>
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
        <div data-testid="plugins-empty" className="min-h-[120px]" />
      ) : (
        groups.map(({ category, cards: groupCards }) => (
          <section key={category} data-testid={`plugin-category-${category}`} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#2DA5A0]">
              {category}
            </h2>
            <div className="flex flex-col gap-3">
              {groupCards.map((card) => (
                <PluginAppCard
                  key={card.slug}
                  card={card}
                  busy={busySlug === card.slug}
                  onConnect={onConnect}
                  onDisconnect={onDisconnect}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <p className="sr-only">{PLUGIN_COMING_SOON_ACTION}</p>
    </div>
  );
}

export default PluginsAppsSurface;
