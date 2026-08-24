// Prompt 212: process pending wearable_events into normalized tables.

import type { SupabaseClient } from "@supabase/supabase-js";
import { withTimeout } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { getWhoopAccessToken } from "./whoop/tokens";
import { whoopGet } from "./whoop/client";
import {
  normalizeWhoopRecovery,
  normalizeWhoopSleep,
  normalizeWhoopWorkout,
} from "./whoop/normalize";
import {
  extractBodyComposition,
  extractSleepSessions,
  groupDailyVitals,
  type HealthBatch,
} from "./normalize-health";
import { getOuraAccessToken } from "./oura/tokens";
import { ouraGet } from "./oura/client";
import { normalizeOuraRecovery, normalizeOuraSleep } from "./oura/normalize";

const SCOPE = "lib.wearables.processor";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = SupabaseClient<any, "public", any>;

export async function processPendingEvents(
  admin: Admin,
  limit = 20,
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  const { data: events, error } = await withTimeout(
    (admin as any)
      .from("wearable_events")
      .select("id, user_id, provider, event_type, external_id, payload")
      .eq("processing_status", "pending")
      .order("received_at", { ascending: true })
      .limit(limit),
    4000,
    `${SCOPE}.listPending`,
  );

  if (error || !events?.length) {
    if (error) safeLog.warn(SCOPE, "list pending failed", { error });
    return { processed, failed };
  }

  for (const ev of events) {
    try {
      await processOne(admin, ev);
      await mark(admin, ev.id, "processed");
      processed += 1;
    } catch (err) {
      safeLog.warn(SCOPE, "process failed", { error: err, eventId: ev.id });
      await mark(admin, ev.id, "failed");
      failed += 1;
    }
  }
  return { processed, failed };
}

async function mark(admin: Admin, id: string, status: "processed" | "failed" | "duplicate") {
  await withTimeout(
    (admin as any)
      .from("wearable_events")
      .update({ processing_status: status })
      .eq("id", id),
    3000,
    `${SCOPE}.mark`,
  );
}

interface WearableEventRow {
  id: string;
  user_id: string;
  provider: string;
  event_type: string;
  external_id: string;
  payload: Record<string, unknown> | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processOne(admin: Admin, ev: any): Promise<void> {
  if (ev.provider === "whoop") {
    await processWhoop(admin, ev);
    return;
  }
  if (ev.provider === "oura") {
    await processOura(admin, ev as WearableEventRow);
    return;
  }
  if (ev.provider === "health_kit" || ev.provider === "health_connect") {
    await processHealthBatch(admin, ev);
    return;
  }
}

async function processOura(admin: Admin, ev: WearableEventRow): Promise<void> {
  const type = String(ev.event_type || "");
  const isDelete = type.endsWith(".deleted") || type === "delete";
  const isReadiness = type.includes("readiness") || type.includes("recovery");
  const isSleep = type.includes("sleep");

  if (isDelete) {
    const table = isReadiness ? "wearable_recovery" : isSleep ? "wearable_sleep_sessions" : null;
    if (table) {
      await withTimeout(
        admin
          .from(table)
          .update({ deleted_at: new Date().toISOString() })
          .eq("source_provider", "oura")
          .eq("external_id", ev.external_id),
        4000,
        `${SCOPE}.ouraSoftDelete`,
      );
    }
    return;
  }

  let payload: Record<string, unknown> | null = ev.payload;
  const access = await getOuraAccessToken(admin, ev.user_id);
  if (access && (!payload || !payload.id)) {
    const path = isReadiness
      ? `/usercollection/daily_readiness/${ev.external_id}`
      : `/usercollection/${type.includes("daily_sleep") ? "daily_sleep" : "sleep"}/${ev.external_id}`;
    const fetched = await ouraGet<Record<string, unknown>>(path, access);
    if (fetched) payload = fetched;
  }
  if (!payload) {
    throw new Error("missing oura payload");
  }

  if (isReadiness) {
    const row = normalizeOuraRecovery(ev.user_id, payload);
    await withTimeout(
      admin.from("wearable_recovery").upsert(row, { onConflict: "source_provider,external_id" }),
      4000,
      `${SCOPE}.ouraRecovery`,
    );
    return;
  }

  if (isSleep) {
    const row = normalizeOuraSleep(ev.user_id, payload);
    if (!row.external_id || !row.start_at) throw new Error("invalid oura sleep");
    await withTimeout(
      admin.from("wearable_sleep_sessions").upsert(row, { onConflict: "source_provider,external_id" }),
      4000,
      `${SCOPE}.ouraSleep`,
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processWhoop(admin: Admin, ev: any): Promise<void> {
  const type = String(ev.event_type || "");
  const isDelete = type.endsWith(".deleted");
  const resource = type.split(".")[0]; // sleep | recovery | workout

  if (isDelete) {
    const table =
      resource === "sleep"
        ? "wearable_sleep_sessions"
        : resource === "recovery"
          ? "wearable_recovery"
          : resource === "workout"
            ? "wearable_workouts"
            : null;
    if (table) {
      await withTimeout(
        (admin as any)
          .from(table)
          .update({ deleted_at: new Date().toISOString() })
          .eq("source_provider", "whoop")
          .eq("external_id", ev.external_id),
        4000,
        `${SCOPE}.softDelete`,
      );
    }
    return;
  }

  // Prefer payload already attached; else fetch by UUID.
  let payload = ev.payload?.resource ?? ev.payload?.data ?? ev.payload;
  const access = await getWhoopAccessToken(admin, ev.user_id);
  if (access && (!payload || !payload.id)) {
    if (resource === "sleep") {
      payload = await whoopGet(`/activity/sleep/${ev.external_id}`, access);
    } else if (resource === "workout") {
      payload = await whoopGet(`/activity/workout/${ev.external_id}`, access);
    } else if (resource === "recovery") {
      // Recovery is often embedded; payload from webhook may be enough.
      payload = payload ?? (await whoopGet(`/recovery/${ev.external_id}`, access));
    }
  }
  if (!payload) {
    throw new Error("missing whoop payload");
  }

  if (resource === "sleep") {
    const row = normalizeWhoopSleep(ev.user_id, payload);
    if (!row.external_id || !row.start_at) throw new Error("invalid sleep");
    await withTimeout(
      (admin as any)
        .from("wearable_sleep_sessions")
        .upsert(row, { onConflict: "source_provider,external_id" }),
      4000,
      `${SCOPE}.upsertSleep`,
    );
  } else if (resource === "recovery") {
    const row = normalizeWhoopRecovery(ev.user_id, payload);
    await withTimeout(
      (admin as any)
        .from("wearable_recovery")
        .upsert(row, { onConflict: "source_provider,external_id" }),
      4000,
      `${SCOPE}.upsertRecovery`,
    );
  } else if (resource === "workout") {
    const row = normalizeWhoopWorkout(ev.user_id, payload);
    if (!row.start_at) throw new Error("invalid workout");
    await withTimeout(
      (admin as any)
        .from("wearable_workouts")
        .upsert(row, { onConflict: "source_provider,external_id" }),
      4000,
      `${SCOPE}.upsertWorkout`,
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processHealthBatch(admin: Admin, ev: any): Promise<void> {
  const batch = ev.payload as HealthBatch;
  const samples = Array.isArray(batch?.samples) ? batch.samples : [];
  const provider = ev.provider as "health_kit" | "health_connect";

  const vitals = groupDailyVitals(ev.user_id, provider, samples);
  for (const row of vitals) {
    await withTimeout(
      (admin as any)
        .from("wearable_daily_vitals")
        .upsert(row, { onConflict: "user_id,source_provider,metric_date" }),
      4000,
      `${SCOPE}.upsertVitals`,
    );
  }

  const body = extractBodyComposition(ev.user_id, provider, samples);
  for (const row of body) {
    await withTimeout(
      (admin as any).from("wearable_body_composition").upsert(row, {
        onConflict: "source_provider,external_id",
        ignoreDuplicates: false,
      }),
      4000,
      `${SCOPE}.upsertBody`,
    );
  }

  const sleeps = extractSleepSessions(ev.user_id, provider, samples);
  for (const row of sleeps) {
    await withTimeout(
      (admin as any)
        .from("wearable_sleep_sessions")
        .upsert(row, { onConflict: "source_provider,external_id" }),
      4000,
      `${SCOPE}.upsertHealthSleep`,
    );
  }

  await withTimeout(
    (admin as any)
      .from("connected_sources")
      .update({
        last_sync_at: new Date().toISOString(),
        status: "connected",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", ev.user_id)
      .eq("provider", provider),
    3000,
    `${SCOPE}.touchSource`,
  );
}
