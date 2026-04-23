// =============================================================================
// notification-sms-inbound (Prompt #112)
// =============================================================================
// Twilio inbound SMS webhook. Handles:
//   - Verification code confirmation (step 2 of double-opt-in)
//   - YES reply (step 5 — opt-in accepted, sms_opt_in_completed_at set)
//   - STOP / UNSUBSCRIBE / CANCEL / END / QUIT — instantaneous opt-out
//   - HELP / INFO — auto-response with support info
//   - Any other inbound — logged, no-op
// =============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SVC    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";

const STOP_KEYWORDS = new Set(["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const HELP_KEYWORDS = new Set(["HELP", "INFO"]);

const HELP_RESPONSE = "ViaConnect practitioner support: support@viaconnectapp.com | https://viaconnectapp.com/help";
const OPT_OUT_CONFIRMATION = "You've opted out of ViaConnect SMS notifications. No further messages will be sent. Reply HELP for support.";
const OPT_IN_CONFIRMATION = "You're opted in to ViaConnect practitioner notifications. Reply STOP anytime to opt out.";

function admin(): SupabaseClient {
  return createClient(SB_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function verifyTwilioSignature(req: Request, rawBody: string): Promise<boolean> {
  if (!TWILIO_AUTH_TOKEN) return false;
  const signature = req.headers.get("X-Twilio-Signature");
  if (!signature) return false;
  const url = req.url;
  // Twilio signs URL + sorted key=value pairs of form body
  const params = new URLSearchParams(rawBody);
  const sorted = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  const concat = url + sorted.map(([k, v]) => k + v).join("");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(TWILIO_AUTH_TOKEN), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(concat));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return expected === signature;
}

function twimlResponse(text: string | null): Response {
  const xml = text
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${text}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new Response(xml, { status: 200, headers: { "content-type": "application/xml" } });
}

serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const rawBody = await req.text();
  const sigOk = await verifyTwilioSignature(req, rawBody);
  if (!sigOk) return new Response("invalid signature", { status: 403 });

  const params = new URLSearchParams(rawBody);
  const from = params.get("From") ?? "";
  const body = (params.get("Body") ?? "").trim();
  const messageSid = params.get("MessageSid") ?? "";
  // Michelangelo + Sherlock review: strip non-alphabetic punctuation so "STOP." / "stop!" / "Help?" match.
  const upperBody = body.toUpperCase().replace(/[^A-Z]/g, "");
  const db = admin();

  const { data: cred } = await db
    .from("notification_channel_credentials")
    .select("credential_id, practitioner_id, sms_pending_verification_code, sms_opt_in_completed_at")
    .eq("sms_phone_number", from).maybeSingle();
  if (!cred) return twimlResponse(null);
  const credTyped = cred as { credential_id: string; practitioner_id: string; sms_pending_verification_code: string | null; sms_opt_in_completed_at: string | null };

  // STOP — instantaneous opt-out, all events
  if (STOP_KEYWORDS.has(upperBody)) {
    await db.from("notification_channel_credentials")
      .update({ sms_opt_in_completed_at: null, updated_at: new Date().toISOString() })
      .eq("credential_id", credTyped.credential_id);
    await db.from("notification_preferences")
      .update({ sms_enabled: false, updated_at: new Date().toISOString() })
      .eq("practitioner_id", credTyped.practitioner_id);
    await db.from("notification_sms_opt_in_log").insert({
      practitioner_id: credTyped.practitioner_id, action: "opt_out_received",
      phone_number: from, message_sid: messageSid, reply_body: body,
    });
    return twimlResponse(OPT_OUT_CONFIRMATION);
  }

  // HELP — auto-response
  if (HELP_KEYWORDS.has(upperBody)) {
    await db.from("notification_sms_opt_in_log").insert({
      practitioner_id: credTyped.practitioner_id, action: "help_sent",
      phone_number: from, message_sid: messageSid, reply_body: body,
      message_body_sent: HELP_RESPONSE,
    });
    return twimlResponse(HELP_RESPONSE);
  }

  // Verification code reply (step 2) — if a code is pending and body matches
  if (credTyped.sms_pending_verification_code && body === credTyped.sms_pending_verification_code) {
    await db.from("notification_channel_credentials")
      .update({ sms_pending_verification_code: null, updated_at: new Date().toISOString() })
      .eq("credential_id", credTyped.credential_id);
    await db.from("notification_sms_opt_in_log").insert({
      practitioner_id: credTyped.practitioner_id, action: "verification_confirmed",
      phone_number: from, message_sid: messageSid, reply_body: body,
    });
    // Send compliant opt-in SMS (caller app will trigger this via a follow-up)
    return twimlResponse(null);
  }

  // YES — opt-in accepted (only after verification is confirmed)
  if (upperBody === "YES" && !credTyped.sms_pending_verification_code && !credTyped.sms_opt_in_completed_at) {
    const now = new Date().toISOString();
    await db.from("notification_channel_credentials")
      .update({ sms_opt_in_completed_at: now, updated_at: now })
      .eq("credential_id", credTyped.credential_id);
    await db.from("notification_sms_opt_in_log").insert({
      practitioner_id: credTyped.practitioner_id, action: "opt_in_accepted",
      phone_number: from, message_sid: messageSid, reply_body: body,
    });
    return twimlResponse(OPT_IN_CONFIRMATION);
  }

  // YES arriving before verification is confirmed, OR after an already-completed
  // opt-in: log as reactivation_attempted so TCPA defenders can later prove we
  // did NOT honour premature consent. No confirmation reply (silent to user).
  if (upperBody === "YES") {
    await db.from("notification_sms_opt_in_log").insert({
      practitioner_id: credTyped.practitioner_id, action: "reactivation_attempted",
      phone_number: from, message_sid: messageSid, reply_body: body,
    });
  }

  // Unrecognized — log and no-op
  return twimlResponse(null);
});
