'use client';

// Research Hub — Consumer page (Prompt #61).
// Replaces the previous static media-sources view with personalized,
// DB-backed source curation, local relevance scoring, and sample content.

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Filter, Loader2, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUserDashboardData } from '@/hooks/useUserDashboardData';
import {
  addSource,
  applyFeedFilters,
  ensureDefaultTabs,
  ensureSuggestedSources,
  getActiveCategoryIds,
  listAllItems,
  listCategories,
  listUserItemStates,
  listUserSources,
  removeSource,
  toggleSourceActive,
  toggleSourceAlerts,
  toggleTab,
  upsertUserItem,
} from '@/lib/research-hub/service';
import {
  buildRelevanceContext,
  scoreRelevance,
} from '@/lib/research-hub/relevance';
import type {
  CategorySlug,
  FeedFilters,
  NewSourceInput,
  ResearchCategory,
  ResearchItem,
  ScoredItem,
  UserSource,
} from '@/lib/research-hub/types';
import { CategoryTabBar } from '@/components/research-hub/CategoryTabBar';
import { CategoryTabManager } from '@/components/research-hub/CategoryTabManager';
import { SourceManager } from '@/components/research-hub/SourceManager';
import { AddSourceModal } from '@/components/research-hub/AddSourceModal';
import { ContentFeed } from '@/components/research-hub/ContentFeed';
import { SherlockStatusIndicator } from '@/components/research-hub/SherlockStatusIndicator';
import { SherlockActivityFeed } from '@/components/research-hub/SherlockActivityFeed';
import type { RelevanceContext } from '@/lib/research-hub/relevance';
import { emitResearchHubEvent } from '@/lib/research-hub/events';

// ── Local agent: themed item generator (zero API cost) ──────
// Templated content per category. Each template references protocol terms
// from the user's RelevanceContext when available so the scored cards
// surface real "why it matters" reasons the moment a new source is added.
const TEMPLATES: Record<string, Array<{ title: (s: string) => string; summary: (s: string, focus: string) => string; tags: string[] }>> = {
  publications: [
    { title: (s) => `${s}: Updated 2026 Evidence on ${'$FOCUS$'}`, summary: (s, f) => `${s} publishes new systematic review on ${f}, covering bioavailability, dosing, and outcome markers.`, tags: ['evidence', 'review'] },
    { title: (s) => `New ${s} study: precision wellness targets`, summary: (s) => `${s} releases findings on personalized supplementation strategies for genetic variant carriers.`, tags: ['precision', 'genetics'] },
    { title: (s) => `${s} — Methylation pathways and B-vitamin response`, summary: (s) => `${s} explores the latest research on MTHFR variants and methylated B-vitamin response.`, tags: ['methylation', 'mthfr'] },
    { title: (s) => `${s}: Inflammation markers and adaptogenic protocols`, summary: (s) => `${s} reviews adaptogen-based protocols for inflammation reduction in healthy adults.`, tags: ['inflammation', 'adaptogen'] },
  ],
  platforms: [
    { title: (s) => `${s}: Practical guide to ${'$FOCUS$'}`, summary: (s, f) => `${s} publishes a hands-on practitioner guide for working with ${f} in clinical practice.`, tags: ['practical', 'guide'] },
    { title: (s) => `${s} — Supplement bioavailability deep dive`, summary: (s) => `${s} compares liposomal, micellar, and standard supplement forms for absorption (10–27× variance).`, tags: ['bioavailability', 'liposomal'] },
    { title: (s) => `${s}: Top wellness trends for 2026`, summary: (s) => `${s} editorial on emerging precision wellness, peptide therapies, and AI-guided protocols.`, tags: ['trends', 'wellness'] },
    { title: (s) => `${s} — Sleep optimization & circadian protocols`, summary: (s) => `${s} breaks down evidence-based protocols for sleep latency, deep sleep, and recovery.`, tags: ['sleep', 'circadian'] },
  ],
  social_media: [
    { title: (s) => `${s} thread: ${'$FOCUS$'} explained`, summary: (s, f) => `${s} drops a deep-dive thread on ${f}, with citations and practical takeaways.`, tags: ['thread', 'education'] },
    { title: (s) => `${s} — viral take on NAD+ precursors`, summary: (s) => `${s} weighs in on the latest NAD+ supplement research and what actually works for healthspan.`, tags: ['nad', 'longevity'] },
    { title: (s) => `${s}: Daily protocol breakdown`, summary: (s) => `${s} shares a transparent look at their personal supplement and recovery stack.`, tags: ['protocol', 'stack'] },
    { title: (s) => `${s} — Stress, cortisol, and HPA axis tools`, summary: (s) => `${s} discusses adaptogens, breathwork, and morning light for HPA axis regulation.`, tags: ['stress', 'cortisol'] },
  ],
  podcasts: [
    { title: (s) => `${s} episode: ${'$FOCUS$'}`, summary: (s, f) => `${s} releases a long-form episode covering ${f} with leading researchers.`, tags: ['episode', 'interview'] },
    { title: (s) => `${s} — Peptides & recovery science`, summary: (s) => `${s} hosts a guest expert on injectable and oral peptide protocols for tissue repair.`, tags: ['peptides', 'recovery'] },
  ],
  clinical_trials: [
    { title: (s) => `${s}: New recruiting trial for methylation support`, summary: (s) => `${s} lists a Phase 2 RCT recruiting MTHFR variant carriers for a 12-week methylated B-complex study.`, tags: ['recruiting', 'mthfr'] },
    { title: (s) => `${s} — Active study: NAD+ in aging adults`, summary: (s) => `${s} tracks an ongoing trial on NMN supplementation in adults 55+ over 16 weeks.`, tags: ['nad', 'aging'] },
  ],
  news: [
    { title: (s) => `${s}: Industry update on liposomal delivery`, summary: (s) => `${s} reports on the rapid growth of liposomal supplement formulations and bioavailability research.`, tags: ['liposomal', 'industry'] },
    { title: (s) => `${s} — Breaking: new senolytic data`, summary: (s) => `${s} covers Phase 2 results from a senolytic compound targeting age-related cellular markers.`, tags: ['senolytics', 'aging'] },
  ],
};

function generateThemedItems(
  sourceName: string,
  categoryId: string,
  categorySlug: string,
  sourceUrl: string | null,
  ctx: RelevanceContext,
): ResearchItem[] {
  const templates = TEMPLATES[categorySlug] || TEMPLATES.publications;
  // Pull a focus term from the user's actual concerns/supplements when
  // available — otherwise fall back to a generic wellness theme.
  const focus =
    ctx.healthConcerns[0] ||
    ctx.supplements[0] ||
    ctx.wellnessCategories[0] ||
    'precision wellness';

  const baseTime = Date.now();
  return templates.map((tpl, idx) => {
    const titleRaw = tpl.title(sourceName).replace('$FOCUS$', focus);
    const summary = tpl.summary(sourceName, focus).replace('$FOCUS$', focus);
    return {
      id: `local-${categoryId}-${baseTime}-${idx}`,
      category_id: categoryId,
      source_name: sourceName,
      title: titleRaw,
      summary,
      original_url: sourceUrl,
      author: sourceName,
      published_at: new Date(baseTime - idx * 1000 * 60 * 60 * 3).toISOString(), // staggered hours
      image_url: null,
      tags: tpl.tags,
      raw_metadata: { generated: true },
      created_at: new Date().toISOString(),
    };
  });
}

export default function ResearchHubPage() {
  const { profile, supplements } = useUserDashboardData();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ResearchCategory[]>([]);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sources, setSources] = useState<UserSource[]>([]);
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [userItemStates, setUserItemStates] = useState<
    Awaited<ReturnType<typeof listUserItemStates>>
  >({});

  const [showManager, setShowManager] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);

  // Filters
  const [minRelevance, setMinRelevance] = useState(0);
  const [statusFilter, setStatusFilter] = useState<FeedFilters['status']>('all');
  const [sortBy, setSortBy] = useState<FeedFilters['sortBy']>('relevance');

  // ── Initial load ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) {
          setLoading(false);
          return;
        }
        setUserId(user.id);

        const cats = await listCategories();
        if (cancelled) return;
        setCategories(cats);

        // Ensure defaults active for first-time users + auto-populate
        // suggested sources for all categories so the chip strip is never empty
        await ensureDefaultTabs(user.id, cats);
        await ensureSuggestedSources(user.id, cats);

        const activeIdList = await getActiveCategoryIds(user.id);
        if (cancelled) return;

        // If no active tabs (returning user with everything off), force defaults
        const initialActive =
          activeIdList.length > 0
            ? new Set(activeIdList)
            : new Set(cats.filter((c) => c.is_default).map((c) => c.id));

        setActiveIds(initialActive);

        const firstActive = cats.find((c) => initialActive.has(c.id));
        setSelectedId(firstActive?.id ?? cats[0]?.id ?? null);

        const [allItems, srcs, states] = await Promise.all([
          listAllItems(),
          listUserSources(user.id),
          listUserItemStates(user.id),
        ]);
        if (cancelled) return;
        setItems(allItems);
        setSources(srcs);
        setUserItemStates(states);
      } catch (e) {
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Build relevance context (memoized off profile + supplements) ─
  const relevanceContext = useMemo(
    () =>
      buildRelevanceContext({
        profile,
        supplements,
        wellnessCategories: ['sleep', 'methylation', 'stress', 'inflammation'],
      }),
    [profile, supplements],
  );

  // ── Score items locally (no API) ─────────────────────────
  const scoredAll: ScoredItem[] = useMemo(() => {
    if (categories.length === 0 || items.length === 0) return [];
    const catSlugById: Record<string, CategorySlug> = {};
    categories.forEach((c) => (catSlugById[c.id] = c.slug));

    return items.map((item) => {
      const state = userItemStates[item.id];
      const result = state
        ? {
            score: state.relevance_score,
            reasons: state.relevance_reasons,
            matchedDomains: state.matched_domains,
          }
        : scoreRelevance(item, relevanceContext);
      return {
        ...item,
        category_slug: catSlugById[item.category_id] || 'publications',
        user_item_id: state?.user_item_id ?? null,
        relevance_score: result.score,
        relevance_reasons: result.reasons,
        matched_domains: result.matchedDomains,
        is_bookmarked: state?.is_bookmarked ?? false,
        is_read: state?.is_read ?? false,
        is_dismissed: state?.is_dismissed ?? false,
      };
    });
  }, [items, categories, userItemStates, relevanceContext]);

  // ── Persist scores once on first load (best effort) ─────
  useEffect(() => {
    if (!userId || scoredAll.length === 0) return;
    const fresh = scoredAll.filter((s) => s.user_item_id === null);
    if (fresh.length === 0) return;
    (async () => {
      try {
        await Promise.all(
          fresh.slice(0, 50).map((s) =>
            upsertUserItem(userId, s.id, {
              relevance_score: s.relevance_score,
              relevance_reasons: s.relevance_reasons,
              matched_domains: s.matched_domains,
            }),
          ),
        );
      } catch {
        /* ignore */
      }
    })();
  }, [userId, scoredAll]);

  // ── Filtered feed for the currently selected tab ────────
  const selectedCategory = categories.find((c) => c.id === selectedId);

  // Build a set of active source NAMES for the selected category so the
  // feed reacts in real time when the user toggles a source chip on/off.
  const activeSourceNamesForSelected = useMemo(() => {
    if (!selectedCategory) return new Set<string>();
    return new Set(
      sources
        .filter((s) => s.category_id === selectedCategory.id && s.is_active)
        .map((s) => s.source_name),
    );
  }, [sources, selectedCategory]);

  const feedItems = useMemo(() => {
    if (!selectedCategory) return [];
    const filtered = scoredAll
      .filter((s) => s.category_slug === selectedCategory.slug)
      // Only show items whose source the user has ACTIVE for this category
      .filter((s) =>
        activeSourceNamesForSelected.size === 0
          ? true // before sources load, show everything so the page isn't blank
          : activeSourceNamesForSelected.has(s.source_name),
      );
    return applyFeedFilters(filtered, {
      categorySlug: 'all',
      minRelevance,
      status: statusFilter,
      sortBy,
    });
  }, [
    scoredAll,
    selectedCategory,
    activeSourceNamesForSelected,
    minRelevance,
    statusFilter,
    sortBy,
  ]);

  // ── Actions ──────────────────────────────────────────────
  const handleToggleTab = async (categoryId: string, nextActive: boolean) => {
    if (!userId) return;
    const next = new Set(activeIds);
    if (nextActive) next.add(categoryId);
    else next.delete(categoryId);
    setActiveIds(next);
    await toggleTab(userId, categoryId, nextActive);
    emitResearchHubEvent({ type: 'tab-toggled', categoryId, isActive: nextActive });
    if (!nextActive && selectedId === categoryId) {
      const fallback = categories.find((c) => next.has(c.id));
      setSelectedId(fallback?.id ?? null);
    }
  };

  const handleAddSource = async (input: NewSourceInput) => {
    if (!userId || !selectedCategory) return;
    const created = await addSource(userId, selectedCategory.id, input);
    if (created) {
      setSources((prev) => [...prev, created]);
      emitResearchHubEvent({ type: 'source-added', sourceId: created.id });
      // Auto-seed themed sample content so any newly added source —
      // suggested OR custom — surfaces in the feed immediately. Templates
      // are wellness-aligned and pulled from the user's protocol context
      // so the cards score with real relevance reasons.
      const themed = generateThemedItems(
        input.source_name,
        selectedCategory.id,
        selectedCategory.slug,
        input.source_url ?? null,
        relevanceContext,
      );
      setItems((prev) => [...prev, ...themed]);
    }
  };

  const handleRemoveSource = async (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    await removeSource(id);
    emitResearchHubEvent({ type: 'source-removed', sourceId: id });
  };

  const handleToggleSource = async (id: string, isActive: boolean) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: isActive } : s)));
    await toggleSourceActive(id, isActive);
    emitResearchHubEvent({ type: 'source-toggled', sourceId: id, isActive });
  };

  const handleToggleSourceAlerts = async (id: string, notify: boolean) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, notify_alerts: notify } : s)));
    await toggleSourceAlerts(id, notify);
  };

  const handleBookmark = async (item: ScoredItem) => {
    if (!userId) return;
    const next = !item.is_bookmarked;
    setUserItemStates((prev) => ({
      ...prev,
      [item.id]: {
        user_item_id: prev[item.id]?.user_item_id || `local-${item.id}`,
        relevance_score: item.relevance_score,
        relevance_reasons: item.relevance_reasons,
        matched_domains: item.matched_domains,
        is_read: item.is_read,
        is_bookmarked: next,
        is_dismissed: item.is_dismissed,
      },
    }));
    await upsertUserItem(userId, item.id, {
      relevance_score: item.relevance_score,
      relevance_reasons: item.relevance_reasons,
      matched_domains: item.matched_domains,
      is_bookmarked: next,
    });
  };

  const handleDismiss = async (item: ScoredItem) => {
    if (!userId) return;
    setUserItemStates((prev) => ({
      ...prev,
      [item.id]: {
        user_item_id: prev[item.id]?.user_item_id || `local-${item.id}`,
        relevance_score: item.relevance_score,
        relevance_reasons: item.relevance_reasons,
        matched_domains: item.matched_domains,
        is_read: item.is_read,
        is_bookmarked: item.is_bookmarked,
        is_dismissed: true,
      },
    }));
    await upsertUserItem(userId, item.id, {
      relevance_score: item.relevance_score,
      relevance_reasons: item.relevance_reasons,
      matched_domains: item.matched_domains,
      is_dismissed: true,
    });
  };

  const handleRead = async (item: ScoredItem) => {
    if (!userId || item.is_read) return;
    setUserItemStates((prev) => ({
      ...prev,
      [item.id]: {
        user_item_id: prev[item.id]?.user_item_id || `local-${item.id}`,
        relevance_score: item.relevance_score,
        relevance_reasons: item.relevance_reasons,
        matched_domains: item.matched_domains,
        is_read: true,
        is_bookmarked: item.is_bookmarked,
        is_dismissed: item.is_dismissed,
      },
    }));
    await upsertUserItem(userId, item.id, {
      relevance_score: item.relevance_score,
      relevance_reasons: item.relevance_reasons,
      matched_domains: item.matched_domains,
      is_read: true,
    });
  };

  const activeCategories = categories.filter((c) => activeIds.has(c.id));
  const sourcesForSelected = selectedCategory
    ? sources.filter((s) => s.category_id === selectedCategory.id)
    : [];
  const existingSourceNames = new Set(sourcesForSelected.map((s) => s.source_name));

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-[#1A2744] text-white">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-6 md:py-8">
        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2DA5A0]/30 bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]">
              <BookOpen className="h-5 w-5 text-white" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white sm:text-2xl">Research Hub</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <p className="text-xs text-white/45 sm:text-sm">
                  Personalized discovery scored by Hannah
                </p>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#FBBF24]/40 bg-gradient-to-r from-[#FBBF24]/15 to-[#B75E18]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FBBF24] shadow-[0_0_12px_rgba(251,191,36,0.18)]">
                  <Sparkles className="h-3 w-3" strokeWidth={2} />
                  Zero Cost AI
                </span>
              </div>
            </div>
          </div>
          {/* Sherlock status (additive — does not alter layout) */}
          <div className="hidden flex-shrink-0 sm:block">
            <SherlockStatusIndicator />
          </div>
        </header>

        {/* Sherlock activity feed (additive — new section above the rest) */}
        <SherlockActivityFeed />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <CategoryTabBar
              categories={activeCategories}
              activeId={selectedId}
              onSelect={setSelectedId}
              onManage={() => setShowManager(true)}
            />

            {/* Sources for selected tab */}
            {selectedCategory && (
              <SourceManager
                sources={sourcesForSelected}
                onAdd={() => setShowAddSource(true)}
                onToggleActive={handleToggleSource}
                onToggleAlerts={handleToggleSourceAlerts}
                onRemove={handleRemoveSource}
              />
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[#1E3054] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                <Filter className="h-3 w-3" strokeWidth={1.5} />
                Filters
              </div>
              <select
                value={minRelevance}
                onChange={(e) => setMinRelevance(Number(e.target.value))}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white focus:border-[#2DA5A0]/40 focus:outline-none"
              >
                <option value={0} className="bg-[#1E3054]">All relevance</option>
                <option value={50} className="bg-[#1E3054]">50%+</option>
                <option value={70} className="bg-[#1E3054]">70%+</option>
                <option value={90} className="bg-[#1E3054]">90%+ only</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FeedFilters['status'])}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white focus:border-[#2DA5A0]/40 focus:outline-none"
              >
                <option value="all" className="bg-[#1E3054]">All</option>
                <option value="unread" className="bg-[#1E3054]">Unread</option>
                <option value="bookmarked" className="bg-[#1E3054]">Bookmarked</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as FeedFilters['sortBy'])}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white focus:border-[#2DA5A0]/40 focus:outline-none"
              >
                <option value="relevance" className="bg-[#1E3054]">Most relevant</option>
                <option value="recent" className="bg-[#1E3054]">Most recent</option>
              </select>
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-white/40">
                <Sparkles className="h-3 w-3 text-[#2DA5A0]" strokeWidth={1.5} />
                {feedItems.length} items
              </span>
            </div>

            {/* Feed */}
            <ContentFeed
              items={feedItems}
              onBookmark={handleBookmark}
              onDismiss={handleDismiss}
              onRead={handleRead}
            />
          </>
        )}
      </div>

      {/* Modals */}
      <CategoryTabManager
        open={showManager}
        categories={categories}
        activeIds={activeIds}
        onToggle={handleToggleTab}
        onClose={() => setShowManager(false)}
      />

      {selectedCategory && (
        <AddSourceModal
          open={showAddSource}
          category={selectedCategory}
          existingSourceNames={existingSourceNames}
          onAdd={handleAddSource}
          onClose={() => setShowAddSource(false)}
        />
      )}
    </div>
  );
}
