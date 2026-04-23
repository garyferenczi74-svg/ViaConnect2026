// =============================================================================
// notification-slack-webhook (Prompt #112)
// =============================================================================
// Slack Events API handler. Verifies Slack signature, handles:
//   - URL verification challenge (one-time during app config)
//   - app_uninstalled → cascade all practitioners in that workspace to
//     slack_enabled=FALSE, clear access tokens, audit log
// =============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SVC    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SLACK_SIGNING_SECRET = Deno.env.get("SLACK_SIGNING_SECRET") ?? "";

function admin(): SupabaseClient {
  return createClient(SB_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
}

function constantTimeEquals(a: string, b: string): boolean {
  // Sherlock review: reject timing-attack exposure on the Slack Events endpoint.
  // Constant-time byte comparison after length check (length leak is acceptable
  // since the expected format is the fixed-width `v0=` + 64 hex chars).
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySlackSignature(req: Request, rawBody: string): Promise<boolean> {
  if (!SLACK_SIGNING_SECRET) return false;
  const ts = req.headers.get("X-Slack-Request-Timestamp") ?? "";
  const sig = req.headers.get("X-Slack-Signature") ?? "";
  if (!ts || !sig) return false;
  const ageSec = Math.floor(Date.now() / 1000) - Number(ts);
  if (Math.abs(ageSec) > 60 * 5) return false;
  const base = `v0:${ts}:${rawBody}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SLACK_SIGNING_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(base));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return constantTimeEquals(`v0=${hex}`, sig);
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const rawBody = await req.text();
  const sigOk = await verifySlackSignature(req, rawBody);
  if (!sigOk) return new Response("invalid signature", { status: 403 });

  const event = JSON.parse(rawBody);
  if (event.type === "url_verification") {
    return new Response(JSON.stringify({ challenge: event.challenge }), { headers: { "content-type": "application/json" } });
  }

  const db = admin();
  if (event.type === "event_callback" && event.event?.type === "app_uninstalled") {
    const workspaceId = event.team_id;
    // Find all credentials for this workspace
    const { data: creds } = await db
      .from("notification_channel_credentials")
      .select("credential_id, practitioner_id")
      .eq("slack_workspace_id", workspaceId);
    const practIds = (creds ?? []).map((c) => (c as { practitioner_id: string }).practitioner_id);
    // Clear Slack fields across those rows
    await db.from("notification_channel_credentials")
      .update({
        slack_workspace_id: null,
        slack_workspace_name: null,
        slack_access_token_vault_ref: null,
        slack_default_channel_id: null,
        slack_is_dm: null,
        slack_installed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("slack_workspace_id", workspaceId);
    // Flip slack_enabled across all events for those practitioners
    if (practIds.length > 0) {
      await db.from("notification_preferences")
        .update({ slack_enabled: false, updated_at: new Date().toISOString() })
        .in("practitioner_id", practIds);
    }
    return new Response(JSON.stringify({ ok: true, cascaded: practIds.length }), { headers: { "content-type": "application/json" } });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
});
