import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const { id } = await params;
    const userClient = createServerClient();
    let user;
    try {
      const authResult = await withTimeout(
        userClient.auth.getUser(),
        5000,
        'api.practitioner.compliance.notices.remediate.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.practitioner.compliance.notices.remediate', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: "Authentication timed out. Please try again." }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = serviceClient() as any;
    const pracRes = await withTimeout(
      (async () => svc.from("practitioners").select("id").eq("user_id", user.id).maybeSingle())(),
      8000,
      'api.practitioner.compliance.notices.remediate.practitioner-load',
    );
    const prac = pracRes.data;
    if (!prac?.id) return NextResponse.json({ error: "Practitioner profile required" }, { status: 403 });

    const noticeRes = await withTimeout(
      (async () => svc.from("practitioner_notices").select("id, practitioner_id").eq("id", id).maybeSingle())(),
      8000,
      'api.practitioner.compliance.notices.remediate.notice-load',
    );
    const notice = noticeRes.data;
    if (!notice || notice.practitioner_id !== prac.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Mark remediated; Steve Rica still needs to close after verification.
    await withTimeout(
      (async () => svc
        .from("practitioner_notices")
        .update({
          status: "remediated",
          remediated_at: new Date().toISOString(),
          resolution_note: "Self-reported by practitioner; pending compliance verification.",
        })
        .eq("id", id))(),
      8000,
      'api.practitioner.compliance.notices.remediate.update',
    );
    await withTimeout(
      (async () => svc.from("compliance_audit_log").insert({
        event_type: "notice.self_remediated",
        actor_type: "user",
        actor_id: user.id,
        payload: { noticeId: id },
      }))(),
      5000,
      'api.practitioner.compliance.notices.remediate.audit-log',
    );

    return NextResponse.redirect(new URL(`/practitioner/compliance/notices/${id}`, req.url), { status: 303 });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.practitioner.compliance.notices.remediate', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: "Database operation timed out. Please try again." }, { status: 503 });
    }
    safeLog.error('api.practitioner.compliance.notices.remediate', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
