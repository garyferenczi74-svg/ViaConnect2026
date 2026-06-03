/**
 * Prompt 172e Phase F Workstream 1: telemetry helpers.
 *
 * Per spec section 12: "Telemetry is append only and privacy respecting:
 * beverage category logged, effective volume bucket, caffeine contributed
 * flag, never the safety mode clinical inference and never raw health
 * data beyond what hydration logging already stores."
 *
 * This module exports the three coarse signals the hydration_log_sessions
 * row carries on a Phase F write, and a constant pinning the section 12
 * forbidden list so a future regression that tries to attach raw mg
 * values or the safety mode boolean to telemetry trips at vitest run
 * time.
 *
 * No DB calls live here. The route at
 * src/app/api/nutrition/hydration/quick-log/route.ts wires these helpers
 * into the existing 20pct sampled telemetry insert.
 */

/**
 * Spec section 12 forbidden telemetry field list. Tests assert that
 * buildPhaseFTelemetryFields never returns any of these keys, and the
 * route assert (Phase F integration test) confirms the insert payload
 * to hydration_log_sessions never carries any of them either. Any
 * addition here is a section 12 contract change requiring Kelsey re
 * review.
 */
export const TELEMETRY_FORBIDDEN_FIELDS = [
  'safety_mode_enabled',
  'caffeine_mg',
  'sodium_mg',
  'potassium_mg',
  'magnesium_mg',
  'sugar_g',
  'kcal_per_serving',
  'user_id',
] as const;

export type EffectiveVolumeBucket =
  | '0-100ml'
  | '100-250ml'
  | '250-500ml'
  | '500-750ml'
  | '750+ml';

/**
 * Pure: bucket a volume in ml to the spec section 12 enum. Boundary
 * rule is [lower, upper) so 100 ml lands in the 100-250ml bucket and
 * 750 ml lands in the 750+ml bucket. Returns null for negative or non
 * finite inputs; callers treat null as "do not write the column" so
 * the row stays valid.
 */
export function computeEffectiveVolumeBucket(volumeMl: number): EffectiveVolumeBucket | null {
  if (!Number.isFinite(volumeMl) || volumeMl < 0) return null;
  if (volumeMl < 100) return '0-100ml';
  if (volumeMl < 250) return '100-250ml';
  if (volumeMl < 500) return '250-500ml';
  if (volumeMl < 750) return '500-750ml';
  return '750+ml';
}

export interface ComputeCaffeineContributedFlagArgs {
  effective_caffeine_mg: number;
  attribute_caffeine: boolean;
}

/**
 * Pure: true exactly when the route would have written a positive
 * caffeine_mg to meal_items on this log. Mirrors the route boolean at
 * the telemetry layer so the analytics surface can count catalog
 * adoption of caffeinated rows without pulling raw mg values into the
 * sampled metadata row.
 */
export function computeCaffeineContributedFlag(args: ComputeCaffeineContributedFlagArgs): boolean {
  if (!args.attribute_caffeine) return false;
  if (!Number.isFinite(args.effective_caffeine_mg)) return false;
  return args.effective_caffeine_mg > 0;
}

export interface PhaseFTelemetryFields {
  beverage_catalog_slug: string | null;
  effective_volume_bucket: EffectiveVolumeBucket | null;
  caffeine_contributed_flag: boolean;
}

export interface BuildPhaseFTelemetryFieldsArgs {
  beverage_slug: string | null;
  volume_ml: number;
  effective_caffeine_mg: number;
  attribute_caffeine: boolean;
}

/**
 * Pure: shape the three Phase F columns that ride on the
 * hydration_log_sessions sampled telemetry insert. Slug stays null for
 * legacy 170o quick log button paths so the analytics surface can split
 * catalog vs non catalog distribution. Bucket and flag are computed on
 * every Phase F write regardless of slug presence; bucket lands on
 * legacy paths too so the volume distribution is comparable across
 * surfaces.
 */
export function buildPhaseFTelemetryFields(
  args: BuildPhaseFTelemetryFieldsArgs,
): PhaseFTelemetryFields {
  return {
    beverage_catalog_slug: args.beverage_slug ?? null,
    effective_volume_bucket: computeEffectiveVolumeBucket(args.volume_ml),
    caffeine_contributed_flag: computeCaffeineContributedFlag({
      effective_caffeine_mg: args.effective_caffeine_mg,
      attribute_caffeine: args.attribute_caffeine,
    }),
  };
}
