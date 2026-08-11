// Prompt 212: Capacitor HealthKit client wrapper.
// Uses @perfood/capacitor-healthkit when available; no-ops on web with clear status.

import { Capacitor } from "@capacitor/core";
import { safeLog } from "@/lib/utils/safe-log";

const SCOPE = "lib.wearables.health-client";

export type HealthPlatform = "ios" | "android" | "web";

export function getHealthPlatform(): HealthPlatform {
  const p = Capacitor.getPlatform();
  if (p === "ios") return "ios";
  if (p === "android") return "android";
  return "web";
}

export function isHealthConnectEnabled(): boolean {
  // Capability flag mirrored from server HEALTH_CONNECT_ENABLED for UI honesty.
  return process.env.NEXT_PUBLIC_HEALTH_CONNECT_ENABLED === "1";
}

/** Request read permissions. Returns true if granted or already authorized. */
export async function requestHealthPermissions(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const platform = getHealthPlatform();
  if (platform === "web") {
    return { ok: false, reason: "open_in_app" };
  }
  if (platform === "android" && !isHealthConnectEnabled()) {
    return { ok: false, reason: "health_connect_not_enabled" };
  }

  try {
    // Dynamic import so web builds never hard-fail without the native plugin.
    const mod = await import("@perfood/capacitor-healthkit").catch(() => null);
    if (!mod?.CapacitorHealthkit) {
      return { ok: false, reason: "plugin_missing" };
    }
    const Healthkit = mod.CapacitorHealthkit;
    await Healthkit.requestAuthorization({
      all: [],
      read: [
        "HKQuantityTypeIdentifierHeartRate",
        "HKQuantityTypeIdentifierRestingHeartRate",
        "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
        "HKCategoryTypeIdentifierSleepAnalysis",
        "HKQuantityTypeIdentifierRespiratoryRate",
        "HKQuantityTypeIdentifierOxygenSaturation",
        "HKQuantityTypeIdentifierStepCount",
        "HKQuantityTypeIdentifierActiveEnergyBurned",
        "HKQuantityTypeIdentifierBodyMass",
        "HKQuantityTypeIdentifierBodyFatPercentage",
        "HKQuantityTypeIdentifierLeanBodyMass",
      ],
      write: [],
    });
    return { ok: true };
  } catch (err) {
    safeLog.warn(SCOPE, "requestAuthorization failed", { error: err });
    return { ok: false, reason: "permission_denied" };
  }
}

export interface SyncResult {
  ok: boolean;
  batchId?: string;
  sampleCount?: number;
  reason?: string;
}

/**
 * Read samples since local anchor and POST to /api/integrations/health-sync.
 * Anchors stored in localStorage key viaconnect.health.anchors.v1
 */
export async function syncHealthSamples(): Promise<SyncResult> {
  const platform = getHealthPlatform();
  if (platform === "web") return { ok: false, reason: "open_in_app" };
  if (platform === "android" && !isHealthConnectEnabled()) {
    return { ok: false, reason: "health_connect_not_enabled" };
  }

  const source = platform === "ios" ? "health_kit" : "health_connect";
  const batchId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `batch_${Date.now()}`;

  // On native without full query implementation of the plugin surface, send an
  // empty first-sync handshake so connected_sources is marked connected.
  // Full sample query depends on device entitlements; production iOS builds
  // extend querySampleType calls here.
  let samples: Array<Record<string, unknown>> = [];
  try {
    const mod = await import("@perfood/capacitor-healthkit").catch(() => null);
    if (mod?.CapacitorHealthkit?.queryHKitSampleType) {
      const since = loadAnchor("steps") ?? new Date(Date.now() - 7 * 864e5).toISOString();
      const result = await mod.CapacitorHealthkit.queryHKitSampleType({
        sampleName: "stepCount",
        startDate: since,
        endDate: new Date().toISOString(),
        limit: 100,
      });
      // Shape varies by plugin version; normalize defensively.
      const raw = (result as { resultData?: unknown[] })?.resultData ?? [];
      samples = (raw as Array<Record<string, unknown>>).map((r, i) => ({
        type: "steps",
        value: r.value ?? r.quantity ?? null,
        startDate: r.startDate ?? r.startDateString ?? null,
        endDate: r.endDate ?? r.endDateString ?? null,
        sourceApp: r.sourceName ?? r.sourceBundleId ?? null,
        id: r.uuid ?? `step_${i}`,
      }));
      saveAnchor("steps", new Date().toISOString());
    }
  } catch (err) {
    safeLog.warn(SCOPE, "sample query failed (sending handshake batch)", { error: err });
  }

  try {
    const res = await fetch("/api/integrations/health-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batch_id: batchId, source, samples }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, reason: json.error || "sync_failed" };
    }
    return { ok: true, batchId, sampleCount: samples.length };
  } catch (err) {
    safeLog.warn(SCOPE, "sync post failed", { error: err });
    return { ok: false, reason: "network" };
  }
}

const ANCHOR_KEY = "viaconnect.health.anchors.v1";

function loadAnchor(type: string): string | null {
  try {
    const raw = localStorage.getItem(ANCHOR_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[type] ?? null;
  } catch {
    return null;
  }
}

function saveAnchor(type: string, iso: string): void {
  try {
    const raw = localStorage.getItem(ANCHOR_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[type] = iso;
    localStorage.setItem(ANCHOR_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}
