// POST /api/admin/jeffery/approve  (Prompt #60c)
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { approveMessage } from "@/lib/jeffery/message-bus";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

async function requireAdmin() {
  const supabase = createServerClient();
  const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, "api.admin.jeffery.approve.auth");
  if (!user) return { error: "Unauthenticated", status: 401 };
  const profileRes = await withTimeout(
    (async () => supabase.from("profiles").select("role").eq("id", user.id).maybeSingle())(),
    5000,
    "api.admin.jeffery.approve.role-check",
  );
  const profile = profileRes.data as { role: string } | null;
  if (profile?.role !== "admin") return { error: "Admin only", status: 403 };
  return { user };
}

export async function POST(req: Request) {
  try {
    const gate = await requireAdmin();
    if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

    let body: { messageId?: string; modifications?: Record<string, unknown> };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    if (!body.messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 });

    const result = await withTimeout(
      approveMessage(body.messageId, gate.user.id, body.modifications),
      10000,
      "api.admin.jeffery.approve.action",
    );
    if (!result.ok) {
      safeLog.warn("api.admin.jeffery.approve", "approval rejected", { messageId: body.messageId, reason: result.error });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error("api.admin.jeffery.approve", "timeout", { error: err });
      return NextResponse.json({ error: "Operation timed out." }, { status: 503 });
    }
    safeLog.error("api.admin.jeffery.approve", "unexpected error", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
