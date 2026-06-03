/**
 * Prompt 170o Phase 1 Phase B + Prompt 172e Phase A: Hydration types +
 * Zod schemas.
 *
 * 9-value canonical enum per Gordon LP1 §1.0 (spelling/casing/underscore
 * conventions normative; no drift permitted between this file, the
 * migration, and the parser system prompts).
 *
 * Coefficient table patched 2026-06-02 to Maughan 2016 conservative values
 * per Gordon Deliverable 1 (172e Phase A). See
 * supabase/migrations/20260602000020_prompt_172e_phase_a_coefficient_patch.sql
 * for the snapshot + audit row paired with this code edit.
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
 * Adjusted mode ratio table, Maughan 2016 BHI grounded per Prompt 172e
 * Phase A (Gordon Deliverable 1 ratified 2026-06-02).
 *
 * | kind            | old    | new    | provenance                               |
 * | --------------- | ------ | ------ | ---------------------------------------- |
 * | pure_water      | 1.00   | 1.00   | Maughan Table 2 water reference          |
 * | coffee_tea      | 1.00   | 1.00   | Maughan Table 2 coffee BHI 1.01          |
 * | juice_smoothie  | 0.90   | 1.20   | Orange juice BHI 1.39 conservative 0.19  |
 * | dairy           | 0.85   | 1.30   | Whole milk BHI 1.50 conservative 0.20    |
 * | soda            | 0.80   | 1.00   | Cola BHI 1.01 matches measured           |
 * | alcohol_low     | 0.95   | 1.00   | Lager BHI 1.01 matches measured          |
 * | alcohol_high    | 0.65   | 1.00   | Lager anchor extrapolated, flattened     |
 * | sports_drink    | 0.95   | 1.00   | BHI 1.04 conservative 0.04               |
 * | high_water_food | 0      | 0.90   | Gordon derived, no Maughan anchor        |
 *
 * Conservative mode counts only pure_water at full ratio; all other kinds
 * are zero in conservative.
 *
 * alcohol_high no longer disambiguates wine vs spirits. Cumulative dose
 * alcohol diuretic handling moves to Phase C via
 * ALCOHOL_DIURETIC_THRESHOLD_DRINKS per spec 5.3.
 */
export const HYDRATION_RATIO_ADJUSTED: Record<HydrationSourceKind, number> = {
  pure_water: 1.0,
  coffee_tea: 1.0,
  juice_smoothie: 1.2,
  dairy: 1.3,
  soda: 1.0,
  alcohol_low: 1.0,
  alcohol_high: 1.0,
  sports_drink: 1.0,
  high_water_food: 0.9,
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
  // foodNameHint preserved for API compatibility with callers; the wine vs
  // spirits split no longer applies since 172e flattened alcohol_high to 1.00.
  _foodNameHint?: string,
): number {
  if (mode === 'conservative') return HYDRATION_RATIO_CONSERVATIVE[kind];
  return HYDRATION_RATIO_ADJUSTED[kind];
}

const QuickLogRequestSchema = z.object({
  volume_ml: z.number().positive().min(10).max(2000),
  beverage_kind: z.enum(HYDRATION_SOURCE_KINDS).default('pure_water'),
  captured_at: z.string().datetime().optional(),
  log_surface: z.enum(HYDRATION_LOG_SURFACES).default('dashboard_widget'),
  // Prompt 172e Phase C: when the user picks via the BeveragePicker the
  // catalog row slug is passed through so the route can hydrate caffeine
  // + alcohol attribution from the catalog row at write time. Optional
  // for backward compatibility with the existing 170o quick log buttons
  // that pass only the 9 value source kind.
  beverage_slug: z.string().min(1).max(100).optional(),
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
