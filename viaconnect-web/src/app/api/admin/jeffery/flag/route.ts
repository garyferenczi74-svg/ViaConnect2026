// POST /api/admin/jeffery/flag  (Prompt #60c)
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { flagMessage } from "@/lib/jeffery/message-bus";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export async function POST(req: Request) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, "api.admin.jeffery.flag.auth");
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    const profileRes = await withTimeout(
      (async () => supabase.from("profiles").select("role").eq("id", user.id).maybeSingle())(),
      5000,
      "api.admin.jeffery.flag.role-check",
    );
    const profile = profileRes.data as { role: string } | null;
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

    let body: { messageId?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    if (!body.messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 });

    const result = await withTimeout(flagMessage(body.messageId, user.id), 8000, "api.admin.jeffery.flag.action");
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error("api.admin.jeffery.flag", "timeout", { error: err });
      return NextResponse.json({ error: "Operation timed out." }, { status: 503 });
    }
    safeLog.error("api.admin.jeffery.flag", "unexpected error", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
