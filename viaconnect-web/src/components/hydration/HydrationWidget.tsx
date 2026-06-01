/**
 * Prompt 170o Phase 1 Phase C: Dashboard hydration widget per Hannah §1.
 *
 * 232px tall card with circular progress ring + 3 quick-log buttons. Tap
 * ring -> /wellness-analytics/hydration (Detail view). Empty state is the
 * ring itself per Hannah §1 push-back (no separate "get started" panel).
 */

'use client';

import Link from 'next/link';
import { Droplet, ChevronRight } from 'lucide-react';
import { HydrationRing, formatVolumeLabel } from './HydrationRing';
import { HydrationQuickLogButtons } from './HydrationQuickLogButtons';
import { useHydrationToday } from './useHydrationToday';

export function HydrationWidget(): JSX.Element {
  const { data, refresh } = useHydrationToday();
  const total = data?.total_ml ?? 0;
  const target = data?.target_ml ?? 1890;
  const percentageText = data
    ? `${formatVolumeLabel(total)} of ${formatVolumeLabel(target)}`
    : 'Tap a button to log your first water';

  return (
    <section
      aria-labelledby="hydration-widget-heading"
      className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#1E3054]/45 p-5 text-white"
      style={{ minHeight: 232 }}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplet className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden="true" />
          <h2 id="hydration-widget-heading" className="text-base font-semibold text-white">
            Hydration
          </h2>
        </div>
        <Link
          href="/wellness-analytics/hydration"
          aria-label="Open hydration detail view"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </header>

      <div className="flex items-center gap-4">
        <Link
          href="/wellness-analytics/hydration"
          aria-label="Open hydration detail view from progress ring"
          className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2"
        >
          <HydrationRing
            total_ml={total}
            target_ml={target}
            size="large"
            centerLabel={data ? formatVolumeLabel(total) : '0 ml'}
            centerSublabel={data ? `of ${formatVolumeLabel(target)}` : `of ${formatVolumeLabel(target)}`}
          />
        </Link>
        <div className="flex flex-1 flex-col gap-1 text-sm text-white/75">
          <p className="font-medium text-white">
            {data && total >= target ? 'Daily target met' : data ? 'Keep going' : 'Get started today'}
          </p>
          <p className="text-[12px] text-white/60">
            {percentageText}
          </p>
          {data && total >= target ? (
            <p className="mt-1 text-[11px] text-[#2DA5A0]">Tap to log more</p>
          ) : null}
        </div>
      </div>

      <HydrationQuickLogButtons
        surface="dashboard_widget"
        variant="three"
        layout="row"
        size="medium"
        onLogged={() => { void refresh(); }}
      />
    </section>
  );
}
