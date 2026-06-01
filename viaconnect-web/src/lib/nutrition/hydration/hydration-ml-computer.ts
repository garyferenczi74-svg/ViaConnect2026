/**
 * Prompt 170o Phase 1 Phase B: hydration_ml computation.
 *
 * Server-side computation per Gordon LP1 §2: the parser is NOT responsible
 * for the math. Parsers emit only hydration_source_kind + portion_volume_ml
 * (plus food_name for wine/spirits disambiguation in alcohol_high). The
 * server multiplies by the appropriate ratio at meal save time.
 *
 * Switching counting modes recomputes displayed totals at read time via the
 * aggregations matview's stored-by-kind columns; saved meal_items.hydration_ml
 * reflects the mode at save time.
 */

import {
  hydrationRatio,
  type HydrationSourceKind,
  type HydrationCountingMode,
} from './types';

export interface ComputeHydrationMlArgs {
  source_kind: HydrationSourceKind | null;
  portion_volume_ml: number | null;
  counting_mode: HydrationCountingMode;
  food_name?: string;
}

export function computeHydrationMl(args: ComputeHydrationMlArgs): number {
  if (args.source_kind === null) return 0;
  if (args.portion_volume_ml === null || args.portion_volume_ml <= 0) return 0;
  const ratio = hydrationRatio(args.source_kind, args.counting_mode, args.food_name);
  const hydrationMl = args.portion_volume_ml * ratio;
  return Math.round(hydrationMl * 100) / 100;
}
