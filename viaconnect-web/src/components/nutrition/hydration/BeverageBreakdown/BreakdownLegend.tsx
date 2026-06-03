// Prompt 172e Phase D Workstream 1: breakdown legend chip row.
//
// Spec section 10: "In safety mode this is composition only, no calorie
// or sugar tally." Implementation: normal mode shows each non zero
// category with display name + absolute ml (gross), then a separate
// effective total line. Safety mode shows each non zero category with
// display name + percentage; no ml values, no effective total line.
//
// The legend is the primary screen reader surface for the chart; the
// chart's segments are aria-labeled too but the legend renders the full
// numeric context. Safety mode users still see the chip row so the page
// layout does not shift between modes (170c section 8.4 silent UX).

'use client';

import type { BreakdownData } from './breakdown-aggregator';
import { CATEGORY_COLORS } from './category-colors';
import { CATEGORY_MICROCOPY_KEYS } from '../BeveragePicker/category-icons';
import { getHydrationMicrocopy } from '@/lib/nutrition/microcopy/hydration';
import type { HydrationMicrocopyKey, HydrationMicrocopyVariant } from '@/lib/nutrition/microcopy/hydration';

export interface BreakdownLegendProps {
  data: BreakdownData;
  variant: HydrationMicrocopyVariant;
  safetyMode: boolean;
}

export function BreakdownLegend({ data, variant, safetyMode }: BreakdownLegendProps): JSX.Element {
  const nonZero = data.segments.filter((s) => s.gross_ml > 0);
  const grossLabel = getHydrationMicrocopy('hydration.breakdown.gross_label', variant);
  const effectiveLabel = getHydrationMicrocopy('hydration.breakdown.effective_label', variant);

  return (
    <div className="flex flex-col gap-2">
      <ul
        aria-label="Beverage categories logged today"
        className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-white/70"
      >
        {nonZero.map((segment) => {
          const categoryLabel = getHydrationMicrocopy(
            CATEGORY_MICROCOPY_KEYS[segment.category] as HydrationMicrocopyKey,
            variant,
          );
          // Safety mode strips ml values per spec section 8; the chip
          // surfaces the percentage so the breakdown stays composition
          // only. Normal mode surfaces ml so the user can reason about
          // their intake quantitatively.
          const valueText = safetyMode
            ? `${segment.gross_pct}%`
            : `${segment.gross_ml} ml`;
          return (
            <li key={segment.category} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[segment.category].hex }}
              />
              <span className="text-white/85">{categoryLabel}</span>
              <span className="text-white/55">{valueText}</span>
            </li>
          );
        })}
      </ul>

      {/* Totals line. Normal mode shows gross + effective ml; safety mode
          drops the line entirely because the chip row already carries the
          composition information per spec section 8. */}
      {!safetyMode ? (
        <div className="flex flex-wrap items-center gap-x-3 text-[12px] text-white/60">
          <span>
            <span className="text-white/45">{grossLabel}</span>{' '}
            <span className="text-white/85">{data.total_gross_ml} ml</span>
          </span>
          <span aria-hidden="true" className="text-white/35">·</span>
          <span>
            <span className="text-white/45">{effectiveLabel}</span>{' '}
            <span className="text-white/85">{data.total_effective_ml} ml</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
