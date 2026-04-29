// POST /api/admin/jeffery/process-directive  (Prompt #60c)
// Prompt #140b Layer 3 hardening: timeouts on auth, role check, directive
// processor; safeLog instrumentation.
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { processDirective } from "@/lib/jeffery/directive-processor";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const supabase = createServerClient();

    let user;
    try {
      const authResult = await withTimeout(supabase.auth.getUser(), 5000, "api.jeffery.process-directive.auth");
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error("api.jeffery.process-directive", "auth timeout", { requestId, error: err });
        return NextResponse.json({ error: "Authentication check timed out." }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const profileRes = await withTimeout(
      (async () => supabase.from("profiles").select("role").eq("id", user.id).maybeSingle())(),
      5000,
      "api.jeffery.process-directive.role-check",
    );
    const profile = profileRes.data as { role: string } | null;
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

    let body: { directiveId?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    if (!body.directiveId) return NextResponse.json({ error: "directiveId required" }, { status: 400 });

    let result;
    try {
      result = await withTimeout(
        processDirective(body.directiveId),
        45000,
        "api.jeffery.process-directive.processor",
      );
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error("api.jeffery.process-directive", "processor timeout", { requestId, directiveId: body.directiveId, error: err });
        return NextResponse.json({ error: "Directive processing took too long. Please try again." }, { status: 504 });
      }
      throw err;
    }

    if (!result.ok) {
      safeLog.warn("api.jeffery.process-directive", "processor rejected", { requestId, directiveId: body.directiveId, reason: result.error });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    safeLog.info("api.jeffery.process-directive", "directive processed", { requestId, directiveId: body.directiveId, userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error("api.jeffery.process-directive", "database timeout", { requestId, error: err });
      return NextResponse.json({ error: "Database operation timed out." }, { status: 503 });
    }
    safeLog.error("api.jeffery.process-directive", "unexpected error", { requestId, error: err });
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
