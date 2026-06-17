// Prompt 201b: Google Health webhook. Verifies the signature, then pulls the
// changed window through the sync orchestrator and routes it to the domain
// stores. Mirrors the existing integrations webhook pattern (timeouts, structured
// logging, data_source_connections lookup) with the real pull added.
//
// The webhook signature scheme and the per-account payload identifier are
// PROVISIONAL until verified against live Google Health docs. Account-to-user
// mapping for the multi-user case is a documented staging follow-up; today the
// handler resolves the single active connection and otherwise defers to polling.
//
// All comments use hyphens only. No em-dashes or en-dashes.

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { withTimeout } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { isFeatureEnabled } from "@/lib/config/feature-flags";
import { GOOGLE_HEALTH_SOURCE_ID } from "@/lib/integrations/google-health/config";
import { syncConnection, type ConnectionRow } from "@/lib/integrations/google-health/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SCOPE = "api.integrations.google-health.webhook";

// PROVISIONAL signature check. When GOOGLE_HEALTH_WEBHOOK_SECRET is set we accept
// either a matching channel token header or an HMAC-SHA256 of the raw body. Fails
// CLOSED when no secret is configured: without it this endpoint would be an
// unauthenticated trigger of a service-role sync, so GOOGLE_HEALTH_WEBHOOK_SECRET
// is required before the connector flag is turned on.
function verifySignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.GOOGLE_HEALTH_WEBHOOK_SECRET;
  if (!secret) {
    safeLog.warn(SCOPE, "no webhook secret configured; rejecting", {});
    return false;
  }

  const channelToken = req.headers.get("x-goog-channel-token");
  if (channelToken && channelToken === secret) return true;

  const sig = req.headers.get("x-goog-signature") ?? req.headers.get("x-webhook-signature");
  if (!sig) return false;
  try {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!isFeatureEnabled("google_health_connector")) {
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  }

  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "no body" }, { status: 400 });
  }

  if (!verifySignature(req, rawBody)) {
    safeLog.warn(SCOPE, "signature rejected", {});
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
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
          .limit(25))(),
      8000,
      `${SCOPE}.lookup`,
    );

    const connections = (rows as ConnectionRow[] | null) ?? [];
    if (connections.length === 0) {
      return NextResponse.json({ status: "no_connection" }, { status: 200 });
    }
    if (connections.length > 1) {
      // Without a verified per-account identifier we do not know which user this
      // event belongs to; polling will pick up the change. Documented follow-up.
      safeLog.info(SCOPE, "multiple active connections; deferring to polling", { count: connections.length });
      return NextResponse.json({ status: "deferred" }, { status: 202 });
    }

    const summary = await syncConnection(admin, connections[0], 2);
    safeLog.info(SCOPE, "webhook sync complete", { summary });
    return NextResponse.json({ status: "received", summary }, { status: 200 });
  } catch (err) {
    safeLog.error(SCOPE, "webhook handler error", { error: err });
    // Fail open with a 200 so the provider does not hammer retries; polling is
    // the safety net.
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}
