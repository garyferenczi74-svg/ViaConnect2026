// Prompt #112 — Browser push subscription registration endpoint.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addSubscription, isValidSubscription } from "@/lib/notifications/adapters/push";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, "api.notifications.push.subscribe.auth");
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    if (!body || !isValidSubscription(body.subscription)) {
      return NextResponse.json({ ok: false, error: "invalid_subscription" }, { status: 400 });
    }

    const ok = await withTimeout(
      addSubscription(user.id, {
        ...body.subscription,
        user_agent: request.headers.get("user-agent") ?? undefined,
        device_label: body.device_label,
      }),
      8000,
      "api.notifications.push.subscribe.add",
    );
    return NextResponse.json({ ok });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn("api.notifications.push.subscribe", "timeout", { error: err });
      return NextResponse.json({ ok: false, error: "timeout" }, { status: 503 });
    }
    safeLog.error("api.notifications.push.subscribe", "unexpected error", { error: err });
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
