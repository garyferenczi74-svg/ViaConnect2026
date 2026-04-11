'use client';

// DailyInsightsCard — dashboard section that surfaces top relevance-scored
// research items from the user's active Research Hub sources. Replaces
// the previous static DailyUltrathinkTip section.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Bookmark, Clock, ExternalLink, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getActiveCategoryIds,
  listAllItems,
  listCategories,
  listUserItemStates,
  listUserSources,
  upsertUserItem,
} from '@/lib/research-hub/service';
import {
  buildRelevanceContext,
  scoreRelevance,
} from '@/lib/research-hub/relevance';
import type {
  CategorySlug,
  ResearchCategory,
  ResearchItem,
  ScoredItem,
} from '@/lib/research-hub/types';
import { subscribeResearchHub } from '@/lib/research-hub/events';
import { RelevanceBadge } from '@/components/research-hub/RelevanceBadge';
import type { DashboardProfile, DashboardSupplement } from '@/hooks/useUserDashboardData';

interface DailyInsightsCardProps {
  profile: DashboardProfile | null;
  supplements: DashboardSupplement[];
}

const formatRelative = (iso: string | null): string => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export function DailyInsightsCard({ profile, supplements }: DailyInsightsCardProps) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ScoredItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Reusable load function — called on mount, on Research Hub events,
  // and on window focus so toggles propagate live to the dashboard.
  const loadInsights = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        setUserId(user.id);

        const [cats, raw, activeIds, states, userSources] = await Promise.all([
          listCategories(),
          listAllItems(),
          getActiveCategoryIds(user.id),
          listUserItemStates(user.id),
          listUserSources(user.id),
        ]);

        const activeCategorySet = new Set(
          activeIds.length > 0 ? activeIds : cats.filter((c) => c.is_default).map((c) => c.id),
        );
        const catSlugById: Record<string, CategorySlug> = {};
        cats.forEach((c: ResearchCategory) => (catSlugById[c.id] = c.slug));

        // Active sources keyed by `${category_id}::${source_name}` so we can
        // filter items down to ONLY the sources the user has activated on
        // the Research Hub. This is the core interactivity link.
        const activeSourceKeys = new Set<string>();
        userSources.forEach((s) => {
          if (s.is_active && activeCategorySet.has(s.category_id)) {
            activeSourceKeys.add(`${s.category_id}::${s.source_name}`);
          }
        });
        const hasAnyActiveSource = activeSourceKeys.size > 0;

        const ctx = buildRelevanceContext({
          profile,
          supplements,
          wellnessCategories: ['sleep', 'methylation', 'stress', 'inflammation'],
        });

        const scored: ScoredItem[] = raw
          .filter((i: ResearchItem) => activeCategorySet.has(i.category_id))
          // Only include items whose source the user has ACTIVATED on the
          // Research Hub. If the user has no sources yet (first load before
          // ensureSuggestedSources runs), fall back to showing everything.
          .filter((i: ResearchItem) =>
            hasAnyActiveSource
              ? activeSourceKeys.has(`${i.category_id}::${i.source_name}`)
              : true,
          )
          .map((item) => {
            const state = states[item.id];
            const r = state
              ? {
                  score: state.relevance_score,
                  reasons: state.relevance_reasons,
                  matchedDomains: state.matched_domains,
                }
              : scoreRelevance(item, ctx);
            return {
              ...item,
              category_slug: catSlugById[item.category_id] || 'publications',
              user_item_id: state?.user_item_id ?? null,
              relevance_score: r.score,
              relevance_reasons: r.reasons,
              matched_domains: r.matchedDomains,
              is_bookmarked: state?.is_bookmarked ?? false,
              is_read: state?.is_read ?? false,
              is_dismissed: state?.is_dismissed ?? false,
            };
          })
          .filter((i) => !i.is_dismissed)
          .sort((a, b) => b.relevance_score - a.relevance_score)
          .slice(0, 5);

        setItems(scored);
      } catch (e) {
        console.warn('[daily-insights] load failed', e);
      } finally {
        setLoading(false);
      }
    },
    [profile, supplements],
  );

  // Initial load
  useEffect(() => {
    loadInsights(false);
  }, [loadInsights]);

  // Live refresh: subscribe to Research Hub events (BroadcastChannel)
  // so toggling a source on /media-sources updates the dashboard instantly,
  // even across browser tabs.
  useEffect(() => {
    const unsub = subscribeResearchHub((evt) => {
      if (
        evt.type === 'source-toggled' ||
        evt.type === 'tab-toggled' ||
        evt.type === 'source-added' ||
        evt.type === 'source-removed'
      ) {
        loadInsights(true);
      }
    });
    return unsub;
  }, [loadInsights]);

  // Refresh when the dashboard tab regains focus (user comes back from
  // the Research Hub tab/window).
  useEffect(() => {
    const onFocus = () => loadInsights(true);
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
      return () => window.removeEventListener('focus', onFocus);
    }
    return undefined;
  }, [loadInsights]);

  const totalCount = items.length;

  const handleBookmark = async (item: ScoredItem) => {
    if (!userId) return;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_bookmarked: !i.is_bookmarked } : i)),
    );
    await upsertUserItem(userId, item.id, {
      relevance_score: item.relevance_score,
      relevance_reasons: item.relevance_reasons,
      matched_domains: item.matched_domains,
      is_bookmarked: !item.is_bookmarked,
    });
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4 sm:p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
          <div>
            <h2 className="text-sm font-bold text-white">Daily Insights</h2>
            <p className="text-[11px] text-white/40">
              Top {totalCount} matches for your wellness journey
            </p>
          </div>
        </div>
        <Link
          href="/media-sources"
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/70 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
        >
          Research Hub
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
          <p className="text-sm font-semibold text-white">No insights yet</p>
          <p className="mt-1 text-xs text-white/40">
            Activate research sources to start receiving personalized insights.
          </p>
          <Link
            href="/media-sources"
            className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-3 py-2 text-xs font-medium text-[#2DA5A0] hover:bg-[#2DA5A0]/20"
          >
            Open Research Hub
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`group rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-all hover:border-white/15 hover:bg-white/[0.04] ${
                item.is_read ? 'opacity-70' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <RelevanceBadge score={item.relevance_score} size="sm" />
                    <span className="flex items-center gap-1 text-[10px] text-white/35">
                      <Clock className="h-3 w-3" strokeWidth={1.5} />
                      {formatRelative(item.published_at)}
                    </span>
                  </div>
                  <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-white sm:text-[13px]">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-[10px] text-white/40">
                    {item.source_name}
                    {item.matched_domains.length > 0 && (
                      <>
                        {' · '}
                        <span className="text-[#2DA5A0]/80">
                          {item.matched_domains.slice(0, 2).join(', ')}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleBookmark(item)}
                    aria-label={item.is_bookmarked ? 'Unbookmark' : 'Bookmark'}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                      item.is_bookmarked
                        ? 'border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[#FBBF24]'
                        : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <Bookmark className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                  {item.original_url && (
                    <a
                      href={item.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open source"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/40 transition-all hover:border-white/20 hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </a>
                  )}
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
