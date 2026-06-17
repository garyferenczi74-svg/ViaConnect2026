// Prompt 201b: Google Health webhook. On a verified notification it pulls the
// changed window through the sync orchestrator and routes it to the domain
// stores. Reuses the integrations webhook pattern (timeouts, structured logging,
// connection lookup) with the real pull added.
//
// Signature scheme (verified 2026-06-16, developers.google.com/health/webhooks):
// the raw JSON body is signed with ECDSA P-256 (SHA-256) via Tink's PublicKeySign
// and verified against Google's public keyset at the gstatic URL below (Tink
// keyset JSON, keys rotate about every 30 days). The exact signature header name
// and the Tink keyset / signature-prefix encoding must be confirmed against the
// first real notification, so verification is not yet finalized: the handler
// acknowledges every call with 204 but takes NO action on the unverified payload,
// and polling (every 6 hours) performs the actual ingestion. Acknowledging
// without acting is safe (we never act on unverified input) and avoids Google
// disabling the subscription on repeated rejects. Once the encoding is confirmed
// this flips to verify-then-sync.
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SCOPE = "api.integrations.google-health.webhook";

const GOOGLE_HEALTH_WEBHOOK_KEYSET_URL =
  "https://www.gstatic.com/googlehealthapi/webhooks/webhooks_public_keyset.json";

function readSignatureHeader(req: NextRequest): string | null {
  return (
    req.headers.get("x-healthapi-signature") ??
    req.headers.get("google-health-api-signature") ??
    req.headers.get("x-goog-signature") ??
    null
  );
}

// Returns true only when the ECDSA P-256 signature over rawBody verifies against
// Google's keyset. Not yet finalized (see file header): fails closed until the
// header name and Tink encoding are confirmed against a real notification.
async function verifyWebhookSignature(req: NextRequest, _rawBody: string): Promise<boolean> {
  const sig = readSignatureHeader(req);
  if (!sig) {
    safeLog.warn(SCOPE, "missing signature header", {});
    return false;
  }
  // TODO finalize: fetch the Tink keyset from GOOGLE_HEALTH_WEBHOOK_KEYSET_URL,
  // parse the EcdsaPublicKey (x, y), strip the 5-byte Tink signature prefix, and
  // verify ECDSA P-256 (SHA-256) over rawBody via Web Crypto. Until confirmed we
  // fail closed and rely on polling.
  safeLog.warn(SCOPE, "ECDSA webhook verification not yet finalized; deferring to polling", {
    keyset: GOOGLE_HEALTH_WEBHOOK_KEYSET_URL,
  });
  return false;
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
