/**
 * src/lib/formavision/health/healthSync.ts
 *
 * Prompt 211a Workstream 2: platform-agnostic health sync service.
 *
 * Called by the scan-completion flow to write FormaVision body-composition
 * values into Apple Health (iOS) or Health Connect (Android), honestly and
 * privately. The service is fully testable via a mocked HealthBridge -- the
 * real plugin is isolated behind healthBridge.ts.
 *
 * RULE 9 (non-negotiable, test-enforced):
 *   A pure vision scan produces ONLY body_fat_pct. weight and lean_mass are
 *   null unless a real weight/composition entry supplied them. The sync writes
 *   whichever of {weight, body_fat, lean_mass} have REAL non-null values.
 *   It NEVER writes 0, NEVER fabricates, NEVER uses a placeholder.
 *
 * Unit conversion (lbs -> kg):
 *   DB stores weight and lean_mass in lbs. Health stores want kg.
 *   Conversion uses LBS_TO_KG = 0.45359237 (NIST exact factor).
 *   Body fat percent maps to the platform's percent directly (0..100).
 *
 * Resilience:
 *   - withTimeout on every bridge call (5 000 ms)
 *   - safeLog (NO PHI in logs -- metric name + success/failure only)
 *   - fail-open: a sync failure never blocks or fails the scan
 *
 * Helix-invisible: writes NO helix/token/streak data.
 * PHI rule: health values stay in-memory for the write only; never persisted.
 *
 * Standing rules: no em dashes, no en dashes, no emojis, zero any, TS strict.
 */

import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { createClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/types';
import { lbsToKgExact } from './healthBridge';
import type {
  HealthBridge,
  HealthMetric,
  GrantState,
  HealthCompositionPayload,
  WriteResult,
} from './healthBridge';
import { createHealthBridge } from './healthBridge';

// ---------------------------------------------------------------------------
// Timeout for every bridge call (native health stores can be slow)
// ---------------------------------------------------------------------------

const BRIDGE_TIMEOUT_MS = 5_000;
const LOG_SCOPE = 'formavision.health-sync';

// ---------------------------------------------------------------------------
// Input type: raw DB values, null when absent
// ---------------------------------------------------------------------------

/**
 * ScanCompositionInput: the raw values from a completed scan.
 * Values sourced from:
 *   body_fat_pct     <- body_tracker_segmental_fat.total_body_fat_pct (percent)
 *   weight_lbs       <- body_tracker_entries (real weight entry only; null on pure scan)
 *   lean_mass_lbs    <- body_tracker_entries (real composition entry only; null on pure scan)
 *   entry_date       <- body_tracker_entries.entry_date (ISO-8601 date)
 *   user_id          <- authenticated user id
 */
export interface ScanCompositionInput {
  /** Authenticated user id. Required; sync skips if falsy. */
  userId: string | null | undefined;
  /** ISO-8601 date of the scan entry (body_tracker_entries.entry_date). */
  entryDate: string;
  /** Body fat percent (0..100). From body_tracker_segmental_fat.total_body_fat_pct. */
  bodyFatPct: number | null;
  /** Weight in pounds. From a real weight/composition entry. null on pure vision scan. */
  weightLbs: number | null;
  /** Lean body mass in pounds. From a real composition entry. null on pure vision scan. */
  leanMassLbs: number | null;
}

// ---------------------------------------------------------------------------
// Telemetry events
// ---------------------------------------------------------------------------

export type HealthSyncTelemetryEvent =
  | 'formavision.health_sync_skipped'
  | 'formavision.health_sync_written'
  | 'formavision.health_sync_denied'
  | 'formavision.health_sync_failed';

export const ALL_HEALTH_SYNC_EVENTS: HealthSyncTelemetryEvent[] = [
  'formavision.health_sync_skipped',
  'formavision.health_sync_written',
  'formavision.health_sync_denied',
  'formavision.health_sync_failed',
];

if (ALL_HEALTH_SYNC_EVENTS.length !== 4) {
  throw new Error(
    `HealthSyncTelemetryEvent exhaustiveness error: expected 4, got ${ALL_HEALTH_SYNC_EVENTS.length}.`,
  );
}

export type HealthSyncSkipReason = 'flag_off' | 'no_user' | 'not_available';

/**
 * Telemetry payload shapes. PHI rule: NO values, NO measurements.
 * Only metric names, counts, and error class strings.
 */
export interface HealthSyncSkippedProperties {
  reason: HealthSyncSkipReason;
}

export interface HealthSyncWrittenProperties {
  /** Which metrics were written (no values). */
  metrics: HealthMetric[];
  /** How many metrics were written. */
  count: number;
}

export interface HealthSyncDeniedProperties {
  /** Which metric was denied. */
  metric: HealthMetric;
}

export interface HealthSyncFailedProperties {
  /** Error class name, no PHI. */
  errorClass: string;
  /** Which metrics failed. */
  metrics: HealthMetric[];
}

// ---------------------------------------------------------------------------
// Telemetry emitter (fire-and-forget, fail-open)
// ---------------------------------------------------------------------------

async function emitHealthSyncEvent(
  userId: string,
  event: HealthSyncTelemetryEvent,
  properties: Record<string, Json>,
): Promise<void> {
  try {
    await createClient().from('analytics_events').insert({
      user_id: userId,
      event,
      properties,
      page: '/body-tracker/composition',
    });
  } catch (e) {
    safeLog.warn(LOG_SCOPE, 'telemetry emit failed', {
      event,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

// ---------------------------------------------------------------------------
// Unit conversion helpers (pure, tested)
// ---------------------------------------------------------------------------

/**
 * Convert lbs to kg using the NIST exact factor (0.45359237).
 * Returns null when input is null (RULE 9: never substitute 0).
 */
export function convertMassToKg(lbs: number | null): number | null {
  if (lbs === null) return null;
  return lbsToKgExact(lbs);
}

/**
 * Build the HealthCompositionPayload from raw scan input.
 * RULE 9: fields that are null in input remain null in the payload.
 * NEVER write 0, NEVER fabricate a value.
 */
export function buildCompositionPayload(input: ScanCompositionInput): HealthCompositionPayload {
  return {
    weightKg: convertMassToKg(input.weightLbs),
    bodyFatPct: input.bodyFatPct,            // already percent (0..100)
    leanMassKg: convertMassToKg(input.leanMassLbs),
    sampleDate: input.entryDate,
  };
}

// ---------------------------------------------------------------------------
// Grant analysis helpers (pure, tested)
// ---------------------------------------------------------------------------

/**
 * Determine which metrics should be written based on the payload values
 * and the current grant state. Returns only metrics where BOTH the value
 * is non-null AND the permission is granted.
 *
 * RULE 9: a null payload value means OMIT -- do not write, do not substitute.
 */
export function selectWritableMetrics(
  payload: HealthCompositionPayload,
  grants: GrantState,
): HealthMetric[] {
  const candidates: HealthMetric[] = [];
  if (payload.weightKg !== null) candidates.push('weight');
  if (payload.bodyFatPct !== null) candidates.push('body_fat');
  if (payload.leanMassKg !== null) candidates.push('lean_mass');

  return candidates.filter((m) => grants[m]);
}

/**
 * Determine which metrics are denied (value present, but grant is false).
 * These generate health_sync_denied telemetry.
 */
export function selectDeniedMetrics(
  payload: HealthCompositionPayload,
  grants: GrantState,
): HealthMetric[] {
  const denied: HealthMetric[] = [];
  if (payload.weightKg !== null && !grants.weight) denied.push('weight');
  if (payload.bodyFatPct !== null && !grants.body_fat) denied.push('body_fat');
  if (payload.leanMassKg !== null && !grants.lean_mass) denied.push('lean_mass');
  return denied;
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

/**
 * Sync body-composition values from a completed FormaVision scan into the
 * native health store (Apple Health on iOS, Health Connect on Android).
 *
 * This function never throws: all errors are caught, logged, and emitted as
 * telemetry. A sync failure MUST NOT block or fail the scan.
 *
 * @param input - The raw DB values from the completed scan.
 * @param bridge - Optional HealthBridge override (for testing). Defaults to
 *   createHealthBridge() which returns the platform-appropriate concrete bridge.
 */
export async function syncHealthData(
  input: ScanCompositionInput,
  bridge?: HealthBridge,
): Promise<void> {
  // 1. Guard: valid user
  if (!input.userId) {
    safeLog.info(LOG_SCOPE, 'skipped: no user', {});
    return;
  }
  const userId = input.userId;

  // 2. Guard: feature flag
  if (!isFeatureEnabled('native_health_bridge', userId)) {
    safeLog.info(LOG_SCOPE, 'skipped: flag off', {});
    void emitHealthSyncEvent(userId, 'formavision.health_sync_skipped', {
      reason: 'flag_off' as Json,
    });
    return;
  }

  // 3. Resolve bridge
  const activeBridge = bridge ?? createHealthBridge();

  // 4. Guard: platform availability
  let available = false;
  try {
    available = await withTimeout(
      activeBridge.isAvailable(),
      BRIDGE_TIMEOUT_MS,
      'health-bridge.isAvailable',
    );
  } catch (e) {
    safeLog.warn(LOG_SCOPE, 'isAvailable check failed', {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  if (!available) {
    safeLog.info(LOG_SCOPE, 'skipped: health store not available', {});
    void emitHealthSyncEvent(userId, 'formavision.health_sync_skipped', {
      reason: 'not_available' as Json,
    });
    return;
  }

  // 5. Build the composition payload (unit conversion + null preservation)
  const payload = buildCompositionPayload(input);

  // 6. Request write permissions (request the dialog; grants are checked next)
  //    This is a best-effort call: if it fails, we proceed to checkGrants anyway
  //    because the user may have already granted permissions in a prior session.
  try {
    await withTimeout(
      activeBridge.requestWritePermissions(),
      BRIDGE_TIMEOUT_MS,
      'health-bridge.requestWritePermissions',
    );
  } catch (e) {
    safeLog.warn(LOG_SCOPE, 'requestWritePermissions failed (continuing)', {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // 7. Check current grant state (always read live; never use a cached value)
  let grants: GrantState = { weight: false, body_fat: false, lean_mass: false };
  try {
    grants = await withTimeout(
      activeBridge.checkGrants(),
      BRIDGE_TIMEOUT_MS,
      'health-bridge.checkGrants',
    );
  } catch (e) {
    safeLog.warn(LOG_SCOPE, 'checkGrants failed', {
      error: e instanceof Error ? e.message : String(e),
    });
    // Grants all false means nothing will be written -- fail-open
  }

  // 8. Emit health_sync_denied for each metric that has a value but no grant
  const deniedMetrics = selectDeniedMetrics(payload, grants);
  for (const metric of deniedMetrics) {
    void emitHealthSyncEvent(userId, 'formavision.health_sync_denied', {
      metric: metric as Json,
    });
    safeLog.info(LOG_SCOPE, 'metric denied (no grant)', { metric });
  }

  // 9. Determine which metrics can be written
  const writable = selectWritableMetrics(payload, grants);
  if (writable.length === 0) {
    safeLog.info(LOG_SCOPE, 'no writable metrics after grant check', {});
    return;
  }

  // 10. Write to the health store
  let result: WriteResult = { written: [], skipped: [], failed: [] };
  try {
    result = await withTimeout(
      activeBridge.writeBodyComposition(payload, grants),
      BRIDGE_TIMEOUT_MS,
      'health-bridge.writeBodyComposition',
    );
  } catch (e) {
    const errorClass = e instanceof Error ? e.constructor.name : 'UnknownError';
    safeLog.warn(LOG_SCOPE, 'writeBodyComposition threw', {
      errorClass,
      // NO PHI: only metric names and error class
      metrics: writable,
    });
    void emitHealthSyncEvent(userId, 'formavision.health_sync_failed', {
      errorClass: errorClass as Json,
      metrics: writable as unknown as Json,
    });
    // fail-open: do NOT rethrow
    return;
  }

  // 11. Telemetry for written metrics
  if (result.written.length > 0) {
    safeLog.info(LOG_SCOPE, 'metrics written successfully', {
      metrics: result.written,
      count: result.written.length,
      // NO PHI: no values
    });
    const writtenProps: Record<string, Json> = {
      metrics: result.written as unknown as Json,
      count: result.written.length,
    };
    void emitHealthSyncEvent(userId, 'formavision.health_sync_written', writtenProps);
  }

  // 12. Telemetry for failed metrics within the write result
  if (result.failed.length > 0) {
    safeLog.warn(LOG_SCOPE, 'some metrics failed in write result', {
      metrics: result.failed,
    });
    const failedProps: Record<string, Json> = {
      errorClass: 'WritePartialFailure',
      metrics: result.failed as unknown as Json,
    };
    void emitHealthSyncEvent(userId, 'formavision.health_sync_failed', failedProps);
  }
}
