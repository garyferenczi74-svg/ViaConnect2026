// Prompt 172e Phase D Workstream 1: stacked horizontal bar chart.
//
// Visualization choice: stacked horizontal bar (not ring). Two reasons:
//   1. The breakdown spans nine categories (water, coffee, tea, juice,
//      pop, sports_energy, milk, functional, alcohol). On a ring, small
//      categories (functional + alcohol typically <10 percent) compress
//      to thin slivers that read as noise. On a horizontal bar with
//      gross_pct widths, small categories still render as visible
//      segments at a readable minimum width.
//   2. The legend chip row below the bar uses the same left to right
//      order, so the eye can scan bar-segment to chip without crossing
//      angular references.
//
// Safety mode: the bar renders identically. Spec section 10: "composition
// only, no calorie or sugar tally" applies to the legend's absolute
// numbers, not to the visual segmentation. The bar IS composition; no
// numeric suppression needed at the chart layer.
//
// Accessibility: each segment carries an aria-label with category name +
// percentage. The legend below is the primary screen reader surface for
// numeric details.

'use client';

import type { BreakdownData } from './breakdown-aggregator';
import { CATEGORY_COLORS } from './category-colors';
import { CATEGORY_MICROCOPY_KEYS } from '../BeveragePicker/category-icons';
import { getHydrationMicrocopy } from '@/lib/nutrition/microcopy/hydration';
import type { HydrationMicrocopyKey, HydrationMicrocopyVariant } from '@/lib/nutrition/microcopy/hydration';

export interface BreakdownChartProps {
  data: BreakdownData;
  /** Variant for category label aria text lookup. */
  variant: HydrationMicrocopyVariant;
}

// Minimum visible width per segment so a 1 percent category does not
// disappear into a 0.5 px sliver. Categories below this threshold
// render with a small fixed visual width but the legend chips below
// expose the true percentage.
const MIN_VISIBLE_WIDTH_PCT = 1.5;

export function BreakdownChart({ data, variant }: BreakdownChartProps): JSX.Element {
  const nonZero = data.segments.filter((s) => s.gross_ml > 0);

  if (nonZero.length === 0) {
    // Render an empty rounded rail so the layout does not collapse before
    // any beverage is logged. Same color as the BeveragePicker's empty
    // rows so the visual chrome stays consistent.
    return (
      <div
        aria-hidden="true"
        className="h-3 w-full overflow-hidden rounded-full bg-white/[0.04]"
      />
    );
  }

  return (
    <div
      role="img"
      aria-label="Beverage composition for today"
      className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.04]"
    >
      {nonZero.map((segment) => {
        const widthPct = Math.max(MIN_VISIBLE_WIDTH_PCT, segment.gross_pct);
        const label = getHydrationMicrocopy(
          CATEGORY_MICROCOPY_KEYS[segment.category] as HydrationMicrocopyKey,
          variant,
        );
        return (
          <div
            key={segment.category}
            aria-label={`${label} ${segment.gross_pct} percent`}
            className="h-full"
            style={{
              width: `${widthPct}%`,
              backgroundColor: CATEGORY_COLORS[segment.category].hex,
            }}
          />
        );
      })}
    </div>
  );
}
