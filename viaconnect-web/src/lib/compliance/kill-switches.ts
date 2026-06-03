// Prompt 172 Phase 0 (170c primitive): compile time kill switches.
//
// These flags are the runtime knobs that 170c §3.9, §4.8, §6, §8.13, §10.7, and
// §19.6 promise. Each downstream prompt consumes them via isKillSwitchEnabled
// to gate a behavior. Defaults match what 170c spec says ships post Audit; the
// two flags that gate full 170c §3 (PHI redaction) and §4 (DSAR self serve)
// stay false until those sections actually land.
//
// Env override format is identical to src/lib/feature-flags.ts so callers do
// not have to learn a second pattern. Both NEXT_PUBLIC_<FLAG> and bare <FLAG>
// are read; truthy values are true, 1, on, yes; falsy values are false, 0,
// off, no; anything else falls back to the compile time default.

/**
 * Eating disorder safety mode (170c §8.13). Master switch for the silent
 * ratio mode behavioral contract. When false, opt in is blocked and the
 * default false hook state stands for new users; users who already opted in
 * keep their setting until they opt out.
 */
export type KillSwitch =
  | 'EATING_DISORDER_SAFETY_MODE_ENABLED'
  | 'FDA_DISCLAIMER_RENDERING_ENABLED'
  | 'PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED'
  | 'PHI_REDACTION_ENABLED'
  | 'DSAR_SELF_SERVE_ENABLED'
  | 'BOS_LINE_RENDERING_ENABLED'
  | 'BOS_LINE_SPLIT_PLATE_ENABLED'
  | 'BEVERAGE_CATALOG_RENDERING_ENABLED';

export const KILL_SWITCH_DEFAULTS: Record<KillSwitch, boolean> = {
  /** 170c §8.13. Master gate for ED safety mode rendering and opt in. */
  EATING_DISORDER_SAFETY_MODE_ENABLED: true,
  /** 170c §19.6. Gates rendering of the standardized FDA disclaimer surface. */
  FDA_DISCLAIMER_RENDERING_ENABLED: true,
  /** 170c §10.7. Gates the inline degraded service notice on NutriVision. */
  PROVIDER_DEGRADED_SERVICE_MESSAGING_ENABLED: true,
  /** 170c §3.9. Off until §3 ships (on device segmentation + bundled model). */
  PHI_REDACTION_ENABLED: false,
  /** 170c §4.8. Off until §4 ships (self serve DSAR access + erasure). */
  DSAR_SELF_SERVE_ENABLED: false,
  /**
   * 172 §2 preview gate. Default true in development so localhost still
   * renders the line; preview build flips it via env override for the
   * Vercel review pass. Off in production until Gary green lights via the
   * preview deployment URL. When false the MealCard skips the fetch and
   * the GET endpoint returns 200 with a null body.
   */
  BOS_LINE_RENDERING_ENABLED: process.env.NODE_ENV !== 'production',
  /**
   * 172c stub gate for the Split plate workflow. Off until the workflow
   * lands; the post save action row hides the affordance until then.
   */
  BOS_LINE_SPLIT_PLATE_ENABLED: false,
  /**
   * Prompt 172e Phase B. Gates the GET /api/nutrition/hydration/catalog
   * endpoint and the BeveragePicker mount on /wellness-analytics/hydration.
   * Default true; flip to false for emergency rollback during a 170c
   * section 9 incident or other compliance event. Separate from
   * HYDRATION_TRACKING_ENABLED which gates the 170o write paths.
   */
  BEVERAGE_CATALOG_RENDERING_ENABLED: true,
};

function parseEnv(raw: string | undefined): boolean | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'off', 'no'].includes(normalized)) return false;
  return null;
}

export function isKillSwitchEnabled(flag: KillSwitch): boolean {
  const publicVal = parseEnv(process.env[`NEXT_PUBLIC_${flag}`]);
  if (publicVal !== null) return publicVal;
  const plainVal = parseEnv(process.env[flag]);
  if (plainVal !== null) return plainVal;
  return KILL_SWITCH_DEFAULTS[flag];
}
