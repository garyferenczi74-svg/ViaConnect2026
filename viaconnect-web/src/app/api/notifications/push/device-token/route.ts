// Native APNs / FCM token registration.
// Uses notification_channel_credentials.apns_device_tokens and
// fcm_device_tokens. Does not send a notification and does not accept
// a marketing payload. Apple 4.2 / Play minimum functionality, and
// Apple 5.1.1(ii) purpose is limited to alerts the user opted into.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addNativeDeviceToken } from "@/lib/notifications/adapters/push";
import { isAcceptableDeviceToken, isDeviceTokenPlatform } from "@/lib/native/device-tokens";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      "api.notifications.push.device-token.auth",
    );
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => null)) as { token?: unknown; platform?: unknown } | null;
    if (!body || !isAcceptableDeviceToken(body.token) || !isDeviceTokenPlatform(body.platform)) {
      return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 400 });
    }

    const ok = await withTimeout(
      addNativeDeviceToken(user.id, {
        token: body.token.trim(),
        platform: body.platform,
        last_seen_at: new Date().toISOString(),
      }),
      8000,
      "api.notifications.push.device-token.write",
    );
    if (!ok) return NextResponse.json({ ok: false, error: "store_failed" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn("api.notifications.push.device-token", "timeout", { error: err });
      return NextResponse.json({ ok: false, error: "timeout" }, { status: 503 });
    }
    safeLog.error("api.notifications.push.device-token", "unexpected error", { error: err });
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
