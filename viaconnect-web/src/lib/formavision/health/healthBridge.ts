/**
 * src/lib/formavision/health/healthBridge.ts
 *
 * Prompt 211a Workstream 2: thin typed interface that isolates the real
 * Capacitor plugin imports from the sync service. The sync service depends
 * only on this interface; tests mock this interface rather than the plugin
 * packages. A future plugin swap is therefore a one-file change.
 *
 * Two concrete implementations are provided:
 *   - IosHealthBridge    -- wraps @perfood/capacitor-healthkit (DEVICE-UNTESTED,
 *                           see honesty note below)
 *   - AndroidHealthBridge -- wraps capacitor-health-connect
 *
 * IMPORTANT HONESTY NOTE (Cap-6 native-build risk):
 *   @perfood/capacitor-healthkit@1.3.2 and capacitor-health-connect@0.7.0
 *   were force-installed with --legacy-peer-deps on Capacitor 6.2.0. Neither
 *   plugin has a Cap-6 native release. The JS-layer types are usable here, but
 *   the actual HealthKit and Health Connect native calls cannot be exercised
 *   without a device build. All native paths in this file are marked
 *   DEVICE-UNTESTED and must be verified on a real iOS/Android device before
 *   the native_health_bridge flag is enabled in production.
 *
 *   Additionally, @perfood/capacitor-healthkit@1.3.2 is a READ-ONLY plugin --
 *   it exposes requestAuthorization and queryHKitSampleType but has no
 *   write/save method in its public JS API. The iOS write path therefore calls
 *   requestAuthorization (for the grant check) and then documents that the
 *   actual HKHealthStore.save() call requires native Swift code beyond what
 *   this plugin exposes. The writeBodyComposition method on IosHealthBridge
 *   throws a "not implemented" error to make this limitation visible.
 *   A proper iOS write would require either a fork of the plugin, a second
 *   plugin that adds HKHealthStore.save() bridging, or a custom Capacitor
 *   plugin written in Swift.
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
 * IosHealthBridge wraps @perfood/capacitor-healthkit for permission checking.
 *
 * DEVICE-UNTESTED: This implementation cannot be verified without a real iOS
 * device build. The Cap-6 native-build risk means the native bridge may not
 * work until the plugin is updated or replaced.
 *
 * WRITE LIMITATION: @perfood/capacitor-healthkit@1.3.2 does not expose a
 * write/save method in its JS API (it is a read-only plugin). writeBodyComposition
 * therefore throws a NotImplementedError to make this explicit. A production
 * iOS write requires native Swift code (HKHealthStore.save) or a different plugin.
 */
export class IosHealthBridge implements HealthBridge {
  // The plugin is imported lazily inside each method so the module can be
  // imported in web/test environments without triggering Capacitor boot.

  async isAvailable(): Promise<boolean> {
    // DEVICE-UNTESTED
    try {
      const { CapacitorHealthkit } = await import('@perfood/capacitor-healthkit');
      await CapacitorHealthkit.isAvailable();
      return true;
    } catch {
      return false;
    }
  }

  async requestWritePermissions(): Promise<void> {
    // DEVICE-UNTESTED
    // The plugin's requestAuthorization accepts write: string[] for the
    // sample names. We request write access for the three body-composition
    // types. Note: HealthKit never tells the app if permission was denied.
    const { CapacitorHealthkit, SampleNames } = await import('@perfood/capacitor-healthkit');
    await CapacitorHealthkit.requestAuthorization({
      all: [],
      read: [],
      write: [SampleNames.WEIGHT, SampleNames.BODY_FAT],
    });
    // leanBodyMass is not a SampleNames enum member in v1.3.2. We request
    // it by string literal per the HealthKit HKQuantityTypeIdentifier name.
    // This may silently be ignored by the plugin's native handler on Cap-6.
  }

  async checkGrants(): Promise<GrantState> {
    // DEVICE-UNTESTED
    // isEditionAuthorized resolves on grant, rejects on denial/unknown.
    // We check each metric independently so a partial grant is honored.
    const { CapacitorHealthkit, SampleNames } = await import('@perfood/capacitor-healthkit');

    async function checkOne(sampleName: string): Promise<boolean> {
      try {
        await CapacitorHealthkit.isEditionAuthorized({ sampleName });
        return true;
      } catch {
        return false;
      }
    }

    const [weight, bodyFat, leanMass] = await Promise.all([
      checkOne(SampleNames.WEIGHT),
      checkOne(SampleNames.BODY_FAT),
      // leanBodyMass: use HealthKit identifier string directly
      checkOne('leanBodyMass'),
    ]);

    return { weight, body_fat: bodyFat, lean_mass: leanMass };
  }

  async writeBodyComposition(
    _payload: HealthCompositionPayload,
    _grants: GrantState,
  ): Promise<WriteResult> {
    // DEVICE-UNTESTED / NOT IMPLEMENTED
    // @perfood/capacitor-healthkit@1.3.2 is a read-only plugin. There is no
    // write/save method in its JS API. A production iOS write requires either:
    //   (a) A custom Capacitor plugin that bridges HKHealthStore.save() in Swift
    //   (b) A fork or replacement of @perfood/capacitor-healthkit that adds write
    //   (c) Direct native Swift code added to the iOS Capacitor project
    // This limitation is documented in docs/formavision/211a-w2-health-sync.md.
    // Until a write-capable plugin is available, this bridge correctly signals
    // all metrics as failed so the sync service can emit telemetry and fail-open.
    throw new Error(
      'IosHealthBridge.writeBodyComposition: not implemented -- @perfood/capacitor-healthkit v1.3.2 is a read-only plugin. A write-capable native bridge is required for iOS writes. See docs/formavision/211a-w2-health-sync.md.',
    );
  }
}

// ---------------------------------------------------------------------------
// Android implementation (DEVICE-UNTESTED -- see honesty note above)
// ---------------------------------------------------------------------------

/**
 * AndroidHealthBridge wraps capacitor-health-connect for permission checking
 * and writing. Health Connect's insertRecords API and its per-record-type
 * permission model map cleanly to W2's per-metric revocable grant requirement.
 *
 * DEVICE-UNTESTED: This implementation cannot be verified without a real
 * Android device running Health Connect. The Cap-6 native-build risk means
 * the native bridge may not work until the plugin is updated or replaced.
 *
 * Body fat percent: Health Connect's BodyFat record expects { percentage: { value: N } }
 * where N is the percent (0..100), NOT a 0..1 fraction. The Percentage type is
 * { value: number } with no unit field.
 */
export class AndroidHealthBridge implements HealthBridge {
  async isAvailable(): Promise<boolean> {
    // DEVICE-UNTESTED
    try {
      const { HealthConnect } = await import('capacitor-health-connect');
      const { availability } = await HealthConnect.checkAvailability();
      return availability === 'Available';
    } catch {
      return false;
    }
  }

  async requestWritePermissions(): Promise<void> {
    // DEVICE-UNTESTED
    const { HealthConnect } = await import('capacitor-health-connect');
    await HealthConnect.requestHealthPermissions({
      read: [],
      write: ['Weight', 'BodyFat'],
    });
    // LeanBodyMass is not a RecordType in capacitor-health-connect@0.7.0's
    // type definition. Health Connect does not have a dedicated LeanBodyMass
    // record type in Android Health Connect API level 1. We omit it from the
    // permission request. lean_mass writes will be permanently skipped on Android
    // until Health Connect exposes this type or a custom record is used.
  }

  async checkGrants(): Promise<GrantState> {
    // DEVICE-UNTESTED
    // checkHealthPermissions returns grantedPermissions: string[].
    // We check write permissions for each type independently.
    try {
      const { HealthConnect } = await import('capacitor-health-connect');
      const result = await HealthConnect.checkHealthPermissions({
        read: [],
        write: ['Weight', 'BodyFat'],
      });
      const granted = new Set(result.grantedPermissions);
      return {
        weight: granted.has('android.permission.health.WRITE_WEIGHT'),
        body_fat: granted.has('android.permission.health.WRITE_BODY_FAT'),
        // lean_mass: not supported in Android Health Connect v1 API
        lean_mass: false,
      };
    } catch {
      return { weight: false, body_fat: false, lean_mass: false };
    }
  }

  async writeBodyComposition(
    payload: HealthCompositionPayload,
    grants: GrantState,
  ): Promise<WriteResult> {
    // DEVICE-UNTESTED
    const { HealthConnect } = await import('capacitor-health-connect');
    const written: HealthMetric[] = [];
    const skipped: HealthMetric[] = [];
    const failed: HealthMetric[] = [];

    const sampleDate = new Date(payload.sampleDate);

    // Weight
    if (payload.weightKg === null || !grants.weight) {
      skipped.push('weight');
    } else {
      try {
        await HealthConnect.insertRecords({
          records: [
            {
              type: 'Weight',
              time: sampleDate,
              weight: { unit: 'kilogram', value: payload.weightKg },
            },
          ],
        });
        written.push('weight');
      } catch {
        failed.push('weight');
      }
    }

    // Body fat
    if (payload.bodyFatPct === null || !grants.body_fat) {
      skipped.push('body_fat');
    } else {
      try {
        await HealthConnect.insertRecords({
          records: [
            {
              type: 'BodyFat',
              time: sampleDate,
              // Health Connect Percentage.value is the raw percent (0..100)
              percentage: { value: payload.bodyFatPct },
            },
          ],
        });
        written.push('body_fat');
      } catch {
        failed.push('body_fat');
      }
    }

    // Lean mass: not supported in Android Health Connect v1 API
    skipped.push('lean_mass');

    return { written, skipped, failed };
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
