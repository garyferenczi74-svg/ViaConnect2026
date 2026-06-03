// Prompt 172e Phase D Workstream 3: ElectrolyteSummary component.
//
// Spec section 10: "Electrolyte summary (from the catalog and 17a): a
// quiet line summarizing sodium, potassium, and magnesium from beverages
// for the day. Suppressed numerically in safety mode."
//
// Quiet inline line, no chart. Reads from the breakdown endpoint's
// underlying meal_items + catalog data via the parent page composition
// (the page passes events + catalog in as props so we do not double
// fetch). Honors the BEVERAGE_CATALOG_RENDERING_ENABLED kill switch by
// silent unmount.
//
// 170c contract: useSafetyMode at the boundary; safety mode swaps the
// numeric summary for a qualitative one liner per the microcopy variant.
// The line still appears so the page layout does not shift between
// modes (170c section 8.4 silent UX).

'use client';

import { useSafetyMode } from '@/lib/safety-mode/useSafetyMode';
import { isKillSwitchEnabled } from '@/lib/compliance/kill-switches';
import {
  getHydrationMicrocopy,
  type HydrationMicrocopyVariant,
} from '@/lib/nutrition/microcopy/hydration';
import {
  aggregateElectrolytes,
  hasElectrolyteSummary,
  type ElectrolyteCatalogRow,
  type ElectrolyteEvent,
} from './electrolyte-aggregator';

export interface ElectrolyteSummaryProps {
  /**
   * Today's hydration events. The page composes this from useHydrationToday;
   * the summary derives totals via the pure aggregator so the numbers
   * line up with the breakdown chart.
   */
  events: ReadonlyArray<ElectrolyteEvent>;
  /** The active beverage catalog from useBeverageCatalog at the page level. */
  catalog: ReadonlyArray<ElectrolyteCatalogRow>;
}

function interpolateSummary(
  template: string,
  totals: { sodium_mg: number; potassium_mg: number; magnesium_mg: number },
): string {
  return template
    .replace('{sodium}', String(totals.sodium_mg))
    .replace('{potassium}', String(totals.potassium_mg))
    .replace('{magnesium}', String(totals.magnesium_mg));
}

export function ElectrolyteSummary({ events, catalog }: ElectrolyteSummaryProps): JSX.Element | null {
  // Kill switch: silent unmount. The summary is part of the same surface
  // family as the catalog picker per spec section 10 so one flip removes
  // all three Phase D surfaces (breakdown, overlay, summary).
  const enabled = isKillSwitchEnabled('BEVERAGE_CATALOG_RENDERING_ENABLED');

  const safety = useSafetyMode();
  const variant: HydrationMicrocopyVariant = safety.enabled ? 'safety_mode' : 'normal';

  if (!enabled) return null;

  const totals = aggregateElectrolytes(events, catalog);

  // Hide the line entirely when there is nothing to summarize. Rendering
  // "0 mg sodium, 0 mg potassium, 0 mg magnesium" reads as a clinical
  // assertion of insufficiency; the page is quieter when the line just
  // does not render until a contributing beverage is logged.
  if (!hasElectrolyteSummary(totals)) return null;

  const template = getHydrationMicrocopy('hydration.electrolytes.summary', variant);
  const line = safety.enabled ? template : interpolateSummary(template, totals);

  return (
    <p
      role="status"
      aria-label={getHydrationMicrocopy('hydration.electrolytes.label', variant)}
      className="text-[12px] text-white/55"
    >
      {line}
    </p>
  );
}
