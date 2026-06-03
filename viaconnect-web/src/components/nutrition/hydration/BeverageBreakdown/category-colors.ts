// Prompt 172e Phase D Workstream 1: category color palette for breakdown.
//
// Standing rule: brand tokens via Tailwind only. The chart bar fills + the
// legend chip dots derive from the three ViaConnect brand tokens:
//   Navy   #1A2744
//   Teal   #2DA5A0
//   Orange #B75E18
//
// Nine distinct hues, one per BeverageCategory, derived as follows. Each
// hue starts from one of the three brand anchors and lightens or shifts
// hue within a constrained band so the palette reads as one family. The
// intent is that a user scanning the bar at a glance sees nine readable
// segments without any color reading as a clinical signal (no reds or
// greens; the palette stays in the brand cool + warm bands).
//
// 170c contract: colors are identical in safety mode (palette is not
// numeric, it is visual chrome per spec section 8.4 silent UX).
//
// Hex values authored here, not interpolated at runtime, so the palette
// is a static, design reviewed constant. Each color comments its
// derivation back to the brand token it shifted from.

import type { BeverageCategory } from '../BeveragePicker/BeveragePicker.types';

export interface CategoryColor {
  /** CSS hex string ready to drop in style backgroundColor. */
  hex: string;
  /** Provenance comment: which brand token this hue derives from. */
  derived_from: 'navy' | 'teal' | 'orange';
}

/**
 * Nine category to hex color map. Order parallels BEVERAGE_CATEGORIES so
 * the chart left to right reads in the same sequence the catalog picker
 * exposes the categories.
 *
 * Palette derivation notes:
 *   - water        Teal 600   #2DA5A0  brand token, unchanged. The
 *                  reference fluid sits on the brand teal.
 *   - coffee       Orange 700 #B75E18  brand token, unchanged. The
 *                  most common caffeine source sits on the brand orange.
 *   - tea          Teal 400   #5BC0BB  brand teal lightened 25 percent.
 *                  Reads as a softer teal next to water.
 *   - juice        Orange 500 #D67A2F  brand orange shifted toward
 *                  warmer yellow band so juice reads as "fruit" next to
 *                  coffee without leaving the brand orange family.
 *   - pop          Navy 400   #4A6396  brand navy lightened 60 percent.
 *                  Cool, reads as "carbonated" next to teal without
 *                  shouting.
 *   - sports_energy Teal 800  #1E847F  brand teal darkened 20 percent.
 *                  Reads as electrolyte cool but distinguishable from
 *                  water teal.
 *   - milk         Navy 200   #B5C3DD  brand navy lightened 80 percent.
 *                  Reads as creamy white blue, the most "lightest" hue
 *                  in the palette so dairy reads as light + opaque.
 *   - functional   Orange 300 #E3A66E  brand orange lightened 35 percent.
 *                  Warm but pulled toward sand so kombucha + broth read
 *                  as "earthy."
 *   - alcohol      Navy 600   #2A3F66  brand navy darkened 10 percent.
 *                  Reads as evening dark, distinguishable from soda navy
 *                  and grounded in the navy family per 170c section 9
 *                  "alcohol surfaces neutrally."
 */
export const CATEGORY_COLORS: Record<BeverageCategory, CategoryColor> = {
  water: { hex: '#2DA5A0', derived_from: 'teal' },
  coffee: { hex: '#B75E18', derived_from: 'orange' },
  tea: { hex: '#5BC0BB', derived_from: 'teal' },
  juice: { hex: '#D67A2F', derived_from: 'orange' },
  pop: { hex: '#4A6396', derived_from: 'navy' },
  sports_energy: { hex: '#1E847F', derived_from: 'teal' },
  milk: { hex: '#B5C3DD', derived_from: 'navy' },
  functional: { hex: '#E3A66E', derived_from: 'orange' },
  alcohol: { hex: '#2A3F66', derived_from: 'navy' },
};

export function colorForCategory(category: BeverageCategory): CategoryColor {
  return CATEGORY_COLORS[category];
}
