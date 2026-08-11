// Prompt 212: POST /api/integrations/whoop/webhook (public, signature validated)

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withTimeout } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { getWhoopCreds } from "@/lib/wearables/whoop/config";
import { validateWhoopWebhookSignature } from "@/lib/wearables/whoop/webhook-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE = "api.integrations.whoop.webhook";

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    const creds = getWhoopCreds();
    if (!creds) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }

    const rawBody = await req.text();
    const ok = validateWhoopWebhookSignature(rawBody, req.headers, creds.clientSecret);
    if (!ok) {
      safeLog.warn(SCOPE, "invalid signature", {});
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    let payload: {
      user_id?: number | string;
      id?: string;
      type?: string;
      trace_id?: string;
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const eventType = String(payload.type ?? "unknown");
    const externalId = String(payload.id ?? payload.trace_id ?? `${eventType}:${Date.now()}`);
    const whoopUserId = payload.user_id != null ? String(payload.user_id) : null;

    const admin = createAdminClient();

    // Map WHOOP user to our user via connected_sources.external_user_id
    let userId: string | null = null;
    if (whoopUserId) {
      const { data } = await withTimeout(
        (admin as any)
          .from("connected_sources")
          .select("user_id")
          .eq("provider", "whoop")
          .eq("external_user_id", whoopUserId)
          .eq("status", "connected")
          .maybeSingle(),
        3000,
        `${SCOPE}.resolveUser`,
      );
      userId = data?.user_id ?? null;
    }

    if (!userId) {
      // Accept but cannot process without user mapping
      safeLog.warn(SCOPE, "unmapped whoop user", { hasWhoopUser: Boolean(whoopUserId) });
      return NextResponse.json({ ok: true, deferred: true });
    }

    const { error } = await withTimeout(
      (admin as any).from("wearable_events").upsert(
        {
          user_id: userId,
          provider: "whoop",
          event_type: eventType,
          external_id: externalId,
          payload,
          recorded_at: new Date().toISOString(),
          processing_status: "pending",
        },
        { onConflict: "provider,external_id,event_type", ignoreDuplicates: true },
      ),
      3000,
      `${SCOPE}.insertEvent`,
    );

    if (error) {
      safeLog.warn(SCOPE, "insert failed", { error });
      // Still 200 to avoid WHOOP retry storms when duplicate/constraint
    }

    const ms = Date.now() - started;
    if (ms > 2800) {
      safeLog.warn(SCOPE, "slow webhook", { ms });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    safeLog.error(SCOPE, "webhook failed", { error: err });
    // Fail open with 200 so WHOOP does not disable the endpoint on transient errors
    return NextResponse.json({ ok: true, soft_fail: true });
  }
}
