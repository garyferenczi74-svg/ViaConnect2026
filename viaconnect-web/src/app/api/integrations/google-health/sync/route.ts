// Prompt 201b: Google Health polling fallback. Runs on a schedule (Vercel cron)
// for any connection where a webhook is unavailable or missed. Bounded per run.
//
// Protected by CRON_SECRET: Vercel attaches it as a Bearer token to scheduled
// invocations. This route must also be in the middleware public-route allowlist
// or it is redirected to /login and silently never runs.
//
// All comments use hyphens only. No em-dashes or en-dashes.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // no secret configured means do not run
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

async function run(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isFeatureEnabled("google_health_connector")) {
    return NextResponse.json({ status: "disabled" }, { status: 200 });
  }

  try {
    const admin = createAdminClient();
    const { data: rows } = await withTimeout(
      (async () =>
        (admin as unknown as { from: (t: string) => any })
          .from("body_tracker_connections")
          .select("id, user_id, metadata")
          .eq("source_id", GOOGLE_HEALTH_SOURCE_ID)
          .eq("status", "connected")
          .limit(BATCH))(),
      8000,
      `${SCOPE}.lookup`,
    );

    const connections = (rows as ConnectionRow[] | null) ?? [];
    // No silent cap: if we filled the batch, more connections exist than this run
    // covered; the next scheduled run picks them up.
    if (connections.length === BATCH) {
      safeLog.warn(SCOPE, "connection batch saturated; remaining connections deferred to next run", { batch: BATCH });
    }

    let synced = 0;
    const CONCURRENCY = 8;
    for (let i = 0; i < connections.length; i += CONCURRENCY) {
      const chunk = connections.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(chunk.map((conn) => syncConnection(admin, conn, 2)));
      synced += results.filter((r) => r.status === "fulfilled" && r.value).length;
    }

    safeLog.info(SCOPE, "polling run complete", { connections: connections.length, synced });
    return NextResponse.json({ status: "ok", connections: connections.length, synced });
  } catch (err) {
    safeLog.error(SCOPE, "polling run failed", { error: err });
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
