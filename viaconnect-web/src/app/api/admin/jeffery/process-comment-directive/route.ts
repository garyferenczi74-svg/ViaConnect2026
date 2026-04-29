// POST /api/admin/jeffery/process-comment-directive  (Prompt #60c)
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { processCommentDirective } from "@/lib/jeffery/directive-processor";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export async function POST(req: Request) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, "api.admin.jeffery.process-comment-directive.auth");
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    const profileRes = await withTimeout(
      (async () => supabase.from("profiles").select("role").eq("id", user.id).maybeSingle())(),
      5000,
      "api.admin.jeffery.process-comment-directive.role-check",
    );
    const profile = profileRes.data as { role: string } | null;
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

    let body: { messageId?: string; comment?: string; commentId?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    if (!body.messageId || !body.comment) return NextResponse.json({ error: "messageId and comment required" }, { status: 400 });

    const result = await withTimeout(
      processCommentDirective(body.messageId, body.comment, body.commentId),
      30000,
      "api.admin.jeffery.process-comment-directive.processor",
    );
    return NextResponse.json(result);
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error("api.admin.jeffery.process-comment-directive", "timeout", { error: err });
      return NextResponse.json({ error: "Directive processing took too long." }, { status: 504 });
    }
    safeLog.error("api.admin.jeffery.process-comment-directive", "unexpected error", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
