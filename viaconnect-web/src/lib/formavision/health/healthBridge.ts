/**
 * src/lib/formavision/health/healthBridge.ts
 *
 * Prompt 211a Workstream 2: thin typed interface that isolates the real
 * Capacitor plugin imports from the sync service. The sync service depends
 * only on this interface; tests mock this interface rather than the plugin
 * packages. A future plugin swap is therefore a one-file change.
 *
 * Two concrete implementations are provided:
 *   - IosHealthBridge    -- in-repo read-only step-count plugin (DEVICE-UNTESTED)
 *   - AndroidHealthBridge -- not wired in this release (Health Connect stays out)
 *
 * VIA-9: iOS reads step count through the in-repo plugin. Write methods throw.
 * Android Health Connect is not called. Device behavior is UNVERIFIED.
 *
 * Standing rules: no em dashes, no en dashes, no emojis, zero any, TS strict.
 */

// ---------------------------------------------------------------------------
// Units / measurement types
// ---------------------------------------------------------------------------

/**
 * LBS_TO_KG: exact NIST conversion factor (0.45359237 kg per pound).
 * Used to convert DB-stored lbs to kg for HealthKit and Health Connect.
 */
export const LBS_TO_KG = 0.45359237 as const;

/**
 * Convert a mass in pounds to kilograms using the exact NIST factor.
 * Pure; no rounding (callers round for display if needed).
 */
export function lbsToKgExact(lbs: number): number {
  return lbs * LBS_TO_KG;
}

// ---------------------------------------------------------------------------
// HealthBridge interface and types
// ---------------------------------------------------------------------------

/**
 * The three body-composition metrics W2 writes. Use string literals to
 * keep the grant model clear and avoid numeric-index confusion.
 */
export type HealthMetric = 'weight' | 'body_fat' | 'lean_mass';

/**
 * The per-metric grant state returned by checkGrants.
 * granted: true = the user has authorized writes for this metric.
 * granted: false = denied, revoked, or unavailable.
 */
export interface GrantState {
  weight: boolean;
  body_fat: boolean;
  lean_mass: boolean;
}

/**
 * The composition values passed to writeBodyComposition.
 * Masses are in kilograms (already converted from lbs by the caller).
 * body_fat_pct is the raw percent value (0..100), not a fraction.
 * Any field that is null must NOT be written (RULE 9 honesty gate).
 */
export interface HealthCompositionPayload {
  /** Weight in kilograms. null = absent (do not write). */
  weightKg: number | null;
  /** Body fat percent (0..100). null = absent (do not write). */
  bodyFatPct: number | null;
  /** Lean body mass in kilograms. null = absent (do not write). */
  leanMassKg: number | null;
  /** ISO-8601 date string for the sample (body_tracker_entries.entry_date). */
  sampleDate: string;
}

/**
 * The result of one writeBodyComposition call: which metrics succeeded,
 * which were skipped (not granted or null), and which failed.
 */
export interface WriteResult {
  written: HealthMetric[];
  skipped: HealthMetric[];
  failed: HealthMetric[];
}

/**
 * HealthBridge: the platform-agnostic interface the sync service uses.
 * Concrete implementations wrap the real plugins behind this boundary.
 * Tests mock this interface directly.
 */
export interface HealthBridge {
  /**
   * Returns true when the health store is available on this device.
   * On web this always returns false.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Request write permission for all three metrics. The user sees the
   * platform permission dialog. On iOS, HealthKit never reveals whether
   * permission was denied -- the grant check falls back to isEditionAuthorized.
   * On Android, Health Connect returns grantedPermissions explicitly.
   */
  requestWritePermissions(): Promise<void>;

  /**
   * Check current write-grant state for each metric WITHOUT prompting the
   * user. Called at the start of every sync run so revoked grants are honored.
   */
  checkGrants(): Promise<GrantState>;

  /**
   * Write the composition values to the health store, respecting the grant
   * state. Only metrics with a non-null value AND a granted permission are
   * written. Returns which metrics were written, skipped, or failed.
   */
  writeBodyComposition(
    payload: HealthCompositionPayload,
    grants: GrantState,
  ): Promise<WriteResult>;
}

// ---------------------------------------------------------------------------
// iOS implementation (DEVICE-UNTESTED -- see honesty note above)
// ---------------------------------------------------------------------------

/**
 * IosHealthBridge checks the in-repo ViaConnectHealthKit plugin.
 *
 * DEVICE-UNTESTED: this cannot be verified without a real iOS device build.
 *
 * This release reads step count only. requestWritePermissions and
 * writeBodyComposition throw. They do not call HealthKit save.
 */
export class IosHealthBridge implements HealthBridge {
  async isAvailable(): Promise<boolean> {
    try {
      const { ViaConnectHealthKit } = await import('@/lib/wearables/viaconnect-healthkit');
      const result = await ViaConnectHealthKit.isAvailable();
      return result.available;
    } catch {
      return false;
    }
  }

  async requestWritePermissions(): Promise<void> {
    throw new Error(
      'IosHealthBridge.requestWritePermissions: this release reads step count only and does not request Apple Health write access.',
    );
  }

  async checkGrants(): Promise<GrantState> {
    return { weight: false, body_fat: false, lean_mass: false };
  }

  async writeBodyComposition(
    _payload: HealthCompositionPayload,
    _grants: GrantState,
  ): Promise<WriteResult> {
    throw new Error(
      'IosHealthBridge.writeBodyComposition: this release reads step count only and does not save Apple Health samples.',
    );
  }
}

// ---------------------------------------------------------------------------
// Android implementation (DEVICE-UNTESTED -- see honesty note above)
// ---------------------------------------------------------------------------

/**
 * AndroidHealthBridge does not call capacitor-health-connect in this release.
 * isAvailable returns false. Write methods throw. Health Connect stays out of v1.
 *
 * DEVICE-UNTESTED: the Android binary still lists the plugin module because
 * the package remains a dependency. JS does not import it.
 */
export class AndroidHealthBridge implements HealthBridge {
  async isAvailable(): Promise<boolean> {
    return false;
  }

  async requestWritePermissions(): Promise<void> {
    throw new Error(
      'AndroidHealthBridge.requestWritePermissions: Health Connect is not in this release.',
    );
  }

  async checkGrants(): Promise<GrantState> {
    return { weight: false, body_fat: false, lean_mass: false };
  }

  async writeBodyComposition(
    _payload: HealthCompositionPayload,
    _grants: GrantState,
  ): Promise<WriteResult> {
    throw new Error(
      'AndroidHealthBridge.writeBodyComposition: Health Connect is not in this release.',
    );
  }
}

// ---------------------------------------------------------------------------
// Null bridge (web / flag-off / test default)
// ---------------------------------------------------------------------------

/**
 * NullHealthBridge: a no-op bridge used when no native platform is available
 * (web) or when tests need a fully controllable stub that does nothing.
 * isAvailable() always returns false so the sync service skips immediately.
 */
export class NullHealthBridge implements HealthBridge {
  async isAvailable(): Promise<boolean> {
    return false;
  }

  async requestWritePermissions(): Promise<void> {
    // no-op
  }

  async checkGrants(): Promise<GrantState> {
    return { weight: false, body_fat: false, lean_mass: false };
  }

  async writeBodyComposition(
    _payload: HealthCompositionPayload,
    _grants: GrantState,
  ): Promise<WriteResult> {
    return { written: [], skipped: ['weight', 'body_fat', 'lean_mass'], failed: [] };
  }
}

// ---------------------------------------------------------------------------
// Factory: returns the correct bridge for the current Capacitor platform
// ---------------------------------------------------------------------------

/**
 * Returns the appropriate HealthBridge implementation for the current runtime.
 * On iOS (Capacitor) returns IosHealthBridge; on Android returns
 * AndroidHealthBridge; on web returns NullHealthBridge.
 *
 * Reads window.Capacitor?.getPlatform() without hard-depending on
 * @capacitor/core (matches the pattern in camera-capture.ts).
 */
export function createHealthBridge(): HealthBridge {
  if (typeof window === 'undefined') return new NullHealthBridge();
  const w = window as unknown as Record<string, unknown>;
  const cap = w['Capacitor'] as { getPlatform?: () => string } | undefined;
  if (!cap || typeof cap.getPlatform !== 'function') return new NullHealthBridge();
  const platform = cap.getPlatform();
  if (platform === 'ios') return new IosHealthBridge();
  if (platform === 'android') return new AndroidHealthBridge();
  return new NullHealthBridge();
}
