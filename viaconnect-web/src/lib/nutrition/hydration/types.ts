/**
 * Prompt 170o Phase 1 Phase B: Hydration types + Zod schemas.
 *
 * 9-value canonical enum per Gordon LP1 §1.0 (spelling/casing/underscore
 * conventions normative; no drift permitted between this file, the
 * migration, and the parser system prompts).
 *
 * Ratio table per Gordon LP1 §1.0 (Gary signed off en bloc 2026-05-31).
 */

import { z } from 'zod';

export const HYDRATION_SOURCE_KINDS = [
  'pure_water',
  'coffee_tea',
  'juice_smoothie',
  'dairy',
  'soda',
  'alcohol_low',
  'alcohol_high',
  'sports_drink',
  'high_water_food',
] as const;

export type HydrationSourceKind = typeof HYDRATION_SOURCE_KINDS[number];

export const HYDRATION_COUNTING_MODES = ['conservative', 'adjusted'] as const;
export type HydrationCountingMode = typeof HYDRATION_COUNTING_MODES[number];

export const HYDRATION_NOTIFICATION_CADENCES = [
  'every_2h',
  'every_3h',
  'every_4h',
  'milestone_only',
] as const;
export type HydrationNotificationCadence = typeof HYDRATION_NOTIFICATION_CADENCES[number];

export const HYDRATION_LOG_SURFACES = [
  'dashboard_widget',
  'nutrivision_card',
  'floating_fab',
  'hydration_detail_view',
  'meal_save_with_beverage',
] as const;
export type HydrationLogSurface = typeof HYDRATION_LOG_SURFACES[number];

/**
 * Gordon LP1 §1.0 adjusted-mode ratio table. Each kind's contribution to
 * hydration_ml as a fraction of portion_volume_ml. Conservative mode counts
 * only pure_water at full ratio; all other kinds are zero in conservative.
 *
 * alcohol_high default 0.65 is the mean of wine 0.75 + spirits 0.50; the
 * server prefers per-food disambiguation when food_name allows (e.g. food
 * containing "wine" -> 0.75; containing "vodka"/"whiskey"/"gin"/"rum"/
 * "tequila"/"shot" -> 0.50). high_water_food is deferred to Phase 1.1; v1
 * treats it as 0 (the parser sets portion_volume_ml=null for solid foods
 * with high water content; the resolver handles per Gordon LP1 §1.0).
 */
export const HYDRATION_RATIO_ADJUSTED: Record<HydrationSourceKind, number> = {
  pure_water: 1.0,
  coffee_tea: 1.0,
  juice_smoothie: 0.9,
  dairy: 0.85,
  soda: 0.8,
  alcohol_low: 0.95,
  alcohol_high: 0.65,
  sports_drink: 0.95,
  high_water_food: 0,
};

export const HYDRATION_RATIO_CONSERVATIVE: Record<HydrationSourceKind, number> = {
  pure_water: 1.0,
  coffee_tea: 0,
  juice_smoothie: 0,
  dairy: 0,
  soda: 0,
  alcohol_low: 0,
  alcohol_high: 0,
  sports_drink: 0,
  high_water_food: 0,
};

export function hydrationRatio(
  kind: HydrationSourceKind,
  mode: HydrationCountingMode,
  foodNameHint?: string,
): number {
  if (mode === 'conservative') return HYDRATION_RATIO_CONSERVATIVE[kind];
  if (kind !== 'alcohol_high') return HYDRATION_RATIO_ADJUSTED[kind];
  // Wine vs spirits disambiguation per Gordon LP1 §1.0.
  if (!foodNameHint) return 0.65;
  const lower = foodNameHint.toLowerCase();
  if (/\bwine\b|\bchampagne\b|\bprosecco\b|\bsangria\b|\bsherry\b|\bport\b/.test(lower)) return 0.75;
  if (/\bvodka\b|\bwhiskey\b|\bwhisky\b|\bgin\b|\brum\b|\btequila\b|\bbourbon\b|\bscotch\b|\bshot\b|\bspirits?\b|\bbrandy\b|\bcognac\b/.test(lower)) return 0.5;
  return 0.65;
}

const QuickLogRequestSchema = z.object({
  volume_ml: z.number().positive().min(10).max(2000),
  beverage_kind: z.enum(HYDRATION_SOURCE_KINDS).default('pure_water'),
  captured_at: z.string().datetime().optional(),
  log_surface: z.enum(HYDRATION_LOG_SURFACES).default('dashboard_widget'),
});

export type QuickLogRequest = z.infer<typeof QuickLogRequestSchema>;
export { QuickLogRequestSchema };

const TargetUpdateSchema = z.object({
  custom_target_ml_per_day: z.number().min(500).max(6000).nullable(),
});

export type TargetUpdate = z.infer<typeof TargetUpdateSchema>;
export { TargetUpdateSchema };

const PreferencesUpdateSchema = z.object({
  counting_mode: z.enum(HYDRATION_COUNTING_MODES).optional(),
  notifications_enabled: z.boolean().optional(),
  notification_cadence: z.enum(HYDRATION_NOTIFICATION_CADENCES).nullable().optional(),
});

export type PreferencesUpdate = z.infer<typeof PreferencesUpdateSchema>;
export { PreferencesUpdateSchema };
