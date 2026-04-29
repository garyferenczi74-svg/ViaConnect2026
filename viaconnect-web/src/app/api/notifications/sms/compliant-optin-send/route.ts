// Prompt #112 — Step 4: after verification-code confirmed, server sends
// the TCPA-compliant opt-in SMS and waits for "YES" reply.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms, SMS_TCPA_COMPLIANT_OPT_IN_COPY } from "@/lib/notifications/adapters/sms";
import { recordOptInAction } from "@/lib/notifications/audit-logger";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { getCircuitBreaker, isCircuitBreakerError } from "@/lib/utils/circuit-breaker";

const smsBreaker = getCircuitBreaker("sms-provider");

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, "api.notifications.sms.compliant-optin-send.auth");
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: cred } = await admin
    .from("notification_channel_credentials")
    .select("sms_phone_number, sms_pending_verification_code, sms_opt_in_completed_at")
    .eq("practitioner_id", user.id)
    .maybeSingle();
  if (!cred) return NextResponse.json({ ok: false, error: "no_credentials" }, { status: 409 });
  const c = cred as { sms_phone_number: string | null; sms_pending_verification_code: string | null; sms_opt_in_completed_at: string | null };
  if (!c.sms_phone_number) return NextResponse.json({ ok: false, error: "no_phone" }, { status: 409 });
  if (c.sms_pending_verification_code) {
    return NextResponse.json({ ok: false, error: "verification_not_confirmed" }, { status: 409 });
  }
  if (c.sms_opt_in_completed_at) {
    return NextResponse.json({ ok: false, error: "already_opted_in" }, { status: 409 });
  }

  let sent;
  try {
    sent = await smsBreaker.execute(() => withTimeout(sendSms(c.sms_phone_number!, SMS_TCPA_COMPLIANT_OPT_IN_COPY), 10000, "api.notifications.sms.compliant-optin-send.send"));
  } catch (smsErr) {
    if (isCircuitBreakerError(smsErr)) {
      safeLog.warn("api.notifications.sms.compliant-optin-send", "sms circuit open", { error: smsErr });
      return NextResponse.json({ ok: false, error: "sms_unavailable" }, { status: 503 });
    }
    if (isTimeoutError(smsErr)) {
      safeLog.warn("api.notifications.sms.compliant-optin-send", "sms send timeout", { error: smsErr });
      return NextResponse.json({ ok: false, error: "sms_timeout" }, { status: 504 });
    }
    throw smsErr;
  }
  if (!sent.ok) return NextResponse.json({ ok: false, error: sent.error }, { status: 502 });

  await recordOptInAction({
    practitioner_id: user.id,
    action: "compliant_opt_in_sent",
    phone_number: c.sms_phone_number,
    message_sid: sent.message_sid,
    message_body_sent: SMS_TCPA_COMPLIANT_OPT_IN_COPY,
    ip_address: request.headers.get("x-forwarded-for") ?? undefined,
    user_agent: request.headers.get("user-agent") ?? undefined,
  });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn("api.notifications.sms.compliant-optin-send", "auth/db timeout", { error: err });
      return NextResponse.json({ ok: false, error: "timeout" }, { status: 503 });
    }
    safeLog.error("api.notifications.sms.compliant-optin-send", "unexpected error", { error: err });
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
