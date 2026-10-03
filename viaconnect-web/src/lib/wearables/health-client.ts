// Prompt 212, VIA-9: Apple Health step-count client.
// iOS uses the in-repo ViaConnectHealthKit plugin (read-only step count).
// Android Health Connect is not called in this release.

import { Capacitor } from "@capacitor/core";
import { safeLog } from "@/lib/utils/safe-log";
import { ViaConnectHealthKit } from "@/lib/wearables/viaconnect-healthkit";
import { HEALTHKIT_STEP_COUNT_READ, normalizeStepSamples, type StepSample } from "@/lib/wearables/step-samples";

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
  if (platform === "android") {
    return { ok: false, reason: "health_connect_not_enabled" };
  }

  try {
    const available = await ViaConnectHealthKit.isAvailable();
    if (!available.available) return { ok: false, reason: "plugin_missing" };
    await ViaConnectHealthKit.requestAuthorization({
      read: [...HEALTHKIT_STEP_COUNT_READ],
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
  if (platform === "android") {
    return { ok: false, reason: "health_connect_not_enabled" };
  }

  const source = platform === "ios" ? "health_kit" : "health_connect";
  const batchId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `batch_${Date.now()}`;

  let samples: StepSample[] = [];
  try {
    const since = loadAnchor("steps") ?? new Date(Date.now() - 7 * 864e5).toISOString();
    const result = await ViaConnectHealthKit.queryHKitSampleType({
      sampleName: "stepCount",
      startDate: since,
      endDate: new Date().toISOString(),
      limit: 100,
    });
    samples = normalizeStepSamples(result.resultData);
    saveAnchor("steps", new Date().toISOString());
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
