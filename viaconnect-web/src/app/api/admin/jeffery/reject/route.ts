// POST /api/admin/jeffery/reject  (Prompt #60c)
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { rejectMessage } from "@/lib/jeffery/message-bus";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export async function POST(req: Request) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, "api.admin.jeffery.reject.auth");
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    const profileRes = await withTimeout(
      (async () => supabase.from("profiles").select("role").eq("id", user.id).maybeSingle())(),
      5000,
      "api.admin.jeffery.reject.role-check",
    );
    const profile = profileRes.data as { role: string } | null;
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

    let body: { messageId?: string; reason?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    if (!body.messageId || !body.reason) return NextResponse.json({ error: "messageId and reason required" }, { status: 400 });

    const result = await withTimeout(rejectMessage(body.messageId, user.id, body.reason), 8000, "api.admin.jeffery.reject.action");
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error("api.admin.jeffery.reject", "timeout", { error: err });
      return NextResponse.json({ error: "Operation timed out." }, { status: 503 });
    }
    safeLog.error("api.admin.jeffery.reject", "unexpected error", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
