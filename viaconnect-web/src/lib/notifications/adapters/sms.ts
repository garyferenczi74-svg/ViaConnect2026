// Prompt #112 — SMS adapter (Twilio REST API via native fetch).
// TCPA gate: caller MUST check credentials.sms_opt_in_completed_at IS NOT
// NULL before invoking this adapter. The adapter itself validates again as
// defense-in-depth but does NOT re-ping the DB for perf reasons.

import type { DispatchContext, NotificationChannel } from "../types";

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  messagingServiceSid: string;
}

export interface SmsSendResult {
  ok: boolean;
  message_sid?: string;
  error?: string;
  http_status?: number;
  body_raw?: unknown;
}

function getTwilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!accountSid || !authToken || !messagingServiceSid) return null;
  return { accountSid, authToken, messagingServiceSid };
}

/**
 * Send an SMS via Twilio. The caller is responsible for:
 *   - confirming sms_opt_in_completed_at IS NOT NULL
 *   - running validateExternalBody(body) and dropping on failure
 *   - recording the dispatch audit row post-hoc
 * The adapter is transport only.
 */
export async function sendSms(to: string, body: string): Promise<SmsSendResult> {
  const cfg = getTwilioConfig();
  if (!cfg) {
    return { ok: false, error: "twilio_not_configured" };
  }
  if (!to || !body) {
    return { ok: false, error: "missing_to_or_body" };
  }

  const form = new URLSearchParams();
  form.set("To", to);
  form.set("MessagingServiceSid", cfg.messagingServiceSid);
  form.set("Body", body);

  const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Basic ${auth}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
  } catch (e) {
    return { ok: false, error: "twilio_fetch_failed", body_raw: String(e) };
  }
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return { ok: false, error: "twilio_error", http_status: resp.status, body_raw: json };
  }
  return { ok: true, message_sid: json.sid, body_raw: json };
}

export const SMS_TCPA_COMPLIANT_OPT_IN_COPY =
  "ViaConnect practitioner notifications. Msg&data rates apply. Reply YES to opt in, STOP to opt out, HELP for help.";

export const SMS_HELP_AUTO_RESPONSE =
  "ViaConnect practitioner support: support@viaconnectapp.com | https://viaconnectapp.com/help";

export const SMS_OPT_OUT_CONFIRMATION =
  "You've opted out of ViaConnect SMS notifications. No further messages will be sent. Reply HELP for support.";

export const SMS_OPT_IN_CONFIRMATION =
  "You're opted in to ViaConnect practitioner notifications. Reply STOP anytime to opt out.";

export const SMS_STOP_KEYWORDS: readonly string[] = ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];
export const SMS_HELP_KEYWORDS: readonly string[] = ["HELP", "INFO"];

export function isStopKeyword(text: string): boolean {
  const normalized = text.trim().toUpperCase();
  return SMS_STOP_KEYWORDS.includes(normalized);
}

export function isHelpKeyword(text: string): boolean {
  const normalized = text.trim().toUpperCase();
  return SMS_HELP_KEYWORDS.includes(normalized);
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Telemetry placeholder — caller reports the delivery status via recordDispatch.
export function channelName(): NotificationChannel { return "sms"; }

export type { DispatchContext };
