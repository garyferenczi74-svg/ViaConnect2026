/**
 * User health-platform capability (Apple Health / Google Health Connect).
 * Consent-mediated, digest-only. Never scrapes; never cross-user.
 *
 * Existing pathway (Prompt 212/218):
 * - Apple HealthKit via Capacitor @perfood/capacitor-healthkit + /api/integrations/health-sync
 * - Google Health OAuth + Health Connect scaffold in connected-sources registry
 * Agents read via digests / connection state, not raw device APIs.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { CapabilityAgentId, CapabilityResult } from "../types";
import { logCapabilityUsage } from "../logUsage";

export const HEALTH_PLATFORM_SCOPES = [
  "heart_rate",
  "resting_heart_rate",
  "hrv",
  "sleep",
  "respiratory_rate",
  "oxygen_saturation",
  "steps",
  "active_energy",
  "body_mass",
  "body_fat_pct",
  "lean_body_mass",
] as const;

export interface HealthPlatformReadResult {
  userId: string;
  connections: Array<{
    sourceId: string;
    status: string;
    lastSyncAt?: string | null;
  }>;
  digestSummaries: string[];
  scopes: readonly string[];
  note: string;
}

export async function capHealthPlatformRead(
  agent: CapabilityAgentId,
  userId: string
): Promise<CapabilityResult<HealthPlatformReadResult>> {
  const t0 = Date.now();
  const queryShape = `health_platform:user_scoped`;

  if (!userId) {
    const usage = {
      agent: String(agent),
      capability: "health_platform" as const,
      queryShape,
      credits: 0,
      tokens: 0,
      outcome: "denied" as const,
      reason: "userId_required",
      durationMs: Date.now() - t0,
    };
    await logCapabilityUsage(usage);
    return {
      ok: false,
      denied: true,
      reason: "userId_required",
      usage,
      marshallGateRequired: false,
      marshallApproved: true,
    };
  }

  try {
    const supabase = createAdminClient();
    const connections: HealthPlatformReadResult["connections"] = [];

    // Prefer connected_sources (wearables architecture)
    const { data: cs } = await supabase
      .from("connected_sources")
      .select("source_id, status, last_sync_at, provider")
      .eq("user_id", userId)
      .limit(20);

    for (const row of cs ?? []) {
      const r = row as {
        source_id?: string;
        status?: string;
        last_sync_at?: string;
        provider?: string;
      };
      const sid = r.source_id ?? r.provider ?? "unknown";
      if (
        /apple|health_kit|health_connect|google_health|whoop|fitbit/i.test(sid) ||
        /apple|health|google|whoop/i.test(String(r.provider ?? ""))
      ) {
        connections.push({
          sourceId: sid,
          status: r.status ?? "unknown",
          lastSyncAt: r.last_sync_at ?? null,
        });
      }
    }

    // Digest-mediated metrics (Arnold biology path)
    const digestSummaries: string[] = [];
    try {
      const { getArnoldDailyDigest, getJefferyDailyDigest } = await import(
        "@/lib/hannah/compilation/digests"
      );
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [arnold, jeffery] = await Promise.all([
        getArnoldDailyDigest(userId, since),
        getJefferyDailyDigest(userId, since),
      ]);
      if (arnold.ok) {
        for (const i of arnold.items.slice(0, 4)) digestSummaries.push(i.summary);
      }
      if (jeffery.ok) {
        for (const i of jeffery.items.slice(0, 2)) {
          if (/bio|connect|hub/i.test(i.summary)) digestSummaries.push(i.summary);
        }
      }
    } catch {
      digestSummaries.push("Digest suppliers unavailable; connection state only.");
    }

    const data: HealthPlatformReadResult = {
      userId,
      connections,
      digestSummaries,
      scopes: HEALTH_PLATFORM_SCOPES,
      note:
        "Device-mediated consent only. Agents never call Apple HealthKit or Health Connect server-side. Synced rows flow through digests with RLS.",
    };

    const usage = {
      agent: String(agent),
      capability: "health_platform" as const,
      queryShape,
      credits: 0,
      tokens: 0,
      outcome: "ok" as const,
      durationMs: Date.now() - t0,
      userId,
      meta: {
        connectionCount: connections.length,
        digestCount: digestSummaries.length,
        // never log raw samples
      },
    };
    await logCapabilityUsage(usage);
    return {
      ok: true,
      data,
      usage,
      marshallGateRequired: false,
      marshallApproved: true,
    };
  } catch (err) {
    const usage = {
      agent: String(agent),
      capability: "health_platform" as const,
      queryShape,
      credits: 0,
      tokens: 0,
      outcome: "failed" as const,
      reason: err instanceof Error ? err.message : "health_error",
      durationMs: Date.now() - t0,
      userId,
    };
    await logCapabilityUsage(usage);
    return {
      ok: false,
      reason: usage.reason,
      usage,
      marshallGateRequired: false,
      marshallApproved: true,
    };
  }
}
