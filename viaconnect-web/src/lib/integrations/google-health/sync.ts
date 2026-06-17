// Prompt 201b: sync orchestrator. Shared by the webhook handler (pull the
// changed window) and the polling fallback (pull a recent window on a schedule).
// Pulls every enabled data type for a connection, routes the readings to their
// domain stores, and refreshes the last-sync timestamps the UI reads.
//
// All comments use hyphens only. No em-dashes or en-dashes.

import type { SupabaseClient } from "@supabase/supabase-js";
import { withTimeout } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { GOOGLE_HEALTH_SOURCE_ID, ENABLED_DOMAINS, dataTypesForDomains } from "./config";
import { getValidAccessToken, type ConnectionRow } from "./auth";
import { fetchDataTypeReadings, type ReadingRecord } from "./client";
import { ingestReadings, type IngestSummary } from "./ingest";

const SCOPE = "lib.integrations.google-health.sync";

export type { ConnectionRow };

async function touchTimestamps(admin: SupabaseClient, userId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  // body_tracker_connections is the single connection store and drives the
  // Connected Sources "last synced" line.
  try {
    await withTimeout(
      (async () =>
        (admin as unknown as { from: (t: string) => any })
          .from("body_tracker_connections")
          .update({ last_sync_at: nowIso, updated_at: nowIso })
          .eq("user_id", userId)
          .eq("source_id", GOOGLE_HEALTH_SOURCE_ID))(),
      5000,
      `${SCOPE}.touch-conn`,
    );
  } catch (err) {
    safeLog.warn(SCOPE, "touch body_tracker_connections failed", { error: err, userId });
  }
}

export async function syncConnection(
  admin: SupabaseClient,
  conn: ConnectionRow,
  sinceDays = 2,
): Promise<IngestSummary | null> {
  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(admin, conn);
  } catch (err) {
    safeLog.warn(SCOPE, "no valid token; skipping", { error: err, connectionId: conn.id });
    return null;
  }

  const until = new Date();
  const since = new Date(until.getTime() - sinceDays * 86_400_000);

  // Data-type pulls are independent reads; fetch them concurrently. Each call
  // fails open to an empty array, so Promise.all never rejects here.
  const types = dataTypesForDomains(ENABLED_DOMAINS);
  const batches = await Promise.all(
    types.map((dt) => fetchDataTypeReadings(accessToken, dt, since, until)),
  );
  const all: ReadingRecord[] = batches.flat();

  const summary = await ingestReadings(admin, conn.user_id, all);
  await touchTimestamps(admin, conn.user_id);
  return summary;
}
