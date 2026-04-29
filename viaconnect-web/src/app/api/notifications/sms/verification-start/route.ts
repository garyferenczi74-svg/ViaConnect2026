// Prompt #112 — SMS verification start (step 1 of double-opt-in).
// Practitioner submits their phone; server generates a 6-digit code, sends
// verification SMS via Twilio, stores the pending code on credentials,
// writes audit log entry.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms, generateVerificationCode } from "@/lib/notifications/adapters/sms";
import { recordOptInAction } from "@/lib/notifications/audit-logger";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { getCircuitBreaker, isCircuitBreakerError } from "@/lib/utils/circuit-breaker";

const smsBreaker = getCircuitBreaker("sms-provider");

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, "api.notifications.sms.verification-start.auth");
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { phone } = await request.json().catch(() => ({ phone: "" }));
    if (!phone || !/^\+?[1-9]\d{7,14}$/.test(String(phone))) {
      return NextResponse.json({ ok: false, error: "invalid_phone_format" }, { status: 400 });
    }

    const code = generateVerificationCode();
    const admin = createAdminClient();
    const msg = `ViaConnect verification code: ${code}. Reply with this code to confirm your phone.`;

    let sent;
    try {
      sent = await smsBreaker.execute(() => withTimeout(sendSms(phone, msg), 10000, "api.notifications.sms.verification-start.send"));
    } catch (smsErr) {
      if (isCircuitBreakerError(smsErr)) {
        safeLog.warn("api.notifications.sms.verification-start", "sms circuit open", { error: smsErr });
        return NextResponse.json({ ok: false, error: "sms_unavailable" }, { status: 503 });
      }
      if (isTimeoutError(smsErr)) {
        safeLog.warn("api.notifications.sms.verification-start", "sms send timeout", { error: smsErr });
        return NextResponse.json({ ok: false, error: "sms_timeout" }, { status: 504 });
      }
      throw smsErr;
    }
    if (!sent.ok) {
      safeLog.warn("api.notifications.sms.verification-start", "sms send failed", { detail: sent.error });
      return NextResponse.json({ ok: false, error: "sms_send_failed", detail: sent.error }, { status: 502 });
    }

  const { data: existing } = await admin
    .from("notification_channel_credentials")
    .select("credential_id")
    .eq("practitioner_id", user.id)
    .maybeSingle();

  if (existing) {
    await admin.from("notification_channel_credentials")
      .update({
        sms_phone_number: phone,
        sms_pending_verification_code: code,
        sms_verification_sent_at: new Date().toISOString(),
        sms_opt_in_verification_sid: sent.message_sid ?? null,
        sms_opt_in_completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("credential_id", (existing as { credential_id: string }).credential_id);
  } else {
    await admin.from("notification_channel_credentials").insert({
      practitioner_id: user.id,
      sms_phone_number: phone,
      sms_pending_verification_code: code,
      sms_verification_sent_at: new Date().toISOString(),
      sms_opt_in_verification_sid: sent.message_sid ?? null,
    });
  }

  await recordOptInAction({
    practitioner_id: user.id,
    action: "verification_sent",
    phone_number: phone,
    message_sid: sent.message_sid,
    message_body_sent: msg,
    ip_address: request.headers.get("x-forwarded-for") ?? undefined,
    user_agent: request.headers.get("user-agent") ?? undefined,
  });

    return NextResponse.json({ ok: true, verification_message_sid: sent.message_sid });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn("api.notifications.sms.verification-start", "auth/db timeout", { error: err });
      return NextResponse.json({ ok: false, error: "timeout" }, { status: 503 });
    }
    safeLog.error("api.notifications.sms.verification-start", "unexpected error", { error: err });
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
