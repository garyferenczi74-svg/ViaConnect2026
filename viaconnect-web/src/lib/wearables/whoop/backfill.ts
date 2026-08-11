// Prompt 212: 90-day WHOOP backfill through wearable_events path.

import type { SupabaseClient } from "@supabase/supabase-js";
import { withTimeout } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { whoopGet } from "./client";
import { getWhoopAccessToken } from "./tokens";

const SCOPE = "lib.wearables.whoop.backfill";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = SupabaseClient<any, "public", any>;

interface CollectionPage {
  records?: Array<Record<string, unknown>>;
  next_token?: string | null;
}

async function enqueue(
  admin: Admin,
  userId: string,
  eventType: string,
  externalId: string,
  payload: unknown,
  recordedAt: string | null,
) {
  const { error } = await withTimeout(
    (admin as any).from("wearable_events").upsert(
      {
        user_id: userId,
        provider: "whoop",
        event_type: eventType,
        external_id: externalId,
        payload,
        recorded_at: recordedAt,
        processing_status: "pending",
      },
      { onConflict: "provider,external_id,event_type", ignoreDuplicates: true },
    ),
    4000,
    `${SCOPE}.enqueue`,
  );
  if (error) safeLog.warn(SCOPE, "enqueue failed", { error, eventType });
}

async function paginate(
  admin: Admin,
  userId: string,
  access: string,
  path: string,
  eventType: string,
  idKey: string,
) {
  let next: string | null | undefined = null;
  let pages = 0;
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 90);
  const startIso = start.toISOString();

  do {
    const qs = new URLSearchParams({ limit: "25", start: startIso });
    if (next) qs.set("nextToken", next);
    const page = await whoopGet<CollectionPage>(`${path}?${qs.toString()}`, access);
    if (!page) break;
    for (const rec of page.records ?? []) {
      const id = String(rec[idKey] ?? rec.id ?? "");
      if (!id) continue;
      await enqueue(
        admin,
        userId,
        eventType,
        id,
        rec,
        typeof rec.start === "string"
          ? rec.start
          : typeof rec.created_at === "string"
            ? rec.created_at
            : null,
      );
    }
    next = page.next_token ?? null;
    pages += 1;
    if (pages > 40) break; // safety cap
    // Mild backoff to respect rate limits
    await new Promise((r) => setTimeout(r, 150));
  } while (next);
}

export async function enqueueWhoopBackfill(admin: Admin, userId: string): Promise<void> {
  const access = await getWhoopAccessToken(admin, userId);
  if (!access) {
    safeLog.warn(SCOPE, "no access token for backfill", {});
    return;
  }
  try {
    await paginate(admin, userId, access, "/activity/sleep", "sleep.updated", "id");
    await paginate(admin, userId, access, "/activity/workout", "workout.updated", "id");
    await paginate(admin, userId, access, "/recovery", "recovery.updated", "cycle_id");
  } catch (err) {
    safeLog.error(SCOPE, "backfill failed", { error: err });
  }
}
