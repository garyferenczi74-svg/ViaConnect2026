// POST /api/admin/jeffery/verify-knowledge  (Prompt #60c)
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export async function POST(req: Request) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, "api.admin.jeffery.verify-knowledge.auth");
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    const profileRes = await withTimeout(
      (async () => supabase.from("profiles").select("role").eq("id", user.id).maybeSingle())(),
      5000,
      "api.admin.jeffery.verify-knowledge.role-check",
    );
    const profile = profileRes.data as { role: string } | null;
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

    let body: { entryId?: string; notes?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    if (!body.entryId) return NextResponse.json({ error: "entryId required" }, { status: 400 });

    const updateRes = await withTimeout(
      (async () => supabase
        .from("jeffery_knowledge_entries")
        .update({
          admin_verified: true,
          admin_notes: body.notes ?? null,
        })
        .eq("id", body.entryId!))(),
      8000,
      "api.admin.jeffery.verify-knowledge.update",
    );
    if (updateRes.error) {
      safeLog.error("api.admin.jeffery.verify-knowledge", "update failed", { entryId: body.entryId, error: updateRes.error });
      return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error("api.admin.jeffery.verify-knowledge", "timeout", { error: err });
      return NextResponse.json({ error: "Operation timed out." }, { status: 503 });
    }
    safeLog.error("api.admin.jeffery.verify-knowledge", "unexpected error", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
