'use client';

// Prompt 192 Task 4: the Nutrition Insights Row 3 tile, now a navigation card
// mirroring SaveMyMealTile / NutritionGeneticsTile (it replaces the in flow
// expander the hub used to render). Same chrome as the hub's HubTile: the
// hub-card-frame luminous edge ring, the CardMedia seam fed the descriptor
// the hub passes down, and the legibility scrim, with the Open control bottom
// anchored as a Next.js Link to the standalone /nutrition/insights page.
//
// The tile fetches its own top insights ONCE on mount (GET limit 3, status
// active) with the standard resilience posture: withTimeout 4000, try/catch
// fail open, one safeLog.warn. Four states:
//   1. Getting Started: the hub's coldStart prop is true (fewer than 3 meals
//      in the 7 day window; the hub fails toward true while metrics load),
//   2. populated: the top insight (attention first, then newest) with a count
//      chip when more remain,
//   3. empty: the all clear line,
//   4. degraded / error: a calm fallback that never blocks the hub.
// State content sits on the Prompt 191 glass recipe so the background video
// reads through (the recipe carries its own /85 no-backdrop-filter fallback).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { CardMedia } from '@/components/body-tracker/hub/CardMedia';
import type { SurfaceMedia } from '@/components/body-tracker/hub/hubConfig';
import '@/components/body-tracker/hub/hub-card-frame.css';
import { getDisplayName } from '@/lib/getDisplayName';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';
import { INSIGHT_TYPE_ICONS } from '@/components/nutrition/insights/insightIcons';
import {
  activeCountChip,
  topInsight,
  type InsightRow,
} from '@/components/nutrition/insights/insightsView';
import { GLASS_TIER2_BODY } from './glass';

const TIMEOUT_MS = 4_000;

type TileData =
  | { kind: 'loading' }
  | { kind: 'loaded'; insights: InsightRow[]; hasMore: boolean }
  | { kind: 'error' };

export interface NutritionInsightsTileProps {
  gradientClass: string;
  // Optional pass-throughs to the CardMedia seam, same contract as HubTile.
  media?: SurfaceMedia;
  mediaLogKey?: string;
  // Cold start signal from the hub metrics. True wins over any fetch result
  // so brand new users always see Getting Started.
  coldStart?: boolean;
}

// The state body rendered on the glass panel. coldStart beats everything;
// after that the fetch result decides between skeleton, error, empty, and the
// top insight.
function TileBody({ data, coldStart }: { data: TileData; coldStart: boolean }) {
  if (coldStart) {
    return (
      <p className="text-[12px] leading-relaxed text-white/75">
        Log a few meals and {getDisplayName('gordon')} will start finding patterns
      </p>
    );
  }
  if (data.kind === 'loading') {
    return (
      <div aria-hidden="true" className="space-y-2">
        <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
      </div>
    );
  }
  if (data.kind === 'error') {
    return (
      <p className="text-[12px] leading-relaxed text-white/60">
        Insights are taking a moment, check back soon
      </p>
    );
  }
  const top = topInsight(data.insights);
  if (!top) {
    return (
      <p className="text-[12px] leading-relaxed text-white/75">
        {"You're on track, nothing needs attention"}
      </p>
    );
  }
  const Icon = INSIGHT_TYPE_ICONS[top.insight_type];
  // Orange is the attention accent ONLY; everything else stays teal.
  const accent = top.severity === 'attention' ? 'text-[#B75E18]' : 'text-[#2DA5A0]';
  const chip = activeCountChip(data.insights.length, data.hasMore);
  return (
    <div>
      <div className="flex items-start gap-2">
        <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 flex-none ${accent}`} strokeWidth={1.5} />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-snug text-white">{top.title}</p>
          <p className="mt-0.5 line-clamp-1 text-[12px] leading-relaxed text-white/[0.62]">
            {top.body}
          </p>
        </div>
      </div>
      {chip ? (
        <span className="mt-2 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium tabular-nums text-white/80 backdrop-blur-sm">
          {chip}
        </span>
      ) : null}
    </div>
  );
}

export function NutritionInsightsTile({
  gradientClass,
  media,
  mediaLogKey,
  coldStart,
}: NutritionInsightsTileProps) {
  const [data, setData] = useState<TileData>({ kind: 'loading' });

  // One fetch on mount, regardless of coldStart: the prop can flip from true
  // to false as the hub metrics land, and the data must already be there.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await withTimeout(
          fetch('/api/nutrition/insights?limit=3&status=active'),
          TIMEOUT_MS,
          'nutrition.insights.tile.list',
        );
        if (!res.ok) throw new Error(`unexpected status ${res.status}`);
        const payload = (await res.json()) as {
          insights?: InsightRow[];
          nextOffset?: number | null;
          degraded?: boolean;
        };
        if (cancelled) return;
        if (payload.degraded === true) {
          setData({ kind: 'error' });
          return;
        }
        const insights = Array.isArray(payload.insights) ? payload.insights : [];
        setData({ kind: 'loaded', insights, hasMore: payload.nextOffset != null });
      } catch (err) {
        safeLog.warn('nutrition.insights.tile', 'insights fetch failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) setData({ kind: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="hub-card-frame relative isolate flex min-h-[200px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1E3054]/35 backdrop-blur-md">
      {/* z 0: per card media seam, the same branches HubTile renders. */}
      {media ? (
        <CardMedia media={media} logKey={mediaLogKey} />
      ) : (
        <CardMedia media={{ kind: 'gradient', gradientClass }} />
      )}

      {/* z 1: legibility scrim over any media frame. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#1A2744]/85 via-[#1A2744]/30 to-transparent"
      />

      {/* z 2: content. Centered header, glass state panel, bottom anchored Open. */}
      <div className="relative z-[2] flex h-full flex-col items-center p-4 text-center md:p-5">
        <h3 className="text-[15px] font-semibold leading-tight text-white md:text-base">
          Nutrition Insights
        </h3>
        <p className="mt-1 text-[12px] leading-relaxed text-white/[0.62] md:text-[13px]">
          What {getDisplayName('gordon')} sees in your logging
        </p>

        <div className={`mt-3 w-full p-3 text-left ${GLASS_TIER2_BODY}`}>
          <TileBody data={data} coldStart={coldStart === true} />
        </div>

        {/* Bottom aligned Open that navigates to the insights page. */}
        <div className="mt-auto flex pt-4">
          <Link
            href="/nutrition/insights"
            className="inline-flex items-center gap-1 rounded-full border border-[#5B8DEF]/30 bg-[#2A4C9E]/[0.12] px-3 py-1.5 text-[12px] font-medium text-white no-underline backdrop-blur-md transition-all duration-200 hover:border-[#5B8DEF]/55 hover:bg-[#2A4C9E]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] motion-reduce:transition-none"
          >
            <span>Open</span>
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NutritionInsightsTile;
