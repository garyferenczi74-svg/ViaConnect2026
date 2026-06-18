// Prompt 201b: Google Health sync. Two callers:
//   cron : Vercel attaches CRON_SECRET as a Bearer token; syncs every connection.
//   user : a logged-in user (session cookie) can trigger a sync of their OWN
//          connection by opening this route, useful right after connecting and
//          for a manual refresh. Scoped strictly to that user_id.
//
// The cron path must be in the middleware public-route allowlist or it is
// redirected to /login and silently never runs.
//
// All comments use hyphens only. No em-dashes or en-dashes.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { withTimeout } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { isFeatureEnabled } from "@/lib/config/feature-flags";
import { GOOGLE_HEALTH_SOURCE_ID } from "@/lib/integrations/google-health/config";
import { syncConnection, type ConnectionRow } from "@/lib/integrations/google-health/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SCOPE = "api.integrations.google-health.sync";
const BATCH = 200;

function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // no secret configured means do not run on the cron path
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

async function run(req: NextRequest) {
  // Cron mode (all connections) or user mode (the caller's own connection only).
  const isCron = cronAuthorized(req);
  let scopedUserId: string | null = null;
  if (!isCron) {
    try {
      const supabase = createClient();
      const { data } = await withTimeout(supabase.auth.getUser(), 5000, `${SCOPE}.auth`);
      scopedUserId = data?.user?.id ?? null;
    } catch {
      scopedUserId = null;
    }
    if (!scopedUserId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (!isFeatureEnabled("google_health_connector")) {
    return NextResponse.json({ status: "disabled" }, { status: 200 });
  }

  try {
    const admin = createAdminClient();
    let query = (admin as unknown as { from: (t: string) => any })
      .from("body_tracker_connections")
      .select("id, user_id, metadata")
      .eq("source_id", GOOGLE_HEALTH_SOURCE_ID)
      .eq("status", "connected");
    query = scopedUserId ? query.eq("user_id", scopedUserId) : query.limit(BATCH);
    const { data: rows } = await withTimeout((async () => query)(), 8000, `${SCOPE}.lookup`);

    const connections = (rows as ConnectionRow[] | null) ?? [];
    // No silent cap on the cron path: a full batch means more connections exist
    // than this run covered; the next scheduled run picks them up.
    if (!scopedUserId && connections.length === BATCH) {
      safeLog.warn(SCOPE, "connection batch saturated; remaining connections deferred to next run", { batch: BATCH });
    }

    // User-triggered syncs pull a wider first window so initial history appears.
    const sinceDays = scopedUserId ? 30 : 2;
    let synced = 0;
    const CONCURRENCY = 8;
    for (let i = 0; i < connections.length; i += CONCURRENCY) {
      const chunk = connections.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(chunk.map((conn) => syncConnection(admin, conn, sinceDays)));
      synced += results.filter((r) => r.status === "fulfilled" && r.value).length;
    }

    safeLog.info(SCOPE, "sync run complete", {
      mode: scopedUserId ? "user" : "cron",
      connections: connections.length,
      synced,
    });
    return NextResponse.json({
      status: "ok",
      mode: scopedUserId ? "user" : "cron",
      connections: connections.length,
      synced,
    });
  } catch (err) {
    safeLog.error(SCOPE, "sync run failed", { error: err });
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
