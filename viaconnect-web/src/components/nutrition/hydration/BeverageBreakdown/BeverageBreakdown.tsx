// Prompt 172e Phase D Workstream 1: BeverageBreakdown orchestrator.
//
// Spec section 10: "Beverage breakdown (new section): a today view
// showing composition of intake by category (for example a stacked bar
// or ring segment split such as water, coffee, juice), with gross fluid
// and effective hydration both shown. In safety mode this is composition
// only, no calorie or sugar tally."
//
// Mounts the stacked horizontal bar chart + the chip legend in a single
// quiet card matching the other hydration detail sections (rounded 2xl
// border, navy 1E3054/55 background). Honors the
// BEVERAGE_CATALOG_RENDERING_ENABLED kill switch by silent unmount.
//
// 170c contract: useSafetyMode at the boundary; the safety mode flag
// threads to the legend which strips ml in favor of percentages. The
// chart renders identically in both modes since the segments are
// composition only.

'use client';

import { useSafetyMode } from '@/lib/safety-mode/useSafetyMode';
import { isKillSwitchEnabled } from '@/lib/compliance/kill-switches';
import {
  getHydrationMicrocopy,
  type HydrationMicrocopyVariant,
} from '@/lib/nutrition/microcopy/hydration';
import { useBeverageBreakdown } from './useBeverageBreakdown';
import { BreakdownChart } from './BreakdownChart';
import { BreakdownLegend } from './BreakdownLegend';

export function BeverageBreakdown(): JSX.Element | null {
  // Kill switch gate: silent unmount when
  // BEVERAGE_CATALOG_RENDERING_ENABLED is false. The breakdown is part
  // of the same surface family as the catalog picker per spec section 10
  // so a single rollback flip removes both. Read at render time so a
  // runtime flip propagates the next time the parent re renders.
  const enabled = isKillSwitchEnabled('BEVERAGE_CATALOG_RENDERING_ENABLED');

  const safety = useSafetyMode();
  const variant: HydrationMicrocopyVariant = safety.enabled ? 'safety_mode' : 'normal';
  const { data, loading, error } = useBeverageBreakdown();

  if (!enabled) return null;

  const title = getHydrationMicrocopy('hydration.breakdown.title', variant);
  const empty = getHydrationMicrocopy('hydration.breakdown.empty_today', variant);

  return (
    <section
      aria-labelledby="hydration-breakdown-heading"
      className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-5"
    >
      <h2 id="hydration-breakdown-heading" className="text-base font-semibold text-white">
        {title}
      </h2>

      {loading && !data ? (
        <p className="mt-3 text-[12px] text-white/55">Loading breakdown...</p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-[12px] text-[#B75E18]">
          {error}
        </p>
      ) : null}

      {!loading && !error && data && data.total_gross_ml === 0 ? (
        <p className="mt-3 text-[12px] text-white/55">{empty}</p>
      ) : null}

      {data && data.total_gross_ml > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          <BreakdownChart data={data} variant={variant} />
          <BreakdownLegend data={data} variant={variant} safetyMode={safety.enabled} />
        </div>
      ) : null}
    </section>
  );
}
