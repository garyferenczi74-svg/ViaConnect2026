/**
 * Prompt 170o Phase 1 Phase C: NutriVision tab hydration card per Hannah §2.
 *
 * 88px compact card below the 170n 4-button entry path row. Left side:
 * small ring + today's intake. Right side: 2x2 grid of 4 quick-log buttons.
 * Tap card -> Detail view. Hidden via Settings toggle.
 */

'use client';

import Link from 'next/link';
import { Droplet } from 'lucide-react';
import { HydrationRing, formatVolumeLabel } from './HydrationRing';
import { HydrationQuickLogButtons } from './HydrationQuickLogButtons';
import { useHydrationToday } from './useHydrationToday';

export function HydrationCard(): JSX.Element {
  const { data, refresh } = useHydrationToday();
  const total = data?.total_ml ?? 0;
  const target = data?.target_ml ?? 1890;

  return (
    <section
      aria-labelledby="hydration-card-heading"
      className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#1E3054]/45 p-3 text-white"
    >
      <h3 id="hydration-card-heading" className="sr-only">Hydration</h3>
      <Link
        href="/wellness-analytics/hydration"
        aria-label="Open hydration detail view"
        className="flex items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2DA5A0] focus-visible:outline-offset-2"
      >
        <HydrationRing total_ml={total} target_ml={target} size="small" />
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white">
            {formatVolumeLabel(total)}
          </span>
          <span className="text-[11px] text-white/65">
            of {formatVolumeLabel(target)}
          </span>
        </div>
      </Link>
      <div className="ml-auto">
        <HydrationQuickLogButtons
          surface="nutrivision_card"
          variant="four"
          layout="grid"
          size="small"
          onLogged={() => { void refresh(); }}
        />
      </div>
    </section>
  );
}
