// Prompt 201b: Google Health webhook. On a verified notification it pulls the
// changed window through the sync orchestrator and routes it to the domain
// stores. Reuses the integrations webhook pattern (timeouts, structured logging,
// connection lookup) with the real pull added.
//
// Signature scheme (developers.google.com/health/webhooks): the raw JSON body is
// signed with ECDSA P-256 (SHA-256) via Tink and verified against Google's public
// keyset (see webhook-signature.ts). On a verified notification the handler pulls
// the changed window and ingests; an unverified one is acknowledged with 204 and
// takes NO action, with polling (every 6 hours) as the safety net. The verifier
// brute-forces the small space of signature header name and Tink/DER encoding and
// never false-accepts, so the first real notification self-validates in staging
// (GOOGLE_HEALTH_CAPTURE=true logs the raw header and body to assist).
//
// The notification payload carries healthUserId (the account whose data changed),
// dataType, operation, clientProvidedSubscriptionName, and intervals. healthUserId
// is the per-user routing key, matched against body_tracker_connections.metadata.
//
// All comments use hyphens only. No em-dashes or en-dashes.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withTimeout } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { isFeatureEnabled } from "@/lib/config/feature-flags";
import { GOOGLE_HEALTH_SOURCE_ID } from "@/lib/integrations/google-health/config";
import { syncConnection, type ConnectionRow } from "@/lib/integrations/google-health/sync";
import { verifyGoogleHealthWebhook } from "@/lib/integrations/google-health/webhook-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SCOPE = "api.integrations.google-health.webhook";

function readSignatureHeader(req: NextRequest): string | null {
  return (
    req.headers.get("x-healthapi-signature") ??
    req.headers.get("google-health-api-signature") ??
    req.headers.get("x-goog-signature") ??
    null
  );
}

// Capture instrumentation for the staging validation pass. When
// GOOGLE_HEALTH_CAPTURE=true, log the header names and the raw body of a
// notification so the exact signature header and payload are confirmed against a
// real Google notification. Non-signature header values are truncated.
function captureIfEnabled(req: NextRequest, rawBody: string): void {
  if (process.env.GOOGLE_HEALTH_CAPTURE !== "true") return;
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k] = k.toLowerCase().includes("signature") ? v : v.slice(0, 64);
  });
  safeLog.info(SCOPE, "capture: webhook received", { headers, body: rawBody.slice(0, 2000) });
}

// True only when the ECDSA P-256 signature over rawBody verifies against Google's
// keyset. Fail-closed on any gap (polling still ingests); never false-accepts.
async function verifyWebhookSignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const sig = readSignatureHeader(req);
  if (!sig) {
    safeLog.warn(SCOPE, "missing signature header", {});
    return false;
  }
  return verifyGoogleHealthWebhook(sig, rawBody);
}

export async function POST(req: NextRequest) {
  // Always read the body so logging has the payload context.
  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    // non-JSON body; nothing to route
  }
  const healthUserId = typeof payload.healthUserId === "string" ? payload.healthUserId : null;

  if (!isFeatureEnabled("google_health_connector")) {
    return new NextResponse(null, { status: 204 });
  }

  captureIfEnabled(req, rawBody);

  const verified = await verifyWebhookSignature(req, rawBody);
  if (!verified) {
    // Acknowledge without acting; polling ingests. See file header.
    return new NextResponse(null, { status: 204 });
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
          .limit(50))(),
      8000,
      `${SCOPE}.lookup`,
    );

    const connections = (rows as ConnectionRow[] | null) ?? [];
    // Prefer the connection whose stored healthUserId matches the payload; fall
    // back to the single active connection.
    let target: ConnectionRow | null = null;
    if (healthUserId) {
      target =
        connections.find(
          (c) => (c.metadata as { health_user_id?: string } | null)?.health_user_id === healthUserId,
        ) ?? null;
    }
    if (!target && connections.length === 1) target = connections[0];

    if (!target) {
      safeLog.info(SCOPE, "no matching connection; deferring to polling", {
        count: connections.length,
        hasHealthUserId: Boolean(healthUserId),
      });
      return new NextResponse(null, { status: 204 });
    }

    const summary = await syncConnection(admin, target, 2);
    safeLog.info(SCOPE, "webhook sync complete", { summary });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    safeLog.error(SCOPE, "webhook handler error", { error: err });
    // Acknowledge so the provider does not hammer retries; polling is the safety net.
    return new NextResponse(null, { status: 204 });
  }
}
