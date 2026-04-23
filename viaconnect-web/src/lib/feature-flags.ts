// Prompt #118 — Feature-flag entry point. Env-overridable defaults.
//
// Usage:
//   import { isFeatureEnabled } from "@/lib/feature-flags";
//   if (isFeatureEnabled("BODY_GRAPHICS_V2_ENABLED")) { ... }

export type FeatureFlag =
  | "BODY_GRAPHICS_V2_ENABLED"; // Prompt #118 Body Tracker graphics upgrade

const DEFAULTS: Record<FeatureFlag, boolean> = {
  BODY_GRAPHICS_V2_ENABLED: true,
};

/**
 * Env-var override. The env var mirrors the flag name and accepts:
 *   - "true" / "1" / "on"  => enabled
 *   - "false" / "0" / "off" => disabled
 * Anything else (or missing) falls back to the compiled-in default.
 */
function envOverride(flag: FeatureFlag): boolean | null {
  const raw = process.env[`NEXT_PUBLIC_${flag}`] ?? process.env[flag];
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (["true", "1", "on", "yes"].includes(normalized)) return true;
  if (["false", "0", "off", "no"].includes(normalized)) return false;
  return null;
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const override = envOverride(flag);
  return override !== null ? override : DEFAULTS[flag];
}

export { DEFAULTS as FEATURE_FLAG_DEFAULTS };
