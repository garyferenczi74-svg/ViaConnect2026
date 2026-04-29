import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { replaySignal } from "@/lib/hounddog/replay";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const userClient = createServerClient();
    const { data: { user } } = await withTimeout(userClient.auth.getUser(), 5000, "api.hounddog.evaluate.auth");
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    const { data: profile } = await withTimeout(
      (async () => userClient.from("profiles").select("role").eq("id", user.id).maybeSingle())(),
      5000,
      "api.hounddog.evaluate.role-check",
    );
    if (!profile || !["admin", "superadmin", "compliance_officer", "compliance_admin"].includes(profile.role as string)) {
      return NextResponse.json({ error: "Compliance role required" }, { status: 403 });
    }

    let body: { signalId?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    if (!body.signalId) return NextResponse.json({ error: "signalId required" }, { status: 400 });

    const result = await withTimeout(replaySignal(serviceClient(), body.signalId), 15000, "api.hounddog.evaluate.replay");
    if (!result) return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error("api.hounddog.evaluate", "timeout", { error: err });
      return NextResponse.json({ error: "Evaluation took too long" }, { status: 504 });
    }
    safeLog.error("api.hounddog.evaluate", "unexpected error", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
