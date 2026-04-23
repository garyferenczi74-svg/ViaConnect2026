// Prompt #112 — Browser push subscription registration endpoint.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addSubscription, isValidSubscription } from "@/lib/notifications/adapters/push";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || !isValidSubscription(body.subscription)) {
    return NextResponse.json({ ok: false, error: "invalid_subscription" }, { status: 400 });
  }

  const ok = await addSubscription(user.id, {
    ...body.subscription,
    user_agent: request.headers.get("user-agent") ?? undefined,
    device_label: body.device_label,
  });
  return NextResponse.json({ ok });
}
