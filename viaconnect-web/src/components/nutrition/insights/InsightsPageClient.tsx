'use client';

// Prompt 192 Task 4: client container for /nutrition/insights. Owns the two
// filter chip rows (scope: Today / This Week / Saved; type: All + the eight
// insight types with their icons), the manual Refresh button, the masonry
// insight list, and the dismiss undo window. Filters are plain useState (no
// deep link requirement), and every network call is timeout wrapped,
// try/caught, and safeLogged so a failure degrades to a calm state, never a
// crash.
//
// Dismiss undo: the card is removed optimistically and PATCHed to
// 'dismissed' immediately; an inline bar offers a 5 second Undo that PATCHes
// the row back to 'active' and reinserts the card. Unlike the meal delete
// undo (TodaysMealsSummary), nothing is destroyed server side, so leaving
// the page mid window simply lets the dismissal stand.

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, type LucideIcon } from 'lucide-react';
import type { InsightType } from '@/lib/nutrition/insights/types';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';
import { INSIGHT_TYPE_ICONS } from './insightIcons';
import {
  formatRetryAfter,
  INSIGHT_TYPE_LABELS,
  INSIGHT_TYPE_ORDER,
  type InsightRow,
} from './insightsView';
import { InsightCard } from './InsightCard';

const LIST_TIMEOUT_MS = 8_000;
const PATCH_TIMEOUT_MS = 8_000;
// The refresh route awaits the full engine run (maxDuration 60), so the
// client waits with matching headroom rather than aborting a healthy run.
const REFRESH_TIMEOUT_MS = 60_000;
const UNDO_WINDOW_MS = 5_000;
// One page of the GET route's documented maximum; no pagination UI yet.
const LIST_LIMIT = 50;

type ScopeKey = 'today' | 'week' | 'saved';

const SCOPE_CHIPS: ReadonlyArray<{ key: ScopeKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'saved', label: 'Saved' },
];

// Scope + type to GET query params: Today and This Week read active rows on
// the daily / weekly horizon; Saved reads status=saved across horizons.
function listQuery(scope: ScopeKey, type: InsightType | 'all'): string {
  const params = new URLSearchParams();
  params.set('limit', String(LIST_LIMIT));
  if (scope === 'saved') {
    params.set('status', 'saved');
  } else {
    params.set('status', 'active');
    params.set('horizon', scope === 'today' ? 'daily' : 'weekly');
  }
  if (type !== 'all') params.set('type', type);
  return params.toString();
}

function FilterChip({
  label,
  icon: Icon,
  selected,
  onClick,
}: {
  label: string;
  icon?: LucideIcon;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-medium backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 ${
        selected
          ? 'border-[#2DA5A0]/60 bg-[#2DA5A0]/15 text-white'
          : 'border-white/10 bg-white/[0.04] text-white/65 hover:border-white/20 hover:text-white/90'
      }`}
    >
      {Icon ? <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} /> : null}
      <span>{label}</span>
    </button>
  );
}

// Three pulse placeholders in the same masonry flow the real cards use.
function LoadingSkeletons() {
  return (
    <div aria-hidden="true" className="columns-1 gap-4 lg:columns-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="mb-4 break-inside-avoid rounded-xl border border-white/10 bg-[#1E3054]/55 p-4 md:p-5"
        >
          <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="mt-3 h-3 w-full animate-pulse rounded bg-white/10" />
          <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
}

export function InsightsPageClient() {
  const [scope, setScope] = useState<ScopeKey>('today');
  const [typeFilter, setTypeFilter] = useState<InsightType | 'all'>('all');
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [degraded, setDegraded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const [pendingUndo, setPendingUndo] = useState<{ insight: InsightRow; index: number } | null>(
    null,
  );
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // List read: refetch whenever a filter changes or a retry / refresh bumps
  // reloadKey. degraded:true from the route means the read failed open; the
  // calm error state renders with a retry.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDegraded(false);
    void (async () => {
      try {
        const res = await withTimeout(
          fetch(`/api/nutrition/insights?${listQuery(scope, typeFilter)}`),
          LIST_TIMEOUT_MS,
          'nutrition.insights.page.list',
        );
        if (!res.ok) throw new Error(`unexpected status ${res.status}`);
        const payload = (await res.json()) as { insights?: InsightRow[]; degraded?: boolean };
        if (cancelled) return;
        if (payload.degraded === true) {
          setInsights([]);
          setDegraded(true);
        } else {
          setInsights(Array.isArray(payload.insights) ? payload.insights : []);
        }
      } catch (err) {
        safeLog.warn('nutrition.insights.page', 'list fetch failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) {
          setInsights([]);
          setDegraded(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, typeFilter, reloadKey]);

  // Clear a still pending undo timer on unmount. The dismiss PATCH already
  // fired, so no flush is needed: the dismissal simply stands.
  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );

  // Shared PATCH writer, fail open: a failed write logs once and the UI keeps
  // its optimistic state; the next refetch converges to the server truth.
  const patchInsight = useCallback(
    async (
      id: string,
      body: { status?: 'read' | 'dismissed' | 'saved' | 'active'; feedback?: { helpful: boolean } },
    ): Promise<boolean> => {
      try {
        const res = await withTimeout(
          fetch(`/api/nutrition/insights/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
          PATCH_TIMEOUT_MS,
          'nutrition.insights.page.patch',
        );
        return res.ok;
      } catch (err) {
        safeLog.warn('nutrition.insights.page', 'insight patch failed', {
          insightId: id,
          error: err instanceof Error ? err.message : String(err),
        });
        return false;
      }
    },
    [],
  );

  // Dismiss: optimistic removal + PATCH 'dismissed' now, then a 5 second
  // inline Undo window. A second dismiss inside the window replaces the bar;
  // the first dismissal stands.
  const handleDismiss = useCallback(
    (insight: InsightRow) => {
      const index = insights.findIndex((i) => i.id === insight.id);
      if (index === -1) return;
      setInsights((curr) => curr.filter((i) => i.id !== insight.id));
      if (undoTimer.current) clearTimeout(undoTimer.current);
      setPendingUndo({ insight, index });
      undoTimer.current = setTimeout(() => setPendingUndo(null), UNDO_WINDOW_MS);
      void patchInsight(insight.id, { status: 'dismissed' });
    },
    [insights, patchInsight],
  );

  // Undo: PATCH the row back to 'active' and reinsert the card where it was.
  const handleUndo = useCallback(() => {
    if (!pendingUndo) return;
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    const { insight, index } = pendingUndo;
    setPendingUndo(null);
    setInsights((curr) => {
      const next = [...curr];
      next.splice(Math.min(index, next.length), 0, insight);
      return next;
    });
    void patchInsight(insight.id, { status: 'active' });
  }, [pendingUndo, patchInsight]);

  // Save toggles between 'saved' and 'active'. The card stays in place with
  // its flipped status until the next refetch naturally re-filters it.
  const handleToggleSave = useCallback(
    (insight: InsightRow) => {
      const nextStatus = insight.status === 'saved' ? 'active' : 'saved';
      setInsights((curr) =>
        curr.map((i) => (i.id === insight.id ? { ...i, status: nextStatus } : i)),
      );
      void patchInsight(insight.id, { status: nextStatus });
    },
    [patchInsight],
  );

  const handleFeedback = useCallback(
    (insight: InsightRow, helpful: boolean) => {
      void patchInsight(insight.id, { feedback: { helpful } });
    },
    [patchInsight],
  );

  // Manual refresh. The route awaits the engine run, so a 202 means the new
  // rows are already readable: bump reloadKey to refetch. 429 surfaces the
  // window copy from retryAfterSeconds.
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshNote(null);
    try {
      const res = await withTimeout(
        fetch('/api/nutrition/insights/refresh', { method: 'POST' }),
        REFRESH_TIMEOUT_MS,
        'nutrition.insights.page.refresh',
      );
      if (res.status === 429) {
        const payload = (await res.json().catch(() => null)) as {
          retryAfterSeconds?: number;
        } | null;
        const seconds =
          typeof payload?.retryAfterSeconds === 'number' ? payload.retryAfterSeconds : 600;
        setRefreshNote(formatRetryAfter(seconds));
        return;
      }
      if (res.status === 202) {
        setReloadKey((k) => k + 1);
        return;
      }
      setRefreshNote('Refresh did not finish, try again soon');
    } catch (err) {
      safeLog.warn('nutrition.insights.page', 'refresh failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      setRefreshNote('Refresh did not finish, try again soon');
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <div>
      {/* Row 1: scope chips with the Refresh button on the same line. */}
      <div className="flex items-center gap-3">
        <div
          role="group"
          aria-label="Insight window"
          className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1"
        >
          {SCOPE_CHIPS.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              selected={scope === chip.key}
              onClick={() => setScope(chip.key)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={refreshing}
          className="inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-white/85 backdrop-blur-sm transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            strokeWidth={1.5}
          />
          <span>{refreshing ? 'Refreshing' : 'Refresh'}</span>
        </button>
      </div>
      {refreshNote ? <p className="mt-2 text-[12px] text-white/60">{refreshNote}</p> : null}

      {/* Row 2: type chips, horizontally scrollable on mobile. */}
      <div
        role="group"
        aria-label="Insight type"
        className="mt-3 flex gap-2 overflow-x-auto pb-1"
      >
        <FilterChip
          label="All"
          selected={typeFilter === 'all'}
          onClick={() => setTypeFilter('all')}
        />
        {INSIGHT_TYPE_ORDER.map((t) => (
          <FilterChip
            key={t}
            label={INSIGHT_TYPE_LABELS[t]}
            icon={INSIGHT_TYPE_ICONS[t]}
            selected={typeFilter === t}
            onClick={() => setTypeFilter(t)}
          />
        ))}
      </div>

      {/* Inline dismiss undo bar, alive for the 5 second window. */}
      {pendingUndo ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#1E3054]/70 px-4 py-2.5 backdrop-blur-md">
          <span className="text-[13px] text-white/80">Insight dismissed</span>
          <button
            type="button"
            onClick={handleUndo}
            className="rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-[12px] font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70"
          >
            Undo
          </button>
        </div>
      ) : null}

      {/* The list: masonry above lg via CSS columns, single column below. */}
      <div className="mt-4">
        {loading ? (
          <LoadingSkeletons />
        ) : degraded ? (
          <div className="rounded-xl border border-white/10 bg-[#1E3054]/55 p-5 text-center">
            <p className="text-[14px] font-medium text-white/85">Insights could not load</p>
            <p className="mt-1 text-[12px] text-white/55">
              Your data is safe, this read just did not make it through
            </p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[12px] font-medium text-white/85 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70"
            >
              Retry
            </button>
          </div>
        ) : insights.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#1E3054]/55 p-5 text-center">
            <p className="text-[14px] font-medium text-white/85">Nothing here yet</p>
            <p className="mt-1 text-[12px] text-white/55">
              New insights appear as your logging builds up
            </p>
          </div>
        ) : (
          <div className="columns-1 gap-4 lg:columns-2">
            {insights.map((insight) => (
              <div key={insight.id} className="mb-4 break-inside-avoid">
                <InsightCard
                  insight={insight}
                  onDismiss={handleDismiss}
                  onToggleSave={handleToggleSave}
                  onFeedback={handleFeedback}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default InsightsPageClient;
