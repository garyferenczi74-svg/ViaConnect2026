// Prompt 212: process pending WHOOP/health wearable_events (cron or post-webhook).
// Auth: CRON_SECRET bearer or authenticated admin.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import { processPendingEvents } from "@/lib/wearables/processor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE = "api.integrations.whoop.process";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}` || auth === secret;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const admin = createAdminClient();
    const result = await processPendingEvents(admin, 25);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    safeLog.error(SCOPE, "process failed", { error: err });
    return NextResponse.json({ error: "process_failed" }, { status: 500 });
  }
}
