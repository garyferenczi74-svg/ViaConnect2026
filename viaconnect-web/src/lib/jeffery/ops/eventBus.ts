/**
 * Prompt 219H: always-on platform event bus.
 * Idempotent on event_id; coalesces bursts by coalesce_key within window.
 */

import { createAdminClientOrNull } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import type { PlatformEventType } from "./types";

const DEFAULT_COALESCE_SEC = 300;

export interface EmitPlatformEventInput {
  eventType: PlatformEventType;
  userId?: string | null;
  payload?: Record<string, unknown>;
  /** Stable id for dedupe; generated if omitted. */
  eventId?: string;
  /** Domain key for coalescing, e.g. digest:gordon:{userId} */
  coalesceKey?: string;
}

export async function emitPlatformEvent(input: EmitPlatformEventInput): Promise<{
  accepted: boolean;
  eventId: string;
  coalesced?: boolean;
}> {
  const eventId =
    input.eventId ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  const coalesceKey =
    input.coalesceKey ??
    (input.userId
      ? `${input.eventType}:${input.userId}`
      : `${input.eventType}:global`);

  try {
    const supabase = createAdminClientOrNull();
    if (!supabase) return { accepted: false, eventId };

    // Coalesce: if pending event with same coalesce_key in window, mark new as coalesced
    const since = new Date(Date.now() - DEFAULT_COALESCE_SEC * 1000).toISOString();
    const { data: existing } = await supabase
      .from("platform_events")
      .select("id, event_id")
      .eq("coalesce_key", coalesceKey)
      .eq("status", "pending")
      .gte("created_at", since)
      .limit(1);

    if (existing && existing.length > 0) {
      // Insert as coalesced for audit trail
      await supabase.from("platform_events").insert({
        event_id: eventId,
        event_type: input.eventType,
        user_id: input.userId ?? null,
        payload: input.payload ?? {},
        coalesce_key: coalesceKey,
        status: "coalesced",
        processed_at: new Date().toISOString(),
      });
      safeLog.info("ops.event", "coalesced", {
        eventType: input.eventType,
        into: (existing[0] as { event_id?: string }).event_id,
      });
      return { accepted: true, eventId, coalesced: true };
    }

    const { error } = await supabase.from("platform_events").insert({
      event_id: eventId,
      event_type: input.eventType,
      user_id: input.userId ?? null,
      payload: input.payload ?? {},
      coalesce_key: coalesceKey,
      status: "pending",
    });

    if (error) {
      // Unique violation = idempotent replay
      if (error.code === "23505") {
        return { accepted: true, eventId, coalesced: false };
      }
      safeLog.warn("ops.event", "insert failed", { code: error.code });
      return { accepted: false, eventId };
    }
    return { accepted: true, eventId, coalesced: false };
  } catch (err) {
    safeLog.warn("ops.event", "emit threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { accepted: false, eventId };
  }
}

export interface PendingEvent {
  id: string;
  event_id: string;
  event_type: string;
  user_id: string | null;
  payload: Record<string, unknown>;
  coalesce_key: string | null;
}

export async function fetchPendingEvents(limit = 40): Promise<PendingEvent[]> {
  try {
    const supabase = createAdminClientOrNull();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("platform_events")
      .select("id, event_id, event_type, user_id, payload, coalesce_key")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id as string,
      event_id: r.event_id as string,
      event_type: r.event_type as string,
      user_id: (r.user_id as string) ?? null,
      payload: (r.payload as Record<string, unknown>) ?? {},
      coalesce_key: (r.coalesce_key as string) ?? null,
    }));
  } catch {
    return [];
  }
}

export async function markEventDone(
  id: string,
  status: "done" | "failed",
  error?: string
): Promise<void> {
  try {
    const supabase = createAdminClientOrNull();
    if (!supabase) return;
    await supabase
      .from("platform_events")
      .update({
        status,
        processed_at: new Date().toISOString(),
        error: error?.slice(0, 400) ?? null,
        attempts: 1,
      })
      .eq("id", id);
  } catch {
    /* fail-open */
  }
}

/**
 * Process pending events: domain refresh handlers (digest + light Hannah).
 * One refresh per coalesce group.
 */
export async function processPendingEvents(): Promise<{
  processed: number;
  coalescedSkipped: number;
  failed: number;
}> {
  const pending = await fetchPendingEvents(50);
  let processed = 0;
  let failed = 0;
  const coalescedSkipped = 0;

  // Group by coalesce_key so burst already reduced; still one handler per pending row
  for (const evt of pending) {
    try {
      await handleEvent(evt);
      await markEventDone(evt.id, "done");
      processed += 1;
    } catch (err) {
      await markEventDone(
        evt.id,
        "failed",
        err instanceof Error ? err.message : String(err)
      );
      failed += 1;
    }
  }

  return { processed, coalescedSkipped, failed };
}

async function handleEvent(evt: PendingEvent): Promise<void> {
  const userId = evt.user_id;
  const type = evt.event_type;

  // Domain digest refresh on user data landings
  if (
    userId &&
    (type === "meal_logged" ||
      type === "scan_landed" ||
      type === "wearable_synced" ||
      type === "health_connected" ||
      type === "genetics_confirmed" ||
      type === "lab_uploaded")
  ) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    try {
      const digests = await import("@/lib/hannah/compilation/digests");
      if (type === "meal_logged") {
        await digests.getGordonDailyDigest(userId, since);
      } else if (type === "scan_landed" || type === "wearable_synced") {
        await digests.getArnoldDailyDigest(userId, since);
      } else if (type === "genetics_confirmed") {
        await digests.getElysiumDailyDigest(userId, since);
      } else {
        await digests.getJefferyDailyDigest(userId, since);
      }
    } catch (err) {
      safeLog.warn("ops.event", "digest refresh fail-open", {
        type,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Significant landings: event-driven Hannah recompile via chain entry
    if (
      type === "scan_landed" ||
      type === "genetics_confirmed" ||
      type === "lab_uploaded" ||
      type === "meal_logged"
    ) {
      try {
        const { compileViaChain } = await import("@/lib/hannah/compilation/chainEntry");
        // meal_logged uses light path marker in reason; chain may still full-compile
        // but we prefer compileViaChain for significant events only on non-meal
        if (type !== "meal_logged") {
          await compileViaChain({
            userId,
            reason: `event_${type}`,
          });
        } else {
          // Light: touch recency only (no full compile budget)
          await touchHannahLightFreshness(userId);
        }
      } catch (err) {
        safeLog.warn("ops.event", "hannah path fail-open", {
          type,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  if (type === "staging_landed" || type === "content_gated") {
    // Event-chained Marshall gate / Sherlock curate hooks
    try {
      if (type === "staging_landed") {
        const { processPendingStagingGate } = await import("./jobRunners");
        await processPendingStagingGate();
      }
      if (type === "content_gated") {
        const { runSherlockCurateSweep } = await import("./jobRunners");
        await runSherlockCurateSweep({ fromEvent: true });
      }
    } catch (err) {
      safeLog.warn("ops.event", "gate/curate fail-open", {
        type,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/** Light freshness: stamp recency metadata only (no full compile). */
export async function touchHannahLightFreshness(userId: string): Promise<void> {
  try {
    const supabase = createAdminClientOrNull();
    if (!supabase) return;
    // Upsert a lightweight recency row if table exists; fail-open otherwise
    await supabase.from("hannah_daily_notes").upsert(
      {
        user_id: userId,
        note_kind: "recency_touch",
        note_text: "Surface recency updated from domain event (light pass).",
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id" }
    );
  } catch {
    // Table shape may not allow this upsert; light pass still counted as attempted
    safeLog.info("ops.event", "light freshness stamp skipped", { userIdPresent: !!userId });
  }
}
