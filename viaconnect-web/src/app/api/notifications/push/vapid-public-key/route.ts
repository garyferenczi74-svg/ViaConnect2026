// Prompt #112, Serves the VAPID public key so the browser Service Worker
// can subscribe. Key is provisioned in Supabase Vault and exposed via env.

import { NextResponse } from "next/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

void withTimeout;
void isTimeoutError;

export async function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) return NextResponse.json({ ok: false, error: "vapid_not_configured" }, { status: 503 });
    return NextResponse.json({ ok: true, public_key: key });
  } catch (err) {
    safeLog.error('api.notifications.push.vapid-public-key', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
